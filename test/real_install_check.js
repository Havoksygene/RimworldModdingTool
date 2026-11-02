'use strict';
// Mimics a real install: XML-only game folder + a flat dump of extracted sprites.
// usage: node test/real_install_check.js <scratchDir>
const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const installStub = require('./stub');

const mk = (mode) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ri-' + mode + '-'));
  execFileSync('python3', ['-I', path.join(__dirname, 'make_fake_game.py'), d, mode], { stdio: 'ignore' });
  return d;
};

(async () => {
  const [scratch] = process.argv.slice(2);
  const defs = mk('defs'), flat = mk('flat');
  const dump = path.join(flat, 'Texture2D');
  const check = (name, cond) => { assert.ok(cond, name); console.log('ok -', name); };

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  // Start like a first launch on a real install: only the game folder (XML, no loose sprites)
  const state = await installStub(page, [defs]);
  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  await page.waitForFunction(() => S.game);
  const ev = (fn, a) => page.evaluate(fn, a);

  check('install-only: no sprites, body types found', (await ev(() => [S.game.entries.length, S.game.bodyTypes.length])).join() === '0,2');
  check('install-only: help is opened', await ev(() => $('helpBox').open));
  check('install-only: status explains the problem', /No sprites/.test(await ev(() => $('gameStatus').textContent)));
  check('install-only: folder listed', (await ev(() => document.querySelectorAll('#sourceList .src').length)) === 1);

  // Add the extracted-sprites folder through the real button
  state.nextAdd = [dump];
  await page.click('#btnGame');
  await page.waitForFunction(() => S.game && S.game.entries.length > 0);
  await page.waitForFunction(() => S.layers.length >= 2);
  await page.waitForTimeout(400);
  check('two folders listed', (await ev(() => document.querySelectorAll('#sourceList .src').length)) === 2);
  check('default pawn built from flat dump (body+head)', (await ev(() => S.layers.map((l) => l.kind).join())).startsWith('body,head'));
  check('head offset came from the XML via file-name match', (await ev(() => S.headOffset[1])) === 0.34);
  check('body type selector filled from XML', (await ev(() => [...$('bodyType').options].map((o) => o.value).join())) === ',Male,Fat');

  // "Other" tab holds the hair (no telltale in a flat dump); Shift+click adds it as hair
  await page.click('.tab[data-cat="other"]');
  check('Afro is in the Other tab', (await ev(() => [...document.querySelectorAll('#libList .item')].map((e) => e.textContent).join())).includes('Afro'));
  await ev(() => { $('addKind').value = 'hair'; });
  await page.locator('#libList .item', { hasText: 'Afro' }).click({ modifiers: ['Shift'] });
  check('Shift+click adds it as a hair layer', (await ev(() => S.layers.some((l) => l.kind === 'hair' && l.name === 'Afro'))));

  // "All" tab + filter
  await page.click('.tab[data-cat="all"]');
  await page.fill('#search', 'shirt');
  check('All tab + filter finds the shirt', (await page.locator('#libList .item').count()) === 1);

  // everything draws without errors, and the head sits above the body (head offset applied)
  const ok = await ev(() => { try { S.mode = 'sheet'; render(); return true; } catch (e) { return e.message; } });
  check('renders', ok === true);
  await page.screenshot({ path: path.join(scratch, 'real_install.png') });

  // remove folders via the × buttons
  await page.locator('#sourceList .src button').nth(1).click();
  await page.waitForFunction(() => document.querySelectorAll('#sourceList .src').length === 1);
  check('removing the dump leaves only the install', (await ev(() => S.game.entries.length)) === 0);
  await page.locator('#sourceList .src button').nth(0).click();
  await page.waitForFunction(() => document.querySelectorAll('#sourceList .src').length === 0);
  check('removing the last folder empties the library', (await ev(() => S.game === null)));

  await browser.close();
  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
  console.log('REAL_INSTALL_OK');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
