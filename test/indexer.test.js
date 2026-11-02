'use strict';
const assert = require('assert');
const path = require('path');
const { execFileSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const idx = require('../lib/indexer');

const mk = (mode) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-' + mode + '-'));
  execFileSync('python3', ['-I', path.join(__dirname, 'make_fake_game.py'), d, mode], { stdio: 'ignore' });
  return d;
};
const structured = mk('structured'), flat = mk('flat'), defs = mk('defs');
const by = (r, cat) => r.entries.filter((e) => e.cat === cat);

// ---- structured tree -------------------------------------------------------
for (const input of [structured, path.join(structured, 'Data'), path.join(structured, 'Data', 'Core')]) {
  const roots = idx.resolveTextureRoots(input);
  assert.strictEqual(roots.length, 1, 'roots from ' + input);
  assert.strictEqual(roots[0].pack, 'Core');
}
assert.deepStrictEqual(idx.resolveTextureRoots(path.join(structured, 'nope')), []);

let r = idx.scan([structured]);
assert.strictEqual(by(r, 'bodies').length, 1, 'bodies');
assert.strictEqual(by(r, 'heads').length, 1, 'heads');
assert.strictEqual(by(r, 'hair').length, 2, 'hair');
assert.strictEqual(by(r, 'apparel').length, 1, 'apparel');
assert.strictEqual(by(r, 'weapons').length, 1, 'weapons');
assert.deepStrictEqual(Object.keys(by(r, 'bodies')[0].facings).sort(), ['east', 'north', 'south']);
assert.ok(by(r, 'weapons')[0].facings.single, 'weapon is a single texture');
assert.strictEqual(r.bodyTypes.length, 2);
assert.deepStrictEqual(r.bodyTypes[0].headOffset, [0, 0.34]);

// ---- flat extraction dump (no folders) ---------------------------------------
r = idx.scan([path.join(flat, 'Texture2D')]);
assert.strictEqual(by(r, 'bodies').length, 1, 'flat bodies by name');
assert.strictEqual(by(r, 'heads').length, 1, 'flat heads by name');
assert.strictEqual(by(r, 'apparel').length, 1, 'flat apparel by keyword');
assert.strictEqual(by(r, 'weapons').length, 1, 'flat weapon by keyword');
assert.strictEqual(by(r, 'other').length, 1, 'unrecognised hair falls back to Other');
assert.strictEqual(r.bodyTypes.length, 0);
// choosing the parent folder of the dump works too
assert.strictEqual(idx.scan([flat]).entries.length, r.entries.length);

// ---- install with only XML + a flat dump, as on a real install -------------------
r = idx.scan([defs, path.join(flat, 'Texture2D')]);
assert.strictEqual(r.bodyTypes.length, 2, 'body types come from the install folder');
assert.ok(r.entries.length >= 5, 'sprites come from the dump');
assert.strictEqual(r.roots.length, 1, 'only the dump has images');

// ---- edge cases ---------------------------------------------------------------
assert.strictEqual(idx.scan([]).valid.length, 0);
assert.strictEqual(idx.scan([path.join(os.tmpdir(), 'does-not-exist-xyz')]).valid.length, 0);
r = idx.scan([flat, flat]);               // same folder twice must not crash or lose items
assert.ok(r.entries.length > 0);
assert.strictEqual(new Set(r.roots.map((x) => x.pack)).size, r.roots.length, 'pack ids are unique');

// ---- categories by name alone ----------------------------------------------------
assert.strictEqual(idx.categorize('Naked_Female'), 'bodies');
assert.strictEqual(idx.categorize('Female_Narrow_Pointy'), 'heads');
assert.strictEqual(idx.categorize('Things/Pawn/Humanoid/Hairs/Mop'), 'hair');
assert.strictEqual(idx.categorize('Duster'), 'apparel');
assert.strictEqual(idx.categorize('Longsword'), 'weapons');
assert.strictEqual(idx.categorize('Steel'), 'other');

// ---- sibling facings -----------------------------------------------------------
const f = path.join(flat, 'Texture2D', 'Naked_Male_east.png');
assert.deepStrictEqual(Object.keys(idx.siblingFacings(f)).sort(), ['east', 'north', 'south']);

