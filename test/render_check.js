'use strict';
// Loads the real renderer in Chromium with window.api stubbed by the real indexer.
// usage: node test/render_check.js <fakeGameDir> <out.png>
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const idx = require('../lib/indexer');
const installStub = require('./stub');

(async () => {
  const [gameDir, out] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  const state = await installStub(page, gameDir.split(path.delimiter));
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  await page.waitForFunction(() => document.querySelectorAll('#libList .item').length > 0);

  const layers = await page.evaluate(() => window.__smoke());
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => ({
    layers: S.layers.map((l) => l.kind + ':' + l.name),
    bodyTypes: [...document.querySelectorAll('#bodyType option')].map((o) => o.textContent),
    canvas: [document.getElementById('view').width, document.getElementById('view').height],
    // any non-background pixels drawn in the first cell?
    drawn: (() => { const c = document.getElementById('view'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 180 && d[i + 1] < 90) n++; return n; })(),
  }));
  console.log(JSON.stringify({ smokeLayers: layers, ...info }, null, 1));
  await page.screenshot({ path: out });
  await browser.close();
  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
  console.log('RENDER_OK');
})();
