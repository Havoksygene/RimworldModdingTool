'use strict';
/* Minimal DDS reader for RimWorld textures (works in the app and in Node tests).
   Supports: DXT1 / DXT3 / DXT5 (BC1/2/3), DX10-header BC1/2/3, uncompressed 24/32-bit RGB(A),
   8-bit luminance. BC7 (DX10 formats 98/99) is decoded on the GPU through WebGL when the browser offers it.
   Only the top mip level is read. Rows are returned in file order (DDS is top-down by spec). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DDS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const MAGIC = 0x20534444; // "DDS "
  const cc = (s) => s.charCodeAt(0) | (s.charCodeAt(1) << 8) | (s.charCodeAt(2) << 16) | (s.charCodeAt(3) << 24);
  const FOURCC = { DXT1: cc('DXT1'), DXT3: cc('DXT3'), DXT5: cc('DXT5'), DX10: cc('DX10'), DXT2: cc('DXT2'), DXT4: cc('DXT4') };
  const fourccName = (v) => String.fromCharCode(v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >> 24) & 255);

  function isDDS(bytes) {
    return bytes && bytes.length >= 128 && bytes[0] === 0x44 && bytes[1] === 0x44 && bytes[2] === 0x53 && bytes[3] === 0x20;
  }


  // ---- ".dds.split" (RimWorld 1.7 / Waylith engine) -> ordinary BC7 DDS --------------------------------------------
  // Reverse of Waylith.Graphics.Textures.BlockCompression.Bc7StreamSplit.TryJoin, read from Waylith.dll. Lossless.
  // Payload = [one mode byte per block (all mips)] [endpoint bytes grouped by mode] [index bytes grouped by mode].
  const SPLIT_ORDER = [9, 6, 10, 5, 1, 3, 4, 0, 2, 7, 8],
    SPLIT_EP = [8, 8, 8, 8, 8, 9, 9, 8, 8, 6, 7],
    SPLIT_IB = [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 4];
  const M64 = (1n << 64n) - 1n;
  function rd(b, o, n) {
    let v = 0n;
    for (let i = n - 1; i >= 0; i--) v = (v << 8n) | BigInt(b[o + i]);
    return v;
  }
  function joinRgb(b, o, sh) {
    const c = b[o + 2],
      x3 = (b[o + 3] + c) & 127;
    const xs = [(b[o] + c) & 127, (b[o + 1] + x3) & 127, c, x3, (b[o + 4] + c) & 127, (b[o + 5] + x3) & 127];
    let r = 0n;
    for (let i = 0; i < 6; i++) r |= BigInt(xs[i]) << BigInt((sh + 7 * i) & 63);
    return r;
  }
  const unpad = (v) => (v & 1) | ((v >>> 1) & 0x7ffffffe);
  const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
  function blocksInChain(w, h, mips) {
    let t = 0;
    for (let i = 0; i < mips; i++) {
      t += Math.ceil(w / 4) * Math.ceil(h / 4);
      w = Math.max(1, w >> 1);
      h = Math.max(1, h >> 1);
    }
    return t;
  }
  // pay: Uint8Array payload (after the 148-byte header). Returns Uint8Array of nblocks*16 bytes, or throws.
  function unsplitBC7Payload(pay, n) {
    const cnt = new Array(11).fill(0);
    for (let i = 0; i < n; i++) {
      if (pay[i] > 10) throw new Error('bad block mode');
      cnt[pay[i]]++;
    }
    let pos = n;
    const eo = [],
      io = [];
    for (const m of SPLIT_ORDER) {
      eo[m] = pos;
      pos += cnt[m] * SPLIT_EP[m];
    }
    for (const m of SPLIT_ORDER) {
      io[m] = pos;
      pos += cnt[m] * SPLIT_IB[m];
    }
    if (pos !== pay.length) throw new Error('split size mismatch');
    const out = new Uint8Array(n * 16),
      dv = new DataView(out.buffer);
    for (let i = 0; i < n; i++) {
      const m = pay[i],
        e = eo[m],
        x = io[m];
      eo[m] += SPLIT_EP[m];
      io[m] += SPLIT_IB[m];
      let lo, hi;
      if (m === 6) {
        lo = 64n | joinRgb(pay, e, 7) | (BigInt(pay[e + 6]) << 49n) | (BigInt(pay[e + 7]) << 56n) | (BigInt(pay[e + 8]) << 63n);
        hi = rd(pay, x, 8);
      } else if (m === 9) {
        lo = 64n | joinRgb(pay, e, 7) | 0xfffe000000000000n;
        hi = rd(pay, x, 8);
      } else if (m === 5) {
        lo = 32n | (BigInt(pay[e]) << 6n) | joinRgb(pay, e + 1, 8) | (BigInt(pay[e + 7]) << 50n) | (BigInt(pay[e + 8]) << 58n);
        hi = BigInt(pay[e + 8] >> 6) | (BigInt(unpad(u32(pay, x))) << 2n) | (BigInt(unpad(u32(pay, x + 4))) << 33n);
      } else if (m === 10) {
        lo = 32n | joinRgb(pay, e, 8) | 0x03fc000000000000n | (BigInt(pay[e + 6]) << 58n);
        hi = BigInt(pay[e + 6] >> 6) | (BigInt(unpad(u32(pay, x))) << 2n);
      } else {
        lo = rd(pay, e, 8);
        hi = rd(pay, x, 8);
      }
      dv.setBigUint64(i * 16, lo & M64, true);
      dv.setBigUint64(i * 16 + 8, hi & M64, true);
    }
    return out;
  }
  // Takes the bytes of a DDS (plain or ".split"). Returns plain bytes: unchanged when nothing to do,
  // a rebuilt copy for split BC7, or null for a split format we cannot rebuild (BC1/BC4/BC5 splits).
  function unsplit(bytes) {
    if (!isDDS(bytes) || bytes.length < 148) return bytes;
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (dv.getUint32(84, true) !== FOURCC.DX10) return bytes;
    const dxgi = dv.getUint32(128, true);
    const h = dv.getUint32(12, true),
      w = dv.getUint32(16, true),
      mips = dv.getUint32(28, true) || 1;
    const bpb = [74, 75, 77, 78, 83, 84, 94, 95, 98, 99].includes(dxgi) ? 16 : [71, 72, 80, 81].includes(dxgi) ? 8 : 0;
    if (!bpb) return bytes;
    const n = blocksInChain(w, h, mips);
    const payLen = bytes.length - 148;
    if (payLen === n * bpb) return bytes; // already plain
    if (payLen === Math.ceil(w / 4) * Math.ceil(h / 4) * bpb) return bytes; // plain, top mip only
    if (dxgi !== 98 && dxgi !== 99) return null;
    let pay;
    try {
      pay = unsplitBC7Payload(bytes.subarray(148), n);
    } catch (e) {
      return null;
    }
    const out = new Uint8Array(148 + pay.length);
    out.set(bytes.subarray(0, 148), 0);
    out.set(pay, 148);
    return out;
  }

  function parseHeader(bytes) {
    if (!isDDS(bytes)) throw new Error('Not a DDS file (missing "DDS " header)');
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const height = dv.getUint32(12, true),
      width = dv.getUint32(16, true);
    const mips = dv.getUint32(28, true) || 1;
    const pfFlags = dv.getUint32(80, true),
      fourCC = dv.getUint32(84, true),
      bits = dv.getUint32(88, true);
    const masks = { r: dv.getUint32(92, true), g: dv.getUint32(96, true), b: dv.getUint32(100, true), a: dv.getUint32(104, true) };
    let offset = 128,
      format = null,
      dxgi = null,
      label = '';
    if (!width || !height || width > 16384 || height > 16384) throw new Error('DDS has an invalid size ' + width + 'x' + height);

    if (pfFlags & 0x4) {
      // FOURCC
      label = fourccName(fourCC);
      if (fourCC === FOURCC.DXT1) format = 'bc1';
      else if (fourCC === FOURCC.DXT3 || fourCC === FOURCC.DXT2) format = 'bc2';
      else if (fourCC === FOURCC.DXT5 || fourCC === FOURCC.DXT4) format = 'bc3';
      else if (fourCC === FOURCC.DX10) {
        if (bytes.length < 148) throw new Error('Truncated DX10 DDS header');
        dxgi = dv.getUint32(128, true);
        offset = 148;
        label = 'DX10/DXGI ' + dxgi;
        if (dxgi === 71 || dxgi === 72) format = 'bc1';
        else if (dxgi === 74 || dxgi === 75) format = 'bc2';
        else if (dxgi === 77 || dxgi === 78) format = 'bc3';
        else if (dxgi === 98 || dxgi === 99) format = 'bc7';
        else if (dxgi === 28 || dxgi === 29) format = 'rgba8';
        else if (dxgi === 87 || dxgi === 91) format = 'bgra8';
        else if (dxgi === 88) format = 'bgrx8';
        else if (dxgi === 61) format = 'l8';
      }
    } else if (pfFlags & 0x40) {
      // RGB
      label = 'uncompressed ' + bits + '-bit';
      if (bits === 32 || bits === 24) format = { masks, bits };
    } else if (pfFlags & 0x20000) {
      // luminance
      label = 'luminance ' + bits + '-bit';
      if (bits === 8) format = 'l8';
    }
    if (!format)
      throw new Error('Unsupported DDS format (' + (label || 'unknown') + '). Supported: DXT1/3/5, BC7 (needs GPU support), uncompressed 24/32-bit.');
    return { width, height, mips, format, dxgi, label, dataOffset: offset };
  }

  // ---- block decoders ---------------------------------------------------------------------
  const e5 = (v) => (v << 3) | (v >> 2),
    e6 = (v) => (v << 2) | (v >> 4);
  function colorBlock(bytes, p, out, ox, oy, w, h, stride, allowAlpha) {
    const c0 = bytes[p] | (bytes[p + 1] << 8),
      c1 = bytes[p + 2] | (bytes[p + 3] << 8);
    const r0 = e5(c0 >> 11),
      g0 = e6((c0 >> 5) & 63),
      b0 = e5(c0 & 31);
    const r1 = e5(c1 >> 11),
      g1 = e6((c1 >> 5) & 63),
      b1 = e5(c1 & 31);
    const pal = new Array(16);
    pal[0] = r0;
    pal[1] = g0;
    pal[2] = b0;
    pal[3] = 255;
    pal[4] = r1;
    pal[5] = g1;
    pal[6] = b1;
    pal[7] = 255;
    if (c0 > c1 || !allowAlpha) {
      pal[8] = ((2 * r0 + r1) / 3) | 0;
      pal[9] = ((2 * g0 + g1) / 3) | 0;
      pal[10] = ((2 * b0 + b1) / 3) | 0;
      pal[11] = 255;
      pal[12] = ((r0 + 2 * r1) / 3) | 0;
      pal[13] = ((g0 + 2 * g1) / 3) | 0;
      pal[14] = ((b0 + 2 * b1) / 3) | 0;
      pal[15] = 255;
    } else {
      pal[8] = (r0 + r1) >> 1;
      pal[9] = (g0 + g1) >> 1;
      pal[10] = (b0 + b1) >> 1;
      pal[11] = 255;
      pal[12] = 0;
      pal[13] = 0;
      pal[14] = 0;
      pal[15] = 0;
    }
    const idx = (bytes[p + 4] | (bytes[p + 5] << 8) | (bytes[p + 6] << 16) | (bytes[p + 7] << 24)) >>> 0;
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        if (x >= w || y >= h) continue;
        const i = (idx >>> (2 * (y * 4 + x))) & 3,
          o = ((oy + y) * stride + ox + x) * 4;
        out[o] = pal[i * 4];
        out[o + 1] = pal[i * 4 + 1];
        out[o + 2] = pal[i * 4 + 2];
        out[o + 3] = pal[i * 4 + 3];
      }
  }
  function alphaBC3(bytes, p, out, ox, oy, w, h, stride) {
    const a0 = bytes[p],
      a1 = bytes[p + 1],
      al = new Array(8);
    al[0] = a0;
    al[1] = a1;
    if (a0 > a1) for (let k = 1; k <= 6; k++) al[k + 1] = (((7 - k) * a0 + k * a1) / 7) | 0;
    else {
      for (let k = 1; k <= 4; k++) al[k + 1] = (((5 - k) * a0 + k * a1) / 5) | 0;
      al[6] = 0;
      al[7] = 255;
    }
    // 48 bits of 3-bit indices, little endian
    const lo = (bytes[p + 2] | (bytes[p + 3] << 8) | (bytes[p + 4] << 16)) >>> 0;
    const hi = (bytes[p + 5] | (bytes[p + 6] << 8) | (bytes[p + 7] << 16)) >>> 0;
    for (let n = 0; n < 16; n++) {
      const x = n & 3,
        y = n >> 2;
      if (x >= w || y >= h) continue;
      const bit = n * 3,
        v = bit < 24 ? (lo >>> bit) & 7 : (hi >>> (bit - 24)) & 7;
      out[((oy + y) * stride + ox + x) * 4 + 3] = al[v];
    }
  }
  function alphaBC2(bytes, p, out, ox, oy, w, h, stride) {
    for (let n = 0; n < 16; n++) {
      const x = n & 3,
        y = n >> 2;
      if (x >= w || y >= h) continue;
      const byte = bytes[p + (n >> 1)],
        nib = n & 1 ? byte >> 4 : byte & 15;
      out[((oy + y) * stride + ox + x) * 4 + 3] = nib * 17;
    }
  }
  function decodeBC(bytes, header, kind) {
    const { width, height, dataOffset } = header,
      bw = Math.ceil(width / 4),
      bh = Math.ceil(height / 4);
    const blockSize = kind === 'bc1' ? 8 : 16;
    if (bytes.length < dataOffset + bw * bh * blockSize) throw new Error('DDS data is truncated');
    const out = new Uint8ClampedArray(width * height * 4);
    let p = dataOffset;
    for (let by = 0; by < bh; by++)
      for (let bx = 0; bx < bw; bx++) {
        const ox = bx * 4,
          oy = by * 4,
          w = Math.min(4, width - ox),
          h = Math.min(4, height - oy);
        if (kind === 'bc1') colorBlock(bytes, p, out, ox, oy, w, h, width, true);
        else {
          colorBlock(bytes, p + 8, out, ox, oy, w, h, width, false);
          if (kind === 'bc3') alphaBC3(bytes, p, out, ox, oy, w, h, width);
          else alphaBC2(bytes, p, out, ox, oy, w, h, width);
        }
        p += blockSize;
      }
    return out;
  }

  function maskShift(mask) {
    if (!mask) return { s: 0, bits: 0 };
    let s = 0;
    while (!((mask >>> s) & 1)) s++;
    let b = 0;
    while ((mask >>> (s + b)) & 1) b++;
    return { s, bits: b };
  }
  function decodeRaw(bytes, header) {
    const { width, height, dataOffset, format } = header,
      out = new Uint8ClampedArray(width * height * 4);
    if (format === 'l8') {
      for (let i = 0; i < width * height; i++) {
        const v = bytes[dataOffset + i];
        out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v;
        out[i * 4 + 3] = 255;
      }
      return out;
    }
    let bpp, r, g, b, a;
    if (format === 'rgba8') {
      bpp = 4;
      r = [0, 8];
      g = [8, 8];
      b = [16, 8];
      a = [24, 8];
    } else if (format === 'bgra8') {
      bpp = 4;
      b = [0, 8];
      g = [8, 8];
      r = [16, 8];
      a = [24, 8];
    } else if (format === 'bgrx8') {
      bpp = 4;
      b = [0, 8];
      g = [8, 8];
      r = [16, 8];
      a = null;
    } else {
      bpp = format.bits / 8;
      const m = format.masks;
      const mr = maskShift(m.r),
        mg = maskShift(m.g),
        mb = maskShift(m.b),
        ma = maskShift(m.a);
      r = [mr.s, mr.bits];
      g = [mg.s, mg.bits];
      b = [mb.s, mb.bits];
      a = m.a ? [ma.s, ma.bits] : null;
    }
    if (bytes.length < dataOffset + width * height * bpp) throw new Error('DDS data is truncated');
    const get = (v, f) => {
      if (!f || !f[1]) return 255;
      const maxv = 2 ** f[1] - 1,
        x = (v >>> f[0]) & maxv;
      return f[1] === 8 ? x : Math.round((x * 255) / maxv);
    };
    for (let i = 0; i < width * height; i++) {
      const p = dataOffset + i * bpp;
      let v = bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16);
      if (bpp === 4) v |= bytes[p + 3] << 24;
      v >>>= 0;
      out[i * 4] = get(v, r);
      out[i * 4 + 1] = get(v, g);
      out[i * 4 + 2] = get(v, b);
      out[i * 4 + 3] = a ? get(v, a) : 255;
    }
    return out;
  }

  // BC7 via WebGL (browser only). Uploads the compressed blocks and reads back decoded RGBA.
  function decodeBC7(bytes, header) {
    if (typeof document === 'undefined') throw new Error('BC7 needs a browser/GPU to decode');
    const { width, height, dataOffset } = header,
      w4 = Math.ceil(width / 4) * 4,
      h4 = Math.ceil(height / 4) * 4;
    const size = (w4 / 4) * (h4 / 4) * 16;
    if (bytes.length < dataOffset + size) throw new Error('DDS data is truncated');
    const canvas = document.createElement('canvas');
    canvas.width = w4;
    canvas.height = h4;
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false });
    if (!gl) throw new Error('BC7 textures need WebGL2, which is not available here');
    const ext = gl.getExtension('EXT_texture_compression_bptc');
    if (!ext) throw new Error('This GPU/driver cannot decode BC7 textures. Convert them to PNG (or DXT5) instead.');
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(
      prog,
      sh(gl.VERTEX_SHADER, '#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.0-1.0,0,1);}'),
    );
    gl.attachShader(
      prog,
      sh(
        gl.FRAGMENT_SHADER,
        '#version 300 es\nprecision highp float;uniform sampler2D t;out vec4 o;void main(){o=texelFetch(t,ivec2(gl_FragCoord.xy),0);}',
      ),
    );
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.compressedTexImage2D(gl.TEXTURE_2D, 0, ext.COMPRESSED_RGBA_BPTC_UNORM_EXT, w4, h4, 0, bytes.subarray(dataOffset, dataOffset + size));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    const fbTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fbTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w4, h4, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbTex, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.useProgram(prog);
    gl.uniform1i(gl.getUniformLocation(prog, 't'), 0);
    gl.viewport(0, 0, w4, h4);
    gl.disable(gl.BLEND);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const px = new Uint8Array(w4 * h4 * 4);
    gl.readPixels(0, 0, w4, h4, gl.RGBA, gl.UNSIGNED_BYTE, px); // rows come back in texel (file) order
    const out = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) out.set(px.subarray(y * w4 * 4, y * w4 * 4 + width * 4), y * width * 4);
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return out;
  }

  // -> { width, height, rgba:Uint8ClampedArray, label }
  function decode(input) {
    let bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (isDDS(bytes)) {
      const plain = unsplit(bytes);
      if (!plain) throw new Error('This .dds.split texture uses a format that cannot be rebuilt yet (BC1/BC4/BC5 split)');
      bytes = plain;
    }
    const header = parseHeader(bytes);
    let rgba;
    if (header.format === 'bc1' || header.format === 'bc2' || header.format === 'bc3') rgba = decodeBC(bytes, header, header.format);
    else if (header.format === 'bc7') rgba = decodeBC7(bytes, header);
    else rgba = decodeRaw(bytes, header);
    return { width: header.width, height: header.height, rgba, label: header.label, format: header.format, mips: header.mips };
  }

  return { decode, parseHeader, isDDS, unsplit };
});
