import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { contentVersion, gameFiles } from '../tools/build-sw.mjs';

const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walk(`${dir}/${d.name}`) : [`${dir}/${d.name}`]));

test('service worker precaches every game file', () => {
  const sw = readFileSync('sw.js', 'utf8');
  const files = [...walk('src'), ...walk('styles'), ...walk('assets/img'), 'index.html', 'manifest.webmanifest'];
  const missing = files.filter(f => !sw.includes(`'./${f}'`));
  assert.deepEqual(missing, []);
});

test('manifest matches the github pages path', () => {
  const m = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));
  assert.equal(m.name, 'ファミリー物語');
  assert.equal(m.start_url, './');
  assert.equal(m.scope, './');
  assert.equal(m.display, 'standalone');
  assert.equal(m.orientation, 'portrait');
  assert.ok(m.icons.some(i => i.sizes === '512x512'));
  assert.ok(m.icons.some(i => i.sizes === '192x192'));
});

test('index links manifest, touch icon and black status bar', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /rel="manifest" href="manifest\.webmanifest"/);
  assert.match(html, /rel="apple-touch-icon"/);
  assert.match(html, /apple-mobile-web-app-status-bar-style" content="black"/);
  assert.doesNotMatch(html, /black-translucent/);
});

test('service worker version changes whenever a game file changes', () => {
  const sw = readFileSync('sw.js', 'utf8');
  assert.match(sw, new RegExp(`const VERSION = '${contentVersion(gameFiles())}'`), 'run: node tools/build-sw.mjs');
});

test('service worker installs from the network, not the http cache', () => {
  const sw = readFileSync('sw.js', 'utf8');
  assert.match(sw, /cache: 'reload'/);
});

test('no inert ?v= cache busting left in index', () => {
  assert.doesNotMatch(readFileSync('index.html', 'utf8'), /\?v=\d/);
});
