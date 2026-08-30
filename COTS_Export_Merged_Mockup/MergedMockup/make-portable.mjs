/**
 * Inline the built app into one self-contained .html file, so the integrated mockup can be
 * double-clicked from the Mockups folder with nothing installed — the same way the Export
 * contribution ships `portable/COTS Export Mock-up.html`.
 *
 * Run after `npm run build` (or use `npm run build:portable`, which does both).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, 'dist');
const out = join(here, 'portable');

if (!existsSync(join(dist, 'app.js'))) {
  console.error('dist/app.js not found — run `npm run build` first.');
  process.exit(1);
}

const js = readFileSync(join(dist, 'app.js'), 'utf8');
const cssPath = join(dist, 'app.css');
const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : '';

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>COTS — Integrated Mockup (Core · Shared · Export)</title>
    <style>html,body,#root{height:100%;margin:0}${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script>${js}</script>
  </body>
</html>
`;

if (!existsSync(out)) mkdirSync(out, { recursive: true });
const target = join(out, 'COTS Integrated Mockup.html');
writeFileSync(target, html, 'utf8');
console.log(`portable build written: ${target} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
console.log('Note: the Export frame inside it resolves ../../COTS_Export_Mockup_v1.1/portable/… relative to this file.');
