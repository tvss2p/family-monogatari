import { SYMBOLS, PREMIUM_ID } from './symbols.js';
import { pickLine } from './story.js';

// 出やすさ（当たりのとき／外れのとき）。出たらアツいものほど外れでは出にくい
export const RATES = {
  missReach: 1 / 8,
  // リーチの種類（当たり／外れ）：normal・jarashi（ねこじゃらし）・nap（ハニーのお昼寝）・family（家族）
  reachKind: { hit: { normal: 0.15, jarashi: 0.3, nap: 0.2, family: 0.35 }, miss: { normal: 0.84, jarashi: 0.1, nap: 0.04, family: 0.02 } },
  develop: 0.6,
  parade: { hit: 0.4, miss: 0.0015 },
  paw: { hit: 0.5, miss: 0.15 },
  honey: { hit: 0.3, miss: 0.08 },
  hot: { hit: 0.6, miss: 0.05 },
  nyanren: { hit: [0.4, 0.3, 0.2, 0.1], miss: [0.95, 0.048, 0.002, 0] },
  step: { hit: [0.2, 0.05, 0.15, 0.25, 0.2, 0.15], miss: [0.8, 0.12, 0.06, 0.017, 0.003, 0] },
  chara: { hit: 0.35, miss: 0.06 },
  bubble: { hit: 0.35, miss: 0.08, pinkHit: 0.5, pinkMiss: 0.01 },
  premiumNotice: { premium: 0.3, hit: 0.04 },
  // 家族予告：外れでも 3 回に 1 回くらい。ふきだしの色は白→青→緑→赤の順にアツい
  famNote: { hit: 0.7, miss: 0.33 },
  famColor: { hit: { white: 0.15, blue: 0.25, green: 0.25, red: 0.35 }, miss: { white: 0.72, blue: 0.2, green: 0.07, red: 0.01 } },
  promoKakuhen: 0.35,
  promoNormal: 0.3,
  hold: { hit: { white: 0.3, blue: 0.25, green: 0.2, red: 0.2, gold: 0.05 }, miss: { white: 0.993, blue: 0.005, green: 0.0015, red: 0.0005, gold: 0 } },
};

const CATS = SYMBOLS.filter(s => s.no !== null && !['daisuke', 'hiroko', 'nanae'].includes(s.id)).map(s => s.id);
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const pickOther = (rng, not) => pick(rng, SYMBOLS.filter(s => s.id !== not)).id;
function weighted(rng, table) {
  let r = rng();
  for (const [k, w] of Object.entries(table)) { if ((r -= w) < 0) return k; }
  return Object.keys(table)[0];
}
function level(rng, list) {
  let r = rng();
  for (let i = 0; i < list.length; i++) { if ((r -= list[i]) < 0) return i; }
  return 0;
}

// 保留の色（玉がヘソに入ったときに決める。金は当たり確定）
export function holdColor(hold, rng) {
  if (hold.hit && hold.symbolId === PREMIUM_ID) return rng() < 0.5 ? 'gold' : 'red';
  return weighted(rng, hold.hit ? RATES.hold.hit : RATES.hold.miss);
}

