// 筐体（360×800）を画面に合わせる大きさと位置
// 盤面がほぼ横幅いっぱいになるよう、左右の柱の外側（12px ずつ）と下のスピーカーの段（約80px）は画面の外に出してよい。
// 縦が足りないときは、看板（ファミリー物語の文字）より上の飾りを CROP_MAX まで画面の外に出して、そのぶん大きく映す
// （回転数などの表示 24px を下ろしても、文字にかからない高さ）
const VIEW_W = 336, VIEW_H = 722;
export const CROP_MAX = 56;

// s：倍率、top：筐体の上のはしの位置（画面の px）、cut：上を切った高さ（筐体の px）
export function fitCabinet(w, h) {
  const s = Math.min(w / VIEW_W, h / (VIEW_H - CROP_MAX));
  const extra = VIEW_H * s - h;
  if (extra <= 0) return { s, top: -extra / 2, cut: 0 };
  const cut = extra / s;
  return { s, top: -cut * s, cut };
}
