import { splitBalls, pourCount, TRAY_MAX } from '../payout.js';

// 上皿（玉の山）とドル箱。上皿は下のパネルの絵の皿にぴったり重ねる
const TW = 90, TH = 29, PX = 3, R = 4.4;

// 皿の形（横長のだ円）の中に、下から順に玉をしきつめる位置
const SLOTS = (() => {
  const list = [];
  for (let row = 0; row < 6; row++) {
    const y = TH - 3 - R - row * R * 1.7;
    for (let x = R + 2 + (row % 2) * R; x < TW - R - 2; x += R * 2) {
      const nx = (x - TW / 2) / (TW / 2 - 3), ny = (y - TH / 2) / (TH / 2 - 1);
      if (nx * nx + ny * ny <= 1.02) list.push({ x, y });
    }
  }
  return list.sort((a, b) => b.y - a.y || Math.abs(a.x - TW / 2) - Math.abs(b.x - TW / 2));
})();

function ball(ctx, x, y, r) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, '#d9dee6');
  g.addColorStop(1, '#5f6772');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

export function createTray(bottomEl) {
  bottomEl.insertAdjacentHTML('beforeend', `<div class="tray"><canvas width="${TW * PX}" height="${TH * PX}"></canvas></div>
    <div class="dbox"><div class="stack"></div><div class="box"><i class="boxFill"></i><b>ドル箱</b></div><span class="boxN"></span><span class="boxFull">満タン!</span></div>`);
  const canvas = bottomEl.querySelector('.tray canvas');
  const ctx = canvas.getContext('2d');
  ctx.scale(PX, PX);
  const dbox = bottomEl.querySelector('.dbox');
  const drops = [];
  let shown = -1, last = 0, boxes = -1;

  function draw(tray) {
    ctx.clearRect(0, 0, TW, TH);
    ctx.save();
    ctx.beginPath(); ctx.ellipse(TW / 2, TH / 2, TW / 2, TH / 2, 0, 0, Math.PI * 2); ctx.clip();
    const bg = ctx.createLinearGradient(0, 0, 0, TH);
    bg.addColorStop(0, '#2a1820');
    bg.addColorStop(1, '#5b3442');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, TW, TH);
    const n = Math.round(Math.min(1, tray / TRAY_MAX) * SLOTS.length);
    for (let i = 0; i < n; i++) ball(ctx, SLOTS[i].x, SLOTS[i].y, R);
    for (const d of drops) ball(ctx, d.x, d.y, R * 0.9);
    ctx.restore();
  }

  return {
    // 払い出し：皿の左上の口から玉がころがり出る
    pour(gain) {
      for (let i = 0; i < pourCount(gain); i++) {
        drops.push({ x: 2 - i * 4, y: 3 + Math.random() * 3, vx: 70 + Math.random() * 40, vy: -10 + Math.random() * 20, life: 0.7 + i * 0.06 });
      }
    },
    update(now, balls) {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      const { tray, boxes: b, fill } = splitBalls(balls);
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.vy += 260 * dt;
        d.x += d.vx * dt; d.y += d.vy * dt;
        if (d.y > TH - R - 3) { d.y = TH - R - 3; d.vy *= -0.35; }
        if (d.x > TW - R - 3) { d.x = TW - R - 3; d.vx *= -0.4; }
        d.life -= dt;
        if (d.life <= 0) drops.splice(i, 1);
      }
      if (drops.length || tray !== shown) { draw(tray); shown = tray; }
      // ドル箱：上皿があふれたら出てきて、満タンになると積み上がる
      dbox.classList.toggle('on', b > 0 || fill > 0);
      dbox.style.setProperty('--fill', fill.toFixed(3));
      if (b !== boxes) {
        if (boxes >= 0 && b > boxes) {
          dbox.classList.remove('full');
          void dbox.offsetWidth;
          dbox.classList.add('full');
        }
        boxes = b;
        dbox.querySelector('.stack').innerHTML = '<i></i>'.repeat(Math.min(b, 3));
        dbox.querySelector('.boxN').textContent = b > 0 ? `×${b + 1}` : '';
      }
      return b;
    },
  };
}
