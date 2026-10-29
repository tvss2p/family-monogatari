// 新しい版を公開したら、開いたままの画面も自動で入れかえる（アプリを閉じなくてよい）
// 盤面の玉がなくなるまで打つのを止めて待ち、保存してから再読み込み。大当たり中も続きから遊べる
export const UPDATE_WAIT_MAX_MS = 12000;

export function reloadDecision({ pending, ballsOnBoard, hidden, waitedMs }) {
  if (!pending) return { holdFire: false, reload: false };
  return { holdFire: true, reload: hidden || ballsOnBoard === 0 || waitedMs >= UPDATE_WAIT_MAX_MS };
}
