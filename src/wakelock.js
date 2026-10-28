// 自動で打っている間は画面を消さない（Screen Wake Lock。使えない端末では何もしない）
export function createWakeLock(nav = typeof navigator === 'undefined' ? {} : navigator) {
  let want = false;
  let sentinel = null;

  async function acquire() {
    if (!want || sentinel || !nav.wakeLock) return;
    try {
      sentinel = await nav.wakeLock.request('screen');
      sentinel.addEventListener('release', () => { sentinel = null; });
    } catch (e) {
      sentinel = null;
    }
  }

  return {
    async set(on) {
      want = on;
      if (on) await acquire();
      else if (sentinel) { const s = sentinel; sentinel = null; try { await s.release(); } catch (e) { /* なにもしない */ } }
    },
    // ほかのアプリに切りかえると自動で外れるので、もどったらもう一度
    lost() { sentinel = null; },
    async visible() { await acquire(); },
    get active() { return !!sentinel; },
  };
}
