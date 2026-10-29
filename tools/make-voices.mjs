// ボイスを作る：edge-tts（python3 -m edge_tts）で元の mp3 を作り（assets/original/voice、git に入れない）、
// 24kHz モノラル 48kbps の AAC にして音量をそろえる（assets/audio/voice_*.m4a）
// 使い方: python3 -m pip install --user edge-tts → node tools/make-voices.mjs（macOS の afconvert を使う）
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { VOICES, VOICE_FILES, VOICE_STYLE } from '../src/voices.js';
import { AUDIO_DIR } from '../src/sounds.js';
import { convert } from './prepare-audio.mjs';

const SRC = 'assets/original/voice';
mkdirSync(SRC, { recursive: true });
for (const [k, v] of Object.entries(VOICES)) {
  const mp3 = `${SRC}/${k}.mp3`;
  execFileSync('python3', ['-m', 'edge_tts', '--voice', VOICE_STYLE.voice, `--rate=${VOICE_STYLE.rate}`, `--pitch=${VOICE_STYLE.pitch}`, '--text', v.text, '--write-media', mp3]);
  const r = convert(mp3, `${AUDIO_DIR}/${VOICE_FILES[k]}`, { rate: 24000, ch: 1, bps: 48000, target: 0.25 });
  console.log(`${VOICE_FILES[k]}: ${r.sec.toFixed(2)}s x${r.gain.toFixed(2)}  ${v.show}`);
}
