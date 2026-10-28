import { CONFIG } from './config.js';
import { NUMBERED, PREMIUM_ID } from './symbols.js';

// ヘソに玉が入った瞬間の抽選。時短は当たりやすさがふだんと同じ
export function drawHit(mode, rng) {
  const odds = mode === 'kakuhen' ? CONFIG.odds.kakuhen : CONFIG.odds.normal;
  if (rng() >= 1 / odds) return { hit: false, symbolId: null, kind: null };
  if (rng() < CONFIG.premiumShare) return { hit: true, symbolId: PREMIUM_ID, kind: 'premium' };
  const s = NUMBERED[Math.floor(rng() * NUMBERED.length)];
  return { hit: true, symbolId: s.id, kind: s.type };
}
