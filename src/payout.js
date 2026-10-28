// 出た玉の行き先：まず上皿、あふれたらドル箱（満タンになった箱は積み上がる）
export const TRAY_MAX = 150;
export const BOX_MAX = 500;

export function splitBalls(n) {
  const all = Math.max(0, Math.floor(n));
  const tray = Math.min(all, TRAY_MAX);
  const rest = all - tray;
  const boxes = Math.floor(rest / BOX_MAX);
  return { tray, boxes, fill: (rest - boxes * BOX_MAX) / BOX_MAX };
}

// 払い出しで上皿に流れこむように見せる玉の数
export function pourCount(gain) {
  if (gain <= 0) return 0;
  return Math.min(14, 1 + Math.ceil(gain / 2));
}
