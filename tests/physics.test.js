import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAYOUT } from '../src/board-layout.js';
import { createPhysics, BALL_R } from '../src/physics.js';
import { mulberry32 } from './helpers.js';

const CLOSED = { attackerOpen: false, hesoBoost: false };
const OPEN = { attackerOpen: true, hesoBoost: false };

function run(p, seconds, opts = CLOSED) {
  const ev = [];
  for (let t = 0; t < seconds; t += 1 / 60) ev.push(...p.step(1 / 60, opts));
  return ev;
}

// power ごとに玉を n 個打って、行き先を数える
function shoot(power, n, opts = CLOSED, seed = 1) {
  const p = createPhysics(LAYOUT, mulberry32(seed));
  const count = { heso: 0, attacker: 0, out: 0 };
  const born = new Map();
  let t = 0, launched = 0, maxLife = 0;
  while (launched < n || p.balls.length) {
    if (launched < n && t >= launched * 0.6) { const id = p.launch(power); born.set(id, t); launched++; }
    for (const e of p.step(1 / 60, opts)) {
      count[e.type]++;
      maxLife = Math.max(maxLife, t - born.get(e.id));
    }
    t += 1 / 60;
    for (const b of p.balls) if (t - born.get(b.id) > 15) throw new Error(`stuck ball at ${b.x.toFixed(1)},${b.y.toFixed(1)} power ${power}`);
  }
  return { ...count, rate: count.heso / n, maxLife };
}

test('layout has pins and keeps the lcd clear', () => {
  const real = LAYOUT.pins.filter(p => p.r <= 4).length;
  assert.ok(real >= 150, `pins ${real}`);
  const f = LAYOUT.lcdFrame;
  for (const pin of LAYOUT.pins) {
    const inLcd = pin.x > f.x && pin.x < f.x + f.w && pin.y > f.y && pin.y < f.y + f.h;
    assert.ok(!inLcd, `pin inside lcd ${pin.x},${pin.y}`);
  }
});

test('ball bounces off a pin', () => {
  const p = createPhysics({ ...LAYOUT, pins: [{ x: 100, y: 100, r: 2 }], walls: [] });
  p.addBall(100.5, 70, 0, 0);
  for (let i = 0; i < 30; i++) p.step(1 / 60, CLOSED);
  const b = p.balls[0];
  assert.ok(Math.abs(b.vx) > 20, `vx ${b.vx}`);
});

test('ball dropped into heso emits heso', () => {
  const p = createPhysics(LAYOUT);
  p.addBall(LAYOUT.heso.x, LAYOUT.heso.y - 30, 0, 0);
  const ev = run(p, 2);
  assert.equal(ev[0].type, 'heso');
});

test('closed attacker emits nothing, open emits attacker', () => {
  const a = LAYOUT.attacker;
  const p1 = createPhysics(LAYOUT);
  p1.addBall(a.x, a.y - 20, 0, 0);
  assert.ok(run(p1, 4, CLOSED).every(e => e.type !== 'attacker'));
  const p2 = createPhysics(LAYOUT);
  p2.addBall(a.x, a.y - 20, 0, 0);
  assert.equal(run(p2, 2, OPEN)[0].type, 'attacker');
});

test('weak shot falls back as out', () => {
  const p = createPhysics(LAYOUT);
  p.launch(0.02);
  const ev = run(p, 3);
  assert.equal(ev.length, 1);
  assert.equal(ev[0].type, 'out');
});

test('no ball stays stuck', () => {
  for (const power of [0.2, 0.4, 0.6, 0.8, 0.9]) {
    const r = shoot(power, 600);
    assert.equal(r.heso + r.attacker + r.out, 600);
  }
});

