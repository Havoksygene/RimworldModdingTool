'use strict';
// Body-type comparison, saved asset defaults, head/hair cycling, colour presets, settings export/import.
// usage: node test/round_check.js <fakeGameDir>
const path = require('path'); const assert = require('assert');
const { chromium } = require('playwright'); const installStub = require('./stub');
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1500, height: 900 } });
  const state = await installStub(page, [process.argv[2]]);
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  await page.waitForFunction(() => S.game && S.layers.length >= 3);
  const ev = (f, a) => page.evaluate(f, a); const ok = (n, c) => { assert.ok(c, n); console.log('ok -', n); };

  // body-type comparison
  await page.click('#modeSeg button[data-m="bodies"]');
  await page.waitForTimeout(300);
  const dims = await ev(() => [$('view').width, $('view').height, cellSize(), S.game.bodyTypes.filter((b) => b.bodyNakedGraphicPath || b.headOffset).length]);
  ok('one cell per body type', dims[0] === dims[2] * dims[3] && dims[3] >= 2);
  ok('compare restores state', (await ev(() => S.layers.every((l) => l.images) && S.headOffset[1] > 0)));
  await page.click('#modeSeg button[data-m="single"]');

  // head / hair cycling
  const h0 = await ev(() => S.layers.find((l) => l.kind === 'hair').srcBase);
  await page.click('#hairNext'); await page.waitForTimeout(100);
  if (!(await ev(() => S.layers.some((l) => l.kind === 'hair')))) { await page.click('#hairNext'); await page.waitForTimeout(100); }   // "none" is part of the cycle
  const h1 = await ev(() => S.layers.find((l) => l.kind === 'hair').srcBase);
  ok('hair cycles', h0 !== h1);
  await page.click('#hairPrev');
  if (!(await ev(() => S.layers.some((l) => l.kind === 'hair')))) await page.click('#hairPrev');
  ok('hair cycles back', (await ev(() => S.layers.find((l) => l.kind === 'hair').srcBase)) === h0);
  await page.click('#headNext');
  ok('only one head layer', (await ev(() => S.layers.filter((l) => l.kind === 'head').length)) === 1);

  // colour presets
  await page.selectOption('#skinPre', { label: 'Dark' });
  ok('skin preset applied', (await ev(() => S.skin)) === '#5e3b26');
  await page.selectOption('#hairPre', { label: 'Blond' });
  ok('hair preset applied', (await ev(() => S.hair)) === '#c9a35a');

  // saved asset default: tweak a layer, save, delete it, add again
  await ev(() => addFromEntry(S.game.entries.find((e) => e.cat === 'apparel')));
  await ev(() => { const l = selLayer(); l.off.south = [0.07, 0.11]; l.drawSize = 1.1; renderProps(); });
  await page.locator('#propsBody button', { hasText: 'Save as asset default' }).click();
  await ev(() => { S.layers = S.layers.filter((l) => l !== selLayer()); S.selId = null; afterLayersChanged(); });
  await ev(() => addFromEntry(S.game.entries.find((e) => e.cat === 'apparel')));
  const re = await ev(() => { const l = selLayer(); return [l.off.south, l.drawSize]; });
  ok('asset comes back with saved offset and size', re[0][0] === 0.07 && re[0][1] === 0.11 && re[1] === 1.1);
  // a head with a saved default keeps it when swapped
  await ev(() => { const l = S.layers.find((x) => x.kind === 'head'); S.selId = l.id; l.off.south = [0.02, 0.03]; renderProps(); });
  await page.locator('#propsBody button', { hasText: 'Save as asset default' }).click();
  const hb = await ev(() => S.layers.find((x) => x.kind === 'head').srcBase);
  await page.click('#headNext'); await page.click('#headPrev');
  ok('swapping back restores that head\'s own default', (await ev((b0) => S.layers.find((x) => x.kind === 'head' && x.srcBase === b0).off.south[0], hb)) === 0.02);

  // export / import
  await page.evaluate(() => { document.getElementById('toolsBox').open = true; }); await page.click('#btnOvExport');
  const exported = JSON.parse(state.saved.at(-1).text);
  ok('export contains the saved default', Object.values(exported).some((o) => o.layer));
  assert.deepStrictEqual(errs, []); await b.close(); console.log('ROUND_OK');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
