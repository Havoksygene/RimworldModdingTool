'use strict';
// Picture adjust: viewer size/offset baked as "fit", editor window, export crops / pads / shifts accordingly.
// usage: node test/fit_check.js <scratchDir>
const path = require('path'); const assert = require('assert'); const { execFileSync } = require('child_process');
const { chromium } = require('playwright'); const installStub = require('./stub');
(async () => {
  const dir = path.join(process.argv[2], 'fitw');
  execFileSync('python3', ['-I', '-c', `
import os,sys
from PIL import Image
d=sys.argv[1]; os.makedirs(d+'/Apparel',exist_ok=True)
for f in ('south','east','north'): Image.new('RGBA',(200,100),(255,0,0,255)).save(d+'/Apparel/Fit_%s.png'%f)
`, dir]);
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const state = await installStub(page, [{ path: dir, category: 'apparel' }]);
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  await page.waitForFunction(() => S.game && S.game.entries.length > 0);
  const ok = (n, c) => { assert.ok(c, n); console.log('ok -', n); };
  await page.evaluate(() => { S.tab = 'all'; addFromEntry(S.game.entries[0]); const l = S.layers.find((x) => x.kind === 'apparel'); l.drawSize = 1.65; l.off.south = [0.15, 0]; S.selId = l.id; ModBuilder.fromLayer(l); });
  await page.waitForTimeout(500);
  const fit = () => page.evaluate(() => { const it = ModBuilder.M.project.items.find((i) => i.type === 'apparel'); const w = it.sprites.worn; return { s: w.south && w.south.fit, e: w.east && w.east.fit }; });
  let f = await fit();
  ok('viewer size +10% baked as zoom 1.1', f.s && Math.abs(f.s.z - 1.1) < 0.01);
  ok('viewer offset baked as shift (0.15 / 1.5 = 0.1)', Math.abs(f.s.x - 0.1) < 0.01);
  ok('a view without offset still gets the zoom', f.e && Math.abs(f.e.z - 1.1) < 0.01 && Math.abs(f.e.x) < 0.001);
  await page.fill('#modMeta [data-k=name]', 'Fit Test'); await page.fill('#modMeta [data-k=author]', 'T');
  await page.fill('#modForm .mrow:has(label:text-is("Name shown in game")) input', 'Fit Helm'); await page.waitForTimeout(200);
  // editor window
  await page.locator('#modForm .mrow', { has: page.locator('label:text-is("Worn sprite (south / east / north)")') }).locator('text=Adjust picture…').click();
  ok('editor opens', await page.isVisible('.pick canvas'));
  await page.click('.pick >> text=Fill the square'); await page.click('.pick >> text=Apply'); await page.waitForTimeout(200);
  f = await fit();
  ok('"Fill the square" on a 2:1 picture gives zoom 2', f.s && Math.abs(f.s.z - 2) < 0.01);
  // set exact values for the export check
  await page.evaluate(() => { const w = ModBuilder.M.project.items.find((i) => i.type === 'apparel').sprites.worn; w.south.fit = { z: 2, x: 0, y: 0 }; delete w.east.fit; w.north.fit = { z: 1, x: 0.5, y: 0 }; });
  await page.click('#btnModExport'); await page.waitForTimeout(2000);
  const exp = state.exports[0]; ok('exported', !!exp);
  const alpha = (b64, x, y) => page.evaluate(async ([d, x, y]) => { const im = new Image(); im.src = 'data:image/png;base64,' + d; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return [im.width, g.getImageData(x, y, 1, 1).data[3]]; }, [b64, x, y]);
  const file = (n) => exp.files.find((q) => q.base64 && new RegExp('Fit_Helm.*_' + n + '\\.png$|_' + n + '\\.png$').test(q.path) && /Apparel/.test(q.path) && !/Icon/i.test(q.path));
  const sA = await alpha(file('south').base64, 100, 10), eA = await alpha(file('east').base64, 100, 10), nL = await alpha(file('north').base64, 10, 100), nR = await alpha(file('north').base64, 190, 100);
  ok('zoom 2 fills the whole square (no padding)', sA[0] === 200 && sA[1] === 255);
  ok('no fit keeps the transparent padding', eA[1] === 0);
  ok('shift moves the picture right (left side empty, right side filled)', nL[1] === 0 && nR[1] === 255);
  ok('no page errors ' + errs.join(';'), errs.length === 0);
  console.log('FIT_OK'); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