// ---- ".png.dds" naming, as found in the game files ------------------------------------
const touch = (p) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, 'x'); };
const dds = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-dds-'));
for (const f of ['south', 'east', 'north']) {
  touch(path.join(dds, `Naked_Female_${f}.png.dds`));
  touch(path.join(dds, `Female_Narrow_Pointy_${f}.png.dds`));
  touch(path.join(dds, `Mystery_${f}.png.dds`));
}
touch(path.join(dds, 'Naked_Female_south.png'));                 // a PNG twin of one DDS file
touch(path.join(dds, 'Revolver.png.dds'));
r = idx.scan([dds]);
const nf = r.entries.find((e) => e.base === 'Naked_Female');
assert.ok(nf, 'Naked_Female grouped from .png.dds names');
assert.deepStrictEqual(Object.keys(nf.facings).sort(), ['east', 'north', 'south']);
assert.ok(/\.png$/.test(nf.facings.south), 'PNG preferred over its DDS twin');
assert.ok(/\.png\.dds$/.test(nf.facings.east), 'DDS used when there is no PNG');
assert.strictEqual(nf.cat, 'bodies');
assert.strictEqual(r.entries.find((e) => e.base === 'Female_Narrow_Pointy').cat, 'heads');
assert.strictEqual(r.entries.find((e) => e.base === 'Revolver').cat, 'weapons');
assert.strictEqual(idx.stripImgExt('A_south.png.dds'), 'A_south');
assert.strictEqual(idx.stripImgExt('A_south.dds'), 'A_south');
assert.strictEqual(idx.stripImgExt('A_south.PNG'), 'A_south');
assert.strictEqual(idx.stripImgExt('None_Average_Skull_east.psd.dds'), 'None_Average_Skull_east');
assert.strictEqual(idx.groupPaths(['/x/None_Average_Skull_east.psd.dds'])[0].name, 'None_Average_Skull');

// ---- per-folder category override -----------------------------------------------------
r = idx.scan([{ path: dds, category: 'hair' }]);
assert.ok(r.entries.length >= 3 && r.entries.every((e) => e.cat === 'hair'), 'every sprite takes the folder category');
assert.ok(r.entries.find((e) => e.base === 'Mystery'), 'unrecognised names are kept when a category is set');
assert.ok(r.entries.find((e) => e.base === 'Revolver'), 'single textures are kept too');
assert.strictEqual(r.sourceInfo[0].category, 'hair');
// category survives an unknown value
assert.strictEqual(idx.scan([{ path: dds, category: 'bogus' }]).sourceInfo[0].category, 'auto');
// the same folder can be added twice with different categories
r = idx.scan([{ path: dds, category: 'heads' }, { path: dds, category: 'hair' }]);
assert.strictEqual(new Set(r.roots.map((x) => x.pack)).size, 2, 'unique pack ids');
assert.strictEqual(r.entries.filter((e) => e.cat === 'heads').length > 0 && r.entries.filter((e) => e.cat === 'hair').length > 0, true);

// ---- big auto folders drop unrecognised single images (UI art etc.) ------------------------
const big = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-big-'));
for (let i = 0; i < 450; i++) touch(path.join(big, `UIJunk${i}.png`));
touch(path.join(big, 'LoadingScreen.png'));
for (const f of ['south', 'east', 'north']) touch(path.join(big, `Naked_Male_${f}.png`));
r = idx.scan([big]);
assert.deepStrictEqual(r.entries.map((e) => e.base), ['Naked_Male'], 'junk singles dropped, real sprites kept');
r = idx.scan([{ path: big, category: 'other' }]);
assert.ok(r.entries.length > 400, 'an explicit category keeps everything');

// ---- genes category -----------------------------------------------------------------------
assert.strictEqual(idx.categorize('Things/Pawn/Humanoid/Genes/FoxTail'), 'genes');
assert.strictEqual(idx.categorize('CatEars'), 'genes');
assert.strictEqual(idx.categorize('DemonHorns'), 'genes');

// ---- choosing several files at once -----------------------------------------------------------
const pick = [path.join(dds, 'Naked_Female_east.png.dds'), path.join(dds, 'Mystery_south.png.dds'), path.join(dds, 'Mystery_north.png.dds')];
const groups = idx.groupPaths(pick);
assert.strictEqual(groups.length, 2, 'files of the same sprite collapse into one group');
const g1 = groups.find((g) => g.name === 'Naked_Female');
assert.deepStrictEqual(Object.keys(g1.facings).sort(), ['east', 'north', 'south'], 'missing facings are found next to the chosen file');
assert.deepStrictEqual(Object.keys(groups.find((g) => g.name === 'Mystery').facings).sort(), ['east', 'north', 'south']);
assert.deepStrictEqual(idx.groupPaths(['/nope/readme.txt']), [], 'non-images ignored');

