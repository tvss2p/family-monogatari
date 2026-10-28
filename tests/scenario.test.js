import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSpin } from '../src/scenario.js';
import { drawHit } from '../src/lottery.js';
import { NUMBERED } from '../src/symbols.js';
import { simulate } from '../tools/sim.mjs';
import { mulberry32 } from './helpers.js';

const MISS = { hit: false, symbolId: null, kind: null };
const hitOf = (id, kind) => ({ hit: true, symbolId: id, kind });
const at = (spin, cue) => (spin.cues.find(c => c.cue === cue) || {}).t;

test('miss never shows three equal', () => {
  const rng = mulberry32(10);
  for (let i = 0; i < 20000; i++) {
    const s = buildSpin(MISS, 'normal', rng);
    const [l, m, r] = s.stops;
    assert.ok(!(l === m && m === r));
  }
});

test('hit shows three equal = symbolId', () => {
  const rng = mulberry32(11);
  for (const sym of NUMBERED) {
    const s = buildSpin(hitOf(sym.id, sym.type), 'normal', rng);
    assert.deepEqual(s.stops, [sym.id, sym.id, sym.id]);
    assert.ok(s.reach);
  }
});

test('premium stops are all trio with family reach and hot', () => {
  const rng = mulberry32(12);
  for (let i = 0; i < 200; i++) {
    const s = buildSpin(hitOf('trio', 'premium'), 'normal', rng);
    assert.deepEqual(s.stops, ['trio', 'trio', 'trio']);
    assert.equal(s.reach, 'family');
    assert.equal(s.hot, true);
  }
});

test('reach pair is l and r', () => {
  const rng = mulberry32(13);
  let reaches = 0;
  for (let i = 0; i < 20000; i++) {
    const s = buildSpin(MISS, 'normal', rng);
    const [l, m, r] = s.stops;
    if (s.reach) { reaches++; assert.equal(l, r); assert.notEqual(m, l); }
    else assert.notEqual(l, r);
  }
  const rate = reaches / 20000;
  assert.ok(rate > 0.10 && rate < 0.15, `miss reach rate ${rate}`);
});

test('family reach and parade are hot signals', () => {
  const rng = mulberry32(14);
  const c = { fam: [0, 0], parade: [0, 0], hot: [0, 0] };
  for (let i = 0; i < 400000; i++) {
    const h = drawHit('normal', rng);
    const s = buildSpin(h, 'normal', rng);
    const k = h.hit ? 0 : 1;
    if (s.reach === 'family') c.fam[k]++;
    if (s.notices.includes('parade')) c.parade[k]++;
    if (s.hot) c.hot[k]++;
  }
  const p = ([h, m]) => h / (h + m);
  assert.ok(p(c.fam) > 0.5, `family ${p(c.fam)}`);
  assert.ok(p(c.parade) > 0.6, `parade ${p(c.parade)}`);
  assert.ok(p(c.hot) > 0.35, `hot ${p(c.hot)}`);
});

test('cue order', () => {
  const rng = mulberry32(15);
  for (let i = 0; i < 20000; i++) {
    const h = i % 3 === 0 ? hitOf('trio', 'premium') : i % 3 === 1 ? hitOf('lee', 'normal') : MISS;
    const mode = i % 2 ? 'normal' : 'jitan';
    const s = buildSpin(h, mode, rng);
    const L = at(s, 'stopL'), R = at(s, 'stopR'), M = at(s, 'stopM'), E = at(s, 'end');
    assert.ok(L < R && R < M && M < E);
    assert.equal(E, s.durationMs);
    for (let j = 1; j < s.cues.length; j++) assert.ok(s.cues[j - 1].t <= s.cues[j].t);
    if (s.reach) {
      assert.ok(at(s, 'reach') >= R);
      assert.ok(at(s, 'armsIn') >= at(s, 'reach'));
    }
    if (s.hot) {
      assert.ok(at(s, 'medalDrop') < at(s, 'medalUp'));
      assert.ok(at(s, 'medalUp') <= M - 300);
      assert.ok(at(s, 'cutin') + 1600 <= M - 300);
      assert.ok(at(s, 'hot') > at(s, 'reach'));
    }
    if (h.hit) assert.ok(at(s, 'jackpot') > M);
    else assert.equal(at(s, 'jackpot'), undefined);
  }
});

test('durations: plain miss 3000ms, fast miss 1200ms, reach 7000–11000ms', () => {
  const rng = mulberry32(16);
  for (let i = 0; i < 5000; i++) {
    const s = buildSpin(MISS, 'normal', rng);
    if (!s.reach) assert.equal(s.durationMs, 3000);
    else assert.ok(s.durationMs >= 7000 && s.durationMs <= 11000, `${s.durationMs}`);
    const f = buildSpin(MISS, 'kakuhen', rng);
    if (!f.reach) assert.equal(f.durationMs, 1200);
  }
});

test('long run keeps invariants', () => {
  const r = simulate({ spins: 50000, seed: 7 });
  assert.equal(r.balls, r.expectedBalls);
  assert.equal(r.finalPhase, 'idle');
  assert.ok(r.hits > 300, `hits ${r.hits}`);
});
