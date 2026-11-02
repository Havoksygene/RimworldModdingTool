'use strict';
// Item builder: resource (with material + ore settings) and chunk. usage: node test/items_check.js
const assert = require('assert');
global.window = global;
const SC = require('../renderer/modschema.js'),
  GEN = require('../renderer/modgen.js');
const sp = { single: { kind: 'file', id: 'x' } };
const P = SC.newProject();
P.meta.name = 'ItemMod';
P.meta.prefix = 'IM_';
const ore = SC.newItem('item');
Object.assign(ore, {
  label: 'Azurite',
  isStuff: true,
  stuffCategories: ['Metallic'],
  stuffColor: '#3366cc',
  stuffPower: { StuffPower_Armor_Sharp: 1.1 },
  stuffFactors: { MaxHitPoints: 1.2 },
  deposit: true,
  customStats: [{ name: 'MedicalPotency', value: 0.1 }],
  sprites: { single: sp },
});
ore.stats.MarketValue = 3.5;
const chunk = SC.newItem('item');
chunk.preset = 'chunk';
SC.applyItemPreset(chunk);
Object.assign(chunk, { label: 'Azurite Slag', smeltable: true, smeltProducts: [{ name: 'IM_Azurite', value: 10 }], sprites: { single: sp } });
const bld = SC.newItem('building');
bld.label = 'Blue Thing';
bld.cost = [{ name: 'IM_Azurite', value: 5 }];
P.items = [ore, chunk];
const r = GEN.generate(P);
assert.deepStrictEqual(r.errors, [], r.errors.join('\n'));
const get = (p) => (r.files.find((f) => f.path === p) || {}).text;
const o = get('Defs/ThingDefs_Items/Item_IM_Azurite.xml');
assert(/ParentName="ResourceBase"/.test(o) && /Graphic_StackCount/.test(o) && /<stackLimit>75/.test(o) && /<MarketValue>3.5/.test(o), o);
assert(
  /<stuffProps>/.test(o) &&
    /<li>Metallic<\/li>/.test(o) &&
    /<color>\(51,102,204\)<\/color>/.test(o) &&
    /<StuffPower_Armor_Sharp>1.1/.test(o) &&
    /<MaxHitPoints>1.2/.test(o),
);
assert(/<deepCommonality>1/.test(o) && /<deepLumpSizeRange>20~30/.test(o) && /<MedicalPotency>0.1/.test(o));
assert(r.files.some((f) => f.path === 'Textures/Things/Item/Resource/ItemMod/IM_Azurite.png' && f.keep));
const c = get('Defs/ThingDefs_Items/Item_IM_AzuriteSlag.xml');
assert(
  /ParentName="ChunkBase"/.test(c) &&
    /Graphic_Single/.test(c) &&
    /<smeltable>true/.test(c) &&
    /<IM_Azurite>10/.test(c) &&
    !/stuffProps/.test(c) &&
    !/deepCommonality/.test(c),
  c,
);
assert(r.files.some((f) => f.path === 'Textures/Things/Item/Chunk/ItemMod/IM_AzuriteSlag.png'));
for (const f of r.files) if (f.text && /\.xml$/.test(f.path)) assert(GEN.checkXml(f.text).ok, f.path);
console.log('ITEMS_OK');
