// 盤面の背景の絵（incoming/boards/○○.jpg、ChatGPT で作ったもの）→ ゲーム用（assets/img/board-○○.webp）
// 盤面（320×404）の2倍の大きさに切りぬき、src/board-images.js に使う絵の一覧を書く
// 使い方: node tools/prepare-boards.mjs
import sharp from 'sharp';
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { EPISODES } from '../src/story.js';

const SRC = 'incoming/boards';
const ids = new Set(EPISODES.map(e => e.id));
const files = existsSync(SRC) ? readdirSync(SRC).filter(f => /\.(jpe?g|png|webp)$/i.test(f)) : [];
const map = {};
for (const f of files.sort()) {
  const id = f.replace(/\.\w+$/, '').replace(/^\d+[-_.]?/, '');
  if (!ids.has(id)) { console.log(`skip ${f}（話の名前ではない）`); continue; }
  const out = `board-${id}.webp`;
  await sharp(`${SRC}/${f}`).resize(640, 808, { fit: 'cover' }).webp({ quality: 78 }).toFile(`assets/img/${out}`);
  map[id] = out;
}
writeFileSync('src/board-images.js', `// tools/prepare-boards.mjs が作る（手で直さない）。大当たり中の盤面の背景の絵
export const BOARD_IMAGES = ${JSON.stringify(map, null, 2).replace(/"(\w+)":/g, '$1:').replace(/"/g, "'")};
`);
console.log(`${Object.keys(map).length} 枚：${Object.keys(map).join(', ')}`);
const missing = [...ids].filter(id => !map[id]);
if (missing.length) console.log(`まだない：${missing.join(', ')}`);
