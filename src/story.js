import { symbolById } from './symbols.js';

// 登場人物。遊ぶのはばあちゃん：だいすけは「ばあちゃん」、ななえは「おかあさん」と呼びかける。大江さんはみんなから「大江さん」
// 服の色は肩組みの絵に合わせる（だいすけ＝黒T、ななえ＝白T、ばあちゃん＝花柄ブラウス）
const PEOPLE = {
  daisuke: { shirt: '#2a2a32', pants: '#3f5f8f' },
  nanae: { shirt: '#fbfbfb', pants: '#8fb3dc' },
  hiroko: { shirt: '#f6dbe7', pants: '#7d6f8c', floral: true },  oe: { shirt: '#d9583a', pants: '#5a5a6a' },
};
const CATS = ['jill', 'lee', 'berry', 'nafan', 'lucky', 'kira', 'glen', 'honey'];

export const CAST = Object.fromEntries([
  ...Object.entries(PEOPLE).map(([id, c]) => [id, { ...c, human: true }]),
  ...CATS.map(id => [id, { human: false }]),
].map(([id, c]) => [id, { ...c, name: symbolById(id).name, img: symbolById(id).img }]));

// ふだんの回転でのひとこと（場面ごと）
export const LINES = {
  reach: [
    { who: 'daisuke', text: 'ばあちゃん、リーチだよ！' },
    { who: 'nanae', text: 'おかあさん、きたよ〜！' },
    { who: 'daisuke', text: 'そろえ〜っ！' },
    { who: 'honey', text: 'にゃにゃっ！' },
  ],
  hot: [
    { who: 'daisuke', text: 'ばあちゃん、これアツいよ！' },
    { who: 'nanae', text: 'おかあさん、ボタン押して！' },
  ],
  miss: [
    { who: 'daisuke', text: 'おしい！ つぎつぎ！' },
    { who: 'nanae', text: 'だいじょうぶ、まだまだ！' },
    { who: 'lucky', text: 'にゃ〜…' },
  ],
  jackpot: [
    { who: 'daisuke', text: 'ばあちゃん、やったね！！' },
    { who: 'nanae', text: 'おかあさん、すごーい！' },
  ],
  family: [
    { who: 'daisuke', text: '家族みんなそろったよ！' },
    { who: 'nanae', text: 'おかあさん、最高だね！' },
  ],
  kakuhen: [
    { who: 'daisuke', text: '確変！まだまだ当たるよ' },
    { who: 'nanae', text: 'おかあさん、確変だって！' },
  ],
  jitan: [
    { who: 'daisuke', text: 'ばあちゃん、時短だよ！' },
    { who: 'nanae', text: 'もうひと当たりいこう！' },
  ],
  end: [
    { who: 'daisuke', text: 'ばあちゃん、おつかれさま！' },
    { who: 'nanae', text: 'おかあさん、またやろうね' },
  ],
  // 家族予告（回転のはじめに液晶の右下から顔を出す）。白→青→緑→赤の順にアツい
  notice_white: [
    { who: 'daisuke', text: 'ばあちゃん、お茶いる？' },
    { who: 'nanae', text: 'おかあさん、肩ももうか？' },
    { who: 'hiroko', text: 'いいお天気だねえ' },
    { who: 'daisuke', text: 'ばあちゃん、調子どう？' },
    { who: 'nanae', text: 'おかあさん、のんびりね〜' },
    { who: 'hiroko', text: 'お腹すいたねえ' },
  ],
  notice_blue: [
    { who: 'daisuke', text: 'ん？ なんか来そう…' },
    { who: 'nanae', text: 'おかあさん、ちょっと見て！' },
    { who: 'hiroko', text: 'あら、なんだろうねえ' },
  ],
  notice_green: [
    { who: 'daisuke', text: 'ばあちゃん、そろそろ来るよ！' },
    { who: 'nanae', text: 'おかあさん、チャンスかも！' },
    { who: 'hiroko', text: '今日はツイてる気がするねえ' },
  ],
  notice_red: [
    { who: 'daisuke', text: 'ばあちゃん、これは来る！！' },
    { who: 'nanae', text: 'おかあさん、ぜったい当たる！' },
    { who: 'hiroko', text: 'みんな、見ててね！' },
  ],
};

