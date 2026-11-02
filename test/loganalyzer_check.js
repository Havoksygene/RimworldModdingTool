'use strict';
// Log reader. usage: node test/loganalyzer_check.js
const assert = require('assert');
const LA = require('../renderer/loganalyzer.js');
const log = `Initialize engine version: 2022.3.35f1
Loading game from file
Could not resolve cross-reference to Verse.ThingDef named Steal (wanter=Verse.RecipeDef.ingredients) in KP_MakeTrailMix
Verse.Log:Error(String)
Verse.BackCompatibility:GetBackCompatibleType(Type, String, XmlNode)
(Filename: C:/buildslave/unity/build/Runtime/Export/Debug/Debug.bindings.h Line: 39)

Config error in KP_Rustbucket: graphicData.texPath is empty
Verse.Log:Error(String)
(Filename: C:/buildslave/unity/build/Runtime/Export/Debug/Debug.bindings.h Line: 39)

Could not load UnityEngine.Texture2D at Things/Pawn/Mechanoid/KitchenPack/KP_Rustbucket_south in any active mod or in base resources.
UnityEngine.Debug:LogError(Object)
(Filename: C:/x Line: 39)

Could not resolve cross-reference to Verse.ThingDef named OtherModStuff (wanter=Verse.ThingDef.costList) in SomeOtherMod_Thing
(Filename: C:/x Line: 39)

Patch operation Verse.PatchOperationAdd failed
  xpath: Defs/ThingDef[defName="MechGestator"]/recipes
  success: Normal
mod KitchenPack
(Filename: C:/x Line: 39)

Exception in KP_Brew: System.NullReferenceException: Object reference not set to an instance of an object
  at Verse.ThingDef.ConfigErrors () [0x00000] in <0>:0
(Filename: C:/x Line: 39)

Something unrelated happened.
`;
const owners = { KP_MakeTrailMix: { id: 'i1', label: 'Make trail mix', type: 'recipe' }, KP_Rustbucket: { id: 'i2', label: 'Rustbucket', type: 'mech' }, KP_Brew: { id: 'i3', label: 'Brew', type: 'item' } };
const r = LA.analyze(log, { owners, texOwners: { 'Things/Pawn/Mechanoid/KitchenPack/KP_Rustbucket': owners.KP_Rustbucket }, modNames: ['KitchenPack'], knownIds: ['Steel', 'Plasteel'] });
const t = r.findings.map((f) => f.title).join('\n');
assert(/Unknown item.*"Steal"|Unknown item, building or creature: "Steal"/.test(t), t);
assert(r.findings.find((f) => /Steal/.test(f.title)).fix.includes('Did you mean "Steel"'), JSON.stringify(r.findings[0]));
assert(r.findings.find((f) => /Steal/.test(f.title)).owner.id === 'i1');
assert(r.findings.some((f) => /Problem in KP_Rustbucket/.test(f.title) && f.owner.id === 'i2'), t);
assert(r.findings.some((f) => /Picture not found/.test(f.title) && f.owner && f.owner.id === 'i2'), t);
assert(r.findings.some((f) => /patch did not apply/.test(f.title) && /MechGestator/.test(f.title)), t);
assert(r.findings.some((f) => /Crash while handling KP_Brew/.test(f.title) && f.owner.id === 'i3'), t);
assert(!r.findings.some((f) => /OtherModStuff/.test(f.title)), 'other mod errors are not blamed on this mod');
assert(r.others.some((o) => /OtherModStuff/.test(o.title)), JSON.stringify(r.others));
assert(r.modSeen === true);
assert(LA.analyze('nothing here', { modNames: ['Zzz'] }).modSeen === false);
assert(/Make trail mix/.test(LA.toText(r, 'Kitchen Pack')));
console.log('LOGANALYZER_OK');
