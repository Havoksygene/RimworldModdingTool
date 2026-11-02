'use strict';
// Reference audit: unknown names produce warnings. usage: node test/refaudit_check.js
const assert = require('assert');
global.window = global;
const SC = require('../renderer/modschema.js'),
  GEN = require('../renderer/modgen.js');
const P = SC.newProject();
P.meta.name = 'Audit';
P.meta.prefix = 'AU_';
const a = SC.newItem('recipe');
Object.assign(a, { label: 'Brew stuff', benches: ['CraftingSpot', 'NoSuchBench'], ingredients: [{ name: 'Steel', value: 2 }, { name: 'MadeUpMetal', value: 1 }], products: [{ name: 'AU_Thing', value: 1 }], research: 'NoSuchResearch' });
const b = SC.newItem('item');
Object.assign(b, { label: 'Thing', sprites: { single: { kind: 'file', id: 'x' } } });
P.items = [a, b];
const r = GEN.generate(P);
const msgs = r.warnings.map((w) => w.message).join('\n');
assert(/item "MadeUpMetal"/.test(msgs) && /workbench "NoSuchBench"/.test(msgs) && /research project "NoSuchResearch"/.test(msgs), msgs);
assert(!/"Steel"/.test(msgs) && !/"CraftingSpot"/.test(msgs) && !/"AU_Thing"/.test(msgs), msgs);
console.log('REFAUDIT_OK');
