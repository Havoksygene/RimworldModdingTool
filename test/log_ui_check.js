'use strict';
// Game log tab: find the log, explain errors, link to the item. usage: node test/log_ui_check.js <scratchDir>
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');
const installStub = require('./stub');
(async () => {
  const dir = path.join(process.argv[2], 'bwide2');
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const state = await installStub(page, [{ path: dir, category: 'apparel' }]);
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  await page.waitForFunction(() => S.game && S.game.entries.length > 0);
  const ok = (n, c) => {
    assert.ok(c, n);
    console.log('ok -', n);
  };
  await page.click('#btnModOpen');
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Item');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const it = MB.sel();
    it.label = 'Moon Berry';
    it.defName = 'MB_MoonBerry';
    MB.changed(true);
  });
  state.logs = [{ path: '/home/x/Player.log', name: 'Player.log', mtime: Date.now() - 120000, size: 20480 }];
  state.logText = `Could not resolve cross-reference to Verse.ThingDef named Steal (wanter=Verse.ThingDef.costList) in MB_MoonBerry
(Filename: C:/x Line: 39)

Could not resolve cross-reference to Verse.ThingDef named SomeoneElse (wanter=Verse.ThingDef.costList) in Other_Thing
(Filename: C:/x Line: 39)
`;
  await page.click('#modTabs >> text=Game log');
  ok('log tab visible, check hidden', (await page.isVisible('#modLog')) && !(await page.isVisible('#modOut')));
  await page.click('#modLog >> text=Find the game log');
  await page.waitForSelector('#modLog .logcard');
  const title = await page.textContent('#modLog .logcard .t');
  ok('finding explained', /Unknown .*Steal/.test(title));
  ok('did you mean shown', /Did you mean "Steel"/.test(await page.textContent('#modLog .logcard .fix')));
  ok('other mod hidden in a collapsed list', (await page.locator('#modLog .logcard').count()) === 1 && /not about your mod/.test(await page.textContent('#modLog .logout')));
  await page.click('#modLog .logcard .item');
  ok('link selects the item', await page.evaluate(() => MB.sel().defName === 'MB_MoonBerry'));
  ok('copy button present', (await page.locator('#modLog >> text=Copy report for Claude').count()) === 1);
  await page.click('#modTabs >> text=Check');
  ok('back to check tab', await page.isVisible('#modOut'));
  ok('no page errors', errs.length === 0);
  console.log('LOG_UI_OK');
  await b.close();
})().catch((e) => {
  console.error('FAIL', e.message);
  process.exit(1);
});
