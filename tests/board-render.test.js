import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawBoard, resetBoardCache } from '../src/render/board.js';
import { LAYOUT } from '../src/board-layout.js';

// Canvas のかわり（何でも受けつける 2D コンテキスト）
function fakeCanvas() {
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } });
  // 本物の Canvas と同じく、幅・高さは整数に切り捨てられる
  let w = 0, h = 0;
  return {
    get width() { return w; }, set width(v) { w = Math.floor(v); },
    get height() { return h; }, set height(v) { h = Math.floor(v); },
    getContext: () => ctx,
  };
}

test('board background is built once for a fractional scale', () => {
  let made = 0;
  globalThis.document = { createElement: () => { made++; return fakeCanvas(); } };
  const target = fakeCanvas().getContext();
  for (let i = 0; i < 5; i++) drawBoard(target, LAYOUT, [{ x: 10, y: 10 }], 2.861);
  assert.equal(made, 2);
  drawBoard(target, LAYOUT, [], 1.667);
  assert.equal(made, 4);
});

test('background is rebuilt after the page comes back (Android drops canvas memory)', () => {
  let made = 0;
  globalThis.document = { createElement: () => { made++; return fakeCanvas(); } };
  const target = fakeCanvas().getContext();
  drawBoard(target, LAYOUT, [], 2.5);
  const before = made;
  drawBoard(target, LAYOUT, [], 2.5);
  assert.equal(made, before);
  resetBoardCache();
  drawBoard(target, LAYOUT, [], 2.5);
  assert.equal(made, before + 2);
});
