import test from 'node:test';
import assert from 'node:assert/strict';
import { splitBalls, pourCount, TRAY_MAX, BOX_MAX } from '../src/payout.js';

test('玉はまず上皿に、あふれたらドル箱へ（満タンの箱は積み上がる）', () => {
  assert.deepEqual(splitBalls(0), { tray: 0, boxes: 0, fill: 0 });
  assert.deepEqual(splitBalls(TRAY_MAX), { tray: TRAY_MAX, boxes: 0, fill: 0 });
  assert.deepEqual(splitBalls(TRAY_MAX + BOX_MAX / 2), { tray: TRAY_MAX, boxes: 0, fill: 0.5 });
  assert.deepEqual(splitBalls(TRAY_MAX + BOX_MAX * 2), { tray: TRAY_MAX, boxes: 2, fill: 0 });
  assert.deepEqual(splitBalls(-5), { tray: 0, boxes: 0, fill: 0 });
});

test('大当たり 1 回ぶん（10R×15 玉）で上皿があふれて箱に入りはじめる', () => {
  assert.ok(TRAY_MAX < 250 + 1500 && BOX_MAX <= 1500);
});

test('払い出しで流れる玉の数：多いほどたくさん、でも出しすぎない', () => {
  assert.equal(pourCount(0), 0);
  assert.ok(pourCount(3) >= 2);
  assert.ok(pourCount(15) > pourCount(3));
  assert.ok(pourCount(1000) <= 14);
});
