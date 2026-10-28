// 台本の合図で、筐体の場面（ph-*）とギミックを動かす
const PHASE = { start: 'normal', reach: 'reach', hot: 'hot', jackpot: 'jackpot' };

export function cueToPhase(cue) {
  return PHASE[cue] ?? null;
}

// 出した直後のタップを ms のあいだ受けない
export function createTapGuard(ms = 500) {
  let until = -Infinity;
  return {
    arm(now) { until = now + ms; },
    allowed(now) { return now >= until; },
  };
}

export function createGimmicks(cab) {
  const q = sel => cab.querySelector(sel);
  const medal = q('.medalwrap');
  const pushwrap = q('#pushwrap');
  const cutin = q('.cutin');
  const guard = createTapGuard(500);
  const listeners = [];

  function setPhase(p) {
    cab.className = cab.className.replace(/\bph-\w+/, `ph-${p}`);
  }
  function replay(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }
  function clear() {
    cab.classList.remove('famreach', 'arms-in');
    medal.classList.remove('up');
    pushwrap.classList.remove('up', 'pressed');
  }

  return {
    onCue(cue, spin) {
      const p = cueToPhase(cue);
      if (cue === 'start') clear();
      if (p) setPhase(p);
      if (cue === 'reach' && spin.reach === 'family') cab.classList.add('famreach');
      if (cue === 'armsIn') cab.classList.add('arms-in');
      if (cue === 'armsOut') cab.classList.remove('arms-in');
      if (cue === 'hot' || cue === 'jackpot') replay(cab, 'shake');
      if (cue === 'medalUp') medal.classList.add('up');
      if (cue === 'pushUp') { pushwrap.classList.add('up'); guard.arm(performance.now()); }
      if (cue === 'cutin') replay(cutin, 'go');
      if (cue === 'stopM') pushwrap.classList.remove('up');
      if (cue === 'jackpot') clear();
      for (const fn of listeners) fn(cue, spin);
    },
    push() {
      if (!pushwrap.classList.contains('up') || !guard.allowed(performance.now())) return false;
      replay(pushwrap, 'pressed');
      return true;
    },
    reset() {
      clear();
      setPhase('normal');
    },
    on(fn) { listeners.push(fn); },
  };
}