// ---- real 1.7 apparel layout: icon + facings, and one sprite set per body type ---------------------
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'apparel-'));
  const put = (rel) => { const f = path.join(d, 'Apparel', rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, 'x'); };
  for (const n of ['AdvancedHelmet.psd.dds', 'AdvancedHelmet_south.png.dds', 'AdvancedHelmet_east.png.dds', 'AdvancedHelmet_north.png.dds']) put('AdvancedHelmet/' + n);
  put('Parka/Parka.psd.dds');
  for (const b of ['Male', 'Female', 'Thin', 'Hulk', 'Fat']) for (const f of ['south', 'east', 'north']) put('Parka/Parka_' + b + '_' + f + '.png.dds');
  const res = idx.scan([{ path: d, category: 'apparel' }]);
  const helm = res.entries.find((e) => e.base.endsWith('AdvancedHelmet/AdvancedHelmet'));
  assert.ok(helm && helm.icon && !helm.facings.single, 'icon is not a facing');
  assert.ok(helm.facings.south && helm.facings.east && helm.facings.north, 'helmet keeps its 3 facings');
  const parka = res.entries.filter((e) => /Parka/.test(e.base));
  assert.strictEqual(parka.length, 1, 'body variants merged into one entry');
  assert.deepStrictEqual(parka[0].variantNames, ['Male', 'Fat', 'Female', 'Hulk', 'Thin']);
  assert.ok(parka[0].icon && /Parka\.psd\.dds$/.test(parka[0].icon), 'parka icon kept');
  assert.ok(/Parka_Male_south/.test(parka[0].facings.south), 'default variant is Male');
  assert.ok(/Parka_Female_east/.test(parka[0].variants.Female.east));
  const bodies = idx.scan([{ path: d, category: 'bodies' }]);   // bodies are never merged
  assert.ok(bodies.entries.length >= 6, 'non-apparel not merged');
}

// ---- app library folders: apparel-body / apparel-head give a slot hint, library sources are flagged ------------------
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'lib-'));
  const put = (rel) => { const f = path.join(d, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, 'x'); };
  for (const f of ['south', 'east', 'north']) { put('Apparel-Head/Cap_' + f + '.png'); put('Apparel-Body/Coat_' + f + '.png'); }
  const res = idx.scan([{ path: path.join(d, 'Apparel-Head'), category: 'apparel-head', library: true }, { path: path.join(d, 'Apparel-Body'), category: 'apparel-body', library: true }, { path: path.join(d, 'Empty'), category: 'genes', library: true }]);
  const cap = res.entries.find((e) => /Cap$/.test(e.base)), coat = res.entries.find((e) => /Coat$/.test(e.base));
  assert.ok(cap && cap.cat === 'apparel' && cap.slot === 'headgear', 'head folder -> headgear slot');
  assert.ok(coat && coat.cat === 'apparel' && coat.slot === 'torso', 'body folder -> torso slot');
  assert.ok(res.sourceInfo.every((i) => i.library), 'library flag kept');
}

// ---- presets.json + the built-in starter pack ----------------------------------------------------
const starter = path.join(__dirname, 'fixtures', 'Starter');
if (fs.existsSync(starter)) {
  r = idx.scan([{ path: starter, builtin: true }]);
  assert.strictEqual(r.entries.length, 25, 'starter sprite groups (body variants merged)');
  assert.ok(r.bodyTypes.some((b) => b.defName === 'Starter_Male' && b.headOffset[1] > 0.3), 'starter body types');
  assert.ok(r.presets['Things/Apparel/Starter_Helmet'].hidesHair === true, 'presets loaded');
  for (const cat of ['bodies', 'heads', 'hair', 'apparel', 'weapons', 'genes']) assert.ok(r.entries.some((e) => e.cat === cat), 'starter has ' + cat);
  for (const e of r.entries) if (e.cat !== 'weapons') assert.ok(e.facings.south && e.facings.east && e.facings.north, e.base + ' has all facings');
}

console.log('indexer tests passed');
