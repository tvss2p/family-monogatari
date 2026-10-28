// 元画像（assets/original）→ ゲームで使う大きさ（assets/img）
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'node:fs';
import { SYMBOLS } from '../src/symbols.js';

const SRC = 'assets/original';
const OUT = 'assets/img';
mkdirSync(OUT, { recursive: true });

let n = 0;
for (const s of SYMBOLS) {
  const src = `${SRC}/${s.id}.webp`;
  if (!existsSync(src)) throw new Error(`missing ${src}`);
  const out = `${OUT}/sym-${s.id}.png`;
  const img = sharp(src);
  if (s.id === 'trio') await img.resize({ width: 400 }).png({ palette: true, quality: 90 }).toFile(out);
  else await img.resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ palette: true, quality: 90 }).toFile(out);
  n++;
}
console.log(`wrote ${n} images to ${OUT}`);

// ChatGPT の部品（gpt/parts は git に入れない）→ ゲーム用（3倍の大きさの webp）
const PARTS = [
  ['gpt/parts/fm-part1-crown.png', 'cab-crown', 1080, null],
  ['gpt/parts/cut/nafan.png', 'part-nafan', 300, null],
  ['gpt/parts/cut/arm.png', 'part-arm', 340, null],
  ['gpt/parts/cut/jarashi.png', 'part-jarashi', 120, null],
  ['gpt/parts/cut/windmill.png', 'part-windmill', 96, null],
  ['gpt/parts/cut/wing.png', 'part-wing', 300, null],
  ['gpt/parts/cut/heso.png', 'part-heso', 260, 0.7],
  ['gpt/parts/cut/push.png', 'part-push', 270, null],
];
for (const [src, name, width, keepTop] of PARTS) {
  if (!existsSync(src)) { console.log(`skip ${name} (no ${src})`); continue; }
  let img = sharp(src).trim();
  if (keepTop) {
    const buf = await img.png().toBuffer();
    const m = await sharp(buf).metadata();
    img = sharp(buf).extract({ left: 0, top: 0, width: m.width, height: Math.round(m.height * keepTop) });
  }
  const out = `${OUT}/${name}.webp`;
  await sharp(await img.png().toBuffer()).resize({ width }).webp({ quality: 86, alphaQuality: 90 }).toFile(out);
  const m = await sharp(out).metadata();
  console.log(name, m.width, m.height);
}

// 台の下の部分（余白を切ってから 1080 幅）
if (existsSync('gpt/parts/fm-part3-bottom.png')) {
  await sharp(await sharp('gpt/parts/fm-part3-bottom.png').trim().png().toBuffer()).resize({ width: 1080 }).webp({ quality: 86, alphaQuality: 90 }).toFile(`${OUT}/cab-bottom.webp`);
  console.log('cab-bottom', (await sharp(`${OUT}/cab-bottom.webp`).metadata()).height);
}

// アプリのアイコン（四隅まで不透明）：パールピンクの地に、なーふぁんのフィギュア
if (existsSync('gpt/parts/cut/nafan.png')) {
  for (const [name, size] of [['icon-512', 512], ['icon-192', 192], ['apple-touch-icon', 180]]) {
    const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs><radialGradient id="g" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#fff6fa"/><stop offset=".6" stop-color="#ffd3e1"/><stop offset="1" stop-color="#f3a6be"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><rect x="${size * 0.04}" y="${size * 0.04}" width="${size * 0.92}" height="${size * 0.92}" rx="${size * 0.18}" fill="none" stroke="#e2ad45" stroke-width="${size * 0.03}"/></svg>`);
    const fig = await sharp('gpt/parts/cut/nafan.png').resize({ width: Math.round(size * 0.78) }).png().toBuffer();
    const fm = await sharp(fig).metadata();
    await sharp(bg).composite([{ input: fig, left: Math.round((size - fm.width) / 2), top: Math.round((size - fm.height) / 2 + size * 0.03) }])
      .flatten({ background: '#ffd3e1' }).png().toFile(`${OUT}/${name}.png`);
  }
  console.log('icons');
}
