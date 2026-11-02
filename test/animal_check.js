'use strict';
// Animal builder. usage: node test/animal_check.js
const assert = require('assert');
global.window = global;
const SC = require('../renderer/modschema.js'),
  GEN = require('../renderer/modgen.js');
const f3 = { south: { kind: 'file', id: 's' }, east: { kind: 'file', id: 'e' }, north: { kind: 'file', id: 'n' } };
const P = SC.newProject();
P.meta.name = 'ZooMod';
P.meta.prefix = 'ZM_';
const cow = SC.newItem('animal');
cow.preset = 'farm';
SC.applyAnimalPreset(cow);
Object.assign(cow, { label: 'Glow Cow', drawSize: 1.2, color: '#88ff88', sprites: { main: f3 }, customStats: [{ name: 'MyMod_Stat', value: 2 }], produceThing: 'Milk' });
const cat = SC.newItem('animal');
Object.assign(cat, { label: 'Zoo Cat', sprites: { main: f3, dessicated: f3 } });
const bare = SC.newItem('animal');
bare.label = 'Ghost';
P.items = [cow, cat, bare];
const r = GEN.generate(P);
assert.deepStrictEqual(r.errors, [], r.errors.join('\n'));
const f = (n) => (r.files.find((q) => q.path.includes(n)) || {}).text;
const c = f('Animal_ZM_GlowCow');
assert(/<PawnKindDef ParentName="AnimalKindBase">[\s\S]*<race>ZM_GlowCow<\/race>[\s\S]*<ThingDef ParentName="AnimalThingBase">/.test(c), c);
assert(/<body>QuadrupedAnimalWithHooves<\/body>/.test(c) && /<herdAnimal>true/.test(c) && /<baseBodySize>2.4/.test(c) && /<MoveSpeed>3.2/.test(c) && /<MyMod_Stat>2/.test(c), c);
assert(/CompProperties_Milkable/.test(c) && /<milkDef>Milk/.test(c) && /<milkAmount>14/.test(c), c);
assert(/<soundCall>Pawn_Cow_Call|<soundCall>Pawn_Muffalo_Call/.test(c) && /<headPosPerRotation>/.test(c), 'sounds from vanilla profile');
assert(/<linkedBodyPartsGroup>Teeth/.test(c) && /<capacities>\s*<li>Bite/.test(c), c);
assert(/<drawSize>0.72<\/drawSize>/.test(c) && /<drawSize>1.2<\/drawSize>/.test(c) && /\(136,255,136\)/.test(c), c);
for (const p of ['Textures/Things/Pawn/Animal/ZooMod/ZM_GlowCow_south.png', 'Textures/Things/Pawn/Animal/ZooMod/Dessicated_ZM_GlowCow_east.png', 'Textures/Things/Pawn/Animal/ZooMod/ZM_ZooCat_north.png']) assert(r.files.some((q) => q.path === p && q.sprite), p);
assert(r.warnings.some((w) => /No body picture/.test(w.message) && w.item === 'Ghost'));
assert(r.warnings.some((w) => /No dessicated picture/.test(w.message) && w.item === 'Glow Cow'));
// extras: female / baby pictures, labels, eggs with hatching, riding
{
  const P2 = SC.newProject();
  P2.meta.name = 'ZooMod';
  P2.meta.prefix = 'ZM_';
  const h = SC.newItem('animal');
  h.preset = 'bird';
  SC.applyAnimalPreset(h);
  Object.assign(h, { label: 'Moa', maleLabel: 'cock', femaleLabel: 'hen', babyLabel: 'chick', produce: 'eggs', produceAmount: 2, produceDays: 2, eggHatchDays: 5, stats: { ...h.stats, CaravanRidingSpeedFactor: 1.4 }, sprites: { main: f3, female: f3, baby: f3, egg: { single: { kind: 'file', id: 'egg' } } } });
  P2.items = [h];
  const r2 = GEN.generate(P2);
  assert.deepStrictEqual(r2.errors, [], r2.errors.join('\n'));
  const t = r2.files.find((q) => q.path.includes('Animal_ZM_Moa')).text;
  assert(/<labelMale>cock/.test(t) && /<labelFemale>hen/.test(t) && /<label>chick<\/label>/.test(t), t);
  assert(/<femaleGraphicData>[\s\S]*ZM_Moa_Female/.test(t) && /ZM_Moa_Baby/.test(t) && /<femaleDessicatedBodyGraphicData>/.test(t), t);
  assert(/ParentName="EggUnfertBase"/.test(t) && /ParentName="EggFertBase"/.test(t) && /<hatcherPawn>ZM_Moa<\/hatcherPawn>/.test(t) && /<hatcherDaystoHatch>5/.test(t), t);
  assert(/CompProperties_EggLayer/.test(t) && /<eggFertilizedDef>ZM_MoaEggFertilized/.test(t) && /<eggCountRange>2/.test(t) && /<eggLayIntervalDays>2/.test(t), t);
  assert(/<CaravanRidingSpeedFactor>1.4/.test(t), t);
  for (const p of ['Textures/Things/Pawn/Animal/ZooMod/ZM_Moa_Female_south.png', 'Textures/Things/Pawn/Animal/ZooMod/ZM_Moa_Baby_east.png', 'Textures/Things/Item/Resource/ZooMod/ZM_MoaEgg.png']) assert(r2.files.some((q) => q.path === p && q.sprite), p);
}
console.log('ANIMAL_OK');
