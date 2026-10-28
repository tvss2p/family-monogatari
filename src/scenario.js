import { SYMBOLS, PREMIUM_ID } from './symbols.js';

// 出やすさ（当たりのとき／外れのとき）
export const RATES = {
  missReach: 1 / 8,
  family: { hit: 0.5, miss: 0.03 },
  parade: { hit: 0.4, miss: 0.0015 },
  paw: { hit: 0.5, miss: 0.15 },
  honey: { hit: 0.3, miss: 0.08 },
  hot: { hit: 0.6, miss: 0.05 },
};

const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const pickOther = (rng, not) => pick(rng, SYMBOLS.filter(s => s.id !== not)).id;

// 1回転ぶんの台本：止まる図柄・予告・リーチ・合図の時刻（ms）
export function buildSpin(hold, mode, rng) {
  const fast = mode !== 'normal';
  const premium = hold.hit && hold.symbolId === PREMIUM_ID;
  const chance = (r) => rng() < (hold.hit ? r.hit : r.miss);

  const hasReach = hold.hit || rng() < RATES.missReach;
  const reach = !hasReach ? null : (premium || chance(RATES.family)) ? 'family' : 'normal';
  const hot = !!reach && (premium || chance(RATES.hot));

  const notices = [];
  if (chance(RATES.paw)) notices.push('paw');
  if (chance(RATES.honey)) notices.push('honey');
  if (premium || chance(RATES.parade)) notices.push('parade');

  let stops;
  if (hold.hit) stops = [hold.symbolId, hold.symbolId, hold.symbolId];
  else if (reach) { const p = pick(rng, SYMBOLS).id; stops = [p, pickOther(rng, p), p]; }
  else { const l = pick(rng, SYMBOLS).id; stops = [l, pick(rng, SYMBOLS).id, pickOther(rng, l)]; }

  const cues = [{ t: 0, cue: 'start' }];
  const add = (t, cue) => cues.push({ t, cue });
  const noticeAt = { paw: 300, honey: 700, parade: 1000 };
  for (const n of notices) add(fast ? Math.round(noticeAt[n] / 3) : noticeAt[n], `notice:${n}`);

  const stopL = fast ? 500 : 1600;
  const stopR = fast ? 800 : 2400;
  add(stopL, 'stopL');
  add(stopR, 'stopR');

  let stopM;
  if (!reach) stopM = fast ? 1100 : 2800;
  else {
    add(stopR, 'reach');
    add(stopR + 200, 'armsIn');
    stopM = stopR + (reach === 'family' ? 7000 : 4400) + (hot ? 1000 : 0);
    if (hot) {
      const h = stopM - 3500;
      add(h, 'hot');
      add(h, 'medalDrop');
      add(h + 100, 'pushUp');
      add(h + 200, 'cutin');
      add(stopM - 600, 'medalUp');
    }
    add(stopM - 200, 'armsOut');
  }
  add(stopM, 'stopM');

  let end;
  if (hold.hit) { add(stopM + 600, 'jackpot'); end = stopM + 800; }
  else end = reach ? stopM + 600 : stopM + (fast ? 100 : 200);
  add(end, 'end');

  cues.sort((a, b) => a.t - b.t);
  return { stops, reach, notices, hot, durationMs: end, cues };
}
