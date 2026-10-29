// 家族が歌った曲（個人の録音）→ ゲーム用（assets/audio）
// 元のファイルは assets/original/songs（git に入れない）。ffmpeg を使う
// 軽くするためモノラル 24kHz・48kbps の AAC。大きさは魔王魂の曲（-12 LUFS 前後）にそろえる
// （モノラルはゲームで左右の両方から鳴るので、左右に同じ音を置いた形で測る）
// 使い方: node tools/prepare-songs.mjs
import { execFileSync, spawnSync } from 'node:child_process';
import { SONG_FILES, AUDIO_DIR } from '../src/sounds.js';

const SRC = 'assets/original/songs';
export const SONG_LUFS = -12;

// 曲の名前：元のファイル、切る長さ（秒、なし＝全部）、最後のフェードアウト（秒）
const SONG_SRC = {
  withU: ['withu.mp3', 110, 3],
  paradise: ['paradise.mp3', 110, 3],
  mom: ['mom.mp3'],
};

// 左右に同じ音を置いたときの大きさ（LUFS）
export function measure(file) {
  const log = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'pan=stereo|c0=c0|c1=c0,ebur128', '-f', 'null', '-'],
    { encoding: 'utf8' }).stderr;
  return Number([...log.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop()[1]);
}

function encode(src, out, { cut, fade, gainDb }) {
  // loudnorm で曲の中の大きさのばらつきをならしてから、全体の大きさを gainDb で合わせる
  const af = ['loudnorm=I=-14:TP=-1.5:LRA=7', `volume=${gainDb.toFixed(2)}dB`, 'alimiter=limit=0.95'];
  if (cut) af.push(`afade=t=out:st=${cut - fade}:d=${fade}`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, ...(cut ? ['-t', String(cut)] : []),
    '-af', af.join(','), '-ac', '1', '-ar', '24000', '-c:a', 'aac', '-b:a', '48k', out]);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const [name, out] of Object.entries(SONG_FILES)) {
    const [src, cut, fade] = SONG_SRC[name];
    const file = `${AUDIO_DIR}/${out}`;
    encode(`${SRC}/${src}`, file, { cut, fade, gainDb: 0 });
    const first = measure(file);
    encode(`${SRC}/${src}`, file, { cut, fade, gainDb: SONG_LUFS - first });
    console.log(`${out}: ${measure(file).toFixed(1)} LUFS`);
  }
}
