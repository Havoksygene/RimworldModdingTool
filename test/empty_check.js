'use strict';
const path = require('path'); const assert = require('assert');
const { chromium } = require('playwright'); const installStub = require('./stub');
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1500, height: 900 } });
  await installStub(page, []); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  await page.waitForTimeout(600);
  assert.ok(/No sprites yet/.test(await page.textContent('#gameStatus')), 'empty-state message');
  assert.strictEqual(await page.evaluate(() => S.layers.length), 0);
  assert.deepStrictEqual(errs, []); await b.close(); console.log('EMPTY_OK');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