// 1回転ぶんの台本：止まる図柄・予告・リーチ・合図の時刻（ms）
export function buildSpin(hold, mode, rng) {
  const fast = mode !== 'normal';
  const premium = hold.hit && hold.symbolId === PREMIUM_ID;
  const side = hold.hit ? 'hit' : 'miss';
  const chance = (r) => rng() < r[side];

  const hasReach = hold.hit || rng() < RATES.missReach;
  let reach = null;
  if (hasReach) reach = premium ? (rng() < 0.5 ? 'allspin' : 'family') : weighted(rng, RATES.reachKind[side]);
  const develop = !!reach && (reach === 'jarashi' || reach === 'nap' || reach === 'family') && rng() < RATES.develop;
  const hot = !!reach && (premium || chance(RATES.hot));

  const notices = [];
  if (chance(RATES.paw)) notices.push('paw');
  if (chance(RATES.honey)) notices.push('honey');
  if (premium || chance(RATES.parade)) notices.push('parade');

  const nyanren = premium && rng() < 0.5 ? 3 : level(rng, RATES.nyanren[side]);
  const step = level(rng, RATES.step[side]);
  // ハニーが出たらアツい（外れではめったに出ない）
  const chara = (premium || chance(RATES.chara))
    ? (rng() < (hold.hit ? 0.4 : 0.02) ? 'honey' : pick(rng, CATS.filter(c => c !== 'honey')))
    : null;
  const bubble = chance(RATES.bubble) ? (rng() < (hold.hit ? RATES.bubble.pinkHit : RATES.bubble.pinkMiss) ? 'pink' : 'white') : null;
  let famNote = null;
  if (chance(RATES.famNote)) {
    const color = weighted(rng, RATES.famColor[side]);
    famNote = { color, ...pickLine(`notice_${color}`, rng) };
  }
  const premiumNotice = hold.hit && rng() < (premium ? RATES.premiumNotice.premium : RATES.premiumNotice.hit) ? (rng() < 0.5 ? 'wave' : 'yawn') : null;

  // 確変昇格：確変の当たりを、いったん偶数（通常）の図柄で見せて大当たり中に昇格させる
  let promo = null;
  let shown = hold.symbolId;
  if (hold.hit && hold.kind === 'kakuhen' && rng() < RATES.promoKakuhen) {
    shown = pick(rng, SYMBOLS.filter(s => s.type === 'normal')).id;
    promo = { real: hold.symbolId, success: true };
  } else if (hold.hit && hold.kind === 'normal' && rng() < RATES.promoNormal) {
    promo = { real: hold.symbolId, success: false };
  }

  let stops;
  if (hold.hit) stops = [shown, shown, shown];
  else if (reach) { const p = pick(rng, SYMBOLS).id; stops = [p, pickOther(rng, p), p]; }
  else { const l = pick(rng, SYMBOLS).id; stops = [l, pick(rng, SYMBOLS).id, pickOther(rng, l)]; }

  const cues = [{ t: 0, cue: 'start' }];
  const add = (t, cue) => cues.push({ t, cue });
  const k = fast ? 3 : 1;
  const noticeAt = { paw: 300, honey: 700, parade: 1000 };
  for (const n of notices) add(Math.round(noticeAt[n] / k), `notice:${n}`);
  for (let i = 1; i <= step; i++) add(Math.round((200 + i * 260) / k), `step:${i}`);
  if (chara) add(Math.round(900 / k), `chara:${chara}`);
  if (bubble) add(Math.round(500 / k), `bubble:${bubble}`);
  if (premiumNotice) add(Math.round(400 / k), `premium:${premiumNotice}`);
  if (famNote) add(Math.round(600 / k), `fam:${famNote.color}`);

  // にゃん連：いったん止まって「にゃん連」のあと、また回る（1回 1.6 秒）
  const nyanCount = fast ? Math.min(1, nyanren) : nyanren;
  const base = fast ? 300 : 1200;
  for (let i = 0; i < nyanCount; i++) add(base + i * 1600, 'nyan');
  const off = nyanCount * 1600;

  const stopL = (fast ? 500 : 1600) + off;
  const stopR = (fast ? 800 : 2400) + off;
  add(stopL, 'stopL');
  add(stopR, 'stopR');

  let stopM;
  if (!reach) stopM = (fast ? 1100 : 2800) + off;
  else {
    add(stopR, 'reach');
    add(stopR + 200, 'armsIn');
    const len = { normal: 4400, jarashi: 6000, nap: 6000, family: 7000, allspin: 6500 }[reach];
    const devLen = develop ? 1800 : 0;
    stopM = stopR + len + devLen + (hot ? 1000 : 0);
    if (develop) add(stopR + 2200, 'develop');
    add(stopR + (develop ? 2200 + 400 : 100), `rt:${reach}`);
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
  // 外れ：止まった図柄が見えるように少し待つ（リーチ外れは「ざんねん」の間も）
  else end = stopM + (reach ? 1600 : fast ? 700 : 1000);
  add(end, 'end');

  cues.sort((a, b) => a.t - b.t);
  return { stops, reach, develop, notices, step, chara, bubble, famNote, nyanren: nyanCount, premiumNotice, promo, hot, durationMs: end, cues };
}
