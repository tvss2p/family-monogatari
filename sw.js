// オフラインでも開けるように、ゲームのファイルを先に保存しておく。
// このファイルは tools/build-sw.mjs が作る（手で直さない）
const VERSION = 'fm-adfb961b3494';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/audio/CREDITS.txt',
  './assets/audio/maou_bgm_healing07_cut.m4a',
  './assets/audio/maou_loop_bgm_acoustic34.m4a',
  './assets/audio/maou_loop_bgm_acoustic44.m4a',
  './assets/audio/maou_loop_bgm_acoustic50.m4a',
  './assets/audio/maou_loop_bgm_ethnic09.m4a',
  './assets/audio/maou_loop_bgm_neorock33_cut.m4a',
  './assets/audio/maou_loop_bgm_neorock34_cut.m4a',
  './assets/audio/maou_se_battle02.m4a',
  './assets/audio/maou_se_battle07.m4a',
  './assets/audio/maou_se_battle08.m4a',
  './assets/audio/maou_se_battle12.m4a',
  './assets/audio/maou_se_jingle05.m4a',
  './assets/audio/maou_se_jingle07.m4a',
  './assets/audio/maou_se_onepoint03.m4a',
  './assets/audio/maou_se_onepoint15.m4a',
  './assets/audio/maou_se_onepoint32.m4a',
  './assets/audio/maou_se_system21.m4a',
  './assets/audio/maou_se_system37.m4a',
  './assets/audio/song_mom.m4a',
  './assets/audio/song_paradise.m4a',
  './assets/audio/song_withu.m4a',
  './assets/audio/voice_family.m4a',
  './assets/audio/voice_hot.m4a',
  './assets/audio/voice_jackpot1.m4a',
  './assets/audio/voice_jackpot2.m4a',
  './assets/audio/voice_jitan.m4a',
  './assets/audio/voice_kakuhen.m4a',
  './assets/audio/voice_kakuhenUp.m4a',
  './assets/audio/voice_reach1.m4a',
  './assets/audio/voice_reach2.m4a',
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
  './assets/img/sym-oe.png',
  './assets/img/sym-trio.png',
  './src/audio.js',
  './src/bgm.js',
  './src/board-layout.js',
  './src/cloud.js',
  './src/config.js',
  './src/cues.js',
  './src/firebase-config.js',
  './src/fit.js',
  './src/hud.js',
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
  './src/sounds.js',
  './src/storage.js',
  './src/story.js',
  './src/symbols.js',
  './src/update.js',
  './src/voices.js',
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
