'use strict';
// Icon + facings + body-type variants as in real 1.7 apparel folders.
// usage: node test/variants_check.js <scratchDir>
const path = require('path'); const assert = require('assert'); const { execFileSync } = require('child_process');
const { chromium } = require('playwright'); const installStub = require('./stub');
(async () => {
  const dir = path.join(process.argv[2], 'variants'); 
  execFileSync('python3', ['-I', '-c', `
import os,sys
from PIL import Image
d=sys.argv[1]
def mk(rel,size,col):
    p=os.path.join(d,'Apparel',rel); os.makedirs(os.path.dirname(p),exist_ok=True); Image.new('RGBA',(size,size),col).save(p)
mk('Helm/Helm.png',64,(255,0,0,255))
for f in ('south','east','north'): mk('Helm/Helm_%s.png'%f,128,(0,0,255,255))
mk('Parka/Parka.png',64,(255,0,0,255))
for i,b in enumerate(('Male','Female','Thin','Hulk','Fat')):
    for f in ('south','east','north'): mk('Parka/Parka_%s_%s.png'%(b,f),128,(0,50*i,200,255))
`, dir]);
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1500, height: 900 } });
  await installStub(page, [{ path: dir, category: 'apparel' }]);
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  await page.waitForFunction(() => S.game && S.game.entries.length > 0);
  await page.evaluate(() => { S.tab = 'all'; renderLibrary(); });
  const ok = (n, c) => { assert.ok(c, n); console.log('ok -', n); };
  const names = await page.$$eval('#libList .item', (els) => els.map((e) => e.textContent));
  ok('2 list rows (icons and variants are not separate items): ' + names.join('|'), names.length === 2);
  ok('helmet has 3/4, not 1', (await page.$$eval('#libList .item .fc', (e) => e.map((x) => x.textContent))).includes('3/4'));
  ok('icon thumbnails shown', (await page.$$('#libList .item canvas.ico')).length === 2);
  ok('arrow only on the parka', (await page.$$('#libList .item .arrow')).length === 1);
  await page.click('#libList .item .arrow');
  ok('arrow lists 5 body types', (await page.$$('#libList .item.sub')).length === 5);
  await page.dblclick('#libList .item.sub[data-variant="Fat"]');
  const l = await page.evaluate(() => S.layers.find((x) => x.srcBase && /Parka/.test(x.srcBase)));
  ok('double-click adds that variant', l && /Parka_Fat_south/.test(l.images.south.rel));
  await page.click('#libList .item.sub[data-variant="Thin"]');
  ok('click on a version swaps the layer', await page.evaluate(() => /Parka_Thin_south/.test(S.layers.find((x) => /Parka/.test(x.srcBase || '')).images.south.rel)));
  // sending a body-variant item to the mod builder keeps every body type's art and the game's icon
  await page.evaluate(() => { const l = S.layers.find((x) => /Parka/.test(x.srcBase || '')); S.selId = l.id; l.apparelLayer = 'Belt'; ModBuilder.fromLayer(l); });
  const item = await page.evaluate(() => ModBuilder.M.project.items[0]);
  ok('builder item has per-body-type sprites', item.sprites.wornBy && Object.keys(item.sprites.wornBy).length === 5 && /Parka_Hulk_south/.test(item.sprites.wornBy.Hulk.south.rel));
  ok('builder item uses the game icon and the Belt layer', /Parka\.png$/.test(item.sprites.icon.single.rel) && item.wornAs === 'belt');
  const gen = await page.evaluate(() => ModGen.generate(ModBuilder.M.project));
  const paths = gen.files.map((f) => f.path);
  ok('generated files carry each body type\'s own sprite', paths.includes('Textures/Things/Apparel/MyMod/Parka_Fat_east.png') && gen.files.find((f) => /Parka_Fat_east/.test(f.path)).sprite.rel.includes('Parka_Fat_east'));
  await page.evaluate(() => { delete VARIANT['Things/Apparel/Parka/Parka']; });
  ok('no page errors', errs.length === 0);
  await b.close(); console.log('VARIANTS_OK');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
