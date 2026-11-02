'use strict';
// Research projects. usage: node test/research_check.js
const assert = require('assert');
global.window = global;
const SC = require('../renderer/modschema.js'),
  GEN = require('../renderer/modgen.js');
const P = SC.newProject();
P.meta.name = 'Moon Tech';
P.meta.prefix = 'MT_';
const a = SC.newItem('research');
Object.assign(a, { label: 'Moon basics', description: 'First steps.', baseCost: 400, techLevel: 'Medieval', prerequisites: ['Smithing'] });
const b = SC.newItem('research');
Object.assign(b, { label: 'Moon engines', baseCost: 2500, techLevel: 'Spacer', prerequisites: ['MT_MoonBasics', 'MultiAnalyzer'], requiredBench: 'HiTechResearchBench', requiredFacilities: ['MultiAnalyzer'] });
const c = SC.newItem('research');
Object.assign(c, { label: 'Main tab one', ownTab: false, tab: '', viewX: 3, viewY: 2.5 });
P.items = [a, b, c];
const r = GEN.generate(P);
assert.deepStrictEqual(r.errors, [], r.errors.join('\n'));
const ta = r.files.find((f) => /MoonBasics/.test(f.path)).text,
  tb = r.files.find((f) => /MoonEngines/.test(f.path)).text,
  tc = r.files.find((f) => /MainTabOne/.test(f.path)).text;
assert(/<ResearchTabDef>[\s\S]*<defName>MoonTechMoonTechTab<\/defName>/.test(ta) && !/ResearchTabDef/.test(tb), ta);
assert(/<baseCost>400<\/baseCost>/.test(ta) && /<techLevel>Medieval/.test(ta) && /<li>Smithing<\/li>/.test(ta) && /<tab>MoonTechMoonTechTab/.test(ta), ta);
assert(/<researchViewX>0.00/.test(ta) && /<researchViewX>1.00/.test(tb) && /<researchViewY>0.00/.test(tb), ta + tb);
assert(/<requiredResearchBuilding>HiTechResearchBench/.test(tb) && /<requiredResearchFacilities>\s*<li>MultiAnalyzer/.test(tb) && /<li>MT_MoonBasics<\/li>/.test(tb), tb);
assert(!/<tab>/.test(tc) && /<researchViewX>3.00/.test(tc) && /<researchViewY>2.50/.test(tc), tc);
console.log('RESEARCH_OK');
