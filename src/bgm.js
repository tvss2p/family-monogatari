// BGM：場面ごとのオリジナル曲を、その場で合成してくり返す
// 楽譜の書き方：音名（C5・F#4・Bb3）＝鳴らす、- ＝前の音をのばす、. ＝休み。1文字ぶんが step 拍
// ドラムは k（キック）・s（スネア）・h（ハイハット）

const bars = (...b) => b.join(' ');
const rep = (s, n) => Array(n).fill(s).join(' ');
const DRUM_4 = rep('k h s h k h s h', 4);
const DRUM_8 = rep('k h s h k h s h', 8);

export const TRACKS = {
  // ふだん：のんびり明るい（C・Am・F・G）
  normal: {
    bpm: 112, beats: 32,
    parts: [
      { wave: 'square', gain: 0.05, step: 0.5, line: bars(
        'E5 . G5 . C6 - G5 .', 'A5 - G5 E5 C5 - . .', 'F5 . A5 . C6 - A5 .', 'B5 - A5 G5 D5 - . .',
        'E5 G5 C6 E6 D6 - C6 .', 'A5 - E5 . C6 - . .', 'F5 A5 C6 F6 E6 - D6 .', 'D6 - B5 . G5 - . .') },
      { wave: 'triangle', gain: 0.16, step: 1, line: rep('C3 C3 G2 C3 A2 A2 E3 A2 F2 F2 C3 F2 G2 G2 D3 G2', 2) },
      { wave: 'noise', gain: 0.05, step: 0.5, line: DRUM_8 },
    ],
  },
  // リーチ：ドキドキ（Am・F・G・E）
  reach: {
    bpm: 140, beats: 16,
    parts: [
      { wave: 'square', gain: 0.05, step: 0.5, line: bars(
        'A4 C5 E5 A5 E5 C5 A4 C5', 'F4 A4 C5 F5 C5 A4 F4 A4', 'G4 B4 D5 G5 D5 B4 G4 B4', 'E5 - G#5 - B5 - E6 -') },
      { wave: 'triangle', gain: 0.17, step: 1, line: 'A2 A2 A2 A2 F2 F2 F2 F2 G2 G2 G2 G2 E2 E2 E2 E2' },
      { wave: 'noise', gain: 0.06, step: 0.5, line: rep('k h k h s h k h', 4) },
    ],
  },
  // 激アツ：速くて強い
  hot: {
    bpm: 165, beats: 16,
    parts: [
      { wave: 'sawtooth', gain: 0.04, step: 0.5, line: bars(
        'D5 F5 A5 D6 A5 F5 D5 F5', 'Bb4 D5 F5 Bb5 F5 D5 Bb4 D5', 'C5 E5 G5 C6 G5 E5 C5 E5', 'A4 C#5 E5 A5 C#6 E6 A6 -') },
      { wave: 'triangle', gain: 0.18, step: 0.5, line: bars(rep('D3', 8), rep('Bb2', 8), rep('C3', 8), rep('A2', 8)) },
      { wave: 'noise', gain: 0.07, step: 0.5, line: rep('k h s h k k s h', 4) },
    ],
  },
  // 大当たり（ボーナス）：ファンファーレ
  jackpot: {
    bpm: 150, beats: 32,
    parts: [
      { wave: 'square', gain: 0.055, step: 0.5, line: bars(
        'C5 - E5 - G5 - C6 -', 'B5 - G5 - D6 - B5 -', 'A5 - C6 - F6 - E6 D6', 'C6 - G5 - E5 - G5 -',
        'C6 - E6 - G6 - E6 -', 'F6 - E6 - D6 - C6 -', 'D6 - B5 - G5 - B5 D6', 'C6 - - - . . . .') },
      { wave: 'triangle', gain: 0.17, step: 1, line: 'C3 E3 G3 E3 G2 B2 D3 B2 F2 A2 C3 A2 C3 E3 G3 E3 C3 E3 G3 E3 F2 A2 C3 A2 G2 B2 D3 B2 C3 G2 C3 .' },
      { wave: 'noise', gain: 0.06, step: 0.5, line: DRUM_8 },
    ],
  },
  // 家族揃って大当たり：あたたかくてキラキラ（D）
  family: {
    bpm: 132, beats: 32,
    parts: [
      { wave: 'triangle', gain: 0.13, step: 0.5, line: bars(
        'F#5 - A5 - D6 - A5 -', 'G5 - B5 - E6 - D6 C#6', 'D6 - F#6 - A6 - F#6 -', 'E6 - - - . . . .',
        'F#5 A5 D6 F#6 E6 D6 C#6 B5', 'A5 - D6 - G6 - F#6 -', 'E6 - C#6 - A5 - C#6 E6', 'D6 - - - . . . .') },
      { wave: 'sine', gain: 0.06, step: 0.5, line: rep('D6 A6 F#6 A6 D6 A6 F#6 A6', 8) },
      { wave: 'triangle', gain: 0.16, step: 1, line: 'D3 F#3 A3 F#3 G2 B2 D3 B2 D3 F#3 A3 F#3 A2 C#3 E3 C#3 D3 F#3 A3 F#3 G2 B2 D3 B2 A2 C#3 E3 A2 D3 A2 D3 .' },
      { wave: 'noise', gain: 0.05, step: 0.5, line: DRUM_8 },
    ],
  },
  // 確変中：アップテンポで華やか（G）
  kakuhen: {
    bpm: 150, beats: 16,
    parts: [
      { wave: 'square', gain: 0.05, step: 0.5, line: bars(
        'G5 . B5 . D6 . B5 .', 'C6 . E6 . G6 - E6 .', 'D6 . B5 . G5 . A5 B5', 'A5 - D6 - F#6 - D6 .') },
      { wave: 'triangle', gain: 0.16, step: 0.5, line: bars(rep('G2 G3', 4), rep('C3 C4', 4), rep('G2 G3', 4), rep('D3 D4', 4)) },
      { wave: 'noise', gain: 0.06, step: 0.5, line: DRUM_4 },
    ],
  },
  // 時短中：かるく軽快（F）
  jitan: {
    bpm: 124, beats: 16,
    parts: [
      { wave: 'square', gain: 0.045, step: 0.5, line: bars(
        'A5 . C6 . F6 - C6 .', 'Bb5 . D6 . G6 - D6 .', 'A5 . C6 . F6 . E6 .', 'G5 - C6 - E6 - . .') },
      { wave: 'triangle', gain: 0.16, step: 1, line: 'F2 C3 F2 C3 Bb2 F3 Bb2 F3 F2 C3 F2 C3 C3 G3 C3 G3' },
      { wave: 'noise', gain: 0.05, step: 0.5, line: DRUM_4 },
    ],
  },
};

