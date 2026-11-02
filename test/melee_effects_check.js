'use strict';
// Melee on-hit effects. usage: node test/melee_effects_check.js
const assert = require('assert');
global.window = global;
const SC = require('../renderer/modschema.js'),
  GEN = require('../renderer/modgen.js');
const P = SC.newProject();
P.meta.name = 'HitMod';
P.meta.prefix = 'HM_';
const w = SC.newItem('weapon');
Object.assign(w, { label: 'Venom Blade', mode: 'melee', sprites: { main: { single: { kind: 'file', id: 'x' } } }, tools: [{ label: 'blade', capacity: 'Cut', power: 12, cooldown: 2 }, { label: 'point', capacity: 'Stab', power: 10, cooldown: 2 }], meleeExtra: [{ name: 'Flame', value: 8 }], meleeExtraChance: 50, meleeHediff: 'ToxicBuildup', meleeHediffAmount: 0.02 });
const plain = SC.newItem('weapon');
Object.assign(plain, { label: 'Plain Club', mode: 'melee', sprites: { main: { single: { kind: 'file', id: 'x' } } }, tools: [{ label: 'head', capacity: 'Blunt', power: 8, cooldown: 2 }] });
P.items = [w, plain];
const r = GEN.generate(P);
assert.deepStrictEqual(r.errors, [], r.errors.join('\n'));
const t = r.files.find((f) => /Venom|VenomBlade/.test(f.path)).text;
assert(/<extraMeleeDamages>\s*<li>\s*<def>Flame<\/def>\s*<amount>8<\/amount>\s*<chance>0.5<\/chance>/.test(t), t);
assert(/<capacities>\s*<li>HM_VenomBlade_CutHit<\/li>/.test(t) && /<capacities>\s*<li>HM_VenomBlade_StabHit<\/li>/.test(t), t);
assert(/<DamageDef ParentName="CutBase">/.test(t) && /<hediff>ToxicBuildup/.test(t) && /<severityPerDamageDealt>0.02/.test(t), t);
assert(/<ToolCapacityDef>[\s\S]*HM_VenomBlade_CutHit/.test(t) && /<meleeDamageDef>HM_VenomBlade_StabDamage/.test(t) && /Maneuver_Slash_MeleeHit/.test(t), t);
assert(/DamageWorker_Stab/.test(t), t);
const p = r.files.find((f) => /PlainClub/.test(f.path)).text;
assert(!/ManeuverDef|extraMeleeDamages/.test(p) && /<li>Blunt<\/li>/.test(p), p);
console.log('MELEE_EFFECTS_OK');
