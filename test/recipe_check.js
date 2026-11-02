'use strict';
// Standalone recipes. usage: node test/recipe_check.js
const assert = require('assert');
global.window = global;
const SC = require('../renderer/modschema.js'),
  GEN = require('../renderer/modgen.js');
const P = SC.newProject();
P.meta.name = 'Kitchen Pack';
P.meta.prefix = 'KP_';
const a = SC.newItem('recipe');
Object.assign(a, { label: 'Make trail mix', workAmount: 500, workSpeedStat: 'CookSpeed', workSkill: 'Cooking', minSkill: 3, effect: 'Cook', sound: 'Recipe_CookMeal', benches: ['FueledStove', 'ElectricStove'], ingredients: [{ name: 'RawBerries', value: 4 }], ingredientCats: [{ name: 'MeatRaw', value: 1 }], products: [{ name: 'Pemmican', value: 8 }], bulk: true, research: 'Smithing' });
const b = SC.newItem('recipe');
Object.assign(b, { label: 'Pemmican anywhere', preset: 'attach', attachRecipe: 'Make_Pemmican', attachBenches: ['CraftingSpot'] });
const c = SC.newItem('recipe');
Object.assign(c, { label: 'Empty attach', preset: 'attach' });
P.items = [a, b, c];
const r = GEN.generate(P);
assert.deepStrictEqual(r.errors, [], r.errors.join('\n'));
const t = r.files.find((f) => /Recipe_KP_MakeTrailMix/.test(f.path)).text;
assert(/<defName>KP_MakeTrailMix<\/defName>/.test(t) && /<defName>KP_MakeTrailMix_Bulk<\/defName>/.test(t), t);
assert(/<workSpeedStat>CookSpeed/.test(t) && /<workSkill>Cooking/.test(t) && /<Cooking>3<\/Cooking>/.test(t) && /<researchPrerequisite>Smithing/.test(t), t);
assert(/<thingDefs>\s*<li>RawBerries<\/li>[\s\S]*<count>4<\/count>/.test(t) && /<categories>\s*<li>MeatRaw<\/li>/.test(t) && /<Pemmican>8<\/Pemmican>/.test(t) && /<Pemmican>32<\/Pemmican>/.test(t) && /<workAmount>2000<\/workAmount>/.test(t), t);
assert(/<li>FueledStove<\/li>\s*<li>ElectricStove<\/li>/.test(t) && /<fixedIngredientFilter>/.test(t), t);
const p = r.files.find((f) => /Patches\/Recipe_KP_PemmicanAnywhere/.test(f.path));
assert(p && /PatchOperationConditional/.test(p.text) && /RecipeDef\[defName=&quot;Make_Pemmican&quot;\]\/recipeUsers/.test(p.text) && /<li>CraftingSpot<\/li>/.test(p.text), p && p.text);
assert(!r.files.some((f) => /Empty/.test(f.path)), 'empty attach writes nothing');
assert(r.warnings.some((w) => /does nothing/.test(w.message)));
console.log('RECIPE_OK');