export function parseLine(line, step) {
  const ev = [];
  line.trim().split(/\s+/).forEach((tok, i) => {
    if (tok === '.') return;
    if (tok === '-') { if (ev.length) ev[ev.length - 1].dur += step; return; }
    ev.push({ t: i * step, note: tok, dur: step });
  });
  return ev;
}

const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function noteFreq(name) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (!m) return NaN;
  const semi = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
  return 440 * 2 ** ((semi - 69) / 12);
}

// 場面から曲を選ぶ（大当たり中・大当たりの瞬間 → 大当たり曲、激アツ・リーチ → その曲、ふだんはモードの曲）
export function trackFor({ phase, mode, scene, premium }) {
  if (phase === 'jackpot' || scene === 'jackpot') return premium ? 'family' : 'jackpot';
  if (scene === 'hot') return 'hot';
  if (scene === 'reach') return 'reach';
  if (mode === 'kakuhen') return 'kakuhen';
  if (mode === 'jitan') return 'jitan';
  return 'normal';
}

const PARSED = Object.fromEntries(Object.entries(TRACKS).map(([k, tr]) => [k, {
  ...tr, parts: tr.parts.map(p => ({ ...p, events: parseLine(p.line, p.step) })),
}]));

// 鳴らす部分（audio の AudioContext と出口を使う）
export function createBgm(audio) {
  let ctx = null, out = null, lane = null;
  let name = null, loopStart = 0, until = 0;
  let on = true;
  let noise = null;

  function setup() {
    const c = audio.context;
    if (!c || c === ctx) return !!c;
    ctx = c;
    out = ctx.createGain();
    out.gain.value = on ? 0.6 : 0;
    out.connect(audio.output);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    lane = null;
    if (name) start(name);
    return true;
  }

  function start(n) {
    if (lane) {
      const old = lane;
      old.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      setTimeout(() => old.disconnect(), 400);
    }
    lane = ctx.createGain();
    lane.connect(out);
    loopStart = ctx.currentTime + 0.06;
    until = loopStart;
  }

  function drum(kind, t, g) {
    if (kind === 'k') {
      const o = ctx.createOscillator(), v = ctx.createGain();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      v.gain.setValueAtTime(g * 3, t);
      v.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      o.connect(v).connect(lane);
      o.start(t); o.stop(t + 0.16);
      return;
    }
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), v = ctx.createGain();
    s.buffer = noise;
    f.type = kind === 'h' ? 'highpass' : 'bandpass';
    f.frequency.value = kind === 'h' ? 7000 : 1800;
    const len = kind === 'h' ? 0.04 : 0.12;
    v.gain.setValueAtTime(g * (kind === 'h' ? 0.6 : 1.2), t);
    v.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f).connect(v).connect(lane);
    s.start(t); s.stop(t + len + 0.01);
  }

  function note(part, freq, t, dur) {
    const o = ctx.createOscillator(), v = ctx.createGain();
    o.type = part.wave;
    o.frequency.setValueAtTime(freq, t);
    const end = t + dur * 0.92;
    v.gain.setValueAtTime(0.0001, t);
    v.gain.exponentialRampToValueAtTime(part.gain, t + 0.012);
    v.gain.setValueAtTime(part.gain, Math.max(t + 0.013, end - 0.04));
    v.gain.exponentialRampToValueAtTime(0.0001, end);
    o.connect(v).connect(lane);
    o.start(t); o.stop(end + 0.02);
  }

  // 少し先（0.25 秒）までの音を予約する
  function tick() {
    if (!name || !setup() || ctx.state !== 'running' || !lane) return;
    const tr = PARSED[name];
    const beat = 60 / tr.bpm, loopLen = tr.beats * beat;
    const from = Math.max(until, ctx.currentTime), to = ctx.currentTime + 0.25;
    if (to <= from) return;
    for (let k = Math.floor((from - loopStart) / loopLen); loopStart + k * loopLen < to; k++) {
      const base = loopStart + k * loopLen;
      for (const p of tr.parts) {
        for (const e of p.events) {
          const t = base + e.t * beat;
          if (t < from || t >= to) continue;
          if (p.wave === 'noise') drum(e.note, t, p.gain);
          else note(p, noteFreq(e.note), t, e.dur * beat);
        }
      }
    }
    until = to;
  }
  setInterval(tick, 60);

  return {
    play(n) {
      if (n === name) return;
      name = n;
      if (setup()) start(n);
    },
    setOn(v) {
      on = v;
      if (out) out.gain.setTargetAtTime(v ? 0.6 : 0, ctx.currentTime, 0.05);
    },
    get on() { return on; },
    get track() { return name; },
  };
}
