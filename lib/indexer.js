'use strict';
// Finds sprites and body types in one or more folders. Pure Node (no Electron) so it can be tested.
//
// Vanilla RimWorld keeps much of its art packed or converted (e.g. "Naked_Female_south.png.dds"), and extraction
// tools often write FLAT folders. So a folder can be:
//   - a game/mod folder with a real "Textures/Things/..." tree
//   - any folder of sprites (PNG, JPG or DDS), flat or nested
//   - a game folder with "Defs" XML, used for body types / head offsets
// Each folder may also be given a category by the user (body, head, hair...). That overrides guessing.

const fs = require('fs');
const path = require('path');

const IMG_RE = /\.(png|jpe?g|dds(\.split)?)$/i;
const EXT_STRIP_RE = /(\.(png|jpe?g|psd|tga|tiff?|bmp|dds|split))+$/i; // "A_south.png.dds" -> "A_south"
const FACING_RE = /^(.*)_(south|east|north|west)$/i;
const FACINGS = ['south', 'east', 'north', 'west'];
const DEFAULT_BODY_NAMES = ['Male', 'Female', 'Thin', 'Hulk', 'Fat'];
const MAX_FILES = 150000;
const SKIP_DIRS = new Set(['node_modules', '.git', '__pycache__', '$recycle.bin']);
const CATEGORIES = ['auto', 'bodies', 'heads', 'hair', 'beards', 'apparel', 'apparel-body', 'apparel-head', 'weapons', 'genes', 'other'];

const isDir = (p) => {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
};
const stripImgExt = (name) => name.replace(EXT_STRIP_RE, '');
const isDds = (name) => /\.dds(\.split)?$/i.test(name);

function defaultGameDirs() {
  const dirs = [];
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const pf = process.env['ProgramFiles'] || 'C:\\Program Files';
  for (const base of [pf86, pf, ...'CDEFGH'.split('').map((l) => l + ':\\')]) {
    dirs.push(path.join(base, 'Steam', 'steamapps', 'common', 'RimWorld'));
    dirs.push(path.join(base, 'SteamLibrary', 'steamapps', 'common', 'RimWorld'));
  }
  const home = process.env.HOME;
  if (home) {
    dirs.push(path.join(home, '.local/share/Steam/steamapps/common/RimWorld'));
    // Steam installed as a Flatpak (common on Bazzite / Steam Deck style systems)
    dirs.push(path.join(home, '.var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps/common/RimWorld'));
    dirs.push(path.join(home, '.var/app/com.valvesoftware.Steam/data/Steam/steamapps/common/RimWorld'));
    dirs.push(path.join(home, 'Library/Application Support/Steam/steamapps/common/RimWorld'));
  }
  return dirs;
}

// ---- structured "Textures/Things" trees ---------------------------------------------------
function searchDirsNamed(dir, name, depth, out, mustContain) {
  if (depth < 0 || !isDir(dir)) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (!e.isDirectory() || SKIP_DIRS.has(e.name.toLowerCase())) continue;
    const full = path.join(dir, e.name);
    if (e.name.toLowerCase() === name) {
      if (!mustContain || isDir(path.join(full, mustContain))) out.push(full);
      continue; // never descend into the match itself
    }
    searchDirsNamed(full, name, depth - 1, out, mustContain);
  }
}

// Accepts an install folder, its Data folder, one pack (Core) or a Textures folder.
function resolveTextureRoots(input) {
  if (!input || !isDir(input)) return [];
  const found = [];
  if (path.basename(input).toLowerCase() === 'textures' && isDir(path.join(input, 'Things'))) found.push(input);
  else searchDirsNamed(input, 'textures', 3, found, 'Things');
  const seen = new Set();
  return found
    .filter((r) => (seen.has(r) ? false : (seen.add(r), true)))
    .map((root) => ({ pack: path.basename(path.dirname(root)), root, packDir: path.dirname(root) }))
    .sort((a, b) => (a.pack === 'Core' ? -1 : b.pack === 'Core' ? 1 : a.pack.localeCompare(b.pack)));
}

function walk(dir, base, out, state) {
  if (state && state.truncated) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (state && out.length >= MAX_FILES) {
      state.truncated = true;
      return;
    }
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name.toLowerCase())) walk(full, base + e.name + '/', out, state);
    } else if (IMG_RE.test(e.name)) out.push(base + e.name);
  }
}

