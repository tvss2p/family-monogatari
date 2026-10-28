// 盤面の座標（320×404）
const W = 320, H = 404;

function arc(cx, cy, r, a0, a1, n = 10) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

function poly(pts) {
  const segs = [];
  for (let i = 1; i < pts.length; i++) segs.push({ x1: pts[i - 1][0], y1: pts[i - 1][1], x2: pts[i][0], y2: pts[i][1] });
  return segs;
}

function roundRect(x, y, w, h, r) {
  return poly([
    ...arc(x + r, y + r, r, 180, 270, 4), ...arc(x + w - r, y + r, r, 270, 360, 4),
    ...arc(x + w - r, y + h - r, r, 0, 90, 4), ...arc(x + r, y + h - r, r, 90, 180, 4), [x, y + r],
  ]);
}

// 穴あきのレール：from→to の線を、gaps（0〜1の位置）で gapLen ぶん切る
function rail(x1, y1, x2, y2, gaps, gapLen) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const g = gapLen / len / 2;
  const cuts = [0, ...gaps.flatMap(t => [t - g, t + g]), 1];
  const segs = [];
  for (let i = 0; i < cuts.length; i += 2) {
    const a = cuts[i], b = cuts[i + 1];
    segs.push({ x1: x1 + (x2 - x1) * a, y1: y1 + (y2 - y1) * a, x2: x1 + (x2 - x1) * b, y2: y1 + (y2 - y1) * b });
  }
  return segs;
}

const lcdFrame = { x: 36, y: 58, w: 248, h: 206, r: 28 };
const heso = { x: 160, y: 300, w: 26 };
const hesoPlate = { x: 122, y: 306, w: 76, h: 46 };
// w はふたの幅、sensorW は開いているとき入ったとみなす幅（ガイドのはしまで）
const attacker = { x: 160, y: 366, w: 120, sensorW: 140 };
const windmills = [{ x: 52, y: 308 }, { x: 268, y: 308 }];
// 液晶の上の屋根（玉が乗って止まらないように山形）
const roof = [[56, 59], [160, 30], [264, 59]];
// 液晶の下からヘソへ向かうレール（穴から落ちた玉はヘソに届かない）
const RAIL_GAPS = [0.4, 0.75];
const RAIL_GAP_LEN = 10;
const rails = [
  { x1: 20, y1: 268, x2: 146, y2: 293 },
  { x1: 312, y1: 266, x2: 174, y2: 293 },
];

// 盤面の下でアタッカーへ玉を集めるガイド（アタッカーとのすき間から外れ玉が落ちる）
const guides = [
  { x1: 20, y1: 326, x2: 93, y2: 368 },
  { x1: 314, y1: 326, x2: 227, y2: 368 },
];

// 外のレール（左上・右上は大きな丸）と、左の発射レーン
const outer = poly([[6, 404], ...arc(106, 106, 100, 180, 270), ...arc(214, 106, 100, 270, 360), [314, 404]]);
const lane = poly([[20, 404], ...arc(108, 108, 88, 180, 270), [130, 25]]);
// 右上の返しゴム：右の壁ぞいに落ちる玉を内側へはね返す
const kicker = { x1: 314, y1: 112, x2: 296, y2: 134 };

// アタッカーの下の床：外れ玉は中央のアウト口へ転がって吸いこまれる
// （左はしの発射レーンの下はファウル玉の通り道なので、床はレーンの内側から）
const OUT = { x: 160, y: 400, w: 40 };
const floor = [
  { x1: 21, y1: 386, x2: OUT.x - OUT.w / 2, y2: OUT.y },
  { x1: OUT.x + OUT.w / 2, y1: OUT.y, x2: 314, y2: 386 },
];

const walls = [
  ...outer, ...lane, kicker, ...floor,
  ...roundRect(lcdFrame.x, lcdFrame.y, lcdFrame.w, lcdFrame.h, lcdFrame.r),
  ...poly(roof),
  ...guides,
  ...rails.flatMap(r => rail(r.x1, r.y1, r.x2, r.y2, RAIL_GAPS, RAIL_GAP_LEN)),
  ...poly([[hesoPlate.x, hesoPlate.y + hesoPlate.h], [hesoPlate.x, hesoPlate.y + 8], [heso.x - 11, hesoPlate.y - 2]]),
  ...poly([[heso.x + 11, hesoPlate.y - 2], [hesoPlate.x + hesoPlate.w, hesoPlate.y + 8], [hesoPlate.x + hesoPlate.w, hesoPlate.y + hesoPlate.h]]),
];

function segDist(x, y, w) {
  const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
  const t = Math.max(0, Math.min(1, ((x - w.x1) * dx + (y - w.y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (w.x1 + dx * t), y - (w.y1 + dy * t));
}

// 盤面の内側（外のレールの内、発射レーンより内）
function inside(x, y) {
  if (x < 20 || x > 314 || y > 398) return false;
  if (x < 108 && y < 108) return Math.hypot(x - 108, y - 108) <= 88;
  if (x < 130 && y < 20) return false;
  if (x > 214 && y < 106) return Math.hypot(x - 214, y - 106) <= 100;
  return y > 6;
}

// 釘：11×9.5 の互いちがいの格子に打ち、壁から 9px、液晶・ヘソ・アタッカー・風車をよける
const PIN_DX = 11, PIN_DY = 9.5, PIN_CLEAR = 9;
const pins = [];
for (let r = 0; r < 40; r++) {
  for (let c = 0; c < 26; c++) {
    const x = 27 + c * PIN_DX + (r % 2 ? PIN_DX / 2 : 0), y = 26 + r * PIN_DY;
    if (!inside(x, y)) continue;
    if (x > lcdFrame.x - 4 && x < lcdFrame.x + lcdFrame.w + 4 && y > lcdFrame.y - 4 && y < lcdFrame.y + lcdFrame.h + 4) continue;
    if (Math.abs(x - heso.x) < 30 && y > 262 && y < 360) continue;
    if (Math.abs(x - attacker.x) < attacker.w / 2 + 8 && y > 340) continue;
    if (windmills.some(w => Math.hypot(x - w.x, y - w.y) < 20)) continue;
    if (walls.some(w => segDist(x, y, w) < PIN_CLEAR)) continue;
    pins.push({ x, y, r: 1.5 });
  }
}
for (const w of windmills) pins.push({ x: w.x, y: w.y, r: 9 });

export const LAYOUT = {
  w: W, h: H,
  pins,
  walls,
  // 時短・確変中はヘソに近い穴がふさがる（電サポ）
  boostWalls: rails.map(r => {
    const t = RAIL_GAPS[RAIL_GAPS.length - 1], g = RAIL_GAP_LEN / Math.hypot(r.x2 - r.x1, r.y2 - r.y1) / 2 + 0.01;
    return { x1: r.x1 + (r.x2 - r.x1) * (t - g), y1: r.y1 + (r.y2 - r.y1) * (t - g), x2: r.x1 + (r.x2 - r.x1) * (t + g), y2: r.y1 + (r.y2 - r.y1) * (t + g) };
  }),
  lcdFrame, roof, kicker, rails, guides, railGaps: RAIL_GAPS, railGapLen: RAIL_GAP_LEN,
  heso, hesoBoostW: 76, hesoPlate, attacker, windmills,
  out: OUT, floor,
  launch: { x: 122, y: 13 },
};
