import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SYMBOLS, NUMBERED, PREMIUM_ID } from '../src/symbols.js';
import { drawHit } from '../src/lottery.js';
import { mulberry32 } from './helpers.js';

test('symbols table matches spec', () => {
  assert.equal(SYMBOLS.length, 13);
  assert.deepEqual(SYMBOLS.map(s => s.name), ['ジル', 'リー', 'ベリー', 'なーふぁん', 'ラッキー', 'キラ', 'グレン', 'だいすけ', 'ばあちゃん', 'ななえ', 'ハニー', '大江さん', '家族4人']);
  for (const s of NUMBERED) assert.equal(s.type, s.no % 2 === 1 ? 'kakuhen' : 'normal');
  assert.equal(NUMBERED.length, 12);
  const last = SYMBOLS[12];
  assert.equal(last.id, PREMIUM_ID);
  assert.equal(last.id, 'trio');
  assert.equal(last.type, 'premium');
  assert.equal(last.no, null);
});

test('hit rate normal ≈ 1/99', () => {
  const rng = mulberry32(1);
  let hits = 0;
  for (let i = 0; i < 200000; i++) if (drawHit('normal', rng).hit) hits++;
  const r = hits / 200000;
  assert.ok(r > 0.0085 && r < 0.0117, `rate ${r}`);
});

test('jitan uses the normal odds', () => {
  const rng = mulberry32(2);
  let hits = 0;
  for (let i = 0; i < 200000; i++) if (drawHit('jitan', rng).hit) hits++;
  const r = hits / 200000;
  assert.ok(r > 0.0085 && r < 0.0117, `rate ${r}`);
});

test('hit rate kakuhen ≈ 1/10', () => {
  const rng = mulberry32(3);
  let hits = 0;
  for (let i = 0; i < 100000; i++) if (drawHit('kakuhen', rng).hit) hits++;
  const r = hits / 100000;
  assert.ok(r > 0.095 && r < 0.105, `rate ${r}`);
});

test('premium share ≈ 10%', () => {
  const rng = mulberry32(4);
  let hits = 0, prem = 0;
  for (let i = 0; i < 200000; i++) {
    const h = drawHit('kakuhen', rng);
    if (!h.hit) continue;
    hits++;
    if (h.symbolId === 'trio') { prem++; assert.equal(h.kind, 'premium'); }
  }
  const r = prem / hits;
  assert.ok(r > 0.08 && r < 0.12, `share ${r}`);
});

test('当たりの図柄：確変の図柄は 6/66 ずつ、通常は 5/66 ずつ。確変に入る割合は 6/11 のまま', () => {
  const rng = mulberry32(5);
  const count = {};
  let n = 0;
  for (let i = 0; i < 300000; i++) {
    const h = drawHit('kakuhen', rng);
    if (!h.hit || h.symbolId === 'trio') continue;
    n++;
    count[h.symbolId] = (count[h.symbolId] || 0) + 1;
    const s = SYMBOLS.find(x => x.id === h.symbolId);
    assert.equal(h.kind, s.type);
  }
  for (const s of NUMBERED) {
    const r = count[s.id] / n;
    const want = s.type === 'kakuhen' ? 6 / 66 : 5 / 66;
    assert.ok(Math.abs(r - want) < 0.006, `${s.id} ${r}`);
  }
  const k = NUMBERED.filter(s => s.type === 'kakuhen').reduce((a, s) => a + count[s.id], 0) / n;
  assert.ok(Math.abs(k - 6 / 11) < 0.006, `kakuhen ${k}`);
  assert.ok(count.oe > 0);
});

test('miss has no symbol', () => {
  const rng = () => 0.99;
  assert.deepEqual(drawHit('normal', rng), { hit: false, symbolId: null, kind: null });
});
