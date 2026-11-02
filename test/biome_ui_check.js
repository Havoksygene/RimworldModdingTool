'use strict';
// Biome form: sections, rule rows with live match list, ground bands, and the scan parser. usage: node test/biome_ui_check.js <scratchDir>
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');
const installStub = require('./stub');
(async () => {
  const dir = path.join(process.argv[2], 'bwide2');
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1500, height: 1400 } });
  await installStub(page, [{ path: dir, category: 'apparel' }]);
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  await page.waitForFunction(() => S.game && S.game.entries.length > 0);
  const ok = (n, c) => {
    assert.ok(c, n);
    console.log('ok -', n);
  };
  await page.click('#btnModOpen');
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Biome');
  await page.waitForTimeout(300);
  const heads = await page.$$eval('#modForm .msec h3', (h) => h.map((x) => x.textContent));
  ok(
    'biome sections',
    ['On the world map', 'Wildlife', 'Ground', 'Climate'].every((n) => heads.includes(n)),
  );
  await page.click('#modForm .mrow:has(label:text-is("Wild animals")) >> text=+ Add rule (by stat)');
  await page.waitForTimeout(250);
  ok('rule row with a match summary', (await page.locator('#modForm .mrow:has(label:text-is("Wild animals")) details summary').count()) === 1);
  await page.evaluate(() => {
    const it = MB.sel();
    it.wildAnimals[0].stat = 'MoveSpeed';
    it.wildAnimals[0].value = 5;
    MB.changed(true);
  });
  await page.waitForTimeout(250);
  const sum = await page.textContent('#modForm .mrow:has(label:text-is("Wild animals")) details summary');
  ok('rule counts the matching animals', /Matches [1-9]\d* animal/.test(sum));
  ok('ground bands listed', (await page.locator('#modForm .mrow:has(label:text-is("Ground by fertility")) .row').count()) >= 2);
  const found = await page.evaluate(() =>
    MB.parseDefs([
      {
        text: `<Defs><ThingDef ParentName="AnimalThingBase"><defName>Kraken</defName><label>kraken</label><statBases><MoveSpeed>3</MoveSpeed><BreathUnderwater>1</BreathUnderwater></statBases></ThingDef>
<PawnKindDef><defName>Kraken</defName><race>Kraken</race></PawnKindDef>
<ThingDef ParentName="PlantBase"><defName>Kelp</defName><category>Plant</category><plant><growDays>5</growDays></plant><statBases><Nutrition>0.9</Nutrition></statBases></ThingDef></Defs>`,
      },
    ]),
  );
  ok(
    'scan parser finds the animal and the plant with stats',
    found.animals.length === 1 &&
      found.animals[0].stats.BreathUnderwater === 1 &&
      found.plants.length === 1 &&
      found.plants[0].stats.Nutrition === 0.9,
  );
  // approximate preview map
  await page.evaluate(() => {
    const it = MB.sel();
    it.wildPlants = [{ id: 'Plant_Grass', commonality: 5 }];
    it.plantDensity = 1;
    it.terrains = [{ terrain: 'Soil', min: -999, max: 0.5 }, { terrain: 'Sand', min: 0.5, max: 999 }];
    it.patches = [{ freq: 0.015, pond: true, bands: [{ terrain: 'WaterShallow', min: 0.6, max: 999 }] }];
    MB.changed(true);
  });
  await page.waitForTimeout(300);
  await page.click('#modForm .mrow:has(label:text-is("Preview map (approximate)")) >> text=Redraw with my changes');
  const pv = await page.evaluate(() => {
    const row = [...document.querySelectorAll('#modForm .mrow')].find((r) => /Preview map/.test(r.textContent));
    const cv = row.querySelector('canvas'),
      d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    const cols = new Set();
    for (let i = 0; i < d.length; i += 4 * 97) cols.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
    return { colours: cols.size, text: row.textContent };
  });
  ok('preview draws several ground colours', pv.colours >= 3);
  ok('preview lists ground and plants', /Ground:/.test(pv.text) && /Plants \(dots\): .*Grass/i.test(pv.text));
  // floors: the form opens and a floor made in this mod becomes pickable as ground
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Floor');
  await page.waitForTimeout(300);
  const flabels = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('floor form has its fields', ['Floor picture (single image)', 'Fertility (0 = nothing grows, 1 = plain soil)', 'Cost to build'].every((n) => flabels.includes(n)));
  await page.evaluate(() => {
    const it = MB.sel();
    it.label = 'Blue Tile';
    it.defName = 'BlueTile';
    MB.changed(true);
  });
  const mine = await page.evaluate(() => MB.entriesOf('terrains').some((e) => e.id === 'BlueTile'));
  ok('floor from this mod listed as ground', mine);
  // plants: form opens, this-mod plant is pickable in a biome; wall gets a Natural rock mode that hides build-only fields
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Plant');
  await page.waitForTimeout(300);
  const plabels = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('plant form has its fields', ['Plant picture (single image)', 'Days to grow fully', 'What harvesting gives'].every((n) => plabels.includes(n)));
  await page.evaluate(() => {
    const it = MB.sel();
    it.label = 'Blue Berry';
    it.defName = 'BlueBerry';
    MB.changed(true);
  });
  ok('plant from this mod listed as wild plant', await page.evaluate(() => MB.entriesOf('plants').some((e) => e.id === 'BlueBerry')));
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Building');
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const it = MB.sel();
    it.preset = 'wall';
    ModSchema.applyBuildPreset(it);
    MB.changed(true);
  });
  const w1 = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('wall shows Build menu tab and not rock settings', w1.includes('Build menu tab') && !w1.includes('What mining it gives'));
  await page.evaluate(() => {
    const it = MB.sel();
    it.natural = true;
    MB.changed(true);
  });
  await page.waitForTimeout(250);
  const w2 = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('natural rock hides build menu tab and shows mining settings', !w2.includes('Build menu tab') && w2.includes('What mining it gives'));
  // crafting: items get recipe fields; a building can be "crafted at a workbench, then placed"
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Item');
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    const it = MB.sel();
    it.craftable = true;
    MB.changed(true);
  });
  await page.waitForTimeout(250);
  const il = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('item shows recipe fields when craftable', ['Made at workbench', 'Ingredients to make it', 'How many one job makes'].every((n) => il.includes(n)));
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Building');
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    const it = MB.sel();
    it.preset = 'crafted';
    ModSchema.applyBuildPreset(it);
    MB.changed(true);
  });
  await page.waitForTimeout(250);
  const bl = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('crafted building has recipe fields and no build menu tab', bl.includes('Made at workbench') && !bl.includes('Build menu tab') && !bl.includes('Research needed to build'));
  // genes: the form opens with per-direction layers
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Gene');
  await page.waitForTimeout(300);
  const gl = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('gene form has body picture and layers', gl.includes('Body picture (south / east / north)') && gl.includes('Layer facing north') && gl.includes('Complexity cost'));
  // abilities: form opens, this-mod ability pickable by genes
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Ability');
  await page.waitForTimeout(300);
  const al = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('ability form has targeting and effects', al.includes('Who or what it targets') && al.includes('Effect: launches this projectile'));
  await page.evaluate(() => {
    const it = MB.sel();
    it.label = 'Bone Dart';
    it.defName = 'BoneDart';
    MB.changed(true);
  });
  ok('ability from this mod listed for genes', await page.evaluate(() => MB.entriesOf('abilities').some((e) => e.id === 'BoneDart')));
  // hediffs: form opens, this-mod condition pickable by abilities
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Condition');
  await page.waitForTimeout(300);
  const hl = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('condition form has effects', hl.includes('Body abilities: add or subtract') && hl.includes('Multiplies stats'));
  await page.evaluate(() => {
    const it = MB.sel();
    it.label = 'Swift Legs';
    it.defName = 'SwiftLegs';
    MB.changed(true);
  });
  ok('condition from this mod listed for abilities', await page.evaluate(() => MB.entriesOf('hediffs').some((e) => e.id === 'SwiftLegs')));
  // implants: form opens with surgery and picture options
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Implant / bionic part');
  await page.waitForTimeout(300);
  const implLabels = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('implant form has kind, body part, abilities', implLabels.includes('Kind of implant') && implLabels.includes('Installed on this body part') && implLabels.includes('Gives these abilities'));
  // food: picking the Drug kind shows the high fields, Meal shows nutrition
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Item');
  await page.waitForTimeout(300);
  await page.selectOption('#modForm .mrow:has(label:text-is("Kind of item")) select', 'drug');
  await page.waitForTimeout(250);
  const foodLabels = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('drug kind shows high fields', foodLabels.includes('The high lasts (hours)') && foodLabels.includes('Mood while high (+ happy, - unhappy)') && foodLabels.includes('Eating sound'));
  await page.selectOption('#modForm .mrow:has(label:text-is("Kind of item")) select', 'meal');
  await page.waitForTimeout(250);
  const mealLabels = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('meal kind shows nutrition and hides the high', mealLabels.some((t) => /^Nutrition/.test(t)) && !mealLabels.includes('The high lasts (hours)') && mealLabels.includes('Days before it rots (0 = never)'));
  // research project: form opens and its own projects are listed for prerequisites
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Research project');
  await page.waitForTimeout(300);
  const resLabels = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('research form has cost, prerequisites, tab', resLabels.includes('Research cost (work points)') && resLabels.includes('Must research first') && resLabels.includes('Put it in a research tab of its own'));
  await page.evaluate(() => { const it = MB.sel(); it.label = 'Moon Basics'; it.defName = 'MoonBasics'; MB.changed(true); });
  ok('research of this mod listed', await page.evaluate(() => MB.entriesOf('research').some((e) => e.id === 'MoonBasics')));
  // recipe: form opens; attach kind swaps the fields
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Recipe (bill at a bench)');
  await page.waitForTimeout(300);
  const recLabels = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('recipe form has ingredients, makes, bench', recLabels.includes('Ingredients (specific things)') && recLabels.includes('Makes') && recLabels.includes('Made at bench'));
  await page.selectOption('#modForm .mrow:has(label:text-is("Kind of recipe")) select', 'attach');
  await page.waitForTimeout(250);
  const attLabels = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('attach recipe shows recipe ID and benches only', attLabels.includes('Existing recipe ID') && !attLabels.includes('Makes'));
  // mechanoid: form opens, preset swaps numbers
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Mechanoid');
  await page.waitForTimeout(300);
  const mechLabels = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('mechanoid form has weight class, bandwidth, gestation', mechLabels.includes('Weight class') && mechLabels.includes('Gestation ingredients') && mechLabels.includes('Mechanoid numbers'));
  await page.selectOption('#modForm .mrow:has(label:text-is("Kind of mechanoid")) select', 'heavy');
  await page.waitForTimeout(250);
  ok('heavy preset fills class and bandwidth', await page.evaluate(() => { const m = MB.sel(); return m.weightClass === 'Heavy' && m.stats.BandwidthCost === 4; }));
  // trait and thought: forms open, this-mod entries are listed
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Trait');
  await page.waitForTimeout(300);
  const trLabels = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('trait form has stats, skills, work tags', trLabels.includes('Adds to stats') && trLabels.includes('Skill levels gained or lost') && trLabels.includes('Work the pawn refuses to do'));
  await page.evaluate(() => { const it = MB.sel(); it.label = 'Night Owl'; it.defName = 'NightOwl'; MB.changed(true); });
  ok('trait of this mod listed', await page.evaluate(() => MB.entriesOf('traits').some((e) => e.id === 'NightOwl')));
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Thought (mood effect)');
  await page.waitForTimeout(300);
  await page.evaluate(() => { const it = MB.sel(); it.label = 'Moon Cake Joy'; it.defName = 'MoonCakeJoy'; MB.changed(true); });
  ok('memory thought listed for food', await page.evaluate(() => MB.entriesOf('tasteThoughts').some((e) => e.id === 'MoonCakeJoy')));
  // event: weather kind shows duration, disease kind shows the disease
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Event (random incident)');
  await page.waitForTimeout(300);
  const evLabels = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('event form shows weather fields', evLabels.includes('What happens (behaviour copied from)') && evLabels.includes('Lasts (days, like 1.5~3.5)') && evLabels.includes('Not again for at least (days)'));
  await page.selectOption('#modForm .mrow:has(label:text-is("Kind of event")) select', 'disease');
  await page.waitForTimeout(250);
  const ev2 = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('disease event shows the disease and hides duration', ev2.includes('The disease (condition) people catch') && !ev2.includes('Lasts (days, like 1.5~3.5)'));
  // gene shape presets: picking Wings fills numbers
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Gene');
  await page.waitForTimeout(300);
  await page.selectOption('#modForm .mrow:has(label:text-is("Where it sits on the pawn")) select', 'wings');
  await page.waitForTimeout(250);
  ok('wings preset fills layers', await page.evaluate(() => { const g = MB.sel(); return g.shape === 'wings' && g.layerSouth === -3 && g.meshSize === 1.6; }));
  // xenotype: form opens, this-mod genes pickable, vanilla genes and traits in lists
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Xenotype (a group of genes)');
  await page.waitForTimeout(300);
  const xl = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('xenotype form has genes', xl.includes('Genes of this xenotype'));
  ok('vanilla genes and traits listed', await page.evaluate(() => MB.entriesOf('genes').some((e) => e.id === 'Delicate') && MB.entriesOf('traits').some((e) => e.id === 'Kind')));
  // animals: form opens, preset refills, this-mod animal pickable for biomes, attacks have a body part box
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Animal');
  await page.waitForTimeout(300);
  const animalLabels = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('animal form has body, attacks and custom stats', animalLabels.includes('Body shape (its body parts)') && animalLabels.includes('Attacks') && animalLabels.includes('More properties (stats not above)'));
  ok('attack rows have a body part box', (await page.$$eval('#modForm input[list=animalGroups]', (e) => e.length)) >= 3);
  await page.selectOption('#modForm .mrow:has(label:text-is("Kind of animal")) select', 'bird');
  await page.waitForTimeout(250);
  ok('bird preset refills the body', await page.evaluate(() => { const a = MB.sel(); return a.body === 'Bird' && a.tools.length === 2; }));
  await page.evaluate(() => {
    const a = MB.sel();
    a.label = 'Zoo Bird';
    a.defName = 'ZooBird';
    MB.changed(true);
  });
  ok('animal from this mod listed for biomes', await page.evaluate(() => MB.entriesOf('animals').some((e) => e.id === 'ZooBird')));
  // own XML file: quick patch form, then switch to hand-written XML
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Your own XML (Defs / Patch)');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    MB.sel().patchDefName = 'Steel';
    MB.changed(true);
  });
  await page.waitForTimeout(250);
  const pe = await page.$$eval('#modForm .patchedit .row', (r) => r.map((x) => x.textContent));
  ok('patch editor shows current stats of Steel', pe.some((t) => /Market value/i.test(t) && /1\.9/.test(t)) && pe.length > 3);
  ok('retexture picture box shown for a single-picture thing', (await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent))).includes('New picture (retexture)'));
  await page.selectOption('#modForm .mrow:has(label:text-is("What this file is")) select', 'quick');
  await page.waitForTimeout(250);
  const ql = await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent));
  ok('quick patch form has its fields', ql.includes('What to do') && ql.includes('defName of the thing to change') && !ql.includes('The XML'));
  await page.selectOption('#modForm .mrow:has(label:text-is("What this file is")) select', 'defs');
  await page.waitForTimeout(250);
  ok('hand-written XML box appears', (await page.$$eval('#modForm .mrow label', (l) => l.map((x) => x.textContent))).includes('The XML'));
  // quick delete from the item list
  const before = await page.evaluate(() => MB.M.project.items.length);
  page.once('dialog', (d) => d.accept());
  await page.click('#modItems .layer.sel .itemx');
  await page.waitForTimeout(250);
  ok('quick delete removes the item', (await page.evaluate(() => MB.M.project.items.length)) === before - 1);
  assert.deepStrictEqual(errs, []);
  await b.close();
  console.log('BIOME_UI_OK');
})();
