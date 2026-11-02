'use strict';
// Beard is its own layer kind: hair + beard together, hats can hide hair and/or beard.
// usage: node test/beard_check.js <scratchDir>
const path = require('path'); const assert = require('assert'); const { execFileSync } = require('child_process');
const { chromium } = require('playwright'); const installStub = require('./stub');
(async () => {
  const dir = path.join(process.argv[2], 'beards');
  execFileSync('python3', ['-I', '-c', `
import os,sys
from PIL import Image
d=sys.argv[1]
def mk(rel,col):
    p=os.path.join(d,rel); os.makedirs(os.path.dirname(p),exist_ok=True); Image.new('RGBA',(128,128),col).save(p)
for f in ('south','east','north'):
    mk('Hairs/Bob_%s.png'%f,(90,60,30,255)); mk('Beards/BeardFull_%s.png'%f,(60,40,20,255)); mk('Apparel/Mask/Mask_%s.png'%f,(0,0,255,255))
`, dir]);
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1500, height: 900 } });
  await installStub(page, [dir]);
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  await page.waitForFunction(() => S.game && S.game.entries.length >= 3);
  const ok = (n, c) => { assert.ok(c, n); console.log('ok -', n); };
  const cats = await page.evaluate(() => S.game.entries.map((e) => e.base + ':' + e.cat));
  ok('beards get their own category: ' + cats.join(','), cats.some((c) => /BeardFull:beards/.test(c)) && cats.some((c) => /Bob:hair/.test(c)));
  await page.evaluate(() => { for (const e of S.game.entries) addFromEntry(e); });
  const kinds = await page.evaluate(() => S.layers.map((l) => l.kind));
  ok('hair and beard coexist: ' + kinds, kinds.includes('hair') && kinds.includes('beard'));
  ok('beard follows head and uses the hair colour', await page.evaluate(() => { const l = S.layers.find((x) => x.kind === 'beard'); return l.followHead && l.tintMode === 'hair'; }));
  await page.evaluate(() => { const l = S.layers.find((x) => x.kind === 'apparel'); l.slot = 'headgear'; l.hidesBeard = true; l.hidesHair = false; });
  ok('hat hides beard only', await page.evaluate(() => {
    let drawn = []; const o = drawLayer; window.drawLayer = (ctx, l) => { drawn.push(l.kind); };
    try { drawPawn(document.createElement('canvas').getContext('2d'), 0, 0, 'south'); } finally { window.drawLayer = o; }
    return drawn.includes('hair') && !drawn.includes('beard');
  }));
  ok('no page errors', errs.length === 0);
  await b.close(); console.log('BEARD_OK');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
