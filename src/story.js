import { symbolById } from './symbols.js';

// 登場人物。遊ぶのはばあちゃん：だいすけは「ばあちゃん」、ななえは「おかあさん」と呼びかける
// 服の色は肩組みの絵に合わせる（だいすけ＝黒T、ななえ＝白T、ばあちゃん＝花柄ブラウス）
const PEOPLE = {
  daisuke: { shirt: '#2a2a32', pants: '#3f5f8f' },
  nanae: { shirt: '#fbfbfb', pants: '#8fb3dc' },
  hiroko: { shirt: '#f6dbe7', pants: '#7d6f8c', floral: true },
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
};

export function pickLine(kind, rng) {
  const list = LINES[kind];
  return list ? list[Math.floor(rng() * list.length)] : null;
}

// 大当たり中に流れるムービー（1 場面 7 秒、くり返し）
// actors：from から to まで歩いてきて止まる（x は液晶の左からの px）。walk:true は止まらず歩きぬける
export const SCENE_MS = 7000;
export const MOVIE = [
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
    bg: 'night', cap: '夏祭りの花火',
    actors: [{ who: 'nanae', from: -70, to: 40 }, { who: 'daisuke', from: 260, to: 130 }, { who: 'kira', from: 260, to: 192, delay: 600 }],
    lines: [
      { at: 1200, who: 'nanae', text: 'おかあさん、花火きれい〜' },
      { at: 3300, who: 'daisuke', text: 'たーまやー！' },
      { at: 5000, who: 'kira', text: 'にゃ〜！' },
    ],
  },
  {
    bg: 'party', cap: '主役はばあちゃん！',
    actors: [
      { who: 'hiroko', from: 80, to: 80, star: true }, { who: 'daisuke', from: 260, to: 160, delay: 400 },
      { who: 'nanae', from: -70, to: 4, delay: 400 }, { who: 'berry', from: -40, to: 52, delay: 1200 }, { who: 'glen', from: 260, to: 140, delay: 1200 },
    ],
    lines: [
      { at: 900, who: 'daisuke', text: '主役のばあちゃん登場〜！' },
      { at: 3000, who: 'nanae', text: 'おかあさん、ばんざーい！' },
      { at: 5000, who: 'daisuke', text: 'まだまだ打ってね！' },
    ],
  },
];
