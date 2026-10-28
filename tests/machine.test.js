import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMachine } from '../src/machine.js';
import { CONFIG } from '../src/config.js';

// 決まった順に値を返す乱数（なくなったら 0.99＝外れ）
const seq = (...v) => () => (v.length ? v.shift() : 0.99);
// drawHit に渡す値：当たり（0）→ プレミアムか（0.5=いいえ / 0=はい）→ 図柄の位置
const NORMAL_HIT = [0, 0.5, 1 / 11 + 0.001];   // 2番目＝リー（偶数＝通常）
const KAKUHEN_HIT = [0, 0.5, 0];               // 1番目＝ジル（奇数＝確変）
const PREMIUM_HIT = [0, 0];

function playJackpot(m) {
  while (m.state.phase === 'jackpot') m.onAttacker();
}

test('starts with 250 balls', () => {
  const m = createMachine({ rng: seq() });
  assert.equal(m.state.balls, 250);
  assert.equal(m.state.mode, 'normal');
  assert.equal(m.state.phase, 'idle');
});

test('fireBall returns false at zero', () => {
  const m = createMachine({ rng: seq() });
  for (let i = 0; i < 250; i++) assert.equal(m.fireBall(), true);
  assert.equal(m.state.balls, 0);
  assert.equal(m.fireBall(), false);
  assert.equal(m.state.balls, 0);
  m.rent();
  assert.equal(m.state.balls, 125);
  assert.equal(m.fireBall(), true);
});

test('heso pays 3 and holds max 4', () => {
  const m = createMachine({ rng: seq() });
  for (let i = 0; i < 5; i++) m.onHeso();
  assert.equal(m.state.holds.length, 4);
  assert.equal(m.state.balls, 250 + 15);
  assert.equal(m.onHeso(), null);
});

test('spin consumes a hold and counts', () => {
  const m = createMachine({ rng: seq() });
  m.onHeso();
  const h = m.startNextSpin();
  assert.equal(h.hit, false);
  assert.equal(m.state.phase, 'spinning');
  assert.equal(m.state.spins, 1);
  assert.equal(m.startNextSpin(), null);
  m.finishSpin();
  assert.equal(m.state.phase, 'idle');
  assert.equal(m.startNextSpin(), null);
});

test('normal hit leads to 10 rounds then jitan 100', () => {
  const m = createMachine({ rng: seq(...NORMAL_HIT) });
  m.onHeso();
  assert.equal(m.startNextSpin().kind, 'normal');
  m.finishSpin();
  assert.equal(m.state.phase, 'jackpot');
  assert.equal(m.state.roundsTotal, 10);
  assert.equal(m.state.hits, 1);
  assert.equal(m.isAttackerOpen(), true);
  const before = m.state.balls;
  playJackpot(m);
  assert.equal(m.state.balls - before, 10 * 10 * 15);
  assert.equal(m.state.mode, 'jitan');
  assert.equal(m.state.jitanLeft, 100);
  assert.equal(m.isHesoBoost(), true);
  assert.equal(m.isAttackerOpen(), false);
});

test('kakuhen hit leads to kakuhen', () => {
  const m = createMachine({ rng: seq(...KAKUHEN_HIT) });
  m.onHeso(); m.startNextSpin(); m.finishSpin();
  playJackpot(m);
  assert.equal(m.state.mode, 'kakuhen');
  assert.equal(m.isHesoBoost(), true);
});

test('premium has 16 rounds and kakuhen', () => {
  const m = createMachine({ rng: seq(...PREMIUM_HIT) });
  m.onHeso(); m.startNextSpin(); m.finishSpin();
  assert.equal(m.state.roundsTotal, 16);
  const before = m.state.balls;
  playJackpot(m);
  assert.equal(m.state.balls - before, 16 * 10 * 15);
  assert.equal(m.state.mode, 'kakuhen');
});

test('kakuhen ends with a normal hit into jitan', () => {
  const m = createMachine({ rng: seq(...KAKUHEN_HIT, ...NORMAL_HIT) });
  m.onHeso(); m.startNextSpin(); m.finishSpin(); playJackpot(m);
  m.onHeso(); m.startNextSpin(); m.finishSpin(); playJackpot(m);
  assert.equal(m.state.mode, 'jitan');
});

test('attacker pays 15 and advances after 10', () => {
  const m = createMachine({ rng: seq(...NORMAL_HIT) });
  m.onHeso(); m.startNextSpin(); m.finishSpin();
  for (let i = 0; i < 9; i++) assert.equal(m.onAttacker(), true);
  assert.equal(m.state.round, 1);
  m.onAttacker();
  assert.equal(m.state.round, 2);
  assert.equal(m.state.roundCount, 0);
});

test('attacker pays nothing outside jackpot', () => {
  const m = createMachine({ rng: seq() });
  assert.equal(m.onAttacker(), false);
  assert.equal(m.state.balls, 250);
});

test('round times out after 30s', () => {
  const m = createMachine({ rng: seq(...NORMAL_HIT) });
  m.onHeso(); m.startNextSpin(); m.finishSpin();
  m.tick(29999);
  assert.equal(m.state.round, 1);
  m.tick(1);
  assert.equal(m.state.round, 2);
});

test('jitan counts down to normal', () => {
  const m = createMachine({ rng: seq(...NORMAL_HIT) });
  m.onHeso(); m.startNextSpin(); m.finishSpin(); playJackpot(m);
  for (let i = 0; i < 99; i++) { m.onHeso(); m.startNextSpin(); m.finishSpin(); }
  assert.equal(m.state.mode, 'jitan');
  assert.equal(m.state.jitanLeft, 1);
  m.onHeso(); m.startNextSpin(); m.finishSpin();
  assert.equal(m.state.mode, 'normal');
  assert.equal(m.isHesoBoost(), false);
});

test('restores mid-jackpot', () => {
  const m = createMachine({ rng: seq(...NORMAL_HIT) });
  m.onHeso(); m.startNextSpin(); m.finishSpin();
  for (let i = 0; i < 20; i++) m.onAttacker();
  assert.equal(m.state.round, 3);
  const saved = JSON.parse(JSON.stringify(m.toJSON()));
  const r = createMachine({ rng: seq(), saved });
  assert.equal(r.state.phase, 'idle');
  assert.equal(r.state.balls, m.state.balls + 8 * 10 * 15);
  assert.equal(r.state.mode, 'jitan');
  assert.equal(r.state.jitanLeft, 100);
  assert.equal(r.state.hits, 1);
});

test('restores a spinning hold back to the front', () => {
  const m = createMachine({ rng: seq() });
  m.onHeso(); m.onHeso(); m.startNextSpin();
  const r = createMachine({ rng: seq(), saved: JSON.parse(JSON.stringify(m.toJSON())) });
  assert.equal(r.state.phase, 'idle');
  assert.equal(r.state.holds.length, 2);
});

test('broken saved data starts fresh', () => {
  const r = createMachine({ rng: seq(), saved: { balls: 'x' } });
  assert.equal(r.state.balls, CONFIG.startBalls);
});
