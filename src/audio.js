// 合成の効果音。iPhone は指をはなしたとき（pointerup / click）にしか音を出せないので、そこで unlock する
const NOTES = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568 };

export function createAudio({ AC = typeof window === 'undefined' ? null : (window.AudioContext || window.webkitAudioContext) } = {}) {
  let ctx = null;
  let master = null;
  let on = true;
  let triedResume = false;

  function ensure() {
    if (ctx && ctx.state !== 'closed') return ctx;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    return ctx;
  }

  function tone(freq, t, dur, { type = 'sine', gain = 0.3, slide = 0 } = {}) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  const SOUNDS = {
    fire: t => tone(1800, t, 0.04, { type: 'triangle', gain: 0.03 }),
    heso: t => { tone(NOTES.E6, t, 0.12, { gain: 0.18 }); tone(NOTES.G6, t + 0.07, 0.18, { gain: 0.18 }); },
    reach: t => [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6].forEach((f, i) => tone(f, t + i * 0.08, 0.25, { type: 'square', gain: 0.08 })),
    hot: t => { tone(300, t, 0.6, { type: 'sawtooth', gain: 0.09, slide: 4 }); tone(450, t + 0.05, 0.6, { type: 'square', gain: 0.05, slide: 4 }); },
    push: t => { tone(120, t, 0.35, { type: 'sine', gain: 0.45, slide: 0.5 }); tone(NOTES.C6, t, 0.3, { type: 'triangle', gain: 0.12 }); },
    jackpot: t => {
      [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6, NOTES.E6].forEach((f, i) => tone(f, t + i * 0.1, 0.3, { type: 'square', gain: 0.08 }));
      [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6].forEach(f => tone(f, t + 0.55, 1.1, { type: 'triangle', gain: 0.12 }));
    },
    payout: t => { tone(NOTES.A5 * 2, t, 0.06, { type: 'square', gain: 0.04 }); tone(NOTES.E6 * 1.5, t + 0.04, 0.08, { type: 'square', gain: 0.04 }); },
    round: t => { tone(NOTES.G5, t, 0.15, { type: 'triangle', gain: 0.15 }); tone(NOTES.C6, t + 0.1, 0.25, { type: 'triangle', gain: 0.15 }); },
    stop: t => tone(220, t, 0.08, { type: 'triangle', gain: 0.12, slide: 0.6 }),
  };

  return {
    // タップ（pointerup / click）の中で呼ぶ
    // 前のタップで起こそうとしても running にならなかった・interrupted のときは、このタップの中で作りなおす
    unlock() {
      if (ctx && ctx.state !== 'running' && (triedResume || ctx.state === 'interrupted')) {
        try { ctx.close(); } catch (e) { /* なにもしない */ }
        ctx = null;
      }
      if (!ensure()) return;
      if (ctx.state === 'running') { triedResume = false; return; }
      triedResume = true;
      ctx.resume().then(() => { if (ctx && ctx.state === 'running') triedResume = false; }).catch(() => {});
    },
    resume() {
      if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
    },
    play(name) {
      if (!on || !ctx || ctx.state !== 'running' || !SOUNDS[name]) return;
      SOUNDS[name](ctx.currentTime + 0.005);
    },
    setOn(v) { on = v; },
    get on() { return on; },
    get state() { return ctx ? ctx.state : 'none'; },
    // 確かめ用：止められた状態を作る
    debugSuspend() { return ctx ? ctx.suspend() : null; },
    debugSetState(st) { if (ctx) ctx.state = st; },
  };
}

export function vibrate(pattern) {
  try {
    // 画面にさわる前に呼ぶとブラウザに止められる（エラーになる）ので、さわったあとだけ
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch (e) { /* なにもしない */ }
}
