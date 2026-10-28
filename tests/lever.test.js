import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFiring, dragPower, stepPower, powerLabel } from '../src/lever.js';

test('locked lever fires without holding, unlocked needs a finger', () => {
  assert.equal(isFiring({ locked: true, holding: false }), true);
  assert.equal(isFiring({ locked: false, holding: true }), true);
  assert.equal(isFiring({ locked: false, holding: false }), false);
});

test('drag up or right makes it stronger, down or left weaker', () => {
  assert.ok(dragPower(0.5, 0, -40) > 0.5);
  assert.ok(dragPower(0.5, 40, 0) > 0.5);
  assert.ok(dragPower(0.5, 0, 40) < 0.5);
  assert.ok(dragPower(0.5, -40, 0) < 0.5);
});

test('a full sweep needs a long drag, so small moves are fine-grained', () => {
  assert.ok(Math.abs(dragPower(0.5, 0, -10) - 0.5) <= 0.05);
  assert.equal(dragPower(0.5, 0, -1000), 1);
  assert.equal(dragPower(0.5, 0, 1000), 0);
});

test('plus and minus buttons move by 2% and stay in range', () => {
  assert.equal(stepPower(0.5, +1), 0.52);
  assert.equal(stepPower(0.5, -1), 0.48);
  assert.equal(stepPower(0.99, +1), 1);
  assert.equal(stepPower(0.01, -1), 0);
});

test('power label shows a whole percent', () => {
  assert.equal(powerLabel(0.456), '強さ 46%');
});
