'use strict';
const assert = require('assert'); const fs = require('fs'); const os = require('os'); const path = require('path');
const { execFileSync } = require('child_process');
const S = require('../renderer/modschema.js'), G = require('../renderer/modgen.js');
const ref = (n) => ({ kind: 'file', path: '/x/' + n + '.png' });
const proj = S.newProject(); proj.meta.name = 'Cool Pack'; proj.meta.packageId = 'me.coolpack'; proj.meta.prefix = 'CP_';
const a = S.newItem('apparel'); a.label = 'Steel Duster';
a.sprites.worn = { south: ref('s'), east: ref('e'), north: ref('n') }; a.sprites.icon = { single: ref('i') };
a.customStats = [{ name: 'Souls', value: 2 }]; a.equipOffsets = [{ name: 'MoveSpeed', value: 0.2 }]; a.research = 'ComplexClothing';
a.workbenches = ['ElectricTailoringBench', 'MyModdedBench'];
const hat = S.newItem('apparel'); hat.label = 'Fancy Hat'; hat.wornAs = 'headgear-full'; hat.sprites.worn = { south: ref('hs'), east: ref('he'), north: ref('hn') };
const gun = S.newItem('weapon'); gun.label = 'Zap Gun'; gun.sprites.main = { single: ref('g') }; gun.drawSize = 1.2; gun.projectileCustom = 'Bullet_Modded';
const axe = S.newItem('weapon'); axe.mode = 'melee'; axe.label = 'Big Axe'; axe.sprites.main = { single: ref('ax') }; axe.craftable = false;
const hair = S.newItem('hair'); hair.label = 'Spiky'; hair.sprites.main = { south: ref('h1'), east: ref('h2'), north: ref('h3') };
const head = S.newItem('head'); head.defName = 'Round_Head'; head.sprites.main = { south: ref('d1'), east: ref('d2'), north: ref('d3') };
const body = S.newItem('body'); body.label = 'Stocky'; body.sprites.main = { single: ref('b') };
proj.items = [a, hat, gun, axe, hair, head, body];
const r = G.generate(proj);
assert.deepStrictEqual(r.errors, [], r.errors.join('\n'));
const paths = r.files.map((f) => f.path);
const has = (p) => assert.ok(paths.includes(p), 'missing ' + p);
has('About/About.xml'); has('Defs/ThingDefs_Apparel/Apparel_CP_SteelDuster.xml');
has('Textures/Things/Apparel/CoolPack/CP_SteelDuster.png'); has('Textures/Things/Apparel/CoolPack/CP_SteelDuster_Female_south.png');
has('Textures/Things/Apparel/CoolPack/CP_FancyHat_south.png');                 // hats have no body-type suffix
assert.ok(!paths.some((p) => /CP_FancyHat_(Male|Female)/.test(p)));
has('Textures/Things/Weapons/CoolPack/CP_ZapGun.png'); has('Textures/Things/Pawn/Humanlike/Hairs/CoolPack/CP_Spiky_south.png');
has('Textures/Things/Pawn/Humanlike/Heads/CoolPack/Round_Head_east.png'); has('Textures/Things/Pawn/Humanlike/Bodies/CoolPack/CP_Stocky_north.png');
const txt = (re) => r.files.find((f) => re.test(f.path)).text;
const ap = txt(/Apparel_CP_SteelDuster/);
assert.ok(/<li>MyModdedBench<\/li>/.test(ap) && /<researchPrerequisite>ComplexClothing/.test(ap) && /<Souls>2<\/Souls>/.test(ap) && /<MoveSpeed>0.2<\/MoveSpeed>/.test(ap));
assert.ok(/<li>FullHead<\/li>/.test(txt(/Apparel_CP_FancyHat/)), 'helmet covers the full head (hides hair)');
assert.ok(/<defaultProjectile>Bullet_Modded</.test(txt(/Weapon_CP_ZapGun/)) && /<drawSize>1.2</.test(txt(/Weapon_CP_ZapGun/)));
assert.ok(/ParentName="BaseWeapon"/.test(txt(/Weapon_CP_BigAxe/)) && !/recipeMaker/.test(txt(/Weapon_CP_BigAxe/)), 'non-craftable has no recipe');
assert.ok(/<headOffset>\(0,0.34\)/.test(txt(/Body_CP_Stocky/)));
assert.ok(/<supportedVersions>/.test(txt(/About\.xml/)));
// every XML file must be well-formed
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'modgen-'));
for (const f of r.files) if (f.text) fs.writeFileSync(path.join(dir, f.path.replace(/\//g, '__')), f.text);
execFileSync('python3', ['-I', '-c', 'import sys,glob,xml.dom.minidom as m\nfor p in glob.glob(sys.argv[1]+"/*.xml"): m.parse(p)\nprint("xml ok")', dir], { stdio: 'inherit' });
// validation
const bad = S.newProject(); bad.meta.packageId = 'nodots'; bad.meta.name = '';
const it1 = S.newItem('weapon'); it1.defName = '1bad name'; const it2 = S.newItem('apparel'); it2.label = 'Dup'; const it3 = S.newItem('apparel'); it3.label = 'Dup';
bad.items = [it1, it2, it3];
const e = G.generate(bad).errors.join('|');
assert.ok(/packageId/.test(e) && /needs a name/.test(e) && /not valid/.test(e) && /already uses/.test(e), e);
// warnings: no sprites
const w = G.generate({ meta: proj.meta, items: [S.newItem('apparel')] });
assert.ok(w.errors.some((x) => /needs a name/.test(x)));
const nospr = S.newItem('apparel'); nospr.label = 'Plain';
assert.ok(G.generate({ meta: proj.meta, items: [nospr] }).warnings.some((x) => /No worn sprite/.test(x.message)));
// two sprites to one path is refused
const c1 = S.newItem('hair'); c1.label = 'Same'; c1.defName = 'Same'; c1.sprites.main = { south: ref('1') }; const c2 = S.newItem('hair'); c2.label = 'Same'; c2.defName = 'Same'; c2.sprites.main = { south: ref('2') };
assert.ok(G.generate({ meta: proj.meta, items: [c1, c2] }).errors.length > 0);
console.log('modgen tests passed');
// 1.7 structure checks
{
  const hat = txt(/Apparel_CP_FancyHat/);
  assert.ok(/ParentName="HatMakeableBase"/.test(hat) || /ParentName="ApparelBase"/.test(hat), 'hat parent');
  assert.ok(/<layers>\s*<li>Overhead<\/li>/.test(hat), 'hat layer');
  assert.ok(!/<bodyTypes/.test(ap));
}
console.log('1.7 structure ok');
{
  const SCH = require('../renderer/modschema'), GEN = require('../renderer/modgen');
  const p = SCH.newProject(); const bd = SCH.newItem('beard'); bd.label = 'Wild Beard'; bd.sprites = { main: { south: 'a', east: 'b', north: 'c' } };
  p.items = [bd]; const rr = GEN.generate(p);
  const t = rr.files.find((f) => /BeardDefs/.test(f.path));
  assert.ok(t && /<BeardDef>/.test(t.text) && /<texPath>Things\/Pawn\/Humanlike\/Beards\//.test(t.text), 'beard def');
  assert.ok(rr.files.some((f) => /Beards\/MyMod\/WildBeard_east\.png$/.test(f.path)), 'beard sprites');
  console.log('beard modgen ok');
}

// plain-language checks
{
  const SC = require('../renderer/modschema.js'), GEN = require('../renderer/modgen.js');
  const p = SC.newProject(); const it = SC.newItem('apparel'); it.label = 'Checky';
  it.stats.ArmorRating_Sharp = 70; it.equipOffsets = [{ name: 'MoveSpeed', value: NaN }, { name: '', value: 1 }, { name: 'SocialImpact', value: 1 }, { name: 'SocialImpact', value: 2 }];
  it.workbenches = []; it.useStuff = true; it.stuffCategories = [];
  p.items.push(it); const r = GEN.generate(p); const m = r.warnings.map((w) => w.message).join('\n');
  for (const t of ['100× too high', 'no number', 'no entry chosen', 'listed twice', 'no workbench', 'no material category']) if (!m.includes(t)) { console.error('missing warning:', t, '\n' + m); process.exit(1); }
  console.log('plain-language checks ok');
}

// own XML box
{
  const SC = require('../renderer/modschema.js'), GEN = require('../renderer/modgen.js');
  const ok = GEN.checkXml('<comps>\n <li Class="X"><a>1</a></li>\n</comps>\n<!-- c -->'); if (!ok.ok || ok.tops.join() !== 'comps') { console.error('checkXml good', ok); process.exit(1); }
  for (const [t, re] of [['<a><b></a>', /Expected <\/b>/], ['<a>', /never closed/], ['</a>', /without an opening/], ['<a>x & y</a>', /&amp;/], ['<a>1 < 2</a>', /valid tag/]]) { const r = GEN.checkXml(t); if (r.ok || !re.test(r.error)) { console.error('checkXml bad', t, r); process.exit(1); } }
  const p = SC.newProject(); const it = SC.newItem('weapon'); it.label = 'Zap'; it.extraXml = '<comps><li Class="CompProperties_Glower"><glowRadius>3</glowRadius></li></comps>\n<tools/>';
  p.items.push(it); let r = GEN.generate(p); const xml = r.files.find((f) => /Weapon_/.test(f.path)).text;
  if (!/<!-- your own XML -->\s*<comps>/.test(xml) || !/<\/ThingDef>\s*<\/Defs>/.test(xml)) { console.error('own xml not inserted\n' + xml.slice(-500)); process.exit(1); }
  if (!r.warnings.some((w) => /already writes one/.test(w.message))) { console.error('duplicate warning missing'); process.exit(1); }
  it.extraXml = '<comps><li></comps>'; r = GEN.generate(p); if (!r.errors.some((e) => /your own XML is not valid/.test(e))) { console.error('invalid xml not reported'); process.exit(1); }
  console.log('own XML box ok');
}

// vanilla defName clash
{
  const SC = require('../renderer/modschema.js'), GEN = require('../renderer/modgen.js');
  const p = SC.newProject(); const it = SC.newItem('apparel'); it.label = 'Steel'; it.defName = 'Steel'; p.items.push(it);
  const r = GEN.generate(p); if (!r.errors.some((e) => /already has a Thing called "Steel"/.test(e))) { console.error('clash not reported', r.errors); process.exit(1); }
  it.defName = 'MyMod_Steel'; if (GEN.generate(p).errors.some((e) => /already has/.test(e))) { console.error('false clash'); process.exit(1); }
  console.log('vanilla clash check ok');
}
