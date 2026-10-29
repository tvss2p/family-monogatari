import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../src/audio.js';

// AudioContext のかわり。resume しても running にならない（iPhone のアプリで起きる）
function stuckAC(log) {
  return class {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; log.made++; }
    createGain() { return { gain: { value: 1 }, connect() {} }; }
    resume() { log.resumed++; return Promise.resolve(); }
    close() { this.state = 'closed'; log.closed++; return Promise.resolve(); }
  };
}

test('a context that will not run is recreated inside the next tap', async () => {
  const log = { made: 0, resumed: 0, closed: 0 };
  const a = createAudio({ AC: stuckAC(log) });
  a.unlock();
  await Promise.resolve();
  assert.equal(log.made, 1);
  a.unlock();
  assert.equal(log.closed, 1);
  assert.equal(log.made, 2);
  assert.equal(log.resumed, 2);
});

test('interrupted context is recreated right away', () => {
  const log = { made: 0, resumed: 0, closed: 0 };
  const AC = stuckAC(log);
  const a = createAudio({ AC });
  a.unlock();
  a.debugSetState('interrupted');
  a.unlock();
  assert.equal(log.made, 2);
});

test('大当たり中は効果音だけ小さくできる（作りなおした音でも同じ大きさ）', () => {
  const gains = [];
  const AC = class {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; }
    createGain() { const g = { gain: { value: 1, setTargetAtTime(v) { this.value = v; } }, connect() {} }; gains.push(g); return g; }
    resume() { return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
  };
  const a = createAudio({ AC });
  a.unlock();
  a.setDuck(0.55);
  assert.equal(a.duck, 0.55);
  assert.equal(gains[1].gain.value, 0.55);
  a.debugSetState('interrupted');
  a.unlock();
  assert.equal(gains[gains.length - 1].gain.value, 0.55);
});