test('heso rate at best power is 10–13%, boost is 1.5x or more', () => {
  const table = [];
  for (let pw = 0.1; pw <= 0.95; pw += 0.05) table.push([+pw.toFixed(2), shoot(pw, 400).rate]);
  const [best] = table.slice().sort((a, b) => b[1] - a[1])[0];
  const r = shoot(best, 3000);
  const boost = shoot(best, 3000, { attackerOpen: false, hesoBoost: true });
  console.log('heso table', JSON.stringify(table), 'best', best, r.rate, 'boost', boost.rate);
  assert.ok(r.rate >= 0.10 && r.rate <= 0.13, `rate ${r.rate} at ${best}`);
  assert.ok(boost.rate >= r.rate * 1.5, `boost ${boost.rate}`);
});

test('open attacker catches most balls during a jackpot', () => {
  const table = [0.3, 0.5, 0.7, 0.9].map(pw => shoot(pw, 300, OPEN));
  const best = Math.max(...table.map(r => r.attacker / 300));
  assert.ok(best > 0.25, `attacker ${best}`);
});

test('every pin leaves room for a ball to pass walls and other pins', () => {
  const segDist = (p, w) => {
    const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
    const t = Math.max(0, Math.min(1, ((p.x - w.x1) * dx + (p.y - w.y1) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p.x - (w.x1 + dx * t), p.y - (w.y1 + dy * t));
  };
  const pins = LAYOUT.pins.filter(p => p.r <= 4);
  for (const p of pins) {
    for (const w of LAYOUT.walls) assert.ok(segDist(p, w) >= p.r + BALL_R * 2 + 1, `pin ${p.x},${p.y} too close to a wall`);
    for (const q of LAYOUT.pins) if (q !== p) assert.ok(Math.hypot(p.x - q.x, p.y - q.y) >= p.r + q.r + BALL_R * 2 + 1, `pins ${p.x},${p.y} and ${q.x},${q.y} too close`);
  }
});

test('launched ball rides up the left lane before entering the board', () => {
  const p = createPhysics(LAYOUT, mulberry32(3));
  p.launch(0.6);
  const b = p.balls[0];
  assert.ok(b.x < 20 && b.y > 380, `starts bottom-left at ${b.x},${b.y}`);
  const ys = [];
  for (let i = 0; i < 12; i++) { p.step(1 / 60, CLOSED); ys.push(p.balls[0].y); }
  assert.ok(ys.every((y, i) => i === 0 || y <= ys[i - 1]), `moves up: ${ys.map(v => v.toFixed(0))}`);
  for (let i = 0; i < 60 && p.balls[0] && p.balls[0].ride; i++) p.step(1 / 60, CLOSED);
  const top = p.balls[0];
  assert.ok(top && !top.ride && top.y <= 30 && top.x > 100, `reaches the top lane: ${top && top.x},${top && top.y}`);
});

test('a too-weak shot goes partway up the lane and falls back out', () => {
  const p = createPhysics(LAYOUT, mulberry32(4));
  p.launch(0.02);
  let minY = 999;
  let ev = [];
  for (let i = 0; i < 120 && !ev.length; i++) { ev = p.step(1 / 60, CLOSED); if (p.balls[0]) minY = Math.min(minY, p.balls[0].y); }
  assert.equal(ev[0].type, 'out');
  assert.ok(minY < 360 && minY > 100, `rose to ${minY}`);
});

test('外れ玉は盤面の下のアウト口に吸いこまれて消える（途中で消えない）', () => {
  const p = createPhysics(LAYOUT, mulberry32(5));
  const outs = [];
  let t = 0, launched = 0;
  while (launched < 150 || p.balls.length) {
    if (launched < 150 && t >= launched * 0.6) { p.launch(0.4 + (launched % 7) * 0.05); launched++; }
    for (const e of p.step(1 / 60, CLOSED)) if (e.type === 'out' && e.x !== undefined) outs.push(e);
    t += 1 / 60;
    if (t > 200) throw new Error('balls never finished');
  }
  assert.ok(outs.length > 100);
  const o = LAYOUT.out;
  for (const e of outs) assert.ok(Math.abs(e.x - o.x) <= o.w / 2 && e.y >= o.y - 2, `out at ${e.x.toFixed(1)},${e.y.toFixed(1)}`);
});
