// 魔王魂の元ファイル（assets/original/audio、git に入れない）→ ゲーム用（assets/audio）
// 曲は 24kHz ステレオ 56kbps、効果音は 44.1kHz モノラル 96kbps の AAC にして、音量をそろえる
// 使い方: node tools/prepare-audio.mjs（macOS の afconvert を使う）
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { BGM_FILES, SE_FILES, AUDIO_DIR } from '../src/sounds.js';

const SRC = 'assets/original/audio';
const PEAK = 0.98;

// 目標の大きさ（RMS）にする倍率。ただし音が割れないように、ピークは PEAK まで
export function gainFor({ rms, peak }, target) {
  if (!rms || !peak) return 1;
  return Math.min(target / rms, PEAK / peak);
}

// 曲：元のファイル名、切る長さ（秒）、最後のフェードアウト（秒）
const BGM_SRC = {
  'maou_loop_bgm_acoustic44.m4a': ['maou_loop_bgm_acoustic44.m4a'],
  'maou_loop_bgm_neorock34_cut.m4a': ['maou_loop_bgm_neorock34.m4a', 24, 1.5],
  'maou_loop_bgm_neorock33_cut.m4a': ['maou_loop_bgm_neorock33.m4a', 24, 1.5],
  'maou_loop_bgm_acoustic34.m4a': ['maou_loop_bgm_acoustic34.m4a'],
  'maou_bgm_healing07_cut.m4a': ['maou_bgm_healing07.m4a', 90, 3],
  'maou_loop_bgm_ethnic09.m4a': ['maou_loop_bgm_ethnic09.m4a'],
  'maou_loop_bgm_acoustic50.m4a': ['maou_loop_bgm_acoustic50.m4a'],
};

function readWav(file) {
  const b = readFileSync(file);
  let p = 12, fmt = null, data = null;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4), size = b.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(p + 10), rate: b.readUInt32LE(p + 12) };
    if (id === 'data') data = new Int16Array(b.buffer.slice(b.byteOffset + p + 8, b.byteOffset + p + 8 + size));
    p += 8 + size + (size & 1);
  }
  return { ...fmt, data };
}

function writeWav(file, { ch, rate, data }) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length * 2, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(ch, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * ch * 2, 28); h.writeUInt16LE(ch * 2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length * 2, 40);
  writeFileSync(file, Buffer.concat([h, Buffer.from(data.buffer, data.byteOffset, data.length * 2)]));
}

export function convert(src, out, { rate, ch, bps, cut, fade, target }) {
  const tmp = `${AUDIO_DIR}/.tmp.wav`;
  execFileSync('afconvert', ['-f', 'WAVE', '-d', `LEI16@${rate}`, '-c', String(ch), src, tmp]);
  const w = readWav(tmp);
  let d = cut ? w.data.slice(0, Math.min(w.data.length, cut * rate * ch)) : w.data;
  const f = new Float32Array(d.length);
  const frames = d.length / ch, fadeFrames = fade ? fade * rate : 0;
  for (let i = 0; i < d.length; i++) {
    const fr = Math.floor(i / ch);
    const env = fadeFrames && fr > frames - fadeFrames ? (frames - fr) / fadeFrames : 1;
    f[i] = (d[i] / 32768) * env;
  }
  let sum = 0, peak = 0;
  for (const x of f) { sum += x * x; peak = Math.max(peak, Math.abs(x)); }
  const g = gainFor({ rms: Math.sqrt(sum / f.length), peak }, target);
  d = Int16Array.from(f, x => Math.max(-32768, Math.min(32767, Math.round(x * g * 32768))));
  writeWav(tmp, { ch, rate, data: d });
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', String(bps), tmp, out]);
  rmSync(tmp);
  return { sec: frames / rate, gain: g };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(AUDIO_DIR, { recursive: true });
  for (const out of Object.values(BGM_FILES)) {
    const [src, cut, fade] = BGM_SRC[out];
    const r = convert(`${SRC}/${src}`, `${AUDIO_DIR}/${out}`, { rate: 24000, ch: 2, bps: 56000, cut, fade, target: 0.2 });
    console.log(`${out}: ${r.sec.toFixed(1)}s x${r.gain.toFixed(2)}`);
  }
  for (const out of Object.values(SE_FILES)) {
    const r = convert(`${SRC}/${out}`, `${AUDIO_DIR}/${out}`, { rate: 44100, ch: 1, bps: 96000, target: 0.25 });
    console.log(`${out}: ${r.sec.toFixed(2)}s x${r.gain.toFixed(2)}`);
  }
}
