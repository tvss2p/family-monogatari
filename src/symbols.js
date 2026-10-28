// 図柄表：番号の奇数＝確変、偶数＝通常、家族3人＝プレミアム
const LIST = [
  ['jill', 'ジル'], ['lee', 'リー'], ['berry', 'ベリー'], ['nafan', 'なーふぁん'],
  ['lucky', 'ラッキー'], ['kira', 'キラ'], ['glen', 'グレン'], ['daisuke', 'だいすけ'],
  ['hiroko', 'ひろこ'], ['nanae', 'ななえ'], ['honey', 'ハニー'],
];

export const PREMIUM_ID = 'trio';

export const SYMBOLS = [
  ...LIST.map(([id, name], i) => ({
    id, name, no: i + 1,
    type: (i + 1) % 2 === 1 ? 'kakuhen' : 'normal',
    img: `assets/img/sym-${id}.png`,
  })),
  { id: PREMIUM_ID, name: '家族3人', no: null, type: 'premium', img: `assets/img/sym-${PREMIUM_ID}.png` },
];

export const NUMBERED = SYMBOLS.filter(s => s.no !== null);

export const symbolById = id => SYMBOLS.find(s => s.id === id);
