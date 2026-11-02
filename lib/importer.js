'use strict';
// Imports the game's own art into the app's Library folders. Finds Assets.zip (Core: in the game folder; DLCs: Data/<DLC>/Assets.zip),
// copies only the sprites the viewer uses (bodies, heads, hair, beards, apparel, weapons, genes) and renames "X.png.dds.split" to "X.png.dds"
// (BC7 ".split" files are rebuilt into ordinary DDS, checked on real samples; BC1/BC4/BC5 splits are skipped).
const fs = require('fs');
const path = require('path');
const DDS = require('../renderer/dds');
const { openZip, METHODS, supported } = require('./zipread');

let SLOTS = {};
try {
  SLOTS = require('./apparel_slots.json');
} catch {
  SLOTS = {};
}
const HEAD_RE = /(helmet|hat|hood|cap|mask|crown|headset|tiara|veil|beret|bandana|goggles|eyepatch|visor|halo|turban|wig|headdress|circlet)/i;
const isDir = (p) => {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
};
const isFile = (p) => {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
};

// archives: [{ name, file }]. The user may pick the game folder, its Data folder, or a folder holding several installs.
function findArchives(dir) {
  const out = [],
    seen = new Set();
  const add = (name, file) => {
    if (isFile(file) && !seen.has(file)) {
      seen.add(file);
      out.push({ name, file });
    }
  };
  const tryGame = (g) => {
    add('Core', path.join(g, 'Assets.zip'));
    const data = path.join(g, 'Data');
    if (isDir(data)) for (const d of fs.readdirSync(data)) add(d, path.join(data, d, 'Assets.zip'));
  };
  tryGame(dir);
  if (!out.length && path.basename(dir).toLowerCase() === 'data') {
    tryGame(path.dirname(dir));
  }
  if (!out.length)
    for (const d of isDir(dir) ? fs.readdirSync(dir) : []) {
      const g = path.join(dir, d);
      if (isDir(g) && /rimworld/i.test(d)) tryGame(g);
    }
  return out;
}

const GENE_DIRS = ['things/pawn/humanlike/bodyattachments/', 'things/pawn/humanlike/headattachments/'];
const RULES = [
  ['things/pawn/humanlike/bodies/', 'Bodies'],
  ['things/pawn/humanlike/heads/', 'Heads'],
  ['things/pawn/humanlike/hairs/', 'Hair'],
  ['things/pawn/humanlike/beards/', 'Beards'],
  ['things/item/equipment/', 'Weapons'],
];

// -> { folder, rel } (rel = path inside the Library folder, normalised name) or null for entries we do not want
function classify(name) {
  const p = name.replace(/\\/g, '/');
  const m = /^(?:Resources\/)?Textures\/(.+)$/i.exec(p);
  if (!m) return null;
  let rest = m[1];
  if (!/\.dds(\.split)?$/i.test(rest)) return null;
  if (/_(north|east|south|west)m\.[^/]*$/i.test(rest)) return null; // colour masks, not sprites
  const low = rest.toLowerCase();
  const norm = (r) => r.replace(/\.split$/i, '').replace(/\.(psd|jpe?g|tga)\.dds$/i, '.png.dds');
  for (const g of GENE_DIRS) if (low.startsWith(g)) return { folder: 'Genes', rel: norm(rest.slice(g.length)) };
  for (const [pre, folder] of RULES) if (low.startsWith(pre)) return { folder, rel: norm(rest.slice(pre.length)) };
  const ap = 'things/pawn/humanlike/apparel/';
  if (low.startsWith(ap)) {
    const sub = rest.slice(ap.length),
      parts = sub.split('/');
    const item = (parts.length > 1 ? parts[0] : parts[0].replace(/(_(north|east|south|west))?\.[^.]*\.dds(\.split)?$/i, '')).toLowerCase();
    const slot = SLOTS[item] || (HEAD_RE.test(item) ? 'head' : 'body');
    return { folder: slot === 'head' ? 'Apparel-Head' : 'Apparel-Body', rel: norm(sub) };
  }
  return null;
}

// libDir = <app>/Library. onProgress({ phase, archive, done, total }). Existing files are left alone unless overwrite is set.
async function importAssets({ gameDir, libDir, onProgress, overwrite }) {
  const archives = findArchives(gameDir);
  const res = { archives: archives.map((a) => a.name), imported: {}, skipped: 0, errors: [], total: 0 };
  if (!archives.length) return res;
  const jobs = [];
  for (const a of archives) {
    let z;
    try {
      z = openZip(a.file);
    } catch (e) {
      res.errors.push(`${a.name}: ${e.message}`);
      continue;
    }
    const list = [],
      bad = {};
    for (const en of z.entries) {
      if (en.dir) continue;
      const c = classify(en.name);
      if (!c) continue;
      if (!supported(en.method)) {
        bad[en.method] = (bad[en.method] || 0) + 1;
        continue;
      }
      list.push({ en, c });
    }
    for (const [m, n] of Object.entries(bad))
      res.errors.push(`${a.name}: ${n} file(s) use compression method ${m} (${METHODS[m] || 'unknown'}), which this version cannot read`);
    res.methods = res.methods || {};
    for (const en of z.entries) if (!en.dir && classify(en.name)) res.methods[en.method] = (res.methods[en.method] || 0) + 1;
    jobs.push({ a, z, list });
    res.total += list.length;
  }
  let done = 0;
  for (const { a, z, list } of jobs) {
    try {
      for (const { en, c } of list) {
        const dest = path.join(libDir, c.folder, ...c.rel.split('/'));
        done++;
        if (!overwrite && isFile(dest)) {
          res.skipped++;
        } else {
          try {
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            let buf = z.read(en);
            if (/\.split$/i.test(en.name)) {
              const plain = DDS.unsplit(new Uint8Array(buf.buffer, buf.byteOffset, buf.length));
              if (!plain) {
                res.unsupported = (res.unsupported || 0) + 1; // BC1/BC4/BC5 splits are not rebuilt yet
                continue;
              }
              buf = Buffer.from(plain.buffer, plain.byteOffset, plain.length);
            }
            fs.writeFileSync(dest, buf);
            res.imported[c.folder] = (res.imported[c.folder] || 0) + 1;
          } catch (e) {
            if (res.errors.length < 20) res.errors.push(`${a.name}: ${en.name}: ${e.message}`);
            res.failed = (res.failed || 0) + 1;
          }
        }
        if (done % 100 === 0) {
          if (onProgress) onProgress({ phase: 'copy', archive: a.name, done, total: res.total });
          await new Promise((r) => setImmediate(r));
        }
      }
    } finally {
      z.close();
    }
  }
  if (onProgress) onProgress({ phase: 'done', done, total: res.total });
  return res;
}
module.exports = { importAssets, findArchives, classify };