export function pickLine(kind, rng) {
  const list = LINES[kind];
  return list ? list[Math.floor(rng() * list.length)] : null;
}

// 大当たり中に流れるムービー（1 場面 8 秒）
// 1 回の大当たりで、おでかけの話（EPISODES）を 1 話だけ流す。話が終わったら、家族と猫の場面（FILLER）をくり返す
// actors：from から to まで歩いてきて止まる（x は液晶の左からの px）。walk:true は止まらず歩きぬける
export const SCENE_MS = 8000;
const AT = [1000, 3300, 5600];
// extra：場面だけの演出 { fx: 'bloom'（花が咲く）| 'confetti'（紙吹雪）| 'fireworks'（花火）, fxAt: 始まる時刻 ms }
const sc = (bg, cap, actors, lines, extra = {}) => ({ bg, cap, actors, lines: lines.map(([who, text], i) => ({ at: AT[i], who, text })), ...extra });
// その場に立っている人・左右から歩いてくる人
const at = (who, x, extra = {}) => ({ who, from: x, to: x, ...extra });
const inL = (who, x, delay = 0) => ({ who, from: -70, to: x, delay });
const inR = (who, x, delay = 0) => ({ who, from: 260, to: x, delay });

// 家族と猫の場面（おでかけの話のあとにくり返す）
export const FILLER = [
  {
    bg: 'home', cap: 'ばあちゃんのお家',
    actors: [{ who: 'daisuke', from: 260, to: 140 }, { who: 'nanae', from: -70, to: 30 }, { who: 'honey', from: 260, to: 196, delay: 900 }],
    lines: [
      { at: 1200, who: 'daisuke', text: 'ばあちゃん、おめでとう！' },
      { at: 3400, who: 'nanae', text: 'おかあさん、ツイてるね〜' },
      { at: 5200, who: 'honey', text: 'にゃ〜ん♪' },
    ],
  },
  {
    bg: 'park', cap: 'みんなでおさんぽ',
    actors: [
      { who: 'nanae', from: -70, to: 260, walk: true }, { who: 'daisuke', from: -140, to: 200, walk: true },
      { who: 'jill', from: -40, to: 300, walk: true, delay: 300 }, { who: 'lee', from: -90, to: 300, walk: true, delay: 900 },
      { who: 'nafan', from: -60, to: 300, walk: true, delay: 1500 },
    ],
    lines: [
      { at: 1500, who: 'daisuke', text: '猫たちもお祝いだって！' },
      { at: 3800, who: 'nanae', text: 'いいお天気だね〜' },
      { at: 5000, who: 'nafan', text: 'にゃっ！' },
    ],
  },
  {
    bg: 'night', cap: '夏祭りの花火', fx: 'fireworks', fxAt: 0,
    actors: [{ who: 'nanae', from: -70, to: 40 }, { who: 'daisuke', from: 260, to: 130 }, { who: 'kira', from: 260, to: 192, delay: 600 }],
    lines: [
      { at: 1200, who: 'nanae', text: 'おかあさん、花火きれい〜' },
      { at: 3300, who: 'daisuke', text: 'たーまやー！' },
      { at: 5000, who: 'kira', text: 'にゃ〜！' },
    ],
  },
  {
    bg: 'party', cap: '主役はばあちゃん！', fx: 'confetti', fxAt: 700,
    actors: [
      { who: 'hiroko', from: 80, to: 80, star: true }, { who: 'daisuke', from: 260, to: 160, delay: 400 },
      { who: 'nanae', from: -70, to: 4, delay: 400 }, { who: 'oe', from: 260, to: 196, delay: 800 }, { who: 'berry', from: -40, to: 52, delay: 1200 },
    ],
    lines: [
      { at: 900, who: 'daisuke', text: '主役のばあちゃん登場〜！' },
      { at: 3000, who: 'nanae', text: 'おかあさん、ばんざーい！' },
      { at: 5000, who: 'oe', text: 'めでたいなあ！' },
    ],
  },
];

