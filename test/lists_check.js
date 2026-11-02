'use strict';
// Pick lists: search, custom IDs (project + app-wide), edit/remove, stat kinds, sections, XML output.
// usage: node test/lists_check.js <scratchDir>
const path = require('path'); const assert = require('assert'); const { execFileSync } = require('child_process');
const { chromium } = require('playwright'); const installStub = require('./stub');
(async () => {
  const dir = path.join(process.argv[2], 'lwide');
  execFileSync('python3', ['-I', '-c', `
import os,sys
from PIL import Image
d=sys.argv[1]; os.makedirs(d+'/Apparel',exist_ok=True)
for f in ('south','east','north'): Image.new('RGBA',(128,128),(255,0,0,255)).save(d+'/Apparel/Helm_%s.png'%f)
`, dir]);
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  await installStub(page, [{ path: dir, category: 'apparel' }]);
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  await page.waitForFunction(() => S.game && S.game.entries.length > 0);
  const ok = (n, c) => { assert.ok(c, n); console.log('ok -', n); };
  await page.evaluate(() => { S.tab = 'all'; addFromEntry(S.game.entries[0]); const l = S.layers.find((x) => x.kind === 'apparel'); S.selId = l.id; ModBuilder.fromLayer(l); });
  await page.waitForTimeout(500);
  const row = (t) => page.locator('#modForm .mrow', { has: page.locator(`label:text-is("${t}")`) });
  ok('sections shown', (await page.locator('#modForm .msec h3').allTextContents()).join('|').includes('Bonuses to the wearer'));
  await page.locator('#modForm .msec h3', { hasText: 'Bonuses to the wearer' }).click();
  ok('clicking a section title folds it', await page.locator('#modForm .msec.closed h3', { hasText: 'Bonuses to the wearer' }).count() === 1);
  ok('fold state is remembered', await page.evaluate(() => (localStorage.getItem('rsv-closedsections') || '').includes('Bonuses to the wearer')));
  await page.locator('#modForm .msec h3', { hasText: 'Bonuses to the wearer' }).click();
  ok('and unfolds again', await page.locator('#modForm .msec.closed').count() === 0);
  ok('old names gone', !(await page.textContent('#modForm')).includes('equippedStatOffsets'));
  await row('Bonuses to the wearer').locator('text=+ Add…').click();
  ok('picker open', await page.isVisible('.pick'));
  await page.fill('.picksearch', 'move');
  ok('search filters', (await page.locator('.pickrow', { hasText: 'Move speed' }).count()) === 1);
  await page.fill('.picksearch', '');
  ok('item-kind stats hidden in wearer list', (await page.locator('.pickrow', { hasText: 'Hit points' }).count()) === 0);
  await page.fill('.picksearch', 'move');
  await page.locator('.pickrow', { hasText: 'Move speed' }).click();
  ok('row added with friendly name', (await row('Bonuses to the wearer').textContent()).includes('Move speed'));
  await row('Bonuses to the wearer').locator('input[type=number]').fill('0.2'); await page.waitForTimeout(200);
  ok('XML has MoveSpeed 0.2', /<MoveSpeed>0\.2<\/MoveSpeed>/.test(await page.textContent('#modPre')));
  await row('Bonuses to the wearer').locator('text=+ Add…').click();
  await page.fill('.pickadd input[placeholder^="ID"]', 'ZZ_Stealth'); await page.fill('.pickadd input[placeholder^="Friendly"]', 'ZedSneak');
  await page.click('.pickadd button:text-is("Add")'); await page.waitForTimeout(200);
  ok('custom stat added and selected', (await row('Bonuses to the wearer').textContent()).includes('ZedSneak'));
  ok('saved in project', await page.evaluate(() => JSON.stringify(ModBuilder.M.project.custom).includes('ZZ_Stealth')));
  await row('Bonuses to the wearer').locator('text=+ Add…').click();
  ok('custom listed under own entries', (await page.locator('.pickrow', { hasText: 'ZedSneak' }).count()) === 1);
  await page.locator('.pickrow', { hasText: 'ZedSneak' }).locator('button[title=Edit]').click();
  await page.locator('.pickrow.editing input').nth(1).fill('Sneakiness'); await page.click('.pickrow.editing >> text=Save'); await page.waitForTimeout(100);
  ok('edit works', (await page.locator('.pickrow', { hasText: 'Sneakiness' }).count()) === 1);
  await page.fill('.pickadd input[placeholder^="ID"]', 'ZZ_Global'); await page.selectOption('.pickadd select', 'app');
  await page.click('.pickadd button:text-is("Add")'); await page.waitForTimeout(200);
  ok('app-wide list saved', await page.evaluate(() => (localStorage.getItem('rsv-customlists') || '').includes('ZZ_Global')));
  await row('Bonuses to the wearer').locator('text=+ Add…').click();
  await page.fill('.pickadd input[placeholder^="ID"]', 'bad id'); await page.click('.pickadd button:text-is("Add")');
  ok('invalid id refused', (await page.locator('.pickrow', { hasText: 'bad id' }).count()) === 0 && await page.isVisible('.pick'));
  await page.fill('.picksearch', 'Quick_Fix');
  await page.locator('.pickrow.usecustom').click(); await page.waitForTimeout(200);
  ok('"use as my own ID" shortcut', (await row('Bonuses to the wearer').textContent()).includes('Quick_Fix'));
  await row('Bonuses to the wearer').locator('text=+ Add…').click();
  await page.locator('.pickrow', { hasText: 'Quick_Fix' }).locator('button[title^=Remove]').click();
  ok('remove works', (await page.locator('.pickrow', { hasText: 'Quick_Fix' }).count()) === 0);
  await page.click('.pickx');
  await row('Made at workbench').locator('text=Choose…').click();
  await page.locator('.pickrow', { hasText: 'Machining table' }).click();
  await page.click('.pick >> text=Done'); await page.waitForTimeout(200);
  ok('workbench chosen via multi list', /TableMachining/.test(await page.textContent('#modPre')));
  await row('Research needed').locator('text=Choose…').click();
  await page.fill('.pickadd input[placeholder^="ID"]', 'MyModResearch'); await page.click('.pickadd button:text-is("Add")'); await page.waitForTimeout(200);
  ok('custom research used', /MyModResearch/.test(await page.textContent('#modPre')));
  await row('Unfinished item on the bench (optional)').locator('text=Choose…').click();
  await page.locator('.pickrow', { hasText: 'Unfinished armour' }).click(); await page.waitForTimeout(200);
  ok('unfinished override', /UnfinishedArmor/.test(await page.textContent('#modPre')));
  await row('Fixed ingredients').locator('text=+ Add…').click();
  await page.locator('.pickrow', { hasText: 'Plasteel' }).click(); await page.waitForTimeout(200);
  ok('cost row friendly', (await row('Fixed ingredients').textContent()).includes('Plasteel'));
  // material tree
  await row('Made from any material of a category (like cloth or metal)').locator('input[type=checkbox]').check().catch(() => {}); await page.waitForTimeout(200);
  const tree = row('Can be made from');
  ok('tree shows categories', (await tree.textContent()).includes('Metallic'));
  await tree.locator('button:text-is("▸")').first().click(); await page.waitForTimeout(150);
  await row('Can be made from').locator('label', { hasText: 'Metallic' }).locator('input').check(); await page.waitForTimeout(150);
  await row('Can be made from').locator('label', { hasText: /^Steel$/ }).locator('input').uncheck(); await page.waitForTimeout(200);
  ok('unticked material goes to default filter', /<defaultIngredientFilter>[\s\S]*<li>Steel<\/li>/.test(await page.textContent('#modPre')));
  ok('category listed', /stuffCategories/.test(await page.textContent('#modPre')));
  // own XML box
  await row('Add your own XML (optional)').locator('textarea').fill('<comps><li></comps>'); await page.waitForTimeout(250);
  ok('bad XML flagged live and blocks export', (await row('Add your own XML (optional)').textContent()).includes('✗') && (await page.textContent('#modOut')).includes('your own XML is not valid'));
  await row('Add your own XML (optional)').locator('textarea').fill('<modExtensions><li Class="X"/></modExtensions>'); await page.waitForTimeout(250);
  ok('good XML accepted and inserted', (await row('Add your own XML (optional)').textContent()).includes('well formed') && /your own XML -->\s*<modExtensions>/.test(await page.textContent('#modPre')));
  ok('no page errors ' + errs.join(';'), errs.length === 0);
  console.log('LISTS_OK'); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
