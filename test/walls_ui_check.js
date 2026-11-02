'use strict';
// Wall and booster forms show the right fields. usage: node test/walls_ui_check.js <scratchDir>
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');
const installStub = require('./stub');
(async () => {
  const dir = path.join(process.argv[2], 'bwide2');
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  await installStub(page, [{ path: dir, category: 'apparel' }]);
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  await page.waitForFunction(() => S.game && S.game.entries.length > 0);
  await page.click('#btnModOpen');
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Building');
  await page.waitForTimeout(250);
  const row = (t) => page.locator('#modForm .mrow', { has: page.locator(`label:text-is("${t}")`) });
  const ok = (n, c) => {
    assert.ok(c, n);
    console.log('ok -', n);
  };
  await page.selectOption('#modForm .mrow:has(label:text-is("Kind of building")) select', 'wall');
  await page.waitForTimeout(250);
  ok(
    'wall: sheet field, no size / rotation / walking fields',
    (await row('Wall sheet (the smooth look when per-material sheets are on)').count()) === 1 &&
      (await row('Width in cells').count()) === 0 &&
      (await row('Walking over it').count()) === 0 &&
      (await row('Can be rotated (has a picture for each direction)').count()) === 0,
  );
  ok('wall: custom stats still there', (await row('More item properties').count()) === 1);
  await page.locator('#modForm .mrow:has(label:text-is("Different sheet per material look (smooth / bricks / planks)")) input').check();
  await page.waitForTimeout(250);
  ok('per-material sheets appear', (await row('Sheet: bricks').count()) === 1 && (await row('Sheet: planks').count()) === 1);
  await page.selectOption('#modForm .mrow:has(label:text-is("Kind of building")) select', 'facility');
  await page.waitForTimeout(250);
  ok(
    'booster: target / offsets / range fields, no wall sheet',
    (await row('Makes these buildings better').count()) === 1 &&
      (await row('What it adds to them').count()) === 1 &&
      (await row('Must touch the bench').count()) === 1 &&
      (await row('Wall sheet (the smooth look when per-material sheets are on)').count()) === 0,
  );
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Item');
  await page.waitForTimeout(250);
  ok(
    'item: kind, stack and picture fields',
    (await row('Kind of item').count()) === 1 &&
      (await row('How many fit in one stack').count()) === 1 &&
      (await row('Picture (single image)').count()) === 1,
  );
  ok('item: material fields hidden until ticked', (await row('Material category').count()) === 0);
  await page.locator('#modForm .mrow:has(label:text-is("Can be used as a building / weapon / apparel material")) input').check();
  await page.waitForTimeout(250);
  ok('item: material fields appear', (await row('Material category').count()) === 1 && (await row('Material strength').count()) === 1);
  await page.selectOption('#modForm .mrow:has(label:text-is("Kind of item")) select', 'chunk');
  await page.waitForTimeout(250);
  ok(
    'chunk: no material fields, smelting option',
    (await row('Material category').count()) === 0 && (await row('Can be smelted into other things').count()) === 1,
  );
  assert.deepStrictEqual(errs, []);
  await b.close();
  console.log('WALLS_UI_OK');
})();