// おでかけの話（だいすけ・ななえ・ばあちゃんの 3 人でよく行ったところ）。1 話 4 場面
export const EPISODES = [
  {
    id: 'sushi', title: '3人で回転寿司',
    scenes: [
      sc('sushi', '回転寿司に到着！', [inL('nanae', 30), inL('hiroko', 94, 300), inR('daisuke', 158, 300)],
        [['daisuke', 'ばあちゃん、着いたよ！'], ['nanae', 'おかあさん、席あいてる〜'], ['hiroko', 'いいにおいだねえ']]),
      sc('sushi', 'なにから食べる？', [at('nanae', 30), at('hiroko', 94), at('daisuke', 158)],
        [['nanae', 'おかあさん、まぐろ来たよ！'], ['daisuke', 'ばあちゃん、何皿いく？'], ['hiroko', 'たまごも取っておくれ']]),
      sc('sushi', '茶わん蒸しもたのもう', [at('daisuke', 30), at('hiroko', 94), at('nanae', 158)],
        [['daisuke', '茶わん蒸しもたのもう！'], ['nanae', 'おかあさん、熱いからね'], ['hiroko', 'あったまるねえ']]),
      sc('sushi', 'おなかいっぱい！', [at('nanae', 30), at('hiroko', 94), at('daisuke', 158)],
        [['daisuke', 'ばあちゃん、何皿食べた？'], ['hiroko', 'おいしかったねえ'], ['nanae', 'おかあさん、また来よう！']]),
    ],
  },
  {
    id: 'museum', title: '3人でジブリ美術館',
    scenes: [
      sc('museum', 'ジブリ美術館に到着！', [inL('nanae', 20), inL('hiroko', 80, 400), inR('daisuke', 168, 200)],
        [['nanae', 'おかあさん、かわいいね〜'], ['daisuke', 'ばあちゃん、こっちこっち！'], ['hiroko', 'ふしぎな建物だねえ']]),
      sc('museum', 'ステンドグラスがきれい', [at('hiroko', 20), at('nanae', 80), at('daisuke', 168)],
        [['nanae', 'おかあさん、窓がきれい！'], ['hiroko', '光がきらきらだねえ'], ['daisuke', 'ばあちゃん、写真とろう！']]),
      sc('museum', '屋上の庭園', [at('daisuke', 20), at('hiroko', 90), at('nanae', 160)],
        [['daisuke', 'ばあちゃん、屋上に庭がある！'], ['hiroko', '緑がいっぱいだねえ'], ['nanae', 'おかあさん、階段気をつけて']]),
      sc('museum', 'おみやげ選び', [at('nanae', 20), at('hiroko', 90), at('daisuke', 160)],
        [['nanae', 'おかあさん、どれにする？'], ['hiroko', 'みんなにあげようかね'], ['daisuke', '袋はおれが持つよ！']]),
    ],
  },
  {
    id: 'hamburg', title: '3人でびっくりドンキー',
    scenes: [
      sc('hamburg', 'びっくりドンキーに到着！', [inR('daisuke', 104), inL('nanae', 6, 300), inL('hiroko', 54, 600)],
        [['daisuke', 'ばあちゃん、ここだよ！'], ['nanae', 'おかあさん、木のお店だね'], ['hiroko', 'にぎやかだねえ']]),
      sc('hamburg', '大きなメニュー', [at('nanae', 6), at('hiroko', 54), at('daisuke', 104)],
        [['daisuke', 'メニューでっかい！'], ['nanae', 'おかあさん、どれにする？'], ['hiroko', 'チーズのにしようかね']]),
      sc('hamburg', 'いただきます！', [at('nanae', 6), at('hiroko', 54), at('daisuke', 104)],
        [['daisuke', 'ハンバーグ、でっかい！'], ['nanae', 'おかあさん、熱いから気をつけて'], ['hiroko', 'やわらかいねえ']]),
      sc('hamburg', 'デザートも食べよう', [at('daisuke', 6), at('hiroko', 54), at('nanae', 104)],
        [['nanae', 'おかあさん、パフェ半分こ！'], ['hiroko', '甘いのは別腹だねえ'], ['daisuke', 'ばあちゃん、満足？']]),
    ],
  },
  {
    id: 'hyakkin', title: '3人で百均へ',
    scenes: [
      sc('hyakkin', '百均に到着！', [inR('nanae', 150), inR('hiroko', 92, 300), inL('daisuke', 24, 500)],
        [['nanae', 'おかあさん、これ全部100円！'], ['daisuke', 'ばあちゃん、カゴ持つよ'], ['hiroko', 'あれもこれも欲しいねえ']]),
      sc('hyakkin', '台所のもの', [at('daisuke', 24), at('hiroko', 92), at('nanae', 150)],
        [['hiroko', 'このざる便利そうだねえ'], ['nanae', 'おかあさん、色ちがいもあるよ'], ['daisuke', 'ばあちゃん、それ入れとく！']]),
      sc('hyakkin', 'おもしろグッズ', [at('nanae', 24), at('daisuke', 92), at('hiroko', 150)],
        [['daisuke', 'ばあちゃん、これ見て！'], ['hiroko', 'なんだいそれは'], ['nanae', 'おかあさん、笑いすぎ〜']]),
      sc('hyakkin', 'カゴがいっぱい', [at('daisuke', 24), at('hiroko', 92), at('nanae', 150)],
        [['nanae', 'おかあさん、カゴいっぱい！'], ['daisuke', 'ばあちゃん、よく買ったね'], ['hiroko', '安いからつい、ねえ']]),
    ],
  },
  {
    id: 'burger', title: '3人でマクドナルド',
    scenes: [
      sc('burger', 'マクドナルドに到着！', [inL('daisuke', 10), inL('hiroko', 58, 300), inL('nanae', 102, 600)],
        [['daisuke', 'ばあちゃん、ポテト食べる？'], ['nanae', 'おかあさん、何にする？'], ['hiroko', 'たまにはいいねえ']]),
      sc('burger', '注文はどれ？', [at('daisuke', 10), at('hiroko', 58), at('nanae', 102)],
        [['daisuke', 'ばあちゃん、セットにする？'], ['hiroko', 'えびのにしようかね'], ['nanae', 'おかあさん、飲み物は？']]),
      sc('burger', 'いただきます！', [at('nanae', 10), at('hiroko', 58), at('daisuke', 102)],
        [['nanae', 'おかあさん、ポテトあげる'], ['hiroko', 'しょっぱくておいしいねえ'], ['daisuke', 'ばあちゃん、口についてる！']]),
      sc('burger', 'おもちゃ当たった！', [at('daisuke', 10), at('hiroko', 58), at('nanae', 102)],
        [['daisuke', 'ばあちゃん、おまけついてた'], ['hiroko', 'かわいいねえ'], ['nanae', 'おかあさん、もらっちゃえ！']]),
    ],
  },
  {
    id: 'flower', title: 'おかあさんとお花を見に',
    scenes: [
      sc('flower', 'お花屋さんに到着！', [inL('nanae', 60), inL('hiroko', 116, 200), inR('honey', 190, 2400)],
        [['nanae', 'おかあさん、この花きれい！'], ['hiroko', 'うちの庭に植えようかね'], ['nanae', 'これ買っていこう〜']]),
      sc('flower', 'どの色にする？', [at('hiroko', 40), at('nanae', 116)],
        [['nanae', 'おかあさん、赤と黄色どっち？'], ['hiroko', '両方にしようかね'], ['nanae', 'ぜいたく〜！']]),
      sc('flower', 'お庭に植えよう', [at('nanae', 40), at('hiroko', 110), inR('honey', 188, 1200)],
        [['hiroko', 'ここに植えようかね'], ['nanae', 'おかあさん、土やわらかいよ'], ['honey', 'にゃ？']], { fx: 'bloom', fxAt: 3600 }),
      sc('flower', 'きれいに咲いた！', [at('nanae', 40), at('hiroko', 110), at('honey', 188)],
        [['nanae', 'おかあさん、咲いたね！'], ['hiroko', '毎日水やりしたからねえ'], ['honey', 'にゃ〜ん♪']], { fx: 'bloom', fxAt: 0 }),
    ],
  },
  {
    id: 'village', title: '3人でビレッジバンガード',
    scenes: [
      sc('village', 'ビレバンに到着！', [inR('daisuke', 150), inL('hiroko', 82, 300), inL('nanae', 22, 500)],
        [['daisuke', 'ばあちゃん、これ見て！'], ['nanae', 'おかあさん、へんなのある〜'], ['hiroko', 'おもしろい店だねえ']]),
      sc('village', '迷路みたい', [at('nanae', 22), at('hiroko', 82), at('daisuke', 150)],
        [['hiroko', '迷子になりそうだねえ'], ['daisuke', 'ばあちゃん、こっちだよ'], ['nanae', 'おかあさん、手つなごう']]),
      sc('village', 'へんなお菓子', [at('daisuke', 22), at('hiroko', 82), at('nanae', 150)],
        [['daisuke', 'ばあちゃん、これ食べる？'], ['hiroko', 'なんの味だいそれ'], ['nanae', 'おかあさん、やめとこ〜']]),
      sc('village', 'おみやげ買った！', [at('nanae', 22), at('hiroko', 82), at('daisuke', 150)],
        [['nanae', 'おかあさん、何買ったの？'], ['hiroko', 'ないしょだよ'], ['daisuke', 'ばあちゃん、気になる〜！']]),
    ],
  },
  {
    id: 'drive', title: '大江さんとドライブ',
    scenes: [
      sc('drive', 'ドライブに出発！', [inL('daisuke', 6), inL('hiroko', 62, 300), inL('nanae', 118, 600), inR('oe', 178, 300)],
        [['daisuke', '運転はおれにまかせて！'], ['nanae', 'おかあさん、シートベルト！'], ['oe', 'よろしく頼むよ']]),
      sc('drive', '窓の外がきれい', [at('nanae', 6), at('hiroko', 62), at('oe', 118), at('daisuke', 178)],
        [['hiroko', '山がきれいだねえ'], ['oe', 'あれが日光の山だよ'], ['daisuke', '大江さん、くわしい！']]),
      sc('drive', 'サービスエリアで休憩', [at('daisuke', 6), at('hiroko', 62), at('oe', 118), at('nanae', 178)],
        [['daisuke', 'ソフトクリーム買ってきた！'], ['hiroko', 'つめたくておいしいねえ'], ['oe', 'ひと休みだなあ']]),
      sc('drive', '夕やけの帰り道', [at('nanae', 6), at('hiroko', 62), at('oe', 118), at('daisuke', 178)],
        [['nanae', 'おかあさん、夕やけきれい'], ['oe', 'また行こうなあ'], ['daisuke', 'ばあちゃん、寝てていいよ']]),
    ],
  },
  {
    id: 'karaoke', title: '大江さんとカラオケ',
    scenes: [
      sc('karaoke', 'カラオケに到着！', [inR('daisuke', 178), inL('nanae', 6, 300), inL('hiroko', 62, 500), inR('oe', 118, 300)],
        [['daisuke', 'ばあちゃん、歌おう！'], ['oe', 'よし、一番はわしだ'], ['hiroko', 'はずかしいねえ']]),
      sc('karaoke', '大江さんの番', [at('nanae', 6), at('hiroko', 62), at('oe', 118, { star: true }), at('daisuke', 178)],
        [['oe', '十八番いくぞ〜！'], ['nanae', 'おかあさん、手拍子〜！'], ['daisuke', '大江さん、渋い！']]),
      sc('karaoke', 'だいすけの番', [at('nanae', 6), at('hiroko', 62), at('oe', 118), at('daisuke', 178, { star: true })],
        [['daisuke', 'NiziU歌います！'], ['hiroko', '上手だねえ'], ['oe', '若いのはいいなあ']]),
      sc('karaoke', 'ばあちゃんも一曲', [at('nanae', 6), at('hiroko', 62, { star: true }), at('oe', 118), at('daisuke', 178)],
        [['daisuke', 'ばあちゃん、演歌入れたよ！'], ['hiroko', 'じゃあ一曲だけね'], ['oe', '100点だなあ！']], { fx: 'confetti', fxAt: 5600 }),
    ],
  },
  {
    id: 'oe', title: '大江さんとお茶の時間',
    scenes: [
      sc('home', '大江さんがきた！', [at('hiroko', 30), inR('oe', 110), inL('daisuke', 174, 800)],
        [['oe', 'こんにちは〜'], ['hiroko', 'あら、大江さん'], ['daisuke', '大江さん、いらっしゃい！']]),
      sc('home', 'お茶とおせんべい', [at('hiroko', 6), at('oe', 62), at('nanae', 118), at('daisuke', 178)],
        [['nanae', 'おかあさん、お茶いれたよ'], ['oe', 'このせんべい、うまいなあ'], ['hiroko', 'もっと食べなさいね']]),
      sc('home', '昔の話', [at('hiroko', 6), at('oe', 62), at('nanae', 118), at('daisuke', 178)],
        [['oe', '昔はこのへん田んぼでなあ'], ['daisuke', '大江さん、そうなの？'], ['hiroko', 'なつかしいねえ']]),
      sc('home', 'またね！', [at('hiroko', 6), at('nanae', 62), at('daisuke', 118), at('oe', 178)],
        [['oe', 'また来るよ〜'], ['nanae', '大江さん、気をつけてね'], ['hiroko', 'またおいでね']]),
    ],
  },
  {
    id: 'icecream', title: '3人でサーティワン',
    scenes: [
      sc('icecream', 'サーティワンに到着！', [inL('nanae', 22), inL('hiroko', 86, 300), inR('daisuke', 150, 300)],
        [['nanae', 'おかあさん、どれにする？'], ['hiroko', 'たくさんあって迷うねえ'], ['daisuke', 'ばあちゃん、味見できるよ']]),
      sc('icecream', '味見させて', [at('daisuke', 22), at('hiroko', 86), at('nanae', 150)],
        [['daisuke', 'ばあちゃん、これ味見！'], ['hiroko', 'おや、ラムネの味だ'], ['nanae', 'おかあさん、ダブルにしよ']]),
      sc('icecream', 'いただきます！', [at('nanae', 22), at('hiroko', 86), at('daisuke', 150)],
        [['hiroko', 'つめたいねえ'], ['nanae', 'おかあさん、ひと口ちょうだい'], ['daisuke', 'ばあちゃん、とけてる！']]),
      sc('icecream', 'あっというまに完食', [at('daisuke', 22), at('hiroko', 86), at('nanae', 150)],
        [['daisuke', 'ばあちゃん、はやっ！'], ['hiroko', 'もうひとつ食べようかね'], ['nanae', 'おかあさん、さすが〜']]),
    ],
  },
  {
    id: 'chicken', title: '3人でケンタッキー',
    scenes: [
      sc('chicken', 'ケンタッキーに到着！', [inR('daisuke', 150), inL('hiroko', 86, 300), inL('nanae', 22, 500)],
        [['daisuke', 'ばあちゃん、チキンだよ！'], ['nanae', 'おかあさん、いいにおい〜'], ['hiroko', 'おなかすいたねえ']]),
      sc('chicken', 'バーレルにしよう', [at('nanae', 22), at('hiroko', 86), at('daisuke', 150)],
        [['daisuke', 'バーレルにしちゃおう！'], ['hiroko', 'そんなに食べられるかね'], ['nanae', 'おかあさん、いけるいける']]),
      sc('chicken', 'いただきます！', [at('daisuke', 22), at('hiroko', 86), at('nanae', 150)],
        [['hiroko', '皮がパリパリだねえ'], ['nanae', 'おかあさん、ビスケットも！'], ['daisuke', 'ばあちゃん、手ふきどうぞ']]),
      sc('chicken', 'のこりはおみやげ', [at('nanae', 22), at('hiroko', 86), at('daisuke', 150)],
        [['nanae', 'おかあさん、持って帰ろう'], ['daisuke', 'ばあちゃん、明日のお昼ね'], ['hiroko', 'たすかるねえ']]),
    ],
  },
  {
    id: 'market', title: '3人でヤオコー',
    scenes: [
      sc('market', 'ヤオコーに到着！', [inL('daisuke', 22), inL('hiroko', 86, 300), inL('nanae', 150, 600)],
        [['daisuke', 'ばあちゃん、カート押すよ'], ['nanae', 'おかあさん、何買うんだっけ？'], ['hiroko', 'メモ持ってきたよ']]),
      sc('market', 'お野菜コーナー', [at('nanae', 22), at('hiroko', 86), at('daisuke', 150)],
        [['hiroko', 'このトマト安いねえ'], ['nanae', 'おかあさん、きゅうりも！'], ['daisuke', 'ばあちゃん、カゴ入れるね']]),
      sc('market', 'お惣菜コーナー', [at('daisuke', 22), at('hiroko', 86), at('nanae', 150)],
        [['daisuke', 'ばあちゃん、おはぎある！'], ['hiroko', 'それも買っていこうかね'], ['nanae', 'おかあさん、半額だって！']]),
      sc('market', 'お会計', [at('nanae', 22), at('hiroko', 86), at('daisuke', 150)],
        [['nanae', 'おかあさん、ポイントカード'], ['hiroko', 'はいはい、あったよ'], ['daisuke', 'ばあちゃん、荷物持つね！']]),
    ],
  },
  // 猫たちの話（猫の図柄で当たると、その猫が出る話が選ばれやすい）
  {
    id: 'catnap', title: 'ねこたちのお昼寝', cats: ['honey', 'lucky', 'kira'],
    scenes: [
      sc('home', 'ひなたぼっこ', [inR('honey', 30), inR('lucky', 100, 500), inL('kira', 170, 900)],
        [['honey', 'にゃ〜（ぽかぽかだにゃ）'], ['lucky', 'にゃふ…'], ['kira', 'にゃっ（ここ空いてる？）']]),
      sc('home', 'みんなでお昼寝', [at('honey', 30), at('lucky', 100), at('kira', 170)],
        [['honey', 'すぴー…'], ['lucky', 'むにゃむにゃ'], ['kira', 'Zzz…']]),
      sc('home', 'ばあちゃんが毛布を', [at('honey', 30), inR('hiroko', 100), at('lucky', 170)],
        [['hiroko', 'かぜひかないようにね'], ['honey', 'にゃ〜ん（ありがと）'], ['lucky', 'ごろごろ…']]),
      sc('home', 'おやつの時間！', [at('kira', 30), at('hiroko', 100), at('honey', 170)],
        [['kira', 'にゃっ！（おやつだにゃ）'], ['honey', 'にゃにゃっ！'], ['hiroko', 'はいはい、おやつだよ']]),
    ],
  },
  {
    id: 'catrun', title: 'ねこたちの運動会', cats: ['jill', 'lee', 'nafan'],
    scenes: [
      sc('park', 'よーい、どん！', [inL('jill', 30), inL('lee', 100, 300), inL('nafan', 170, 600)],
        [['jill', 'にゃっ！（よーいどん）'], ['lee', 'にゃにゃー！'], ['nafan', 'まってにゃ〜']]),
      sc('park', 'ちょうちょを追いかけ', [{ who: 'lee', from: -50, to: 300, walk: true }, { who: 'jill', from: -110, to: 300, walk: true, delay: 300 }, { who: 'nafan', from: -170, to: 300, walk: true, delay: 600 }],
        [['lee', 'にゃっ（ちょうちょ！）'], ['jill', 'にゃにゃっ'], ['nafan', 'にゃ〜ん']]),
      sc('park', 'ゴール！', [at('jill', 30), at('lee', 100), at('nafan', 170)],
        [['jill', 'にゃーっ！（いちばん）'], ['lee', 'にゃふ（くやしい）'], ['nafan', 'みんなえらいにゃ']], { fx: 'confetti', fxAt: 600 }),
      sc('park', 'だいすけからごほうび', [at('jill', 20), at('nafan', 80), inR('daisuke', 130), at('lee', 196)],
        [['daisuke', 'みんな、おやつだよ！'], ['jill', 'にゃ〜ん♪'], ['nafan', 'にゃむにゃむ']]),
    ],
  },
  {
    id: 'catfish', title: 'ねこのおさかなパーティー', cats: ['berry', 'glen', 'honey'],
    scenes: [
      sc('party', 'おさかなパーティー', [inL('berry', 30), inR('glen', 100, 300), inR('honey', 170, 600)],
        [['berry', 'にゃっ！（いいにおい）'], ['glen', 'にゃにゃ？'], ['honey', 'にゃ〜ん']]),
      sc('party', 'ななえがおさかなを', [at('berry', 20), inL('nanae', 80), at('glen', 140), at('honey', 196)],
        [['nanae', 'みんな、お刺身だよ〜'], ['berry', 'にゃにゃっ！'], ['glen', 'にゃむにゃむ']]),
      sc('party', 'おなかいっぱい', [at('glen', 30), at('berry', 100), at('honey', 170)],
        [['glen', 'にゃふ〜（まんぷく）'], ['berry', 'ごろごろ…'], ['honey', 'にゃ〜（しあわせ）']]),
      sc('party', 'みんなで記念写真', [at('berry', 20), at('nanae', 80), at('glen', 140), at('honey', 196)],
        [['nanae', 'はい、チーズ！'], ['berry', 'にゃっ！'], ['glen', 'にゃ〜ん♪']], { fx: 'confetti', fxAt: 1000 }),
    ],
  },
  {
    id: 'catnight', title: 'ねこたちの夜さんぽ', cats: ['kira', 'nafan', 'lee'],
    scenes: [
      sc('night', '夜のおさんぽ', [inL('kira', 30), inL('nafan', 100, 300), inL('lee', 170, 600)],
        [['kira', 'にゃっ（出発だにゃ）'], ['nafan', 'にゃ〜ん'], ['lee', 'にゃにゃ']]),
      sc('night', 'お月さまきれい', [at('lee', 30), at('nafan', 100), at('kira', 170)],
        [['nafan', 'にゃ〜（まんまる）'], ['kira', 'にゃふ'], ['lee', 'にゃっ（星もある）']]),
      sc('night', '花火があがった！', [at('kira', 30), at('lee', 100), at('nafan', 170)],
        [['kira', 'にゃにゃっ！？'], ['lee', 'にゃーっ！'], ['nafan', 'きれいだにゃ〜']], { fx: 'fireworks', fxAt: 300 }),
      sc('night', 'おうちに帰ろう', [at('kira', 20), at('nafan', 80), inR('daisuke', 140), at('lee', 196)],
        [['daisuke', 'みんな、おかえり！'], ['kira', 'にゃ〜ん'], ['nafan', 'にゃっ（ただいま）']]),
    ],
  },
];

