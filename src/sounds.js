// 魔王魂（https://maou.audio/）の曲と効果音。元のファイルは assets/original/audio、
// ゲーム用（軽くして音量をそろえたもの）は tools/prepare-audio.mjs が assets/audio に作る
export const AUDIO_DIR = 'assets/audio';
export const CREDIT = '音楽・効果音：魔王魂 https://maou.audio/（CC BY 4.0、形式変換・音量調整・一部カットあり）';

// 場面ごとの曲（bgm.js の TRACKS と同じ名前）
export const BGM_FILES = {
  normal: 'maou_loop_bgm_acoustic44.m4a', // Merry-go-round
  reach: 'maou_loop_bgm_neorock34_cut.m4a', // ネオロック34
  hot: 'maou_loop_bgm_neorock33_cut.m4a', // ネオロック33
  jackpot: 'maou_loop_bgm_acoustic34.m4a', // サマータイムわんこ
  family: 'maou_bgm_healing07_cut.m4a', // ヒーリング07
  kakuhen: 'maou_loop_bgm_ethnic09.m4a', // 揺れる提灯
  jitan: 'maou_loop_bgm_acoustic50.m4a', // 至福の隙間
};

// 差しかえる効果音（audio.js の合成の音と同じ名前）。ないものは合成の音のまま
export const SE_FILES = {
  jackpot: 'maou_se_jingle05.m4a', // 当たり
  ending: 'maou_se_jingle07.m4a', // 当たり（大当たりのおわり・プレミア）
  reach: 'maou_se_onepoint03.m4a', // ジャーン
  hot: 'maou_se_battle02.m4a', // パワーアップ
  open: 'maou_se_onepoint15.m4a', // 正解
  miss: 'maou_se_onepoint32.m4a', // ハズレ
  push: 'maou_se_battle12.m4a', // どごぉっ
  stopBig: 'maou_se_battle07.m4a', // どんっ
  punch: 'maou_se_battle08.m4a', // 打撃音
  round: 'maou_se_system37.m4a', // 決定音
  click: 'maou_se_system21.m4a', // 決定音
};

// くり返す範囲：前と後ろの無音（AAC に変換すると入るすき間）を飛ばす
export function loopBounds(data, sampleRate, threshold = 1e-3) {
  let a = 0, b = data.length;
  while (a < b && Math.abs(data[a]) < threshold) a++;
  if (a === b) return { start: 0, end: data.length / sampleRate };
  while (b > a && Math.abs(data[b - 1]) < threshold) b--;
  return { start: a / sampleRate, end: b / sampleRate };
}

// この曲が鳴っているあいだに、次に使いそうな曲を用意しておく
export function prefetchFor(name) {
  if (name === 'reach' || name === 'hot') return ['jackpot', 'family', 'hot'].filter(n => n !== name);
  if (name === 'jackpot' || name === 'family') return ['kakuhen', 'jitan'];
  return ['reach', 'hot'];
}
