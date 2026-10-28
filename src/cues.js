// 1回転の台本を時間どおりに流す。画面が隠れている間は時計を止め、1コマで進むのは 250ms まで
const MAX_STEP = 250;

export function createCueRunner() {
  let spin = null, i = 0, clock = 0, last = 0, paused = false;
  return {
    start(s, now) { spin = s; i = 0; clock = 0; last = now; paused = false; },
    pause() { paused = true; },
    resume(now) { paused = false; last = now; },
    due(now) {
      if (!spin || paused) return [];
      clock += Math.min(MAX_STEP, Math.max(0, now - last));
      last = now;
      const out = [];
      while (i < spin.cues.length && spin.cues[i].t <= clock) out.push(spin.cues[i++].cue);
      if (i >= spin.cues.length) spin = null;
      return out;
    },
    get active() { return !!spin; },
    get spin() { return spin; },
  };
}
