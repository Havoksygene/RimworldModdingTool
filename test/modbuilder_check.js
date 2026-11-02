'use strict';
// UI check for the mod builder. usage: node test/modbuilder_check.js <fakeGameDir> <scratchDir>
const path = require('path'); const assert = require('assert');
const { chromium } = require('playwright'); const installStub = require('./stub');
(async () => {
  const [gameDir, scratch] = process.argv.slice(2);
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1500, height: 900 } });
  const state = await installStub(page, [gameDir]);
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  await page.waitForFunction(() => S.game && S.layers.length >= 3);
  const ev = (f, a) => page.evaluate(f, a); const ok = (n, c) => { assert.ok(c, n); console.log('ok -', n); };

  // viewer layer -> mod item
  await ev(() => addFromEntry(S.game.entries.find((e) => e.cat === 'apparel')));
  await page.locator('#propsBody button', { hasText: 'Send to mod builder' }).click();
  ok('mod view opens', await page.isVisible('#modView') && !(await page.isVisible('#app')));
  ok('item created from the layer', (await ev(() => ModBuilder.M.project.items.length)) === 1 && (await page.textContent('#modItems')).includes('Shirt'));
  ok('worn sprite carried over', (await page.locator('#modForm canvas.thumb').count()) >= 3);
  ok('no errors for a complete item', (await page.textContent('#modOut')).includes('Ready to export'));

  // edit fields
  await page.fill('#modMeta [data-k=name]', 'Test Pack'); await page.fill('#modMeta [data-k=author]', 'Tester');
  ok('packageId auto-filled', (await page.inputValue('#modMeta [data-k=packageId]')) === 'tester.testpack');
  await page.selectOption('#modForm .mrow:has(label:text-is("Worn as")) select', 'headgear-full');
  ok('worn-as hides body-type field', (await page.locator('#modForm .mrow', { hasText: 'Body types with sprites' }).count()) === 0);
  await page.selectOption('#modForm .mrow:has(label:text-is("Worn as")) select', 'torso-shell');
  const pre = await page.textContent('#modPre');
  ok('xml preview shows the def', /<ThingDef ParentName="ApparelMakeableBase">/.test(pre));

  // a weapon via + Weapon, with a library sprite chosen
  await page.click('#modAddBtn'); await page.click('#modAddMenu button:has-text("Weapon")');
  ok('empty weapon reports problems', (await page.textContent('#modOut')).includes('problem'));
  await page.fill('#modForm .mrow >> nth=0 >> input', 'Zap Gun');
  await page.click('#modForm >> text=Melee').catch(() => {});
  await ev(() => { const it = ModBuilder.M.project.items.at(-1); it.sprites.main = { single: S.layers[0].images.south || S.layers[0].images.single }; });
  await page.click('#modItems .layer >> nth=1');
  ok('weapon form shows ranged fields', (await page.textContent('#modForm')).includes('Projectile'));
  await page.selectOption('#modForm .mrow:has-text("Weapon kind") select', 'melee');
  ok('switching to melee shows attacks', (await page.textContent('#modForm')).includes('Melee attacks'));
  ok('ready after fixing', (await page.textContent('#modOut')).includes('Ready to export'));

  // export goes through the bridge with PNG data
  await page.click('#btnModExport');
  await page.waitForFunction(() => document.getElementById('toast') && /files in/.test(document.getElementById('toast').textContent), null, { timeout: 8000 });
  const exp = state.exports[0];
  ok('export payload has folder and files', exp.folder === 'TestPack' && exp.files.length > 5);
  ok('xml files carry text, sprites carry png base64', exp.files.some((f) => /About\.xml$/.test(f.path) && f.text) && exp.files.some((f) => /\.png$/.test(f.path) && /^iVBOR/.test(f.base64)));

  // project survives save/reload
  const saved = await ev(() => JSON.stringify(ModBuilder.M.project));
  await page.waitForTimeout(500);
  await page.reload(); await page.waitForFunction(() => S.game);
  await ev(() => ModBuilder.show(true));
  ok('project restored after reload', (await ev(() => JSON.stringify(ModBuilder.M.project))) === saved);
  await page.screenshot({ path: path.join(scratch, 'modbuilder.png') });
  await page.click('#btnModBack'); ok('back to viewer', await page.isVisible('#app'));
  assert.deepStrictEqual(errs.filter((x) => !/Failed to load resource/.test(x)), []);
  await b.close(); console.log('MODBUILDER_OK');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
