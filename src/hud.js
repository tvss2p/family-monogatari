// 上のカウンター（本物のホールのデータカウンターのように）：いまのモードと、時短なら残りの回数
export function modeDisplay(mode, jitanLeft) {
  if (mode === 'kakuhen') return { label: 'モード', value: '確変中', on: true };
  if (mode === 'jitan') return { label: '時短 残り', value: `${jitanLeft}回`, on: true };
  return { label: 'モード', value: '通常', on: false };
}
