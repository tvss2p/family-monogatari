// オフラインでも開けるように、ゲームのファイルを先に保存しておく。
// このファイルは tools/build-sw.mjs が作る（手で直さない）
const VERSION = 'fm-23fea175e2d6';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/img/apple-touch-icon.png',
  './assets/img/cab-bottom.webp',
  './assets/img/cab-crown.webp',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png',
  './assets/img/part-arm.webp',
  './assets/img/part-heso.webp',
  './assets/img/part-jarashi.webp',
  './assets/img/part-knob.webp',
  './assets/img/part-nafan.webp',
  './assets/img/part-push.webp',
  './assets/img/part-windmill.webp',
  './assets/img/part-wing.webp',
  './assets/img/sym-berry.png',
  './assets/img/sym-daisuke.png',
  './assets/img/sym-glen.png',
  './assets/img/sym-hiroko.png',
  './assets/img/sym-honey.png',
  './assets/img/sym-jill.png',
  './assets/img/sym-kira.png',
  './assets/img/sym-lee.png',
  './assets/img/sym-lucky.png',
  './assets/img/sym-nafan.png',
  './assets/img/sym-nanae.png',
  './assets/img/sym-trio.png',
  './src/audio.js',
  './src/bgm.js',
  './src/board-layout.js',
  './src/config.js',
  './src/cues.js',
  './src/input.js',
  './src/lever.js',
  './src/lottery.js',
  './src/machine.js',
  './src/main.js',
  './src/payout.js',
  './src/physics.js',
  './src/render/board.js',
  './src/render/gimmicks.js',
  './src/render/lcd.js',
  './src/render/parts.js',
  './src/render/tray.js',
  './src/scenario.js',
  './src/storage.js',
  './src/story.js',
  './src/symbols.js',
  './src/wakelock.js',
  './styles/cabinet.css',
  './styles/lcd.css',
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
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open('fm-fonts').then(c => c.match(e.request).then(hit => {
      const net = fetch(e.request).then(res => { if (res.ok) c.put(e.request, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
