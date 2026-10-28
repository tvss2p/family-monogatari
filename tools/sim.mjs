// 長く遊んだときの玉の増減を数える（物理は使わず、ヘソに入る確率で近似）
import { CONFIG } from '../src/config.js';
import { createMachine } from '../src/machine.js';
import { buildSpin } from '../src/scenario.js';
import { mulberry32 } from '../tests/helpers.js';

export function simulate({ spins = 10000, seed = 1 } = {}) {
  const rng = mulberry32(seed);
  const m = createMachine({ rng });
  const t = { fired: 0, heso: 0, attacker: 0, rent: 0, timeMs: 0 };
  const hesoP = () => (m.isHesoBoost() ? 1.5 : 1) / CONFIG.simBallsPerSpin;

  const fire = () => {
    if (!m.fireBall()) { m.rent(); t.rent++; m.fireBall(); }
    t.fired++;
    t.timeMs += 1000 / CONFIG.fireRatePerSec;
  };

  let done = 0;
  while (done < spins) {
    if (m.state.phase === 'jackpot') {
      fire();
      if (rng() < 0.9) { m.onAttacker(); t.attacker++; }
      continue;
    }
    if (m.state.phase === 'idle' && m.state.holds.length) {
      const h = m.startNextSpin();
      const s = buildSpin(h, m.state.mode, rng);
      t.timeMs += s.durationMs * 0.2;
      m.finishSpin();
      done++;
      continue;
    }
    fire();
    if (rng() < hesoP()) { m.onHeso(); t.heso++; }
  }
  while (m.state.phase === 'jackpot') { fire(); m.onAttacker(); t.attacker++; }

  const expectedBalls = CONFIG.startBalls + t.rent * CONFIG.rentBalls + t.heso * CONFIG.hesoPayout
    + t.attacker * CONFIG.attackerPayout - t.fired;
  return { ...t, balls: m.state.balls, expectedBalls, hits: m.state.hits, finalPhase: m.state.phase };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const hourSpins = 600;
  const rows = [];
  for (let seed = 1; seed <= 10; seed++) {
    const r = simulate({ spins: hourSpins, seed });
    rows.push({ seed, hours: +(r.timeMs / 3600000).toFixed(2), hits: r.hits, rent: r.rent, net: r.balls - CONFIG.startBalls - r.rent * CONFIG.rentBalls });
  }
  console.table(rows);
}
