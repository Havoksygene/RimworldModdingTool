'use strict';
// UI checks for DDS sprites, per-folder categories, grouping and empty-sprite warnings.
// usage: node test/dds_ui_check.js <scratchDir>
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const installStub = require('./stub');

(async () => {
  const scratch = process.argv[2];
  const heads = path.join(scratch, 'heads'), mine = path.join(scratch, 'mine');
  fs.rmSync(heads, { recursive: true, force: true }); fs.rmSync(mine, { recursive: true, force: true });
  fs.mkdirSync(heads, { recursive: true }); fs.mkdirSync(mine, { recursive: true });
  execFileSync('python3', ['-I', '-c', `
import sys
from PIL import Image, ImageDraw
d, m = sys.argv[1], sys.argv[2]
def head(col, name):
    im = Image.new('RGBA', (128, 128), (0, 0, 0, 0)); g = ImageDraw.Draw(im)
    g.ellipse([30, 20, 98, 110], fill=col)
    g.rectangle([10, 0, 30, 20], fill=(255, 255, 255, 255))      # asymmetric marker: top-left corner, to detect flips
    im.save(name, pixel_format='DXT5')
for f, c in [('south', (200, 160, 120, 255)), ('east', (190, 150, 110, 255)), ('north', (180, 140, 100, 255))]:
    head(c, f'{d}/Female_Narrow_Pointy_{f}.png.dds')
Image.new('RGBA', (128, 128), (0, 0, 0, 0)).save(m + '/Empty_south.png')   # fully transparent PNG
open(m + '/Broken_south.png', 'wb').write(b'not a png at all')
`, heads, mine]);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  const state = await installStub(page, [], { starter: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const check = (name, cond) => { assert.ok(cond, name); console.log('ok -', name); };
  const ev = (fn, a) => page.evaluate(fn, a);

  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  await page.waitForFunction(() => S.game && S.layers.length >= 3);

  // starter-only start
  check('starter pawn uses a starter body type', (await ev(() => /^Starter_/.test(S.bodyType))));

  // add a folder of .png.dds heads as category "heads"
  state.nextAdd = [heads];
  await page.selectOption('#addCat', 'heads');
  await page.click('#btnGame');
  await page.waitForFunction(() => S.game.entries.some((e) => e.base === 'Female_Narrow_Pointy'));
  const e = await ev(() => { const x = S.game.entries.find((y) => y.base === 'Female_Narrow_Pointy'); return { cat: x.cat, f: Object.keys(x.facings).sort().join() }; });
  check('dds group has 3 facings, category heads', e.cat === 'heads' && e.f === 'east,north,south');
  check('folder row has category select', (await ev(() => document.querySelector('#sourceList .src:not(.builtin) select').value)) === 'heads');

  // selecting it loads all facings as a head layer, decoded from DDS
  await page.click('#tabs .tab[data-cat="heads"]');
  await page.waitForSelector('#libList .item');
  await ev(() => addFromEntry(S.game.entries.find((x) => x.base === 'Female_Narrow_Pointy')));
  await page.waitForFunction(() => { const l = selLayer(); return l && ['south', 'east', 'north'].every((f) => imageState(l.images[f]) === 'ok'); });
  check('head layer got 3 facings', (await ev(() => Object.keys(selLayer().images).sort().join())) === 'east,north,south');
  const sz = await ev(() => { const i = getImage(selLayer().images.south); return [i.naturalWidth, i.naturalHeight]; });
  check('dds decoded to 128x128', sz[0] === 128 && sz[1] === 128);
  // marker pixel: top-left white block must be at the top when not flipped
  const top = async () => ev(() => { const i = getImage(selLayer().images.south), c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return [g.getImageData(15, 5, 1, 1).data[3], g.getImageData(15, 122, 1, 1).data[3]]; });
  let t = await top();
  check('dds upright by default', t[0] > 200 && t[1] === 0);
  await page.evaluate(() => { document.getElementById('toolsBox').open = true; }); await page.check('#flipDds');
  await page.waitForFunction(() => { const l = selLayer(); return imageState(l.images.south) === 'ok'; });
  t = await top();
  check('flip toggle flips dds', t[0] === 0 && t[1] > 200);
  await page.uncheck('#flipDds');
  await page.waitForFunction(() => imageState(selLayer().images.south) === 'ok');

  // change category from the folder row
  await page.selectOption('#sourceList .src:not(.builtin) select', 'hair');
  await page.waitForFunction(() => S.game.entries.find((x) => x.base === 'Female_Narrow_Pointy').cat === 'hair');
  check('changing the folder category re-sorts its sprites', true);

  // multi-file add: picking one file finds the others
  state.nextPick = [path.join(heads, 'Female_Narrow_Pointy_east.png.dds')];
  await page.click('#btnAddFile');
  await page.waitForFunction(() => S.layers.some((l) => l.name === 'Female_Narrow_Pointy' && l.kind === 'gene' || l.kind === 'head'));
  const added = await ev(() => { const l = selLayer(); return Object.keys(l.images).sort().join(); });
  check('add from file groups the facings', added === 'east,north,south');

  // empty + broken images are reported, not silent
  state.nextPick = [path.join(mine, 'Empty_south.png'), path.join(mine, 'Broken_south.png')];
  await page.click('#btnAddFile');
  await page.waitForFunction(() => S.layers.some((l) => l.name === 'Broken'));
  await page.waitForTimeout(600);
  const empty = await ev(() => { const l = S.layers.find((x) => x.name === 'Empty'); return { st: imageState(l.images.south), op: imageInfo(l.images.south).opaque }; });
  check('transparent sprite detected', empty.st === 'ok' && empty.op < 0.001);
  const broken = await ev(() => { const l = S.layers.find((x) => x.name === 'Broken'); S.selId = l.id; renderProps(); return { st: imageState(l.images.south), notice: (document.getElementById('notice') || {}).textContent || '' }; });
  check('undecodable sprite reported', broken.st === 'error' && /could not be decoded/.test(broken.notice));
  await ev(() => { S.selId = S.layers.find((x) => x.name === 'Empty').id; renderProps(); });
  check('empty sprite notice in props', /fully transparent/.test(await ev(() => document.getElementById('notice').textContent)));

  // NaN offsets never hide a layer or throw
  const nan = await ev(() => { const l = selLayer(); l.off.south = [NaN, NaN]; l.drawSize = NaN; try { render(); return true; } catch (x) { return x.message; } });
  check('NaN offsets do not break rendering', nan === true);

  // diagnostics
  await page.evaluate(() => { document.getElementById('toolsBox').open = true; }); await page.click('#btnDiag');
  await page.waitForTimeout(200);
  check('diagnostics produced', (await ev(() => document.getElementById('toast').textContent)).length > 0);

  await page.screenshot({ path: path.join(scratch, 'dds_ui.png') });
  await browser.close();
  const real = errors.filter((x) => !/Failed to load resource|clipboard|Permissions/i.test(x));
  if (real.length) { console.log('ERRORS:\n' + real.join('\n')); process.exit(1); }
  console.log('DDS_UI_OK');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
