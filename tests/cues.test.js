import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCueRunner } from '../src/cues.js';

const spin = { cues: [{ t: 0, cue: 'start' }, { t: 1000, cue: 'stopL' }, { t: 5000, cue: 'hot' }, { t: 9000, cue: 'end' }] };

// 16ms ごとのコマで進めて、出た合図と時刻を集める
function play(r, from, to) {
  const out = [];
  for (let now = from; now <= to; now += 16) for (const c of r.due(now)) out.push([c, now]);
  return out;
}

test('cues fire in time', () => {
  const r = createCueRunner();
  r.start(spin, 100);
  const out = play(r, 100, 1200);
  assert.equal(out[0][0], 'start');
  const stopL = out.find(([c]) => c === 'stopL');
  assert.ok(stopL && stopL[1] >= 1100 && stopL[1] < 1120, JSON.stringify(out));
});

test('hidden time does not count, so cues do not burst after sleep', () => {
  const r = createCueRunner();
  r.start(spin, 0);
  play(r, 0, 2000);
  r.pause(2000);
  r.resume(62000);
  const out = play(r, 62000, 66000);
  assert.deepEqual(out.map(([c]) => c), ['hot']);
  assert.ok(out[0][1] >= 64990, `hot at ${out[0][1]}`);
});

test('one frame never jumps more than 250ms of script', () => {
  const r = createCueRunner();
  r.start(spin, 0);
  r.due(0);
  assert.deepEqual(r.due(20000), []);
  assert.equal(r.active, true);
});
