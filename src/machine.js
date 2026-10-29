import { CONFIG } from './config.js';
import { drawHit } from './lottery.js';

function fresh(config) {
  return {
    balls: config.startBalls, holds: [], mode: 'normal', jitanLeft: 0,
    spins: 0, hits: 0, rentCount: 0,
    phase: 'idle', current: null,
    round: 0, roundsTotal: 0, roundCount: 0, roundElapsed: 0,
  };
}

function isValidSaved(s) {
  return s && Number.isFinite(s.balls) && Array.isArray(s.holds)
    && ['normal', 'jitan', 'kakuhen'].includes(s.mode);
}

// 台の状態：玉・保留・モード・ラウンド
export function createMachine({ config = CONFIG, rng = Math.random, saved = null } = {}) {
  const state = fresh(config);

  function endJackpot() {
    const kind = state.current && state.current.kind;
    if (kind === 'kakuhen' || kind === 'premium') { state.mode = 'kakuhen'; state.jitanLeft = 0; }
    else { state.mode = 'jitan'; state.jitanLeft = config.jitanSpins; }
    state.phase = 'idle';
    state.current = null;
    state.round = 0; state.roundsTotal = 0; state.roundCount = 0; state.roundElapsed = 0;
  }

  function nextRound() {
    state.round++;
    state.roundCount = 0;
    state.roundElapsed = 0;
    if (state.round > state.roundsTotal) endJackpot();
  }

  const m = {
    state,
    fireBall() {
      if (state.balls <= 0) return false;
      state.balls--;
      return true;
    },
    onHeso() {
      state.balls += config.hesoPayout;
      if (state.holds.length >= config.holdMax) return null;
      const h = drawHit(state.mode, rng);
      state.holds.push(h);
      return h;
    },
    startNextSpin() {
      if (state.phase !== 'idle' || state.holds.length === 0) return null;
      state.current = state.holds.shift();
      state.phase = 'spinning';
      state.spins++;
      if (state.mode === 'jitan') state.jitanLeft--;
      return state.current;
    },
    finishSpin() {
      if (state.phase !== 'spinning') return;
      if (state.current.hit) {
        state.phase = 'jackpot';
        state.hits++;
        state.spins = 0;
        state.round = 1;
        state.roundsTotal = state.current.kind === 'premium' ? config.rounds.premium : config.rounds.normal;
        state.roundCount = 0;
        state.roundElapsed = 0;
        return;
      }
      state.phase = 'idle';
      state.current = null;
      if (state.mode === 'jitan' && state.jitanLeft <= 0) { state.mode = 'normal'; state.jitanLeft = 0; }
    },
    onAttacker() {
      if (state.phase !== 'jackpot') return false;
      state.balls += config.attackerPayout;
      state.roundCount++;
      if (state.roundCount >= config.attackerMaxPerRound) nextRound();
      return true;
    },
    tick(ms) {
      if (state.phase !== 'jackpot') return;
      state.roundElapsed += ms;
      if (state.roundElapsed >= config.roundTimeoutMs) nextRound();
    },
    isAttackerOpen() { return state.phase === 'jackpot'; },
    isHesoBoost() { return state.mode !== 'normal'; },
    rent() {
      state.balls += config.rentBalls;
      state.rentCount++;
    },
    toJSON() {
      return JSON.parse(JSON.stringify(state));
    },
  };

  if (isValidSaved(saved)) {
    Object.assign(state, fresh(config), saved);
    // 大当たり中は、そのラウンドの続きから（アタッカーが開いたまま）
    if (state.phase === 'spinning') {
      if (state.current) state.holds.unshift(state.current);
      if (state.mode === 'jitan') state.jitanLeft++;
      state.spins = Math.max(0, state.spins - 1);
      state.current = null;
      state.phase = 'idle';
    }
  }
  return m;
}
