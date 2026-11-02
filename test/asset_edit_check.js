'use strict';
const path = require('path'); const assert = require('assert');
const { chromium } = require('playwright'); const installStub = require('./stub');
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1500, height: 900 } });
  await installStub(page, [], { starter: true });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  await page.waitForFunction(() => S.game && S.layers.length >= 3);
  await page.click('#tabs .tab[data-cat="apparel"]');
  const item = page.locator('#libList .item', { hasText: 'Starter_Jacket' }).first();
  const n0 = await page.evaluate(() => S.layers.length);
  await item.click();
  await page.waitForSelector('#assetEdit select');
  assert.strictEqual(await page.evaluate(() => S.layers.length), n0, 'single click must not add a layer');
  await item.dblclick();
  assert.strictEqual(await page.evaluate(() => S.layers.length), n0 + 1, 'double click adds');
  const before = await page.evaluate(() => selLayer().slot);
  await page.selectOption('#assetEdit select', 'apparel-headgear');
  const after = await page.evaluate(() => { const l = selLayer(); return [l.slot, l.followHead, JSON.parse(localStorage.getItem('rsv-overrides'))[l.srcBase].type]; });
  assert.strictEqual(before, 'torso'); assert.deepStrictEqual(after, ['headgear', true, 'apparel-headgear']);
  // reclassify as a weapon: moves tabs
  await page.selectOption('#assetEdit select', 'weapon');
  await page.click('#tabs .tab[data-cat="weapons"]');
  assert.ok(await page.locator('#libList .item', { hasText: 'Starter_Jacket' }).count() > 0, 'moved to weapons tab');
  await page.locator('#assetEdit button', { hasText: 'Reset' }).click();
  assert.strictEqual(await page.evaluate(() => Object.keys(OV).length), 0);
  // multi-select: ctrl+click two apparel items, set both to headgear
  await page.click('#tabs .tab[data-cat="apparel"]');
  const items = page.locator('#libList .item');
  await items.nth(0).click(); await items.nth(1).click({ modifiers: ['Control'] });
  assert.ok((await page.textContent('#assetEdit')).includes('2 assets selected'));
  await page.selectOption('#assetEdit select', 'apparel-headgear');
  assert.strictEqual(await page.evaluate(() => Object.values(OV).filter((o) => o.type === 'apparel-headgear').length), 2);
  assert.strictEqual(await page.evaluate(() => Object.values(OV).every((o) => o.hidesHair === false)), true, 'hides hair off by default');
  // Delete key removes the selected layer
  await items.nth(0).dblclick();
  const n1 = await page.evaluate(() => S.layers.length);
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('Delete');
  assert.strictEqual(await page.evaluate(() => S.layers.length), n1 - 1, 'Delete removes the layer');
  // no keyword guessing: a name like Helmet stays torso
  assert.strictEqual(await page.evaluate(() => isHeadgearName('Armor_Helmet')), false);
  assert.deepStrictEqual(errs, []);
  await b.close(); console.log('ASSET_EDIT_OK');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
