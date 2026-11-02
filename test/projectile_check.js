'use strict';
// Projectile item: fields, XML for explosion / spawn / gas / hediff, weapon list, unsaved-work flag.
// usage: node test/projectile_check.js <scratchDir>
const path = require('path'); const assert = require('assert'); const { execFileSync } = require('child_process');
const { chromium } = require('playwright'); const installStub = require('./stub');
(async () => {
  const dir = path.join(process.argv[2], 'pj');
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
  ok('clean at start', (await page.evaluate(() => window.rsvUnsaved())).length === 0);
  await page.click('#btnModOpen'); await page.waitForTimeout(300);
  ok('no unsaved mod project when empty', (await page.evaluate(() => window.rsvUnsaved())).length === 0);
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Projectile'); await page.waitForTimeout(300);
  ok('mod project now unsaved', (await page.evaluate(() => window.rsvUnsaved())).includes('mod project'));
  const row = (t) => page.locator('#modForm .mrow', { has: page.locator(`label:text-is("${t}")`) });
  await page.locator('#modForm input[type=text]').first().fill('Toxic Bolt'); await page.waitForTimeout(200);
  ok('explosion fields hidden until it explodes', (await row('Explosion radius in cells').count()) === 0);
  await row('Explodes on impact').locator('input').check(); await page.waitForTimeout(200);
  ok('explosion fields shown', (await row('Explosion radius in cells').count()) === 1);
  await row('Leaves this after the explosion (optional)').locator('text=Choose…').click();
  await page.fill('.picksearch', 'Filth_Fuel');
  await page.locator('.pickrow', { hasText: 'Filth_Fuel' }).first().click().catch(() => {});
  await page.waitForTimeout(200);
  if (await page.isVisible('.pick')) { await page.fill('.picksearch', 'Modded_Thing'); await page.locator('.pickrow.usecustom').click(); await page.waitForTimeout(200); }
  await row('Leaves a gas cloud (optional)').locator('text=Choose…').click();
  await page.locator('.pickrow', { hasText: /Tox ?Gas/ }).first().click(); await page.waitForTimeout(200);
  await row('Also inflicts this condition on hit (optional)').locator('text=Choose…').click();
  await page.locator('.pickrow', { hasText: 'Toxic buildup' }).first().click(); await page.waitForTimeout(200);
  const xml = await page.evaluate(() => ModBuilder.M.result.files.find((f) => /Projectile_/.test(f.path)).text);
  ok('projectile thing with explosion class', /<ThingDef ParentName="BaseBullet">/.test(xml) && /<thingClass>Projectile_Explosive<\/thingClass>/.test(xml));
  ok('gas written', /<postExplosionGasType>ToxGas<\/postExplosionGasType>/.test(xml));
  ok('spawn after written', /<postExplosionSpawnThingDef>\w+<\/postExplosionSpawnThingDef>/.test(xml) && /<postExplosionSpawnThingCount>1</.test(xml));
  ok('custom damage def adds the hediff', /<DamageDef ParentName="Bullet">[\s\S]*<hediff>ToxicBuildup<\/hediff>[\s\S]*<severityPerDamageDealt>0\.01</.test(xml) && /<damageDef>\w+_Damage<\/damageDef>/.test(xml));
  ok('no raw undefined/NaN', !/undefined|NaN/.test(xml));
  // weapon can pick it
  await page.click('#modAddBtn'); await page.click('#modAddMenu >> text=+ Weapon'); await page.waitForTimeout(300);
  await page.locator('#modForm input[type=text]').first().fill('Bolt Gun'); await page.waitForTimeout(200);
  await row('Projectile').locator('text=Choose…').click();
  ok('weapon list offers the projectile of this mod', (await page.locator('.pickrow', { hasText: 'Toxic Bolt (this mod)' }).count()) === 1);
  await page.locator('.pickrow', { hasText: 'Toxic Bolt (this mod)' }).click(); await page.waitForTimeout(200);
  const wx = await page.evaluate(() => ModBuilder.M.result.files.find((f) => /Weapon_/.test(f.path)).text);
  ok('weapon uses the new projectile', /<defaultProjectile>ToxicBolt<\/defaultProjectile>/.test(wx));
  // saving clears the flag
  await page.click('#btnModSave'); await page.waitForTimeout(300);
  ok('saving clears the unsaved flag', (await page.evaluate(() => window.rsvUnsaved())).length === 0);
  await page.locator('#modForm input[type=text]').first().fill('Toxic Bolt 2'); await page.waitForTimeout(200);
  ok('editing again sets it', (await page.evaluate(() => window.rsvUnsaved())).includes('mod project'));
  ok('no page errors ' + errs.join(';'), errs.length === 0);
  console.log('PROJECTILE_OK'); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
