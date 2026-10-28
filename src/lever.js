// ハンドル（レバー）の決まり：固定・強さ
const DRAG_FULL = 240;
const STEP = 0.02;

const clamp = p => Math.max(0, Math.min(1, Math.round(p * 1000) / 1000));

// 固定中は指をはなしても打ち続ける
export function isFiring({ locked, holding }) {
  return !!(locked || holding);
}

// ハンドルを上・右へなぞると強く、下・左へなぞると弱く（240px で 0→100%）
export function dragPower(start, dx, dy) {
  return clamp(start + (dx - dy) / DRAG_FULL);
}

// −・＋ボタンは 2% ずつ
export function stepPower(p, dir) {
  return clamp(p + dir * STEP);
}

export function powerLabel(p) {
  return `強さ ${Math.round(p * 100)}%`;
}
