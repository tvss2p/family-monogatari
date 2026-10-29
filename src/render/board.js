import { BALL_R } from '../physics.js';
// 盤面（釘・レール・玉）を Canvas に描く。座標は LAYOUT と同じ 320×404
const makeCanvas = () => document.createElement('canvas');

// 動かないもの（板・レール・釘）と玉の絵は、倍率が変わったときだけ作りなおす
let bg = null;
let ballSprite = null;
let cachedScale = null;

// 別のタブ・アプリから戻ったとき、Android は取っておいた絵の中身を捨てることがあるので作りなおす
export function resetBoardCache() { cachedScale = null; }

function makeBall(scale) {
  const c = makeCanvas();
  c.width = c.height = Math.round(BALL_R * 2 * scale);
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  const R = BALL_R;
  const g = ctx.createRadialGradient(R * 0.65, R * 0.6, 0.4, R, R, R);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.55, '#c9ced6');
  g.addColorStop(1, '#7d838c');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(R, R, R, 0, Math.PI * 2); ctx.fill();
  return c;
}

function line(ctx, segs, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const s of segs) { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); }
  ctx.stroke();
}

function drawStatic(layout, scale) {
  const c = makeCanvas();
  c.width = Math.round(layout.w * scale);
  c.height = Math.round(layout.h * scale);
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  const g = ctx.createRadialGradient(160, 60, 20, 160, 200, 300);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.6, '#eef6fb');
  g.addColorStop(1, '#fbe9f0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, layout.w, layout.h);

  const gold = ctx.createLinearGradient(0, 0, layout.w, layout.h);
  gold.addColorStop(0, '#fff0b3');
  gold.addColorStop(0.5, '#d9a23a');
  gold.addColorStop(1, '#ffe58f');
  line(ctx, layout.walls, gold, 3);
  line(ctx, [layout.kicker], '#ff8fae', 4);

  // アウト口：外れ玉が吸いこまれる穴（金のふち）
  const o = layout.out;
  if (o) {
    const hole = ctx.createRadialGradient(o.x, o.y + 4, 2, o.x, o.y + 4, o.w / 2);
    hole.addColorStop(0, '#120a10');
    hole.addColorStop(1, '#4a2a38');
    ctx.fillStyle = hole;
    ctx.beginPath(); ctx.ellipse(o.x, o.y + 4, o.w / 2 + 2, 9, 0, Math.PI, 0); ctx.lineTo(o.x + o.w / 2 + 2, layout.h); ctx.lineTo(o.x - o.w / 2 - 2, layout.h); ctx.fill();
    ctx.strokeStyle = gold; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(o.x, o.y + 4, o.w / 2 + 2, 9, 0, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('OUT', o.x, o.y + 2);
  }

  for (const p of [...layout.pins, ...(layout.roadPins || [])]) {
    if (p.r > 4) continue;
    ctx.fillStyle = '#b8862e';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff6c8';
    ctx.beginPath(); ctx.arc(p.x - 0.4, p.y - 0.4, 0.6, 0, Math.PI * 2); ctx.fill();
  }
  return c;
}

export function drawBoard(ctx, layout, balls, scale, opts = {}) {
  if (cachedScale !== scale) {
    bg = drawStatic(layout, scale);
    ballSprite = makeBall(scale);
    cachedScale = scale;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(bg, 0, 0);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  if (opts.hesoBoost) line(ctx, layout.boostWalls, '#ffd34d', 3);
  for (const b of balls) ctx.drawImage(ballSprite, b.x - BALL_R, b.y - BALL_R, BALL_R * 2, BALL_R * 2);
}
