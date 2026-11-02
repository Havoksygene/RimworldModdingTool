'use strict';
// Placeholder gene pack: genes are categorised, presets apply (tail behind body, ears follow head), screenshot for a look.
// usage: node test/genes_check.js <fakeGameDir> <genePlaceholderDir> <out.png>
const path = require('path'); const assert = require('assert');
const { chromium } = require('playwright'); const installStub = require('./stub');
(async () => {
  const [game, gp, out] = process.argv.slice(2);
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1500, height: 900 } });
  await installStub(page, [game, { path: gp, category: 'genes' }]);
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  await page.waitForFunction(() => S.game && S.layers.length >= 3);
  const ok = (n, c) => { assert.ok(c, n); console.log('ok -', n); };
  await page.evaluate(() => { for (const n of ['PH_Tail', 'PH_Ears_Cat', 'PH_Horns_Mini']) addFromEntry(S.game.entries.find((e) => e.base.endsWith('/' + n))); });
  const ls = await page.evaluate(() => S.layers.filter((l) => l.kind === 'gene').map((l) => [l.name, l.followHead, l.behind.south, l.tintMode]));
  ok('3 gene layers with presets: ' + JSON.stringify(ls), ls.length === 3 && ls.find((x) => x[0] === 'PH_Tail')[2] === true && ls.find((x) => x[0] === 'PH_Ears_Cat')[1] === true);
  await page.waitForTimeout(500);
  await page.click('#modeSeg button[data-m="sheet"]'); await page.waitForTimeout(500);
  await page.locator('#view').screenshot({ path: out });
  ok('no page errors', errs.length === 0);
  await b.close(); console.log('GENES_OK');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
