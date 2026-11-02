'use strict';
// Imported sounds, explosion colours, custom unfinished item.   usage: node test/sounds_check.js <scratchDir>
const path = require('path'); const assert = require('assert'); const { execFileSync } = require('child_process');
const { chromium } = require('playwright'); const installStub = require('./stub');
(async () => {
  const sc = process.argv[2], dir = path.join(sc, 'sndlib');
  execFileSync('python3', ['-I', '-c', `
import os,sys
from PIL import Image
d=sys.argv[1]; os.makedirs(d+'/Weapons',exist_ok=True)
Image.new('RGBA',(40,12),(255,200,0,255)).save(d+'/Weapons/Bolt.png')
`, dir]);
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  await installStub(page, [{ path: dir, category: 'weapons' }]);
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  await page.waitForFunction(() => S.game && S.game.entries.length > 0);
  const ok = (n, c) => { assert.ok(c, n); console.log('ok -', n); };
  await page.click('#btnModOpen'); await page.waitForTimeout(300);
  const row = (t) => page.locator('#modForm .mrow', { has: page.locator(`label:text-is("${t}")`) });
  const gen = (re) => page.evaluate((s) => { const f = ModBuilder.M.result.files.find((x) => new RegExp(s).test(x.path)); return f ? (f.text || '(binary)') : null; }, re.source);
  // projectile: explosion sound + colours
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Projectile'); await page.waitForTimeout(300);
  await page.locator('#modForm input[type=text]').first().fill('Boom Bolt'); await page.waitForTimeout(150);
  await row('Explodes on impact').locator('input').check(); await page.waitForTimeout(200);
  await row('Explosion sound (optional)').locator('text=Choose…').click();
  ok('vanilla explosion sounds are listed', (await page.locator('.pickrow', { hasText: /Rocket explosion/ }).count()) >= 1);
  await page.click('.pickx');
  await row('Explosion sound (optional)').locator('input[type=file]').setInputFiles(path.join(sc, 'snd', 'boom.wav')); await page.waitForTimeout(400);
  ok('own sound shown with its name', (await row('Explosion sound (optional)').textContent()).includes('boom.wav'));
  await row('Explosion colour, centre (optional)').locator('input[type=color]').fill('#ff0000'); await page.waitForTimeout(200);
  ok('colour shown as set', (await row('Explosion colour, centre (optional)').textContent()).includes('#ff0000'));
  const px = await gen(/Projectile_/);
  ok('soundExplode points at the new SoundDef', /<soundExplode>BoomBolt_explodeSound<\/soundExplode>/.test(px));
  ok('custom damage def has the colour', /<explosionColorCenter>\(1, 0, 0\)<\/explosionColorCenter>/.test(px) && /<DamageDef ParentName="Bullet">/.test(px));
  ok('SoundDef file written', /AudioGrain_Clip/.test(await gen(/Sound_BoomBolt_explodeSound\.xml/)));
  ok('audio file in the export list', (await gen(/Sounds\/.*boom\.wav$/)) === '(binary)');
  ok('no stray 0 / undefined', !/undefined|NaN|<stoppingPower>0|drawSize/.test(px));
  // weapon: custom crafting sound + unfinished picture
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Weapon'); await page.waitForTimeout(300);
  await page.locator('#modForm input[type=text]').first().fill('Bolt Gun'); await page.waitForTimeout(150);
  await row('Work sound (optional)').locator('input[type=file]').setInputFiles(path.join(sc, 'snd', 'boom.wav')); await page.waitForTimeout(400);
  const wx = await gen(/Weapon_/);
  ok('recipe uses the work sound', /<soundWorking>BoltGun_craftSound<\/soundWorking>/.test(wx));
  ok('work sound is a sustained SoundDef', /<sustain>True<\/sustain>/.test(await gen(/Sound_BoltGun_craftSound\.xml/)));
  ok('unfinished picture field is in the Recipe section', (await page.locator('#modForm .msec', { has: page.locator('h3:text-is("Recipe")') }).locator('label:text-is("Your own unfinished-item picture (optional)")').count()) === 1);
  await page.evaluate(() => { const it = ModBuilder.M.project.items.find((i) => i.label === 'Bolt Gun'); it.sprites.unfinished = { single: S.game.entries.length ? S.game.entries[0].facings && Object.values(S.game.entries[0].facings)[0] ? { path: Object.values(S.game.entries[0].facings)[0] } : { path: '/x.png' } : { path: '/x.png' } }; });
  await page.evaluate(() => ModBuilder.show(true)); await page.waitForTimeout(300);
  ok('own unfinished item generated', /ParentName="UnfinishedBase"/.test(await gen(/Unfinished_BoltGun\.xml/)) && /<unfinishedThingDef>BoltGun_Unfinished</.test(await gen(/Weapon_/)));
  // removing the file goes back to the vanilla picker
  await row('Work sound (optional)').locator('button:text-is("Remove")').click(); await page.waitForTimeout(250);
  ok('remove returns to the list', (await row('Work sound (optional)').locator('text=Use my own sound file…').count()) === 1 && !/BoltGun_craftSound/.test(await gen(/Weapon_/)));
  // too-big / wrong type are refused
  await row('Work sound (optional)').locator('input[type=file]').setInputFiles(path.join(sc, 'snd', 'unf.png')); await page.waitForTimeout(300);
  ok('wrong file type refused', !/BoltGun_craftSound/.test(await gen(/Weapon_/)));
  ok('project keeps the audio in its file', await page.evaluate(() => JSON.stringify(ModBuilder.M.project).includes('"audio"')));
  ok('no page errors ' + errs.join(';'), errs.length === 0);
  console.log('SOUNDS_OK'); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
