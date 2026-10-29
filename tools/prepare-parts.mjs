// 部品の絵（incoming/parts、ChatGPT で作ったもの）→ ゲーム用（assets/img/parts）
// char-○○：横一列の5つの部品（胴体・右うで・左うで・右あし・左あし）を、すき間で切り分ける
// 使い方: node tools/prepare-parts.mjs
import sharp from 'sharp';
import { mkdirSync, existsSync, readdirSync, writeFileSync } from 'node:fs';

const SRC = 'incoming/parts';
const OUT = 'assets/img/parts';
// ゲームで使う倍率（元の絵 1px → 0.16px。画面の 3 倍の細かさ）
const SCALE = 0.16;
const NAMES = ['torso', 'armR', 'armL', 'legR', 'legL'];

// 横に並んだ部品を、透明な列のすき間で分ける（小さなごみは捨てる）
export function splitRuns(alphaAt, W, H, minWidth = 40) {
  const filled = x => { for (let y = 0; y < H; y++) if (alphaAt(x, y) > 20) return true; return false; };
  const runs = [];
  let s = -1;
  for (let x = 0; x <= W; x++) {
    const f = x < W && filled(x);
    if (f && s < 0) s = x;
    if (!f && s >= 0) { if (x - s >= minWidth) runs.push([s, x]); s = -1; }
  }
  return runs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(OUT, { recursive: true });
  const done = [];
  const files = existsSync(SRC) ? readdirSync(SRC).filter(f => /^char-\w+\.(png|webp)$/.test(f)) : [];
  for (const f of files) {
    const who = f.replace(/^char-|\.\w+$/g, '');
    const { data, info } = await sharp(`${SRC}/${f}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const runs = splitRuns((x, y) => data[(y * info.width + x) * 4 + 3], info.width, info.height);
    if (runs.length !== 5) { console.log(`${f}: 部品が ${runs.length} 個（5 個のはず）`); continue; }
    const sizes = [];
    for (let i = 0; i < 5; i++) {
      const [a, b] = runs[i];
      const cut = await sharp(`${SRC}/${f}`).extract({ left: a, top: 0, width: b - a, height: info.height }).png().toBuffer();
      const part = await sharp(cut).trim().png().toBuffer({ resolveWithObject: true });
      const w = Math.round(part.info.width * SCALE), h = Math.round(part.info.height * SCALE);
      await sharp(part.data).resize(w, h).webp({ quality: 85, alphaQuality: 90 }).toFile(`${OUT}/${who}-${NAMES[i]}.webp`);
      sizes.push(`${NAMES[i]} ${w}×${h}`);
    }
    console.log(`${who}: ${sizes.join('、')}`);
    done.push(who);
  }
  // 料理（正方形）と花（縦長）：まわりの透明を切って、使う大きさに
  const foods = [], flowers = [];
  for (const f of existsSync(SRC) ? readdirSync(SRC).sort() : []) {
    const name = f.replace(/\.\w+$/, '');
    if (name.startsWith('food-')) {
      await sharp(`${SRC}/${f}`).trim().resize(240, 240, { fit: 'inside' }).webp({ quality: 82, alphaQuality: 90 }).toFile(`${OUT}/${name}.webp`);
      foods.push(name.slice(5));
    } else if (name.startsWith('flower-')) {
      await sharp(`${SRC}/${f}`).trim().resize({ height: 150 }).webp({ quality: 82, alphaQuality: 90 }).toFile(`${OUT}/${name}.webp`);
      flowers.push(name.slice(7));
    }
  }
  console.log(`料理 ${foods.length}、花 ${flowers.length}`);
  writeFileSync('src/parts.js', `// tools/prepare-parts.mjs が作る（手で直さない）。体の部品の絵がある人（assets/img/parts）
export const PARTS = ${JSON.stringify(done.sort()).replace(/"/g, "'")};
// 料理の絵（food-お店-段階）と、花の絵（flower-色）
export const FOODS = ${JSON.stringify(foods).replace(/"/g, "'")};
export const FLOWERS = ${JSON.stringify(flowers).replace(/"/g, "'")};
`);
}
