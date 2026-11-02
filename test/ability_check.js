'use strict';
// Ability builder (modular effects) and genes that grant abilities. usage: node test/ability_check.js
const assert = require('assert');
global.window = global;
const SC = require('../renderer/modschema.js'),
  GEN = require('../renderer/modgen.js');
const sp = { single: { kind: 'file', id: 'x' } };
const P = SC.newProject();
P.meta.name = 'PowerMod';
P.meta.prefix = 'PM_';
const a = SC.newItem('ability');
Object.assign(a, { label: 'Bone Dart', targeting: 'pawn', range: 15.9, warmup: 0.5, cooldown: 30, hemogenCost: 0.1, effProjectile: 'PM_BoneDart', effHediffs: ['MyMod_Bleed'], needCapacity: 'Manipulation', sprites: { icon: sp } });
const b = SC.newItem('ability');
Object.assign(b, { label: 'Quick Heal', targeting: 'touch', hostile: false, cooldown: 0, effHediffs: ['Anesthetic'], sprites: { icon: sp } });
const c = SC.newItem('ability');
Object.assign(c, { label: 'Boost', targeting: 'self', hostile: false, effHediffs: ['MyMod_Fast'], sprites: { icon: sp } });
const g = SC.newItem('gene');
g.preset = 'effects';
SC.applyGenePreset(g);
Object.assign(g, { label: 'Spiny', abilities: ['PM_BoneDart', 'Coagulate'], sprites: { icon: sp } });
P.items = [a, b, c, g];
const r = GEN.generate(P);
assert.deepStrictEqual(r.errors, [], r.errors.join('\n'));
const get = (p) => (r.files.find((f) => f.path === p) || {}).text;
const x = get('Defs/AbilityDefs/Ability_PM_BoneDart.xml');
assert(/<verbClass>Verb_CastAbility<\/verbClass>/.test(x) && /<range>15.9<\/range>/.test(x) && /<warmupTime>0.5/.test(x) && /<cooldownTicksRange>1800/.test(x), x);
assert(/CompProperties_AbilityLaunchProjectile/.test(x) && /<projectileDef>PM_BoneDart/.test(x) && /<hediffDef>MyMod_Bleed/.test(x) && /CompProperties_AbilityHemogenCost/.test(x) && /<capacity>Manipulation/.test(x), x);
const y = get('Defs/AbilityDefs/Ability_PM_QuickHeal.xml');
assert(/ParentName="AbilityTouchBase"/.test(y) && /Verb_CastAbilityTouch/.test(y) && /<range>-1<\/range>/.test(y) && !/cooldownTicksRange/.test(y) && /<hostile>false/.test(y), y);
const z = get('Defs/AbilityDefs/Ability_PM_Boost.xml');
assert(/<onlyApplyToSelf>true/.test(z) && /<canTargetSelf>true/.test(z), z);
const ge = get('Defs/GeneDefs/Gene_PM_Spiny.xml');
assert(/<abilities>\s*<li>PM_BoneDart<\/li>\s*<li>Coagulate<\/li>/.test(ge), ge);
assert(r.files.some((f) => f.path === 'Textures/UI/Abilities/PowerMod/PM_BoneDart.png' && f.keep));
// jump, mental state, teleport
{
  const P2 = SC.newProject();
  P2.meta.name = 'FxMod';
  P2.meta.prefix = 'FX_';
  const sp2 = { single: { kind: 'file', id: 'x' } };
  const j = SC.newItem('ability');
  Object.assign(j, { label: 'Leap', targeting: 'jump', range: 15.9, minRange: 3, sprites: { icon: sp2 } });
  const m = SC.newItem('ability');
  Object.assign(m, { label: 'Rage', targeting: 'pawn', effMental: 'Berserk', mentalGoodwill: -50, sprites: { icon: sp2 } });
  const tp = SC.newItem('ability');
  Object.assign(tp, { label: 'Blink', targeting: 'pawn', effTeleport: 'random', teleRange: 20, teleStun: 1, sprites: { icon: sp2 } });
  const ts = SC.newItem('ability');
  Object.assign(ts, { label: 'Warp', targeting: 'pawn', effTeleport: 'selected', teleRange: 30, sprites: { icon: sp2 } });
  P2.items = [j, m, tp, ts];
  const r2 = GEN.generate(P2);
  assert.deepStrictEqual(r2.errors, [], r2.errors.join('\n'));
  const g = (n) => r2.files.find((f) => f.path.includes(n)).text;
  assert(/Verb_CastAbilityJump/.test(g('Leap')) && /<minRange>3/.test(g('Leap')) && /<jobDef>CastJump/.test(g('Leap')) && /Longjump_Land/.test(g('Leap')), g('Leap'));
  assert(/CompProperties_AbilityGiveMentalState/.test(g('Rage')) && /<stateDef>Berserk/.test(g('Rage')) && /<goodwillImpact>-50/.test(g('Rage')), g('Rage'));
  assert(/<destination>RandomInRange/.test(g('Blink')) && /<randomRange>6.9~20/.test(g('Blink')) && /<stunTicks>18~60/.test(g('Blink')), g('Blink'));
  assert(/<destination>Selected/.test(g('Warp')) && /<range>30/.test(g('Warp')), g('Warp'));
}
console.log('ABILITY_OK');
