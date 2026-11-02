'use strict';
// A rectangular sprite is drawn onto a square like the game (stretch on), and warned about.
// usage: node test/stretch_check.js <scratchDir>
const path = require('path'); const assert = require('assert'); const { execFileSync } = require('child_process');
const { chromium } = require('playwright'); const installStub = require('./stub');
(async () => {
  const dir = path.join(process.argv[2], 'wide');
  execFileSync('python3', ['-I', '-c', `
import os,sys
from PIL import Image
d=sys.argv[1]; os.makedirs(d+'/Apparel',exist_ok=True)
for f in ('south','east','north'): Image.new('RGBA',(200,100),(255,0,0,255)).save(d+'/Apparel/Wide_%s.png'%f)
`, dir]);
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1500, height: 900 } });
  await installStub(page, [{ path: dir, category: 'apparel' }]);
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  await page.waitForFunction(() => S.game && S.game.entries.length > 0);
  const ok = (n, c) => { assert.ok(c, n); console.log('ok -', n); };
  await page.evaluate(() => { S.layers = []; addFromEntry(S.game.entries[0]); S.selId = null; S.mode = 'single'; S.facing = 'south'; requestRender(); });
  await page.waitForTimeout(600);
  const box = () => page.evaluate(() => {
    const c = document.getElementById('view'), g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data;
    let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const i = (y * c.width + x) * 4; if (d[i] > 200 && d[i + 1] < 60 && d[i + 2] < 60) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
    return [x1 - x0 + 1, y1 - y0 + 1];
  });
  let [w, h] = await box();
  ok('stretch on: drawn square (' + w + '×' + h + ')', Math.abs(w - h) <= 3);
  await page.evaluate(() => { S.stretch = false; requestRender(); }); await page.waitForTimeout(300);
  [w, h] = await box();
  ok('stretch off: keeps 2:1 (' + w + '×' + h + ')', Math.abs(w / h - 2) < 0.1);
  await page.evaluate(() => { S.stretch = true; S.selId = S.layers[0].id; renderLayerList(); renderProps(); }); await page.waitForTimeout(300);
  ok('non-square warning shown', (await page.textContent('#propsBody')).includes('STRETCHED'));
  ok('no page errors', errs.length === 0);
  await b.close(); console.log('STRETCH_OK');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
