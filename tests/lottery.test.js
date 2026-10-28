import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SYMBOLS, NUMBERED, PREMIUM_ID } from '../src/symbols.js';
import { drawHit } from '../src/lottery.js';
import { mulberry32 } from './helpers.js';

test('symbols table matches spec', () => {
  assert.equal(SYMBOLS.length, 12);
  assert.deepEqual(SYMBOLS.map(s => s.name), ['ジル', 'リー', 'ベリー', 'なーふぁん', 'ラッキー', 'キラ', 'グレン', 'だいすけ', 'ひろこ', 'ななえ', 'ハニー', '家族3人']);
  for (const s of NUMBERED) assert.equal(s.type, s.no % 2 === 1 ? 'kakuhen' : 'normal');
  assert.equal(NUMBERED.length, 11);
  const last = SYMBOLS[11];
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

test('numbered hits are uniform and kind follows parity', () => {
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
    assert.ok(r > 0.07 && r < 0.11, `${s.id} ${r}`);
  }
});

test('miss has no symbol', () => {
  const rng = () => 0.99;
  assert.deepEqual(drawHit('normal', rng), { hit: false, symbolId: null, kind: null });
});
