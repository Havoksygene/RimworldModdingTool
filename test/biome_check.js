'use strict';
// Biome generation: wild lists with explicit entries + stat rules (vanilla and scanned mods), DLC tags, ground, patches. usage: node test/biome_check.js
const assert = require('assert');
global.window = global;
const SC = require('../renderer/modschema.js'),
  GEN = require('../renderer/modgen.js');
const P = SC.newProject();
P.meta.name = 'BiomeMod';
P.meta.prefix = 'BM_';
P.scanned = {
  folders: ['DeepSea'],
  animals: [
    { id: 'Kraken', label: 'Kraken', stats: { BreathUnderwater: 1, MoveSpeed: 5 } },
    { id: 'Eel', label: 'Eel', stats: { BreathUnderwater: 2 } },
    { id: 'Cat', label: 'Cat', stats: { BreathUnderwater: 0 } },
  ],
  plants: [],
};
const b = SC.newItem('biome');
Object.assign(b, {
  label: 'Deep Reef',
  sprites: { single: { single: { kind: 'file', id: 'x' } } },
  wildAnimals: [
    { id: 'Muffalo', commonality: 0.5 },
    { rule: true, stat: 'BreathUnderwater', op: '>=', value: 1, commonality: 0.3 },
    { id: 'Eel', commonality: 2 },
    { id: 'Porcupine', commonality: 0.2 },
  ],
  wildPlants: [
    { rule: true, stat: 'Nutrition', op: '>=', value: 0.9, commonality: 0.1 },
    { id: 'Plant_Grass', commonality: 5 },
  ],
  patches: [{ freq: 0.02, pond: true, bands: [{ terrain: 'WaterShallow', min: 0.9, max: 999 }] }],
  weather: [
    { name: 'Clear', value: 10 },
    { name: 'Overcast', value: 2 },
  ],
  diseases: [{ name: 'Disease_Flu', value: 100 }],
  ambient: ['Ambient_NightInsects_Standard'],
});
P.items = [b];
const r = GEN.generate(P);
assert.deepStrictEqual(r.errors, [], r.errors.join('\n'));
const x = (r.files.find((f) => f.path === 'Defs/BiomeDefs/Biome_BM_DeepReef.xml') || {}).text;
assert(x, 'biome file');
assert(/<generatesNaturally>false/.test(x) && !/workerClass/.test(x), 'no world placement -> generatesNaturally false');
assert(/<Muffalo>0.5<\/Muffalo>/.test(x) && /<Kraken>0.3<\/Kraken>/.test(x), 'rule found the scanned animal');
assert(/<Eel>2<\/Eel>/.test(x) && !/<Eel>0.3/.test(x), 'explicit entry wins over the rule');
assert(!/<Cat>/.test(x), 'rule does not match animals below the number');
assert(/<Porcupine MayRequire="Ludeon.RimWorld.Odyssey">0.2/.test(x), 'DLC animal gets MayRequire');
assert(/<Plant_Grass>5/.test(x) && /<wildPlants>/.test(x));
assert(/<perlinFrequency>0.02/.test(x) && /<isPond>true/.test(x) && /<WaterShallow>|<terrain>WaterShallow/.test(x));
assert(/<Clear>10<\/Clear>/.test(x) && /<diseaseInc>Disease_Flu/.test(x) && /<li>Ambient_NightInsects_Standard/.test(x));
assert(/<terrainsByFertility>/.test(x) && /<texture>World\/Biomes\/BiomeMod\/BM_DeepReef/.test(x));
assert(r.files.some((f) => f.path === 'Textures/World/Biomes/BiomeMod/BM_DeepReef.png'));
assert(GEN.checkXml(x).ok);
// vanilla pool rule: animals with MoveSpeed >= 6 exist in the game data
const fast = SC.matchRule({ stat: 'MoveSpeed', op: '>=', value: 6 }, 'animals', P);
assert(fast.length > 0 && fast.every((e) => e.stats.MoveSpeed >= 6), 'vanilla rule works: ' + fast.length);
// a rule that matches nothing is reported
b.wildAnimals = [{ rule: true, stat: 'Nope', op: '>=', value: 1, commonality: 1 }];
const r2 = GEN.generate(P);
assert(r2.warnings.some((w) => /matches nothing/.test(w.message)));
// a vanilla biome defName is refused
b.defName = 'TemperateForest';
assert(GEN.generate(P).errors.some((e) => /already has/.test(e)));
console.log('BIOME_OK');
