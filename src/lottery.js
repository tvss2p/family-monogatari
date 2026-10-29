import { CONFIG } from './config.js';
import { NUMBERED, PREMIUM_ID } from './symbols.js';

// ヘソに玉が入った瞬間の抽選。時短は当たりやすさがふだんと同じ
export function drawHit(mode, rng) {
  const odds = mode === 'kakuhen' ? CONFIG.odds.kakuhen : CONFIG.odds.normal;
  if (rng() >= 1 / odds) return { hit: false, symbolId: null, kind: null };
  if (rng() < CONFIG.premiumShare) return { hit: true, symbolId: PREMIUM_ID, kind: 'premium' };
  const s = pickWeighted(rng());
  return { hit: true, symbolId: s.id, kind: s.type };
}

// 当たりの図柄：確変 6・通常 6 の 12 種類でも、確変に入る割合は 11 種類だったころと同じ 6/11 にする
// （確変の図柄の重みを 6、通常を 5）
const WEIGHT = { kakuhen: 6, normal: 5 };
const TOTAL = NUMBERED.reduce((a, s) => a + WEIGHT[s.type], 0);
function pickWeighted(r) {
  let x = r * TOTAL;
  for (const s of NUMBERED) { if ((x -= WEIGHT[s.type]) < 0) return s; }
  return NUMBERED[NUMBERED.length - 1];
}
