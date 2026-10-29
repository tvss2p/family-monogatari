// ボイス（子どもっぽい元気な声）。edge-tts の ja-JP-NanamiNeural の高さを上げて作る（tools/make-voices.mjs）
// text：読ませる文（読みまちがえないよう、ひらがな）、show：意味（README・確かめ用）
export const VOICE_STYLE = { voice: 'ja-JP-NanamiNeural', rate: '+15%', pitch: '+100Hz' };

export const VOICES = {
  reach1: { text: 'リーチ！', show: 'リーチ！' },
  reach2: { text: 'リーチだよ！そろえ〜！', show: 'リーチだよ！そろえ〜！' },
  hot: { text: 'チャンス！ボタンをおして！', show: 'チャンス！ボタンを押して！' },
  jackpot1: { text: 'おおあたり〜！おめでとう！', show: '大当たり〜！おめでとう！' },
  jackpot2: { text: 'やったね！おおあたり！', show: 'やったね！大当たり！' },
  family: { text: 'かぞくそろって、おおあたり〜！', show: '家族そろって、大当たり〜！' },
  kakuhen: { text: 'かくへんとつにゅう！まだまだいくよ〜！', show: '確変突入！まだまだいくよ〜！' },
  jitan: { text: 'じたんスタート！もうひとあたり！', show: '時短スタート！もうひと当たり！' },
  kakuhenUp: { text: 'かくへんにしょうかく！やった〜！', show: '確変に昇格！やった〜！' },
};

export const VOICE_FILES = Object.fromEntries(Object.keys(VOICES).map(k => [k, `voice_${k}.m4a`]));
// 読みこむときの名前は「v:」を付ける（効果音の hot などと同じ名前でも、入れかわらないように）
export const voiceSample = k => `v:${k}`;
export const VOICE_SAMPLES = Object.fromEntries(Object.entries(VOICE_FILES).map(([k, f]) => [voiceSample(k), f]));

// どの場面でどの声を出すか（出さない場面は null）
export function pickVoice(event, { premium = false } = {}, rng = Math.random) {
  if (event === 'reach') return rng() < 0.5 ? 'reach1' : 'reach2';
  if (event === 'hot') return 'hot';
  if (event === 'jackpot') return premium ? 'family' : (rng() < 0.5 ? 'jackpot1' : 'jackpot2');
  if (event === 'mode:kakuhen') return 'kakuhen';
  if (event === 'mode:jitan') return 'jitan';
  if (event === 'promoWin') return 'kakuhenUp';
  return null;
}