// ---- categories -------------------------------------------------------------------
const APPAREL_RE =
  /(shirt|pants|jacket|duster|parka|\bhat\b|helmet|armou?r|vest|cape|cowboy|tribal|robe|dress|coat|scarf|mask|goggles|shades|belt|corset|skirt|tunic|boots|gloves|hood|cloak|\bcap\b|crown|circlet|bandana|beret|turban|flak|bowler|tophat|slicker|kimono|bodysuit|jumpsuit|toga|poncho)/i;
const WEAPON_RE =
  /(revolver|pistol|rifle|shotgun|\bsmg\b|minigun|launcher|flamethrower|\bbow\b|longbow|sword|knife|spear|mace|\bclub\b|\baxe\b|lance|gladius|rapier|katana|blade|sniper|\blmg\b|machinegun|thump|autocannon|pila|javelin|hammer|molotov|grenade|doomsday)/i;
const GENE_RE = /(tail|ears?(\b|_)|horns?|wings?|antler|fur\b|scales?|markings?)/i;
const HEAD_NAME_RE = /^(male|female|thin|hulk|fat)?_?(average|narrow)_(normal|pointy|wide|long|round|oval)/i;

function categorize(base) {
  const l = '/' + base.toLowerCase();
  const name = l.split('/').pop();
  if (l.includes('/bodies/') || /^(starter_)?naked_(male|female|thin|hulk|fat)/.test(name)) return 'bodies';
  if (l.includes('/heads/') || HEAD_NAME_RE.test(name) || /^starter_(average|narrow)_/.test(name)) return 'heads';
  if (l.includes('/beards/') || /^(starter_)?beard/.test(name)) return 'beards';
  if (l.includes('/hairs/') || l.includes('/hair/')) return 'hair';
  if (
    l.includes('/genes/') ||
    l.includes('/tails/') ||
    l.includes('/ears/') ||
    l.includes('/horns/') ||
    l.includes('/bodyattachments/') ||
    l.includes('/headattachments/')
  )
    return 'genes';
  if (l.includes('/apparel/')) return 'apparel';
  if (l.includes('/equipment/') || l.includes('/weapon')) return 'weapons';
  if (GENE_RE.test(name)) return 'genes';
  if (APPAREL_RE.test(name)) return 'apparel';
  if (WEAPON_RE.test(name)) return 'weapons';
  return 'other';
}

// Group "X_south / X_east / X_north / X_west" files (any of .png, .jpg, .dds, .png.dds) into one entry.
function groupFiles(files, pack, opts) {
  const o = opts || {};
  const groups = new Map();
  for (const rel of files) {
    const noExt = stripImgExt(rel);
    const m = FACING_RE.exec(noExt);
    const base = m ? m[1] : noExt;
    const facing = m ? m[2].toLowerCase() : 'single';
    let g = groups.get(base);
    if (!g) {
      const forcedCat = o.category && o.category !== 'auto' ? o.category : null;
      // "apparel-body" / "apparel-head" folders are apparel with a known slot (torso or headgear)
      g = { pack, base, cat: forcedCat ? (forcedCat.startsWith('apparel-') ? 'apparel' : forcedCat) : categorize(base), facings: {} };
      if (forcedCat === 'apparel-body') g.slot = 'torso';
      else if (forcedCat === 'apparel-head') g.slot = 'headgear';
      groups.set(base, g);
    }
    const have = g.facings[facing];
    if (!have || (isDds(have) && !isDds(rel))) g.facings[facing] = rel; // prefer a real PNG over its DDS twin
  }
  const out = [];
  for (const g of groups.values()) {
    const forced = o.category && o.category !== 'auto';
    // A thumbnail/icon (no direction suffix) next to real facings is NOT a facing: keep it aside as `icon`.
    if (g.facings.single && FACINGS.some((f) => g.facings[f])) {
      g.icon = g.facings.single;
      delete g.facings.single;
    }
    if (!(g.cat === 'weapons' || g.facings.south || g.facings.single || FACINGS.some((f) => g.facings[f]) || forced)) continue;
    if (!forced && o.dropUnknownSingles && g.cat === 'other' && g.facings.single) continue;
    out.push(g);
  }
  return out;
}

