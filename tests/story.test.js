import test from 'node:test';
import assert from 'node:assert/strict';
import { CAST, LINES, MOVIE, EPISODES, MENUS, ORDER_LINES, SCENE_MS, pickLine, pickEpisode } from '../src/story.js';
import { readFileSync } from 'node:fs';
import { mulberry32 } from './helpers.js';

const allLines = () => [
  ...Object.values(LINES).flat(),
  ...MOVIE.flatMap(sc => sc.lines),
  ...Object.values(ORDER_LINES).flat(),
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

test('家族でおでかけの場面：回転寿司・ジブリ美術館・ハンバーグ・百均・マクドナルド・お花・ビレバン', () => {
  const three = ['daisuke', 'hiroko', 'nanae'];
  const want = { sushi: three, museum: three, hamburg: three, hyakkin: three, burger: three, flower: ['hiroko', 'nanae'], village: three };
  for (const [bg, people] of Object.entries(want)) {
    const sc = MOVIE.find(s => s.bg === bg);
    assert.ok(sc, bg);
    assert.deepEqual(sc.actors.filter(a => CAST[a.who].human).map(a => a.who).sort(), people, bg);
  }
});

test('どの場面の背景も、液晶の絵（lcd.css）がある', () => {
  const css = readFileSync('styles/lcd.css', 'utf8');
  for (const sc of MOVIE) assert.ok(css.includes(`.bg-${sc.bg}{`), sc.bg);
});

test('人には服の色があり、猫にはない', () => {
  for (const id of ['daisuke', 'nanae', 'hiroko', 'oe']) assert.ok(CAST[id].human && CAST[id].shirt && CAST[id].pants);
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

test('おでかけの話：1話4場面。サーティワン・ケンタッキー・ヤオコーは3人、ドライブ・カラオケは大江さんも', () => {
  const three = ['daisuke', 'hiroko', 'nanae'];
  for (const ep of EPISODES) assert.equal(ep.scenes.length, 4, ep.id);
  for (const id of ['drive', 'karaoke']) for (const sc of EPISODES.find(e => e.id === id).scenes) assert.deepEqual(sc.actors.map(a => a.who).sort(), [...three, 'oe'].sort(), id);
  assert.ok(EPISODES.find(e => e.id === 'oe'));
  for (const id of ['icecream', 'chicken', 'market']) {
    const ep = EPISODES.find(e => e.id === id);
    assert.ok(ep, id);
    for (const sc of ep.scenes) assert.deepEqual(sc.actors.filter(a => CAST[a.who].human).map(a => a.who).sort(), three, `${id} ${sc.cap}`);
  }
  assert.equal(new Set(EPISODES.map(e => e.id)).size, EPISODES.length);
});

test('話の選び方：まだ見ていない話から。ぜんぶ見たら、また最初から', () => {
  const rng = mulberry32(3);
  let seen = [];
  const got = [];
  for (let i = 0; i < EPISODES.length; i++) {
    const r = pickEpisode(seen, rng);
    seen = r.seen;
    got.push(r.episode.id);
  }
  assert.equal(new Set(got).size, EPISODES.length);
  const again = pickEpisode(seen, rng);
  assert.deepEqual(again.seen, [again.episode.id]);
});

test('注文アニメ：どのお店にも背景と、いつもの・ちょっと豪華・いちばん豪華の注文がある', () => {
  const css = readFileSync('styles/lcd.css', 'utf8');
  for (const [id, m] of Object.entries(MENUS)) {
    assert.ok(m.shop && css.includes(`.bg-${m.bg}{`), id);
    for (const tier of ['normal', 'chance', 'kakutei']) assert.ok(m[tier], `${id} ${tier}`);
  }
  assert.equal(MENUS.donkey.kakutei, 'ポテサラパケットディッシュ');
  assert.equal(MENUS.burger.kakutei, 'ダブルチーズバーガーのセット');
});
