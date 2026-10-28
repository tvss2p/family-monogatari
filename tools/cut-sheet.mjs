// 部品シート（透明背景）から、つながった絵を1つずつ切り出す（となりの部品は消す）
// 使い方: node tools/cut-sheet.mjs <sheet.png> <outDir> name1 name2 ...（左上から行ごとの順）
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const [src, outDir, ...names] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const K = 4;
const meta = await sharp(src).metadata();
const W = Math.ceil(meta.width / K), H = Math.ceil(meta.height / K);
const { data } = await sharp(src).ensureAlpha().extractChannel(3).resize(W, H, { kernel: 'nearest' }).raw().toBuffer({ resolveWithObject: true });

const label = new Int32Array(W * H).fill(-1);
const boxes = [];
for (let i = 0; i < W * H; i++) {
  if (label[i] >= 0 || data[i] < 24) continue;
  const id = boxes.length;
  let x0 = W, y0 = H, x1 = 0, y1 = 0, n = 0;
  const stack = [i];
  label[i] = id;
  while (stack.length) {
    const p = stack.pop();
    const x = p % W, y = (p - x) / W;
    n++;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const q = ny * W + nx;
      if (label[q] < 0 && data[q] >= 24) { label[q] = id; stack.push(q); }
    }
  }
  boxes.push({ id, x0, y0, x1, y1, n });
}
const big = boxes.slice().sort((a, b) => b.n - a.n).slice(0, names.length);
const rowH = H / 2;
big.sort((a, b) => (Math.floor((a.y0 + a.y1) / 2 / rowH) - Math.floor((b.y0 + b.y1) / 2 / rowH)) || (a.x0 - b.x0));

for (let i = 0; i < big.length; i++) {
  const b = big[i], pad = 3;
  const bx0 = Math.max(0, b.x0 - pad), by0 = Math.max(0, b.y0 - pad);
  const bx1 = Math.min(W - 1, b.x1 + pad), by1 = Math.min(H - 1, b.y1 + pad);
  const mw = bx1 - bx0 + 1, mh = by1 - by0 + 1;
  // 自分の形（少し太らせる）だけ白、ほかは透明
  const mask = Buffer.alloc(mw * mh * 4);
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      let mine = false;
      for (let dy = -2; dy <= 2 && !mine; dy++) {
        for (let dx = -2; dx <= 2 && !mine; dx++) {
          const gx = bx0 + x + dx, gy = by0 + y + dy;
          if (gx >= 0 && gy >= 0 && gx < W && gy < H && label[gy * W + gx] === b.id) mine = true;
        }
      }
      const o = (y * mw + x) * 4;
      mask[o] = mask[o + 1] = mask[o + 2] = 255;
      mask[o + 3] = mine ? 255 : 0;
    }
  }
  const left = bx0 * K, top = by0 * K;
  const width = Math.min(meta.width - left, mw * K), height = Math.min(meta.height - top, mh * K);
  const maskImg = await sharp(mask, { raw: { width: mw, height: mh, channels: 4 } }).resize(mw * K, mh * K, { kernel: 'nearest' }).extract({ left: 0, top: 0, width, height }).png().toBuffer();
  const piece = await sharp(src).ensureAlpha().extract({ left, top, width, height }).composite([{ input: maskImg, blend: 'dest-in' }]).png().toBuffer();
  const out = `${outDir}/${names[i]}.png`;
  await sharp(piece).trim().png().toFile(out);
  const m = await sharp(out).metadata();
  console.log(names[i], m.width, m.height);
}
