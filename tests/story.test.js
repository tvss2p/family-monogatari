import test from 'node:test';
import assert from 'node:assert/strict';
import { CAST, LINES, MOVIE, SCENE_MS, pickLine } from '../src/story.js';
import { mulberry32 } from './helpers.js';

const allLines = () => [
  ...Object.values(LINES).flat(),
  ...MOVIE.flatMap(sc => sc.lines),
];

test('セリフと場面に出てくるのは、決まった登場人物と猫だけ', () => {
  for (const l of allLines()) assert.ok(CAST[l.who], `知らない人: ${l.who}`);
  for (const sc of MOVIE) for (const a of sc.actors) assert.ok(CAST[a.who], `知らない人: ${a.who}`);
});

test('ばあちゃん目線：だいすけは「ばあちゃん」、ななえは「おかあさん」と呼ぶ', () => {
  const lines = allLines();
  assert.ok(lines.every(l => !l.text.includes('ひろこ')));
  assert.ok(lines.filter(l => l.who === 'nanae').every(l => !l.text.includes('ばあちゃん')));
  assert.ok(lines.filter(l => l.who === 'daisuke').every(l => !l.text.includes('おかあさん')));
  assert.ok(lines.some(l => l.who === 'daisuke' && l.text.includes('ばあちゃん')));
  assert.ok(lines.some(l => l.who === 'nanae' && l.text.includes('おかあさん')));
  assert.equal(CAST.hiroko.name, 'ばあちゃん');
});

test('ふきだしに入る長さ（18 文字まで）', () => {
  for (const l of allLines()) assert.ok([...l.text].length <= 18, l.text);
});

test('ムービーの場面：背景があり、セリフは場面の時間の中におさまる', () => {
  assert.ok(MOVIE.length >= 4);
  for (const sc of MOVIE) {
    assert.ok(sc.bg && sc.cap && sc.actors.length >= 1 && sc.lines.length >= 1);
    for (const l of sc.lines) assert.ok(l.at >= 0 && l.at + 1800 <= SCENE_MS, `${sc.cap}: ${l.at}`);
  }
});

test('人には服の色があり、猫にはない', () => {
  for (const id of ['daisuke', 'nanae', 'hiroko']) assert.ok(CAST[id].human && CAST[id].shirt && CAST[id].pants);
  assert.equal(CAST.honey.human, false);
});

test('場面ごとのひとこと：リーチ・激アツ・はずれ・大当たり・確変・時短で、毎回どれかが出る', () => {
  const rng = mulberry32(7);
  for (const kind of ['reach', 'hot', 'miss', 'jackpot', 'family', 'kakuhen', 'jitan', 'end']) {
    const l = pickLine(kind, rng);
    assert.ok(l && CAST[l.who] && l.text, kind);
  }
  assert.equal(pickLine('nothing', rng), null);
});
