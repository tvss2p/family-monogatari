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
    meow: (t, pitch = 1) => meow(t, pitch),
    spin: t => [NOTES.C6, NOTES.E6, NOTES.G6].forEach((f, i) => tone(f, t + i * 0.05, 0.08, { type: 'triangle', gain: 0.06 })),
    paw: t => { tone(900, t, 0.09, { gain: 0.16, slide: 1.6 }); tone(1100, t + 0.12, 0.09, { gain: 0.16, slide: 1.6 }); },
    punch: t => { noiseHit(t, 0.12, 900, 0.5); tone(90, t, 0.15, { gain: 0.35, slide: 0.5 }); },
    drop: t => { tone(1800, t, 0.45, { type: 'sine', gain: 0.1, slide: 0.25 }); tone(70, t + 0.45, 0.35, { gain: 0.5, slide: 0.6 }); noiseHit(t + 0.45, 0.25, 400, 0.5); },
    cutin: t => noiseSweep(t, 0.35),
    open: t => [NOTES.G5, NOTES.C6, NOTES.E6, NOTES.G6].forEach((f, i) => tone(f, t + i * 0.06, 0.18, { type: 'triangle', gain: 0.12 })),
    miss: t => {
      [NOTES.G5, NOTES.E5, NOTES.C5].forEach((f, i) => tone(f, t + i * 0.18, 0.22, { type: 'square', gain: 0.07, slide: 0.97 }));
      tone(NOTES.C5 / 2, t + 0.54, 0.7, { type: 'sawtooth', gain: 0.06, slide: 0.8 });
    },
    // ジャラジャラ：玉どうしが当たる金属の音をたくさん重ねる
    jara: (t, n = 14) => {
      for (let i = 0; i < n; i++) {
        const at = t + Math.random() * 0.55;
        tone(2800 + Math.random() * 3200, at, 0.03, { type: 'triangle', gain: 0.035 });
        if (i % 3 === 0) noiseHit(at, 0.04, 5000, 0.12);
      }
    },
    tick: (t, pitch = 1) => tone(1400 * pitch, t, 0.025, { type: 'square', gain: 0.025 }),
    pin: (t, pitch = 1) => tone(2600 * pitch, t, 0.03, { type: 'sine', gain: 0.03 }),
    click: t => tone(1200, t, 0.04, { type: 'triangle', gain: 0.12, slide: 0.7 }),
    grab: t => tone(500, t, 0.06, { type: 'triangle', gain: 0.1, slide: 1.4 }),
    stopBig: t => { tone(160, t, 0.18, { gain: 0.3, slide: 0.5 }); noiseHit(t, 0.08, 2000, 0.25); },
    ending: t => {
      [NOTES.C5, NOTES.G5, NOTES.E6, NOTES.C6].forEach((f, i) => tone(f, t + i * 0.14, 0.3, { type: 'square', gain: 0.07 }));
      [NOTES.C5, NOTES.E5, NOTES.G5].forEach(f => tone(f, t + 0.6, 0.9, { type: 'triangle', gain: 0.1 }));
    },
  };

  // ノイズの音（パンチ・ドン）と、高さが動くノイズ（シュバッ）
  let noiseBuf = null;
  function noise() {
    if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  function noiseHit(t, dur, freq, gain) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise(); f.type = 'lowpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.02);
  }
  function noiseSweep(t, dur) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise(); f.type = 'bandpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(5000, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.02);
  }

  // 猫の「にゃー」：音の高さを上げてから下げ、口の形（フォルマント）のフィルターを通す
  function meow(t, pitch) {
    const dur = 0.55;
    const o = ctx.createOscillator(), vib = ctx.createOscillator(), vibG = ctx.createGain();
    const f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), g = ctx.createGain(), mix = ctx.createGain();
    o.type = 'sawtooth';
    const p = 520 * pitch;
    o.frequency.setValueAtTime(p, t);
    o.frequency.linearRampToValueAtTime(p * 1.7, t + 0.16);
    o.frequency.linearRampToValueAtTime(p * 1.25, t + dur);
    vib.frequency.value = 7;
    vibG.gain.value = p * 0.03;
    vib.connect(vibG).connect(o.frequency);
    f1.type = 'bandpass'; f1.Q.value = 6;
    f1.frequency.setValueAtTime(700, t);
    f1.frequency.linearRampToValueAtTime(1300, t + 0.15);
    f1.frequency.linearRampToValueAtTime(900, t + dur);
    f2.type = 'bandpass'; f2.Q.value = 8; f2.frequency.value = 2600;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.05);
    g.gain.setValueAtTime(0.5, t + dur - 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f1).connect(mix);
    o.connect(f2).connect(mix);
    mix.gain.value = 0.9;
    mix.connect(g).connect(master);
    o.start(t); vib.start(t);
    o.stop(t + dur + 0.02); vib.stop(t + dur + 0.02);
  }

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
    // バックグラウンドでは音を止める（BGM の予約も止まる）
    suspend() {
      if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
    },
    play(name, opt, delay = 0) {
      if (!on || !ctx || ctx.state !== 'running' || !SOUNDS[name]) return;
      SOUNDS[name](ctx.currentTime + 0.005 + delay, opt);
    },
    setOn(v) { on = v; },
    get on() { return on; },
    get state() { return ctx ? ctx.state : 'none'; },
    get context() { return ctx && ctx.state !== 'closed' ? ctx : null; },
    get output() { return master; },
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
