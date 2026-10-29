import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trackFor, songFor, songStart, SONG_STARTS, trackGain, parseLine, noteFreq, TRACKS } from '../src/bgm.js';

test('track follows the scene', () => {
  assert.equal(trackFor({ phase: 'idle', mode: 'normal', scene: 'normal' }), 'normal');
  assert.equal(trackFor({ phase: 'spinning', mode: 'normal', scene: 'reach' }), 'reach');
  assert.equal(trackFor({ phase: 'spinning', mode: 'normal', scene: 'hot' }), 'hot');
  assert.equal(trackFor({ phase: 'jackpot', mode: 'normal', scene: 'jackpot', premium: false }), 'jackpot');
  assert.equal(trackFor({ phase: 'jackpot', mode: 'normal', scene: 'jackpot', premium: true }), 'family');
  assert.equal(trackFor({ phase: 'idle', mode: 'kakuhen', scene: 'normal' }), 'kakuhen');
  assert.equal(trackFor({ phase: 'idle', mode: 'jitan', scene: 'normal' }), 'jitan');
  assert.equal(trackFor({ phase: 'spinning', mode: 'kakuhen', scene: 'reach' }), 'reach');
});

test('家族の歌：大当たりの2回に1回、だいすけの歌を交互に。プレミアは家族の曲のまま', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(songFor), ['withU', null, 'paradise', null, 'withU', null]);
  const jp = (n, premium = false) => trackFor({ phase: 'jackpot', mode: 'normal', scene: 'jackpot', premium, jackpotNo: n });
  assert.equal(jp(1), 'withU');
  assert.equal(jp(2), 'jackpot');
  assert.equal(jp(3), 'paradise');
  assert.equal(jp(1, true), 'family');
});

test('歌はまるごと：大当たりのたびに始める位置が変わり、ぜんぶの位置を順に使う', () => {
  const withU = [1, 5, 9, 13, 17, 21, 25, 29, 33].map(songStart);
  assert.deepEqual([...withU].sort((a, b) => a - b), [...SONG_STARTS.withU].sort((a, b) => a - b));
  for (let i = 1; i < withU.length; i++) assert.notEqual(withU[i], withU[i - 1]);
  const paradise = [3, 7, 11, 15, 19, 23, 27].map(songStart);
  assert.deepEqual([...paradise].sort((a, b) => a - b), [...SONG_STARTS.paradise].sort((a, b) => a - b));
  assert.equal(songStart(2), 0);
  // 曲の長さ（With U 271 秒・Paradise 207 秒）の中から始まる
  assert.ok(Math.max(...SONG_STARTS.withU) < 271 && Math.max(...SONG_STARTS.paradise) < 207);
});

test('おかあさんの図柄のリーチは、リーチから激アツまでおかあさんの歌', () => {
  assert.equal(trackFor({ phase: 'spinning', mode: 'normal', scene: 'reach', reachOn: 'nanae' }), 'mom');
  assert.equal(trackFor({ phase: 'spinning', mode: 'kakuhen', scene: 'hot', reachOn: 'nanae' }), 'mom');
  assert.equal(trackFor({ phase: 'spinning', mode: 'normal', scene: 'reach', reachOn: 'kira' }), 'reach');
  assert.equal(trackFor({ phase: 'spinning', mode: 'normal', scene: 'normal', reachOn: 'nanae' }), 'normal');
});

test('大当たり中の曲は、ほかの曲より少し大きい', () => {
  for (const n of ['jackpot', 'family', 'withU', 'paradise']) assert.ok(trackGain(n) > 1.4 && trackGain(n) < 2, n);
  for (const n of ['normal', 'reach', 'hot', 'mom', 'kakuhen', 'jitan']) assert.equal(trackGain(n), 1, n);
});

test('a line of notes is read into timed events', () => {
  const ev = parseLine('C5 - E5 . G5', 0.5);
  assert.deepEqual(ev, [
    { t: 0, note: 'C5', dur: 1 },
    { t: 1, note: 'E5', dur: 0.5 },
    { t: 2, note: 'G5', dur: 0.5 },
  ]);
});

test('note names become frequencies', () => {
  assert.equal(Math.round(noteFreq('A4')), 440);
  assert.equal(Math.round(noteFreq('C5')), 523);
  assert.equal(Math.round(noteFreq('F#4')), 370);
  assert.equal(Math.round(noteFreq('Bb3')), 233);
});

test('every scene has a looping track whose parts fit the loop', () => {
  for (const name of ['normal', 'reach', 'hot', 'jackpot', 'family', 'kakuhen', 'jitan']) {
    const tr = TRACKS[name];
    assert.ok(tr, name);
    assert.ok(tr.bpm >= 90 && tr.bpm <= 180, `${name} bpm`);
    for (const part of tr.parts) {
      const ev = parseLine(part.line, part.step);
      const end = Math.max(...ev.map(e => e.t + e.dur));
      assert.ok(end <= tr.beats + 1e-9, `${name} part longer than loop: ${end} > ${tr.beats}`);
      for (const e of ev) if (part.wave !== 'noise') assert.ok(Number.isFinite(noteFreq(e.note)), `${name} ${e.note}`);
    }
  }
});
