'use strict';
// Hediff (condition) builder, picked from abilities. usage: node test/hediff_check.js
const assert = require('assert');
global.window = global;
const SC = require('../renderer/modschema.js'),
  GEN = require('../renderer/modgen.js');
const sp = { single: { kind: 'file', id: 'x' } };
const P = SC.newProject();
P.meta.name = 'CondMod';
P.meta.prefix = 'CD_';
const h = SC.newItem('hediff');
Object.assign(h, { label: 'Swift Legs', isBad: false, durationHours: 2, capMods: [{ name: 'Moving', value: 0.4 }], capFactors: [{ name: 'Manipulation', value: 1.1 }], statFactors: [{ name: 'MyMod_Stat', value: 1.2 }], painFactor: 0.5, hungerFactor: 2 });
const empty = SC.newItem('hediff');
empty.label = 'Nothing';
const a = SC.newItem('ability');
Object.assign(a, { label: 'Sprint', targeting: 'self', hostile: false, effHediffs: ['CD_SwiftLegs'], sprites: { icon: sp } });
P.items = [h, empty, a];
const r = GEN.generate(P);
assert.deepStrictEqual(r.errors, [], r.errors.join('\n'));
const x = (r.files.find((f) => f.path === 'Defs/HediffDefs/Hediff_CD_SwiftLegs.xml') || {}).text;
assert(/<hediffClass>HediffWithComps/.test(x) && /<isBad>false/.test(x) && /<disappearsAfterTicks>5000/.test(x) && /HediffCompProperties_Disappears/.test(x), x);
assert(/<capacity>Moving<\/capacity>\s*<offset>0.4/.test(x) && /<capacity>Manipulation<\/capacity>\s*<postFactor>1.1/.test(x) && /<MyMod_Stat>1.2/.test(x) && /<painFactor>0.5/.test(x) && /<hungerRateFactor>2/.test(x), x);
assert(r.warnings.some((w) => /Nothing is changed/.test(w.message) && w.item === 'Nothing'), 'empty hediff warns');
console.log('HEDIFF_OK');
