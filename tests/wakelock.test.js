import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWakeLock } from '../src/wakelock.js';

function fakeNav(log) {
  return { wakeLock: { request: async () => { log.req++; const s = { released: false, release: async () => { s.released = true; log.rel++; }, addEventListener() {} }; return s; } } };
}

test('screen stays awake only while wanted', async () => {
  const log = { req: 0, rel: 0 };
  const w = createWakeLock(fakeNav(log));
  await w.set(true);
  assert.equal(log.req, 1);
  await w.set(true);
  assert.equal(log.req, 1);
  await w.set(false);
  assert.equal(log.rel, 1);
});

test('it is requested again when the page comes back', async () => {
  const log = { req: 0, rel: 0 };
  const w = createWakeLock(fakeNav(log));
  await w.set(true);
  w.lost();
  await w.visible();
  assert.equal(log.req, 2);
});

test('browsers without the feature do nothing', async () => {
  const w = createWakeLock({});
  await w.set(true);
  assert.equal(w.active, false);
});
