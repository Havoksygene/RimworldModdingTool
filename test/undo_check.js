'use strict';
// Undo / redo of project edits. usage: node test/undo_check.js <scratchDir>
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
  const ok = (n, c) => {
    assert.ok(c, n);
    console.log('ok -', n);
  };
  await page.click('#btnModOpen');
  const n = () => page.evaluate(() => MB.M.project.items.length);
  ok('undo disabled at start', await page.isDisabled('#btnModUndo'));
  await page.click('#modAddBtn');
  await page.click('#modAddMenu >> text=+ Item');
  await page.waitForTimeout(800);
  ok('one item', (await n()) === 1);
  ok('undo enabled', !(await page.isDisabled('#btnModUndo')));
  await page.evaluate(() => { MB.sel().label = 'Alpha'; MB.changed(false); });
  await page.waitForTimeout(800);
  await page.evaluate(() => { MB.sel().label = 'Alpha Beta'; MB.changed(false); });
  await page.click('#btnModUndo'); // flushes the pending step, goes back to "Alpha"
  ok('undo restores previous label', (await page.evaluate(() => MB.sel().label)) === 'Alpha');
  await page.click('#btnModUndo');
  await page.click('#btnModUndo');
  ok('undo back to empty project', (await n()) === 0);
  ok('undo disabled again', await page.isDisabled('#btnModUndo'));
  ok('redo enabled', !(await page.isDisabled('#btnModRedo')));
  await page.click('#btnModRedo');
  await page.click('#btnModRedo');
  ok('redo brings item back', (await n()) === 1 && (await page.evaluate(() => MB.sel().label)) === 'Alpha');
  await page.evaluate(() => { MB.sel().label = 'Gamma'; MB.changed(false); });
  await page.waitForTimeout(800);
  ok('new edit clears redo', await page.isDisabled('#btnModRedo'));
  await page.keyboard.press('Control+z');
  ok('Ctrl+Z works outside text fields', (await page.evaluate(() => MB.sel().label)) === 'Alpha');
  await page.keyboard.press('Control+y');
  ok('Ctrl+Y redoes', (await page.evaluate(() => MB.sel().label)) === 'Gamma');
  await page.click('#btnModNew').catch(() => {});
  ok('no page errors', errs.length === 0);
  await b.close();
  console.log('undo_check OK');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
