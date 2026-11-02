'use strict';
// "Update available" button. usage: node test/update_ui_check.js <scratchDir>
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');
const installStub = require('./stub');
(async () => {
  const dir = path.join(process.argv[2], 'bwide2');
  const b = await chromium.launch();
  const ok = (n, c) => (assert.ok(c, n), console.log('ok -', n));
  for (const withUpdate of [false, true]) {
    const page = await b.newPage({ viewport: { width: 1500, height: 1000 } });
    await installStub(page, [{ path: dir, category: 'apparel' }]);
    if (withUpdate) await page.addInitScript(() => { window.__update = { version: '9.9.9', url: 'https://github.com/Havoksygene/RimworldModdingTool/releases/tag/v9.9.9', notes: 'n' }; });
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
    await page.waitForFunction(() => S.game && S.game.entries.length > 0);
    await page.waitForTimeout(300);
    if (!withUpdate) ok('no button without an update', !(await page.isVisible('#btnUpdate')));
    else {
      ok('button shown with version', (await page.textContent('#btnUpdate')).includes('9.9.9') && (await page.isVisible('#btnUpdate')));
      await page.click('#btnUpdate');
      ok('click opens the release page', (await page.evaluate(() => window.__opened)).includes('/releases/tag/v9.9.9'));
      await page.click('#btnModOpen');
      ok('also shown in the mod builder', await page.isVisible('#btnUpdate2'));
    }
    ok('no page errors', errs.length === 0);
    await page.close();
  }
  await b.close();
  console.log('update_ui_check OK');
})().catch((e) => (console.error(e), process.exit(1)));