// Body-shaped apparel ships one sprite set per body type: "Parka_Female_south", "Parka_Fat_east"... plus an icon "Parka".
// Merge them into ONE entry "Parka" with `variants: { Female: {facings}, ... }`, `icon`, and the default variant's `facings`.
function mergeVariants(entries, bodyNames) {
  const names = new Map();
  for (const n of [...DEFAULT_BODY_NAMES, ...(bodyNames || [])]) names.set(n.toLowerCase(), n);
  const byKey = new Map(entries.map((e) => [e.pack + '|' + e.base, e]));
  const parents = new Map(); // key -> { pack, base, cat, variants, members }
  for (const e of entries) {
    if (e.cat !== 'apparel') continue;
    const stem = e.base.split('/').pop();
    const i = stem.lastIndexOf('_');
    if (i <= 0) continue;
    const bn = names.get(stem.slice(i + 1).toLowerCase());
    if (!bn || !FACINGS.some((f) => e.facings[f])) continue;
    const parentBase = e.base.slice(0, e.base.length - stem.length) + stem.slice(0, i);
    const key = e.pack + '|' + parentBase;
    let p = parents.get(key);
    if (!p) {
      p = { pack: e.pack, base: parentBase, cat: e.cat, variants: {}, members: [] };
      parents.set(key, p);
    }
    p.variants[bn] = { ...e.facings };
    if (e.icon && !p.icon) p.icon = e.icon;
    p.members.push(e);
  }
  const drop = new Set();
  const added = [];
  for (const [key, p] of parents) {
    const existing = byKey.get(key);
    if (existing && FACINGS.some((f) => existing.facings[f])) continue; // the plain name is a real item: leave alone
    if (!existing && !p.icon && Object.keys(p.variants).length < 2) continue; // lone "Foo_Fat": probably not a body variant
    if (existing) {
      drop.add(existing);
      if (existing.facings.single) p.icon = existing.facings.single;
      else if (existing.icon) p.icon = existing.icon;
    }
    for (const m of p.members) drop.add(m);
    const order = Object.keys(p.variants).sort((a, b) => (a === 'Male' ? -1 : b === 'Male' ? 1 : a.localeCompare(b)));
    const slot = (p.members.find((m) => m.slot) || {}).slot;
    added.push({
      pack: p.pack,
      base: p.base,
      cat: p.cat,
      ...(slot ? { slot } : {}),
      facings: { ...p.variants[order[0]] },
      variants: p.variants,
      variantNames: order,
      defaultVariant: order[0],
      icon: p.icon || null,
    });
  }
  return entries.filter((e) => !drop.has(e)).concat(added);
}

// Structured trees: only the folders that matter for pawn / equipment sprites.
function indexTextures(roots) {
  const entries = [];
  for (const r of roots) {
    const files = [];
    for (const sub of ['Things/Pawn', 'Things/Item/Equipment', 'Things/Apparel']) {
      const dir = path.join(r.root, ...sub.split('/'));
      if (isDir(dir)) walk(dir, sub + '/', files, null);
    }
    entries.push(...groupFiles(files, r.pack));
  }
  entries.sort((a, b) => a.base.localeCompare(b.base));
  return entries;
}

// ---- body types ------------------------------------------------------------------
function parseBodyTypes(text, seen, out) {
  const re = /<BodyTypeDef[^>]*>([\s\S]*?)<\/BodyTypeDef>/g;
  let m;
  while ((m = re.exec(text))) {
    const body = m[1];
    const name = (/<defName>\s*([^<\s]+)\s*<\/defName>/.exec(body) || [])[1];
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const graphic = (/<bodyNakedGraphicPath>\s*([^<\s]+)\s*</.exec(body) || [])[1] || null;
    const ho = /<headOffset>\s*\(?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)/.exec(body);
    const off = ho ? [parseFloat(ho[1]), parseFloat(ho[2])] : null;
    out.push({ defName: name, bodyNakedGraphicPath: graphic, headOffset: off && off.every(Number.isFinite) ? off : null });
  }
}

