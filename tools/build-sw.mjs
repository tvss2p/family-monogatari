// sw.js を作る：ゲームのファイル一覧と、その中身から作った版の名前（中身が変われば必ず変わる）
// 使い方: node tools/build-sw.mjs（ゲームのファイルを変えたら毎回）
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const walk = dir => readdirSync(dir, { withFileTypes: true })
  .flatMap(d => (d.isDirectory() ? walk(`${dir}/${d.name}`) : [`${dir}/${d.name}`]))
  .filter(f => !f.split('/').pop().startsWith('.'));

export function gameFiles() {
  return ['index.html', 'manifest.webmanifest', ...['src', 'styles', 'assets/img'].flatMap(walk).sort()];
}

export function contentVersion(files) {
  const h = createHash('sha1');
  for (const f of files) { h.update(f); h.update(readFileSync(f)); }
  return `fm-${h.digest('hex').slice(0, 12)}`;
}

function render(files, version) {
  return `// オフラインでも開けるように、ゲームのファイルを先に保存しておく。
// このファイルは tools/build-sw.mjs が作る（手で直さない）
const VERSION = '${version}';
const FILES = [
  './',
${files.map(f => `  './${f}',`).join('\n')}
];

// HTTP のキャッシュを通さず、いちばん新しいファイルを保存する
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'fm-fonts').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// 同じサイトのファイルは保存したものを使う。フォントは取れたら保存して次から使う
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin === location.origin) {
    e.respondWith(caches.open(VERSION).then(c => c.match(e.request, { ignoreSearch: true })).then(r => r || fetch(e.request)));
  } else if (/fonts\\.(googleapis|gstatic)\\.com$/.test(url.hostname)) {
    e.respondWith(caches.open('fm-fonts').then(c => c.match(e.request).then(hit => {
      const net = fetch(e.request).then(res => { if (res.ok) c.put(e.request, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = gameFiles();
  const v = contentVersion(files);
  writeFileSync('sw.js', render(files, v));
  console.log(`sw.js: ${files.length} files, ${v}`);
}