// 注文アニメ（リーチ中、家族がお店にいて注文が運ばれてくる）。normal＝いつもの、chance＝ちょっと豪華、kakutei＝いちばん豪華（当たり確定）
// bg はお店の背景（lcd.css の .bg-○○）。react は運ばれてきたときのひとこと
export const MENUS = {
  donkey: { shop: 'びっくりドンキー', bg: 'hamburg', normal: 'レギュラーバーグディッシュ', chance: 'チーズバーグディッシュ', kakutei: 'ポテサラパケットディッシュ' },
  burger: { shop: 'マクドナルド', bg: 'burger', normal: 'ハンバーガーのセット', chance: 'チーズバーガーのセット', kakutei: 'ダブルチーズバーガーのセット' },
  icecream: { shop: 'サーティワン', bg: 'icecream', normal: 'シングル', chance: 'ダブル', kakutei: 'トリプル' },
  chicken: { shop: 'ケンタッキー', bg: 'chicken', normal: 'ポテトのセット', chance: 'チキンのセット', kakutei: 'パーティバーレル' },
};
export const ORDER_LINES = {
  wait: [{ who: 'daisuke', text: 'ばあちゃん、なに来るかな？' }, { who: 'nanae', text: 'おかあさん、楽しみだね' }],
  normal: [{ who: 'hiroko', text: 'おいしそうだねえ' }, { who: 'daisuke', text: 'いただきまーす！' }],
  chance: [{ who: 'nanae', text: 'おかあさん、豪華〜！' }, { who: 'hiroko', text: 'あらま、チーズだねえ' }],
  kakutei: [{ who: 'daisuke', text: 'ばあちゃん、これはすごい！' }, { who: 'nanae', text: 'おかあさん、特別だよ！' }],
};

// 大当たり中の盤面の背景の絵（assets/img、tools/prepare-boards.mjs が作る）。絵がない話は、色と花びら（cabinet.css の .t-○○）
export { BOARD_IMAGES } from './board-images.js';

// すべての場面（確かめ用）
export const MOVIE = [...FILLER, ...EPISODES.flatMap(e => e.scenes)];

// 次に流す話：まだ見ていない話から選ぶ（ぜんぶ見たら、また最初から）
// cat：猫の図柄で当たったときはその猫。その猫が出る、まだ見ていない話があればそれを流す
export function pickEpisode(seen, rng, cat = null) {
  const left = EPISODES.filter(e => !seen.includes(e.id));
  const starring = left.filter(e => cat && e.cats && e.cats.includes(cat));
  const list = starring.length ? starring : left.length ? left : EPISODES;
  const ep = list[Math.floor(rng() * list.length)];
  return { episode: ep, seen: left.length ? [...seen, ep.id] : [ep.id] };
}
