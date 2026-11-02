'use strict';
// Builder: square fitting at export, description default, crafting styles, covers, field visibility for ranged/melee.
// usage: node test/builder_check.js <scratchDir>
const path = require('path'); const assert = require('assert'); const { execFileSync } = require('child_process');
const { chromium } = require('playwright'); const installStub = require('./stub');
(async () => {
  const dir = path.join(process.argv[2], 'bwide');
  execFileSync('python3', ['-I', '-c', `
import os,sys
from PIL import Image
d=sys.argv[1]; os.makedirs(d+'/Apparel',exist_ok=True)
for f in ('south','east','north'): Image.new('RGBA',(200,100),(255,0,0,255)).save(d+'/Apparel/Helm_%s.png'%f)
Image.new('RGBA',(64,64),(0,255,0,255)).save(d+'/Apparel/Helm.png')
`, dir]);
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1500, height: 950 } });
  const state = await installStub(page, [{ path: dir, category: 'apparel' }]);
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  await page.waitForFunction(() => S.game && S.game.entries.length > 0);
  const ok = (n, c) => { assert.ok(c, n); console.log('ok -', n); };
  await page.evaluate(() => { S.tab = 'all'; addFromEntry(S.game.entries[0]); const l = S.layers.find((x) => x.kind === 'apparel'); S.selId = l.id; ModBuilder.fromLayer(l); });
  await page.waitForTimeout(500);
  ok('builder open', await page.isVisible('#modView'));
  await page.fill('#modMeta [data-k=name]', 'Square Test'); await page.fill('#modMeta [data-k=author]', 'T');
  await page.waitForTimeout(300);
  ok('non-square notice (fit mode)', (await page.textContent('#modOut')).includes('fitted onto a transparent square'));
  ok('empty description is auto-filled with a warning', (await page.textContent('#modOut')).includes('No description') && /<description>A helm\.<\/description>|<description>A [a-z ]+\.<\/description>/.test(await page.textContent('#modPre')));
  await page.click('#btnModExport'); await page.waitForTimeout(1500);
  const exp = state.exports[0];
  ok('exported once', !!exp);
  const dims = (b64) => { const buf = Buffer.from(b64, 'base64'); return [buf.readUInt32BE(16), buf.readUInt32BE(20)]; };
  const pics = exp.files.filter((f) => f.base64);
  ok('every exported sprite is square: ' + pics.map((p) => dims(p.base64).join('x')).join(','), pics.length > 0 && pics.every((p) => { const [w, h] = dims(p.base64); return w === h; }));
  ok('wide image padded to 200x200', pics.some((p) => dims(p.base64)[0] === 200));
  // fixed size
  await page.selectOption('#modMeta select', '128'); await page.click('#btnModExport'); await page.waitForTimeout(1500);
  const exp2 = state.exports[1]; const pics2 = exp2.files.filter((f) => f.base64);
  ok('128 option gives 128x128', pics2.every((p) => dims(p.base64).join('x') === '128x128'));
  // crafting style
  const sty = async (v) => { await page.selectOption('#modForm .mrow:has(label:text-is("How it is made")) select', v); await page.waitForTimeout(200); };
  await sty('machining');
  let xml = await page.textContent('#modPre');
  ok('machining: unfinished armour + machining sound', /UnfinishedArmor/.test(xml) && /Recipe_Machining/.test(xml) && /<li>TableMachining<\/li>/.test(xml));
  await sty('tailoring');
  xml = await page.textContent('#modPre');
  ok('tailoring: cloth bench item', /UnfinishedApparel/.test(xml) && /Recipe_Tailor/.test(xml));
  // covers
  ok('covers picker present', (await page.locator('#modForm .mrow', { hasText: 'Covers these body parts' }).count()) === 1);
  // weapon field visibility
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Weapon'); await page.waitForTimeout(200);
  await page.fill('#modForm .mrow:has(label:text-is("Name shown in game")) input', 'Zapper'); await page.waitForTimeout(200);
  const has = (t) => page.locator('#modForm .mrow', { hasText: t }).count();
  ok('ranged shows projectile', (await has('Projectile')) === 1);
  await page.selectOption('#modForm .mrow:has(label:text-is("Weapon kind")) select', 'melee'); await page.waitForTimeout(200);
  ok('melee hides projectile and shot sound', (await has('Projectile')) === 0 && (await has('Shot sound')) === 0 && (await has('Melee attacks')) === 1);
  { const opts = await page.$$eval('#modOut select option', (o) => o.map((x) => x.value)); await page.selectOption('#modOut select', opts.find((v) => /Weapon_/.test(v))); await page.waitForTimeout(150); }
  ok('melee uses smithing style', /Recipe_Smith/.test(await page.textContent('#modPre')) && /FueledSmithy/.test(await page.textContent('#modPre')));
  await page.selectOption('#modForm .mrow:has(label:text-is("Weapon kind")) select', 'ranged'); await page.waitForTimeout(200);
  ok('ranged hides melee attacks', (await has('Melee attacks')) === 0 && (await has('Projectile')) === 1);
  ok('no page errors', errs.length === 0);
  await b.close(); console.log('BUILDER_OK');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
