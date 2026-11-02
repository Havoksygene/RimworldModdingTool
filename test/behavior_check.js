'use strict';
// Behaviour checks for the renderer, run in Chromium with window.api stubbed by the real indexer.
// usage: node test/behavior_check.js <fakeGameDir> <scratchDir>
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const idx = require('../lib/indexer');
const installStub = require('./stub');

(async () => {
  const [gameDir, scratch] = process.argv.slice(2);
  // two own-sprite files with different sizes, to trigger the size warning
  execFileSync('python3', ['-I', '-c', `
from PIL import Image
import sys
d=sys.argv[1]
Image.new('RGBA',(128,128),(0,200,0,255)).save(d+'/mine_south.png')
Image.new('RGBA',(64,64),(0,200,0,255)).save(d+'/mine_east.png')
Image.new('RGBA',(128,128),(0,200,0,255)).save(d+'/mine_north.png')
`, scratch]);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  const state = await installStub(page, gameDir.split(path.delimiter));
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  await page.waitForFunction(() => S.game && S.layers.length >= 3);
  await page.waitForTimeout(400);

  const ev = (fn, arg) => page.evaluate(fn, arg);
  const check = (name, cond) => { assert.ok(cond, name); console.log('ok -', name); };

  // 1. starting pawn uses the body type head offset
  check('starting pawn has body, head, hair', (await ev(() => S.layers.map((l) => l.kind).join())) === 'body,head,hair');
  check('head offset applied from BodyTypeDef', (await ev(() => S.headOffset[1])) === 0.34);

  // 2. add apparel, undo, redo
  await ev(() => addFromEntry(S.game.entries.find((e) => e.cat === 'apparel')));
  check('apparel added', (await ev(() => S.layers.length)) === 4);
  await page.keyboard.press('Control+z');
  check('undo removes it', (await ev(() => S.layers.length)) === 3);
  await page.keyboard.press('Control+y');
  check('redo brings it back', (await ev(() => S.layers.length)) === 4);

  // 3. drag moves the selected layer, undo reverts the drag
  const before = await ev(() => [...selLayer().off.south]);
  const box = await page.locator('#view').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 - 30, { steps: 4 });
  await page.mouse.up();
  const after = await ev(() => [...selLayer().off.south]);
  check('drag changed the offset', after[0] > before[0] && after[1] > before[1]);
  await page.keyboard.press('Control+z');
  const reverted = await ev(() => [...selLayer().off.south]);
  check('undo reverts the drag', Math.abs(reverted[0] - before[0]) < 1e-9 && Math.abs(reverted[1] - before[1]) < 1e-9);

  // 4. hat hides hair: count hair-coloured pixels before/after
  const hairPixels = () => ev(() => {
    render();
    const c = $('view'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 0x4a) < 10 && Math.abs(d[i + 1] - 0x30) < 10 && Math.abs(d[i + 2] - 0x20) < 10) n++;
    return n;
  });
  const hp0 = await hairPixels();
  await ev(() => { const l = selLayer(); l.slot = 'headgear'; l.hidesHair = true; render(); });
  const hp1 = await hairPixels();
  check('hair visible before hat (' + hp0 + ' px)', hp0 > 500);
  // a few anti-aliased pixels of the dashed selection outline can match the hair colour by chance
  check('full-head hat hides the hair (' + hp1 + ' px left)', hp1 < 50);

  // 5. sort like the game: headgear above hair, weapon on top
  await ev(() => addFromEntry(S.game.entries.find((e) => e.cat === 'weapons')));
  await ev(() => { S.layers.reverse(); sortLikeGame(); });
  check('sorted order', (await ev(() => S.layers.map((l) => l.kind + (l.slot ? ':' + l.slot : '')).join())) === 'body,head,hair,apparel:headgear,weapon');

  // 6. xml values
  const xml = await ev(() => { const l = S.layers.find((x) => x.kind === 'apparel'); l.off.east = [0.05, 0.1]; return xmlFor(l); });
  check('xml has texPath without facing suffix', xml.includes('<texPath>Things/Apparel/Shirt/Shirt_Basic</texPath>'));
  check('xml has east offset', xml.includes('<drawOffsetEast>(0.05,0,0.1)</drawOffsetEast>'));
  check('xml is flagged unverified', xml.includes('NOT verified'));

  // 7. own files with mismatched facing sizes -> warning
  await ev(async (dir) => {
    const r = await window.api.facingsFor(dir + '/mine_south.png');
    addOrReplace(newLayer('gene', 'mine', refsFromFiles(r)));
  }, scratch);
  await page.waitForTimeout(500);
  await ev(() => renderProps());
  const warn = await ev(() => (document.getElementById('notice') || {}).textContent || '');
  check('size mismatch warned', /different pixel sizes/.test(warn));

  // 8. wheel zoom + saved settings
  const z0 = await ev(() => S.ppt);
  await page.mouse.move(box.x + 50, box.y + 50);
  await page.mouse.wheel(0, -100);
  const z1 = await ev(() => S.ppt);
  check('wheel zooms in', z1 > z0);
  check('zoom saved', JSON.parse(await ev(() => localStorage.getItem('rsv-prefs'))).ppt === z1);

  // 9. every layer type renders in all four facings without throwing
  const ok = await ev(() => { try { for (const f of FACINGS) { S.facing = f; S.mode = 'single'; render(); } S.mode = 'sheet'; render(); return true; } catch (e) { return e.message; } });
  check('renders all facings', ok === true);

  await page.screenshot({ path: path.join(scratch, 'behavior.png') });
  await browser.close();
  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
  console.log('BEHAVIOR_OK');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
