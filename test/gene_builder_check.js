'use strict';
// Gene builder: tail attachment with per-direction layers, and an effects-only gene. usage: node test/gene_builder_check.js
const assert = require('assert');
global.window = global;
const SC = require('../renderer/modschema.js'),
  GEN = require('../renderer/modgen.js');
const sp = { single: { kind: 'file', id: 'x' } };
const P = SC.newProject();
P.meta.name = 'GeneMod';
P.meta.prefix = 'GM_';
const tail = SC.newItem('gene');
Object.assign(tail, { label: 'Fox Tail', statOffsets: [{ name: 'ComfyTemperatureMin', value: -8 }], capMods: [{ name: 'Moving', value: 0.05 }], layerSouth: 5, layerNorth: 95,
  sprites: { icon: sp, main: { south: { kind: 'file', id: 'a' }, east: { kind: 'file', id: 'b' }, north: { kind: 'file', id: 'c' } } } });
const fx = SC.newItem('gene');
fx.preset = 'effects';
SC.applyGenePreset(fx);
Object.assign(fx, { label: 'Quick Feet', displayCategory: 'Movement', biostatCpx: 2, biostatMet: -1, statFactors: [{ name: 'MoveSpeed', value: 1.2 }], sprites: { icon: sp } });
fx.statOffsets = [{ name: 'MyMod_Swimming', value: 0.3 }];
fx.capMods = [{ name: 'MyMod_Flying', value: 0.5 }];
P.items = [tail, fx];
const r = GEN.generate(P);
assert.deepStrictEqual(r.errors, [], r.errors.join('\n'));
const get = (p) => (r.files.find((f) => f.path === p) || {}).text;
const t = get('Defs/GeneDefs/Gene_GM_FoxTail.xml');
assert(/<GeneDef ParentName="GeneTailBase">/.test(t) && /<exclusionTags>\s*<li>Tail<\/li>/.test(t) && /<ComfyTemperatureMin>-8/.test(t) && /<capacity>Moving<\/capacity>/.test(t), t);
assert(/<dataSouth>[\s\S]*<layer>5<\/layer>/.test(t) && /<dataNorth>[\s\S]*<layer>95<\/layer>/.test(t) && /<dataWest>[\s\S]*<offset>\(0.5, 0, -0.15\)/.test(t), t);
assert(/<texPath>Things\/Pawn\/Humanlike\/BodyAttachments\/GeneMod\/GM_FoxTail<\/texPath>/.test(t) && /<iconPath>UI\/Icons\/Genes\/GeneMod\/GM_FoxTail/.test(t), t);
for (const f of ['south', 'east', 'north']) assert(r.files.some((x) => x.path === `Textures/Things/Pawn/Humanlike/BodyAttachments/GeneMod/GM_FoxTail_${f}.png`), f);
const e = get('Defs/GeneDefs/Gene_GM_QuickFeet.xml');
assert(!/renderNodeProperties|ParentName/.test(e) && /<MoveSpeed>1.2/.test(e) && /<displayCategory>Movement/.test(e) && /<biostatMet>-1/.test(e), e);
assert(/<MyMod_Swimming>0.3<\/MyMod_Swimming>/.test(e) && /<capacity>MyMod_Flying<\/capacity>/.test(e), 'custom stat and ability IDs pass through');
// shapes: preset fills numbers; wings behind in front north; head uses the head node
{
  const W = SC.newItem('gene');
  W.label = 'Bat Wings';
  W.shape = 'wings';
  SC.applyShape(W, true);
  assert.deepStrictEqual(W.exclusionTags, ['Wings']);
  assert(W.layerSouth === -3 && W.layerNorth === 90 && W.meshSize === 1.6 && W.colorType === 'Ignored');
  const H = SC.newItem('gene');
  H.label = 'Horns';
  H.shape = 'head';
  SC.applyShape(H, true);
  const sp = { kind: 'file', id: 'x' };
  W.sprites = H.sprites = { icon: { single: sp }, main: { south: sp, east: sp, north: sp } };
  const P2 = SC.newProject();
  P2.meta.name = 'ShapeMod';
  P2.meta.prefix = 'SM_';
  P2.items = [W, H];
  const r2 = GEN.generate(P2);
  assert.deepStrictEqual(r2.errors, [], r2.errors.join('\n'));
  const wx = r2.files.find((f) => /Gene_SM_BatWings/.test(f.path)).text;
  const hx = r2.files.find((f) => /Gene_SM_Horns/.test(f.path)).text;
  assert(/AttachmentBody/.test(wx) && /<layer>-3<\/layer>/.test(wx) && /<layer>90<\/layer>/.test(wx) && /<li>Wings<\/li>/.test(wx), wx);
  assert(/PawnRenderNode_AttachmentHead/.test(hx) && /<parentTagDef>Head/.test(hx) && /HeadAttachments/.test(hx) && /<layer>70/.test(hx) && !/GeneTailBase/.test(hx), hx);
}
console.log('GENE_BUILDER_OK');
