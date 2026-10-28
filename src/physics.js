// 玉の物理：重力・釘と壁へのはね返り・入賞の判定
const DT = 1 / 300;
const G = 900;
export const BALL_R = 3;
const E_PIN = 0.5;
const E_WALL = 0.4;
const MAX_V = 900;
const CELL = 24;

// 発射レーン（左下からレールにそって上がり、上で盤面に入る）の中心線
const LANE = (() => {
  const pts = [[13, 396], [13, 107]];
  for (let i = 1; i <= 12; i++) {
    const a = Math.PI + (Math.PI / 2) * (i / 12);
    pts.push([107 + Math.cos(a) * 94, 107 + Math.sin(a) * 94]);
  }
  pts.push([122, 13]);
  const seg = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
    const len = Math.hypot(x2 - x1, y2 - y1);
    seg.push({ x1, y1, x2, y2, s0: total, len });
    total += len;
  }
  return { seg, total };
})();

function laneAt(s) {
  for (const g of LANE.seg) {
    if (s <= g.s0 + g.len) {
      const t = Math.max(0, (s - g.s0) / g.len);
      return [g.x1 + (g.x2 - g.x1) * t, g.y1 + (g.y2 - g.y1) * t];
    }
  }
  const g = LANE.seg[LANE.seg.length - 1];
  return [g.x2, g.y2];
}

export function createPhysics(layout, rng = Math.random) {
  const balls = [];
  let nextId = 1;

  // 釘を升目に入れて、近くの釘だけ調べる
  const grid = new Map();
  for (const p of layout.pins) {
    const reach = p.r + BALL_R;
    for (let gx = Math.floor((p.x - reach) / CELL); gx <= Math.floor((p.x + reach) / CELL); gx++) {
      for (let gy = Math.floor((p.y - reach) / CELL); gy <= Math.floor((p.y + reach) / CELL); gy++) {
        const k = gx + ',' + gy;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(p);
      }
    }
  }
  const walls = layout.walls.map(w => {
    const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
    return { ...w, dx, dy, len2: dx * dx + dy * dy };
  });
  const boostWalls = (layout.boostWalls || []).map(w => {
    const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
    return { ...w, dx, dy, len2: dx * dx + dy * dy };
  });
  // 閉じたアタッカーのふた（山形で玉が乗らない）
  const a = layout.attacker;
  const attackerWalls = [
    { x1: a.x - a.w / 2, y1: a.y - 1, x2: a.x, y2: a.y - 9 },
    { x1: a.x, y1: a.y - 9, x2: a.x + a.w / 2, y2: a.y - 1 },
  ].map(w => ({ ...w, dx: w.x2 - w.x1, dy: w.y2 - w.y1, len2: (w.x2 - w.x1) ** 2 + (w.y2 - w.y1) ** 2 }));

  function bounce(b, nx, ny, pen, e) {
    b.x += nx * pen;
    b.y += ny * pen;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= (1 + e) * vn * nx;
      b.vy -= (1 + e) * vn * ny;
      b.vx *= 0.99;
    }
  }

  function hitWall(b, w, e) {
    let t = ((b.x - w.x1) * w.dx + (b.y - w.y1) * w.dy) / w.len2;
    t = Math.max(0, Math.min(1, t));
    const cx = w.x1 + w.dx * t, cy = w.y1 + w.dy * t;
    const dx = b.x - cx, dy = b.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= BALL_R * BALL_R) return;
    const d = Math.sqrt(d2) || 0.0001;
    bounce(b, dx / d, dy / d, BALL_R - d, e);
  }

  function substep(b, opts) {
    b.vy += G * DT;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > MAX_V) { b.vx *= MAX_V / sp; b.vy *= MAX_V / sp; }
    const py = b.y;
    b.x += b.vx * DT;
    b.y += b.vy * DT;

    const h = layout.heso;
    const hw = (opts.hesoBoost ? layout.hesoBoostW : h.w) / 2;
    if (py < h.y && b.y >= h.y && Math.abs(b.x - h.x) <= hw) return 'heso';
    const a = layout.attacker;
    if (opts.attackerOpen && py < a.y && b.y >= a.y && Math.abs(b.x - a.x) <= (a.sensorW || a.w) / 2) return 'attacker';
    if (b.y > layout.h + BALL_R) return 'out';

    const list = grid.get(Math.floor(b.x / CELL) + ',' + Math.floor(b.y / CELL));
    if (list) {
      for (const p of list) {
        const dx = b.x - p.x, dy = b.y - p.y;
        const min = p.r + BALL_R;
        const d2 = dx * dx + dy * dy;
        if (d2 < min * min) {
          const d = Math.sqrt(d2) || 0.0001;
          bounce(b, dx / d, dy / d, min - d, E_PIN);
          b.vx += (rng() - 0.5) * 30;
        }
      }
    }
    for (const w of walls) hitWall(b, w, E_WALL);
    if (!opts.attackerOpen) for (const w of attackerWalls) hitWall(b, w, E_WALL);
    if (opts.hesoBoost) for (const w of boostWalls) hitWall(b, w, E_WALL);
    return null;
  }

  return {
    balls,
    addBall(x, y, vx, vy) {
      const id = nextId++;
      balls.push({ id, x, y, vx, vy, age: 0 });
      return id;
    },
    // 強さ 0〜1。弱すぎると盤面まで届かずにもどる
    // 強さ 0〜1。左下からレーンを上がり、上で右向きに盤面へ。弱すぎると途中でもどって落ちる
    launch(power) {
      const id = nextId++;
      const [x, y] = laneAt(0);
      const ride = { s: 0, v: 700 + power * 300, max: power < 0.08 ? 200 : Infinity, back: false };
      balls.push({ id, x, y, vx: 0, vy: 0, age: 0, ride, release: (10 + power * 400) * (1 + (rng() - 0.5) * 0.12) });
      return id;
    },
    step(dt, opts) {
      const events = [];
      let acc = dt;
      while (acc > 1e-9) {
        const h = Math.min(DT, acc);
        acc -= h;
        for (let i = balls.length - 1; i >= 0; i--) {
          const b = balls[i];
          b.age += h;
          if (b.ride) {
            const r = b.ride;
            r.s += (r.back ? -r.v : r.v) * h;
            if (!r.back && r.s >= r.max) r.back = true;
            if (r.back && r.s <= 0) { balls.splice(i, 1); events.push({ type: 'out', id: b.id }); continue; }
            if (r.s >= LANE.total) {
              const l = layout.launch;
              b.x = l.x; b.y = l.y; b.vx = b.release; b.vy = 0; b.ride = null;
            } else [b.x, b.y] = laneAt(r.s);
            continue;
          }
          const ev = substep(b, opts);
          if (ev) { balls.splice(i, 1); events.push({ type: ev, id: b.id }); }
        }
      }
      return events;
    },
  };
}
