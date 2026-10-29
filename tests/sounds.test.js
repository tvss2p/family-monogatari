import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { BGM_FILES, SONG_FILES, SE_FILES, AUDIO_DIR, CREDIT, loopBounds, prefetchFor } from '../src/sounds.js';
import { TRACKS } from '../src/bgm.js';
import { SOUND_NAMES } from '../src/audio.js';
import { gainFor } from '../tools/prepare-audio.mjs';

test('どの場面の曲にも、魔王魂の曲ファイルがある', () => {
  assert.deepEqual(Object.keys(BGM_FILES).sort(), Object.keys(TRACKS).sort());
  for (const f of Object.values(BGM_FILES)) {
    assert.match(f, /^maou_/, f);
    assert.ok(existsSync(`${AUDIO_DIR}/${f}`), f);
  }
});

test('差しかえる効果音は、合成の効果音と同じ名前で、ファイルがある', () => {
  for (const [name, f] of Object.entries(SE_FILES)) {
    assert.ok(SOUND_NAMES.includes(name), name);
    assert.match(f, /^maou_/, f);
    assert.ok(existsSync(`${AUDIO_DIR}/${f}`), f);
  }
});

test('スマホで重くならない大きさ（曲ぜんぶで 4MB まで）', () => {
  const total = Object.values(BGM_FILES).reduce((s, f) => s + statSync(`${AUDIO_DIR}/${f}`).size, 0);
  assert.ok(total < 4 * 1024 * 1024, `${total}`);
});

test('家族の歌：ファイルがあり、軽い（3曲で 3MB まで）。クレジットにも書く', () => {
  assert.deepEqual(Object.keys(SONG_FILES).sort(), ['mom', 'paradise', 'withU']);
  let total = 0;
  const credits = readFileSync(`${AUDIO_DIR}/CREDITS.txt`, 'utf8');
  for (const f of Object.values(SONG_FILES)) {
    assert.ok(existsSync(`${AUDIO_DIR}/${f}`), f);
    total += statSync(`${AUDIO_DIR}/${f}`).size;
    assert.ok(credits.includes(f), f);
  }
  assert.ok(total < 3 * 1024 * 1024, `${total}`);
});

test('クレジット：ゲームの設定画面・README・CREDITS.txt に魔王魂と CC BY 4.0', () => {
  assert.match(CREDIT, /魔王魂/);
  assert.match(CREDIT, /CC BY 4\.0/);
  assert.ok(readFileSync('index.html', 'utf8').includes(CREDIT));
  assert.ok(readFileSync('README.md', 'utf8').includes(CREDIT));
  const credits = readFileSync(`${AUDIO_DIR}/CREDITS.txt`, 'utf8');
  for (const f of [...Object.values(BGM_FILES), ...Object.values(SE_FILES)]) assert.ok(credits.includes(f), f);
  assert.match(credits, /https:\/\/maou\.audio\//);
});

test('くり返し位置：前と後ろの無音（変換で入るすき間）を飛ばす', () => {
  const sr = 1000;
  const d = new Float32Array(1000);
  for (let i = 50; i < 960; i++) d[i] = Math.sin(i) * 0.5 + 0.01;
  const b = loopBounds(d, sr);
  assert.equal(b.start, 0.05);
  assert.equal(b.end, 0.96);
  const silent = loopBounds(new Float32Array(100), sr);
  assert.deepEqual(silent, { start: 0, end: 0.1 });
});

test('先に用意しておく曲：リーチ中に大当たり曲、大当たり中に確変・時短の曲', () => {
  assert.deepEqual(prefetchFor('normal').sort(), ['hot', 'reach']);
  assert.ok(prefetchFor('reach').includes('jackpot'));
  assert.ok(prefetchFor('hot').includes('family'));
  assert.deepEqual(prefetchFor('jackpot').sort(), ['jitan', 'kakuhen']);
  assert.deepEqual(prefetchFor('withU').sort(), ['jitan', 'kakuhen']);
  assert.ok(prefetchFor('mom').includes('jackpot'));
  assert.deepEqual(prefetchFor('kakuhen').sort(), ['hot', 'reach']);
});

test('音量合わせ：目標の大きさにするが、割れない（ピーク 0.98 まで）', () => {
  assert.ok(Math.abs(gainFor({ rms: 0.1, peak: 0.5 }, 0.2) - 1.96) < 1e-9);
  assert.equal(gainFor({ rms: 0.05, peak: 0.25 }, 0.1), 2);
  assert.equal(gainFor({ rms: 0, peak: 0 }, 0.1), 1);
});

test('SOUND_NAMES は合成の効果音の一覧と同じ', () => {
  const src = readFileSync('src/audio.js', 'utf8');
  const body = src.slice(src.indexOf('const SOUNDS = {'), src.indexOf('\n  };', src.indexOf('const SOUNDS = {')));
  const keys = [...body.matchAll(/^ {4}([a-zA-Z]+): /gm)].map(m => m[1]);
  assert.deepEqual([...SOUND_NAMES].sort(), keys.sort());
});
