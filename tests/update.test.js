import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reloadDecision, UPDATE_WAIT_MAX_MS } from '../src/update.js';

test('新しい版がなければ、何もしない', () => {
  assert.deepEqual(reloadDecision({ pending: false, ballsOnBoard: 0, hidden: false, waitedMs: 0 }), { holdFire: false, reload: false });
});

test('新しい版が来たら、打つのを止めて、盤面の玉がなくなってから再読み込み', () => {
  assert.deepEqual(reloadDecision({ pending: true, ballsOnBoard: 3, hidden: false, waitedMs: 1000 }), { holdFire: true, reload: false });
  assert.deepEqual(reloadDecision({ pending: true, ballsOnBoard: 0, hidden: false, waitedMs: 1500 }), { holdFire: true, reload: true });
});

test('画面を離れているときや、待ちすぎたときは、すぐ再読み込み', () => {
  assert.equal(reloadDecision({ pending: true, ballsOnBoard: 5, hidden: true, waitedMs: 0 }).reload, true);
  assert.equal(reloadDecision({ pending: true, ballsOnBoard: 5, hidden: false, waitedMs: UPDATE_WAIT_MAX_MS }).reload, true);
  assert.ok(UPDATE_WAIT_MAX_MS >= 5000 && UPDATE_WAIT_MAX_MS <= 20000);
});
