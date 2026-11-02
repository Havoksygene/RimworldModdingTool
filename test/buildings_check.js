'use strict';
// Buildings: presets, XML structure, non-square pictures stay as they are on export.
// usage: node test/buildings_check.js <scratchDir>
const path = require('path'); const assert = require('assert'); const { execFileSync } = require('child_process');
const { chromium } = require('playwright'); const installStub = require('./stub');
(async () => {
  const dir = path.join(process.argv[2], 'bwide2');
  execFileSync('python3', ['-I', '-c', `
import os,sys
from PIL import Image
d=sys.argv[1]; os.makedirs(d+'/Apparel',exist_ok=True)
for f in ('south','east','north'): Image.new('RGBA',(200,100),(255,0,0,255)).save(d+'/Apparel/Tab_%s.png'%f)
`, dir]);
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const state = await installStub(page, [{ path: dir, category: 'apparel' }]);
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  await page.waitForFunction(() => S.game && S.game.entries.length > 0);
  const ok = (n, c) => { assert.ok(c, n); console.log('ok -', n); };
  await page.evaluate(() => { S.tab = 'all'; addFromEntry(S.game.entries[0]); const l = S.layers.find((x) => x.kind === 'apparel'); S.selId = l.id; ModBuilder.fromLayer(l); });
  await page.waitForTimeout(400);
  await page.fill('#modMeta [data-k=name]', 'Build Test'); await page.fill('#modMeta [data-k=author]', 'T');
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Building'); await page.waitForTimeout(200);
  const row = (t) => page.locator('#modForm .mrow', { has: page.locator(`label:text-is("${t}")`) });
  await page.fill('#modForm .mrow:has(label:text-is("Name shown in game")) input', 'Oak Table'); await page.waitForTimeout(200);
  await page.selectOption('#modForm .mrow:has(label:text-is("Kind of building")) select', 'table'); await page.waitForTimeout(250);
  ok('table preset fills width/height', (await row('Width in cells').locator('input').inputValue()) === '2' && (await row('Height in cells').locator('input').inputValue()) === '2');
  ok('table is not rotatable: single picture field', (await row('Picture').count()) === 1 && (await row('Pictures (south / east / north)').count()) === 0);
  await page.evaluate(() => { const P = ModBuilder.M.project; const ap = P.items.find((i) => i.type === 'apparel'), bd = P.items.find((i) => i.type === 'building'); bd.sprites.single = { single: JSON.parse(JSON.stringify(ap.sprites.worn.south)) }; bd.sprites.main = JSON.parse(JSON.stringify(ap.sprites.worn)); });
  const showXml = async () => { await page.waitForTimeout(250); const o = await page.$$eval('#modOut select option', (o) => o.map((x) => x.value)); await page.selectOption('#modOut select', o.find((v) => /Building_/.test(v))); await page.waitForTimeout(200); return page.textContent('#modPre'); };
  ok('size hint 256 x 256 for the table', (await page.locator('#modForm .info').evaluateAll((b) => b.map((x) => x.dataset.tip).join(' '))).includes('256 × 256'));
  let xml = await showXml();
  ok('table: TableBase, size (2,2), drawSize (4,4), Eat, pathCost 42', /ParentName="TableBase"/.test(xml) && /<size>\(2,2\)<\/size>/.test(xml) && /<drawSize>\(4,4\)<\/drawSize>/.test(xml) && /<surfaceType>Eat<\/surfaceType>/.test(xml) && /<pathCost>42<\/pathCost>/.test(xml));
  ok('build menu tab + stuff', /<designationCategory>Furniture<\/designationCategory>/.test(xml) && /<stuffCategories>/.test(xml) && /<costStuffCount>40/.test(xml));
  ok('warning shown', (await page.textContent('#modOut')).includes('not been loaded in game'));
  // clicking a warning opens the item it is about
  await page.evaluate(() => { const P = ModBuilder.M.project; ModBuilder.M.selId = P.items.find((i) => i.type === 'apparel').id; });
  await page.click('#modItems >> text=Oak Table').catch(() => {});
  await page.waitForTimeout(150);
  await page.locator('#modOut .modWarn', { hasText: 'Oak Table' }).first().click(); await page.waitForTimeout(250);
  ok('clicking a warning selects that item', (await page.textContent('#modForm h2')).includes('Oak Table'));
  await page.selectOption('#modForm .mrow:has(label:text-is("Kind of building")) select', 'chair'); await page.waitForTimeout(250);
  xml = await showXml();
  ok('chair: FurnitureWithQualityBase, Comfort 0.7, sittable, Graphic_Multi', /FurnitureWithQualityBase/.test(xml) && /<Comfort>0\.7<\/Comfort>/.test(xml) && /<isSittable>true<\/isSittable>/.test(xml) && /Graphic_Multi/.test(xml) && /<drawSize>\(1,1\)<\/drawSize>/.test(xml));
  await page.selectOption('#modForm .mrow:has(label:text-is("Kind of building")) select', 'workbench'); await page.waitForTimeout(250);
  await row('Power use in watts (0 = no power)').locator('input').fill('120'); await row('Work speed factor (1 = normal)').locator('input').fill('0.5');
  xml = await showXml();
  ok('workbench: BenchBase, Building_WorkTable, bills tab, interaction cell', /ParentName="BenchBase"/.test(xml) && /<thingClass>Building_WorkTable<\/thingClass>/.test(xml) && /ITab_Bills/.test(xml) && /<hasInteractionCell>True<\/hasInteractionCell>/.test(xml) && /<size>\(3,1\)<\/size>/.test(xml) && /<drawSize>\(3\.5,1\.5\)<\/drawSize>/.test(xml));
  ok('workbench power comps and speed', /CompPowerTrader/.test(xml) && /<basePowerConsumption>120<\/basePowerConsumption>/.test(xml) && /CompProperties_Flickable/.test(xml) && /<WorkTableWorkSpeedFactor>0\.5<\/WorkTableWorkSpeedFactor>/.test(xml) && /<unpoweredWorkTableWorkSpeedFactor>0\.5/.test(xml));
  ok('workbench not auto-added to apparel bench list', !(await page.evaluate(() => JSON.stringify(ModBuilder.M.project.items.filter((i) => i.type === 'apparel').map((i) => i.workbenches))).then((v) => v.includes('Oak'))));
  // export keeps proportions
  await page.click('#btnModExport'); await page.waitForTimeout(1500);
  const exp = state.exports[0]; ok('exported', !!exp);
  const dims = (b64) => { const buf = Buffer.from(b64, 'base64'); return [buf.readUInt32BE(16), buf.readUInt32BE(20)]; };
  const bp = exp.files.filter((f) => f.base64 && /Things\/Building\//.test(f.path));
  ok('building pictures not squared: ' + bp.map((p) => dims(p.base64).join('x')), bp.length >= 1 && bp.every((p) => dims(p.base64).join('x') === '200x100'));
  ok('no page errors ' + errs.join(';'), errs.length === 0);
  console.log('BUILDINGS_OK'); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
