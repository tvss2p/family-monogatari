import { test } from 'node:test';
import assert from 'node:assert/strict';
import { save, load, KEY } from '../src/storage.js';

function memStore() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m };
}

test('save/load roundtrip', () => {
  const st = memStore();
  save({ machine: { balls: 10 }, sound: false }, st);
  assert.deepEqual(load(st), { machine: { balls: 10 }, sound: false });
  assert.ok(st.m.has(KEY));
  assert.equal(KEY, 'family-monogatari:v1');
});

test('load returns null on broken json', () => {
  const st = memStore();
  st.setItem(KEY, '{broken');
  assert.equal(load(st), null);
});

test('load returns null when nothing saved', () => {
  assert.equal(load(memStore()), null);
});

test('storage that throws does not break the game', () => {
  const bad = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(load(bad), null);
  assert.doesNotThrow(() => save({ a: 1 }, bad));
});