function readBodyTypesFromDir(dir, seen, out) {
  const defsDirs = [];
  if (path.basename(dir).toLowerCase() === 'defs') defsDirs.push(dir);
  else searchDirsNamed(dir, 'defs', 3, defsDirs, null);
  for (const d of defsDirs) {
    (function collect(x) {
      let es;
      try {
        es = fs.readdirSync(x, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of es) {
        const f = path.join(x, e.name);
        if (e.isDirectory()) collect(f);
        else if (/\.xml$/i.test(e.name) && /BodyType/i.test(f)) {
          let text;
          try {
            text = fs.readFileSync(f, 'utf8');
          } catch {
            continue;
          }
          parseBodyTypes(text, seen, out);
        }
      }
    })(d);
  }
}

// Kept for older callers/tests: body types from the pack folders next to the texture roots.
function readBodyTypes(roots) {
  const out = [];
  const seen = new Set();
  for (const r of roots) readBodyTypesFromDir(r.packDir, seen, out);
  return out;
}

// ---- main entry: scan several folders ---------------------------------------------
// sources: array of path strings, or { path, category, builtin }
function scan(sources) {
  const roots = [],
    entries = [],
    bodyTypes = [],
    notes = [],
    sourceInfo = [];
  const presets = {},
    seenBT = new Set(),
    usedPacks = new Set();
  const uniq = (n) => {
    let k = n,
      i = 2;
    while (usedPacks.has(k)) k = n + '#' + i++;
    usedPacks.add(k);
    return k;
  };
  const list = (sources || []).map((s) => (typeof s === 'string' ? { path: s, category: 'auto' } : s)).filter((s) => s && s.path);
  const valid = [];

  for (const src of list) {
    const dir = src.path;
    const category = CATEGORIES.includes(src.category) ? src.category : 'auto';
    const info = { path: dir, category, builtin: !!src.builtin, library: !!src.library, exists: isDir(dir), kind: 'missing', entries: 0, images: 0 };
    sourceInfo.push(info);
    if (!info.exists) continue;
    valid.push(dir);
    try {
      Object.assign(presets, JSON.parse(fs.readFileSync(path.join(dir, 'presets.json'), 'utf8')));
    } catch {
      /* none */
    }
    readBodyTypesFromDir(dir, seenBT, bodyTypes);

    const structured = category === 'auto' ? resolveTextureRoots(dir) : [];
    if (structured.length) {
      for (const r of structured) r.pack = uniq(r.pack);
      roots.push(...structured.map((r) => ({ pack: r.pack, root: r.root })));
      const found = indexTextures(structured);
      entries.push(...found);
      info.kind = 'structured';
      info.entries = found.length;
      for (const r of structured) {
        // optional presets.json next to the Textures folder
        try {
          Object.assign(presets, JSON.parse(fs.readFileSync(path.join(r.packDir, 'presets.json'), 'utf8')));
        } catch {
          /* none */
        }
      }
    } else {
      const files = [];
      const state = { truncated: false };
      walk(dir, '', files, state);
      info.images = files.length;
      const pack = uniq(path.basename(dir) || dir);
      if (files.length) {
        roots.push({ pack, root: dir });
        // In a big auto-detected folder, loose images with no recognisable type (UI art, items) are just noise.
        const found = groupFiles(files, pack, { category, dropUnknownSingles: category === 'auto' && files.length > 400 });
        entries.push(...found);
        info.kind = 'flat';
        info.entries = found.length;
        if (state.truncated) notes.push('Very large folder: only the first ' + MAX_FILES + ' images were indexed.');
      } else {
        info.kind = 'defs-only';
      }
    }
  }
  const merged = mergeVariants(
    entries,
    bodyTypes.map((b) => b.defName),
  );
  merged.sort((a, b) => a.base.localeCompare(b.base));
  return { valid, roots, entries: merged, bodyTypes, notes, presets, sourceInfo };
}

// Given any image path, find sibling _south/_east/_north/_west files in the same folder.
function siblingFacings(file) {
  const dir = path.dirname(file);
  const stem = stripImgExt(path.basename(file));
  const m = FACING_RE.exec(stem);
  if (!m) return { single: file };
  const res = {};
  let names = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return { [m[2].toLowerCase()]: file };
  }
  for (const f of names) {
    if (!IMG_RE.test(f)) continue;
    const fm = FACING_RE.exec(stripImgExt(f));
    if (!fm || fm[1].toLowerCase() !== m[1].toLowerCase()) continue;
    const k = fm[2].toLowerCase();
    if (!res[k] || (isDds(res[k]) && !isDds(f))) res[k] = path.join(dir, f);
  }
  return res;
}

// Several chosen files -> one group per sprite, each with all its facings (siblings are found automatically).
function groupPaths(paths) {
  const groups = new Map();
  for (const p of paths || []) {
    if (typeof p !== 'string' || !IMG_RE.test(p)) continue;
    const stem = stripImgExt(path.basename(p));
    const m = FACING_RE.exec(stem);
    const name = m ? m[1] : stem;
    const key = path.dirname(p) + '|' + name.toLowerCase();
    if (groups.has(key)) continue;
    groups.set(key, { name, facings: siblingFacings(p) });
  }
  return [...groups.values()];
}

module.exports = {
  defaultGameDirs,
  resolveTextureRoots,
  indexTextures,
  readBodyTypes,
  siblingFacings,
  groupPaths,
  categorize,
  scan,
  groupFiles,
  stripImgExt,
  mergeVariants,
  CATEGORIES,
};
