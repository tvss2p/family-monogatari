import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync, readFileSync } from 'node:fs';
import { VOICES, VOICE_FILES, pickVoice } from '../src/voices.js';
import { AUDIO_DIR } from '../src/sounds.js';
import { mulberry32 } from './helpers.js';

test('ボイス：リーチ・チャンス・大当たり・家族そろって・確変・時短・確変昇格の声がある', () => {
  for (const k of ['reach1', 'reach2', 'hot', 'jackpot1', 'jackpot2', 'family', 'kakuhen', 'jitan', 'kakuhenUp']) {
    assert.ok(VOICES[k] && VOICES[k].text && VOICES[k].show, k);
    const f = `${AUDIO_DIR}/${VOICE_FILES[k]}`;
    assert.ok(existsSync(f), f);
    assert.ok(statSync(f).size < 60 * 1024, `${f} ${statSync(f).size}`);
  }
});

test('ボイスを出す場面：リーチ・激アツ・大当たり（家族そろいは専用）・確変／時短に入ったとき・確変昇格', () => {
  const rng = mulberry32(3);
  const reach = new Set(Array.from({ length: 40 }, () => pickVoice('reach', {}, rng)));
  assert.deepEqual([...reach].sort(), ['reach1', 'reach2']);
  assert.equal(pickVoice('hot', {}, rng), 'hot');
  assert.ok(['jackpot1', 'jackpot2'].includes(pickVoice('jackpot', { premium: false }, rng)));
  assert.equal(pickVoice('jackpot', { premium: true }, rng), 'family');
  assert.equal(pickVoice('mode:kakuhen', {}, rng), 'kakuhen');
  assert.equal(pickVoice('mode:jitan', {}, rng), 'jitan');
  assert.equal(pickVoice('promoWin', {}, rng), 'kakuhenUp');
  assert.equal(pickVoice('stopL', {}, rng), null);
});

test('ボイスの作り方とクレジット：edge-tts の Nanami（女性）で、README に書いてある', () => {
  assert.ok(readFileSync('README.md', 'utf8').includes('ja-JP-NanamiNeural'));
});

test('ボイスの読みこみ名は、効果音の名前とかぶらない（かぶると効果音が声に入れかわる）', async () => {
  const { SOUND_NAMES } = await import('../src/audio.js');
  const { SE_FILES } = await import('../src/sounds.js');
  const { VOICE_SAMPLES } = await import('../src/voices.js');
  assert.equal(Object.keys(VOICE_SAMPLES).length, Object.keys(VOICES).length);
  for (const k of Object.keys(VOICE_SAMPLES)) {
    assert.ok(!SOUND_NAMES.includes(k) && !(k in SE_FILES), k);
  }
});
