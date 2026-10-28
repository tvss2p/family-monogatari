import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitCabinet, CROP_MAX } from '../src/fit.js';

test('縦に余裕があるスマホは、上を切らずにまん中へ', () => {
  const f = fitCabinet(375, 812);
  assert.equal(f.cut, 0);
  assert.ok(Math.abs(f.s - 375 / 336) < 1e-9);
  assert.ok(f.top >= 0);
});

test('縦が足りないスマホは、看板より上（CROP_MAX まで）を切って大きく映す', () => {
  const f = fitCabinet(375, 667);
  assert.ok(f.s > 667 / 722, `${f.s}`);
  assert.ok(f.cut > 0 && f.cut <= CROP_MAX, `${f.cut}`);
  // 切ったぶんだけ上にずらし、見える部分（cut から 722 まで）はちょうど画面におさまる
  assert.ok(Math.abs(f.top + f.cut * f.s) < 1e-9);
  assert.ok((722 - f.cut) * f.s <= 667 + 1e-9);
});

test('とても縦が短いときも、切るのは CROP_MAX まで（ロゴの文字は切らない）', () => {
  const f = fitCabinet(400, 500);
  assert.ok(Math.abs(f.cut - CROP_MAX) < 1e-9);
  assert.ok((722 - f.cut) * f.s <= 500 + 1e-9);
});

test('タブレットのように横が広くても、横幅をこえない', () => {
  const f = fitCabinet(768, 1024);
  assert.ok(336 * f.s <= 768);
  assert.ok((722 - f.cut) * f.s <= 1024 + 1e-9);
});
