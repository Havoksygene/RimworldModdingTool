'use strict';
// Wall and booster (facility) generation. usage: node test/walls_check.js
const assert = require('assert');
global.window = global;
const SC = require('../renderer/modschema.js'),
  GEN = require('../renderer/modgen.js');
const sp = { single: { kind: 'file', id: 'x' } };
const P = SC.newProject();
P.meta.name = 'WallMod';
P.meta.prefix = 'WM_';
const mk = (type, o) => Object.assign(SC.newItem(type), o);
const wall = mk('building', { label: 'Test Wall', preset: 'wall' });
SC.applyBuildPreset(wall);
wall.sprites = { atlas: sp };
const wall2 = mk('building', {
  label: 'Look Wall',
  preset: 'wall',
  wallLooks: true,
  linkStyle: 'Basic',
  customStats: [{ name: 'Beauty', value: 2 }],
});
SC.applyBuildPreset(wall2);
wall2.sprites = { atlas: sp, atlasBricks: sp };
const bench = mk('building', { label: 'My Bench', preset: 'workbench', sprites: { main: { single: sp.single } }, rotatable: false });
SC.applyBuildPreset(bench);
bench.sprites = { single: sp.single };
const fac = mk('building', {
  label: 'Booster',
  preset: 'facility',
  sprites: { single: sp.single },
  facilityTargets: ['My_Bench_X', 'WM_MyBench', 'TableMachining'],
  facilityOffsets: [{ name: 'WorkTableWorkSpeedFactor', value: 0.1 }],
  facilityAdjacent: true,
});
SC.applyBuildPreset(fac);
fac.facilityTargets = ['WM_MyBench', 'TableMachining'];
fac.facilityOffsets = [{ name: 'WorkTableWorkSpeedFactor', value: 0.1 }];
fac.facilityAdjacent = true;
fac.sprites = { single: sp.single };
P.items = [wall, wall2, bench, fac];
const r = GEN.generate(P);
assert.deepStrictEqual(r.errors, [], r.errors.join('\n'));
const get = (p) => (r.files.find((f) => f.path === p) || {}).text;
const paths = r.files.map((f) => f.path);
const w1 = get('Defs/ThingDefs_Buildings/Building_WM_TestWall.xml');
assert(w1 && /<graphicClass>Graphic_Single<\/graphicClass>/.test(w1) && /CornerFiller/.test(w1) && /Impassable/.test(w1) && /<isWall>true/.test(w1));
assert(paths.includes('Textures/Things/Building/WallMod/WM_TestWall_Atlas.png'), paths.join('\n'));
assert(!/<Mass>/.test(w1), 'walls have no mass');
const w2 = get('Defs/ThingDefs_Buildings/Building_WM_LookWall.xml');
assert(/Graphic_Appearances/.test(w2) && /<linkType>Basic/.test(w2) && !/damageData/.test(w2) && /<Beauty>2/.test(w2));
assert(
  paths.includes('Textures/Things/Building/WallMod/WM_LookWall/WM_LookWall_Atlas_Smooth.png') &&
    paths.includes('Textures/Things/Building/WallMod/WM_LookWall/WM_LookWall_Atlas_Bricks.png'),
);
assert(
  r.warnings.some((w) => /planks/.test(w.message)),
  'missing planks warned',
);
const f = get('Defs/ThingDefs_Buildings/Building_WM_Booster.xml');
assert(
  /CompProperties_Facility/.test(f) &&
    /<WorkTableWorkSpeedFactor>0.1/.test(f) &&
    /mustBePlacedAdjacent/.test(f) &&
    /PlaceWorker_ShowFacilitiesConnections/.test(f),
  f,
);
const b = get('Defs/ThingDefs_Buildings/Building_WM_MyBench.xml');
assert(/CompProperties_AffectedByFacilities/.test(b) && /<li>WM_Booster<\/li>/.test(b), 'own bench accepts booster');
const patch = get('Patches/Boosters_TableMachining.xml');
assert(patch && /PatchOperationConditional/.test(patch) && /TableMachining/.test(patch) && /<li>WM_Booster<\/li>/.test(patch));
assert(!paths.includes('Patches/Boosters_WM_MyBench.xml'), 'no patch for own bench');
for (const fl of r.files) if (fl.text && /\.xml$/.test(fl.path)) assert(GEN.checkXml(fl.text).ok, fl.path);
console.log('WALLS_OK');
