'use strict';
// Minimal zip reader (no dependencies): lists entries and extracts single files. Handles stored / deflated entries and zip64.
const fs = require('fs');
const zlib = require('zlib');

const METHODS = { 0: 'stored', 8: 'deflate', 9: 'deflate64', 12: 'bzip2', 14: 'lzma', 93: 'zstd', 95: 'xz', 98: 'ppmd' };
const supported = (m) => m === 0 || m === 8 || (m === 93 && !!zlib.zstdDecompressSync);

function readAt(fd, pos, len) {
  const b = Buffer.alloc(len);
  let off = 0;
  while (off < len) {
    const n = fs.readSync(fd, b, off, len - off, pos + off);
    if (n <= 0) break;
    off += n;
  }
  return off === len ? b : b.subarray(0, off);
}

function openZip(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const tailLen = Math.min(size, 65557 + 22);
    const tail = readAt(fd, size - tailLen, tailLen);
    let e = -1;
    for (let i = tail.length - 22; i >= 0; i--)
      if (tail.readUInt32LE(i) === 0x06054b50) {
        e = i;
        break;
      }
    if (e < 0) throw new Error('not a zip file (no end-of-archive record)');
    let count = tail.readUInt16LE(e + 10),
      cdSize = tail.readUInt32LE(e + 12),
      cdOff = tail.readUInt32LE(e + 16);
    if (count === 0xffff || cdSize === 0xffffffff || cdOff === 0xffffffff) {
      const lp = e - 20;
      if (lp < 0 || tail.readUInt32LE(lp) !== 0x07064b50) throw new Error('zip64 record not found');
      const z64 = Number(tail.readBigUInt64LE(lp + 8));
      const h = readAt(fd, z64, 56);
      if (h.readUInt32LE(0) !== 0x06064b50) throw new Error('bad zip64 end record');
      count = Number(h.readBigUInt64LE(32));
      cdSize = Number(h.readBigUInt64LE(40));
      cdOff = Number(h.readBigUInt64LE(48));
    }
    const cd = readAt(fd, cdOff, cdSize);
    const entries = [];
    let p = 0;
    while (p + 46 <= cd.length && cd.readUInt32LE(p) === 0x02014b50) {
      const flags = cd.readUInt16LE(p + 8),
        method = cd.readUInt16LE(p + 10);
      let comp = cd.readUInt32LE(p + 20),
        uncomp = cd.readUInt32LE(p + 24),
        lho = cd.readUInt32LE(p + 42);
      const nl = cd.readUInt16LE(p + 28),
        el = cd.readUInt16LE(p + 30),
        cl = cd.readUInt16LE(p + 32);
      const name = cd.toString('utf8', p + 46, p + 46 + nl);
      const ex = cd.subarray(p + 46 + nl, p + 46 + nl + el);
      for (let q = 0; q + 4 <= ex.length; ) {
        const id = ex.readUInt16LE(q),
          sz = ex.readUInt16LE(q + 2);
        if (id === 1) {
          let o = q + 4;
          if (uncomp === 0xffffffff) {
            uncomp = Number(ex.readBigUInt64LE(o));
            o += 8;
          }
          if (comp === 0xffffffff) {
            comp = Number(ex.readBigUInt64LE(o));
            o += 8;
          }
          if (lho === 0xffffffff) {
            lho = Number(ex.readBigUInt64LE(o));
          }
        }
        q += 4 + sz;
      }
      entries.push({ name, method, flags, comp, uncomp, lho, dir: name.endsWith('/') });
      p += 46 + nl + el + cl;
    }
    return {
      entries,
      read(en) {
        if (en.flags & 1) throw new Error('entry is password protected');
        const h = readAt(fd, en.lho, 30);
        if (h.readUInt32LE(0) !== 0x04034b50) throw new Error('bad local header for ' + en.name);
        const data = readAt(fd, en.lho + 30 + h.readUInt16LE(26) + h.readUInt16LE(28), en.comp);
        if (en.method === 0) return data;
        if (en.method === 8) return zlib.inflateRawSync(data);
        if (en.method === 93 && zlib.zstdDecompressSync) return zlib.zstdDecompressSync(data); // zstd (newer zip tools)
        throw new Error('unsupported compression method ' + en.method + ' (' + (METHODS[en.method] || 'unknown') + ')');
      },
      close() {
        try {
          fs.closeSync(fd);
        } catch {
          /* ignore */
        }
      },
    };
  } catch (err) {
    fs.closeSync(fd);
    throw err;
  }
}
module.exports = { openZip, METHODS, supported };
