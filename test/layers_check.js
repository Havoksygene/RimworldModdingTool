'use strict';
// Layer reordering (arrows + drag), apparel layer sorting, quick-swap grid incl. body.
// usage: node test/layers_check.js <fakeGameDir>
const path = require('path'); const assert = require('assert');
const { chromium } = require('playwright'); const installStub = require('./stub');
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1500, height: 900 } });
  await installStub(page, [process.argv[2]]);
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  await page.waitForFunction(() => S.game && S.layers.length >= 3);
  const ok = (n, c) => { assert.ok(c, n); console.log('ok -', n); };
  const names = () => page.evaluate(() => S.layers.map((l) => l.name));
  ok('quick swap has body/head/hair/beard rows', (await page.$$('#swapGrid button')).length === 8);
  const before = await names();
  await page.click('#bodyNext');
  ok('body swap keeps one body', await page.evaluate(() => S.layers.filter((l) => l.kind === 'body').length === 1));
  // arrow: move the top row down one step
  const first = (await page.$$('#layerList .layer .mv button'))[1];   // "down" of top row
  const topName = await page.evaluate(() => S.layers[S.layers.length - 1].name);
  await first.click();
  ok('down arrow moves the top layer back one', await page.evaluate((n) => S.layers[S.layers.length - 2].name === n, topName));
  const up = (await page.$$('#layerList .layer .mv button'))[2];     // "up" of second row (the one that just moved up)
  await up.click();
  ok('up arrow brings it back to the top', await page.evaluate((n) => S.layers[S.layers.length - 1].name === n, topName));
  // drag and drop: drag last row onto first row
  const dragged = await page.evaluate(() => S.layers[0].id);   // bottom row
  await page.locator('#layerList .layer').last().dragTo(page.locator('#layerList .layer').first());
  ok('drag and drop moves the bottom row to the top', await page.evaluate((id) => S.layers[S.layers.length - 1].id === id, dragged));
  // apparel layers sort
  await page.evaluate(() => {
    S.layers = S.layers.filter((l) => l.kind !== 'apparel');
    const mk = (n, al) => { const l = newLayer('apparel', n, {}); l.slot = 'torso'; l.apparelLayer = al; S.layers.push(l); };
    mk('pack', 'Belt'); mk('shirt', 'OnSkin'); mk('coat', 'Shell');
    sortLikeGame();
  });
  const order = (await names()).filter((n) => ['pack', 'shirt', 'coat'].includes(n));
  ok('sort follows OnSkin < Shell < Belt: ' + order, order.join() === 'shirt,coat,pack');
  // hair/beard cycling includes "none"
  const hairBefore = await page.evaluate(() => S.layers.some((l) => l.kind === 'hair'));
  let sawNone = false;
  for (let i = 0; i < 12; i++) { await page.click('#hairNext'); if (!(await page.evaluate(() => S.layers.some((l) => l.kind === 'hair')))) { sawNone = true; break; } }
  ok('hair arrows reach "none" (was ' + hairBefore + ')', sawNone);
  await page.click('#hairNext');
  ok('and come back to a hair', await page.evaluate(() => S.layers.some((l) => l.kind === 'hair')));
  // offsets helper
  await page.evaluate(() => { const l = S.layers.find((x) => x.kind === 'body'); S.selId = l.id; l.off.south = [0.1, 0.2]; renderProps(); });
  await page.evaluate(() => { S.facing = 'south'; renderProps(); return 1; });
  await page.click('text=Copy to all views');
  ok('offset copied to every view', await page.evaluate(() => { const l = S.layers.find((x) => x.kind === 'body'); return l.off.east[0] === 0.1 && l.off.north[1] === 0.2; }));
  ok('stretch setting exists and defaults on', await page.evaluate(() => S.stretch === true && document.getElementById('stretch').checked));
  ok('no page errors', errs.length === 0);
  await b.close(); console.log('LAYERS_OK');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
