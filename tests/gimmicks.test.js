import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cueToPhase, createTapGuard } from '../src/render/gimmicks.js';

test('cueToPhase maps cues to cabinet phases', () => {
  assert.equal(cueToPhase('start'), 'normal');
  assert.equal(cueToPhase('reach'), 'reach');
  assert.equal(cueToPhase('hot'), 'hot');
  assert.equal(cueToPhase('jackpot'), 'jackpot');
  assert.equal(cueToPhase('stopL'), null);
  assert.equal(cueToPhase('medalUp'), null);
});

test('ignores taps for 500ms after show', () => {
  const g = createTapGuard(500);
  assert.equal(g.allowed(0), true);
  g.arm(1000);
  assert.equal(g.allowed(1000), false);
  assert.equal(g.allowed(1499), false);
  assert.equal(g.allowed(1500), true);
});
