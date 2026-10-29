import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSpin } from '../src/scenario.js';
import { drawHit } from '../src/lottery.js';
import { NUMBERED } from '../src/symbols.js';
import { simulate } from '../tools/sim.mjs';
import { CAST, LINES } from '../src/story.js';
import { mulberry32 } from './helpers.js';

const MISS = { hit: false, symbolId: null, kind: null };
const hitOf = (id, kind) => ({ hit: true, symbolId: id, kind });
const at = (spin, cue) => (spin.cues.find(c => c.cue === cue) || {}).t;

test('miss never shows three equal', () => {
  const rng = mulberry32(10);
  for (let i = 0; i < 20000; i++) {
    const s = buildSpin(MISS, 'normal', rng);
    const [l, m, r] = s.stops;
    assert.ok(!(l === m && m === r));
  }
});

test('hit shows three equal = symbolId', () => {
  const rng = mulberry32(11);
  for (const sym of NUMBERED) {
    const s = buildSpin(hitOf(sym.id, sym.type), 'normal', rng);
    const [a, b, c] = s.stops;
    assert.ok(a === b && b === c);
    // 確変昇格のときは、いったん偶数で見せて大当たり中に本当の図柄へ
    assert.equal(s.promo && s.promo.success ? s.promo.real : a, sym.id);
    assert.ok(s.reach);
  }
});

test('premium stops are all trio with family reach and hot', () => {
  const rng = mulberry32(12);
  for (let i = 0; i < 200; i++) {
    const s = buildSpin(hitOf('trio', 'premium'), 'normal', rng);
    assert.deepEqual(s.stops, ['trio', 'trio', 'trio']);
    assert.ok(['family', 'allspin'].includes(s.reach));
    assert.equal(s.hot, true);
  }
});

test('reach pair is l and r', () => {
  const rng = mulberry32(13);
  let reaches = 0;
  for (let i = 0; i < 20000; i++) {
    const s = buildSpin(MISS, 'normal', rng);
    const [l, m, r] = s.stops;
    if (s.reach) { reaches++; assert.equal(l, r); assert.notEqual(m, l); }
    else assert.notEqual(l, r);
  }
  const rate = reaches / 20000;
  assert.ok(rate > 0.10 && rate < 0.15, `miss reach rate ${rate}`);
});

test('family reach and parade are hot signals', () => {
  const rng = mulberry32(14);
  const c = { fam: [0, 0], parade: [0, 0], hot: [0, 0] };
  for (let i = 0; i < 400000; i++) {
    const h = drawHit('normal', rng);
    const s = buildSpin(h, 'normal', rng);
    const k = h.hit ? 0 : 1;
    if (s.reach === 'family') c.fam[k]++;
    if (s.notices.includes('parade')) c.parade[k]++;
    if (s.hot) c.hot[k]++;
  }
  const p = ([h, m]) => h / (h + m);
  assert.ok(p(c.fam) > 0.5, `family ${p(c.fam)}`);
  assert.ok(p(c.parade) > 0.6, `parade ${p(c.parade)}`);
  assert.ok(p(c.hot) > 0.35, `hot ${p(c.hot)}`);
});

test('cue order', () => {
  const rng = mulberry32(15);
  for (let i = 0; i < 20000; i++) {
    const h = i % 3 === 0 ? hitOf('trio', 'premium') : i % 3 === 1 ? hitOf('lee', 'normal') : MISS;
    const mode = i % 2 ? 'normal' : 'jitan';
    const s = buildSpin(h, mode, rng);
    const L = at(s, 'stopL'), R = at(s, 'stopR'), M = at(s, 'stopM'), E = at(s, 'end');
    assert.ok(L < R && R < M && M < E);
    assert.equal(E, s.durationMs);
    for (let j = 1; j < s.cues.length; j++) assert.ok(s.cues[j - 1].t <= s.cues[j].t);
    if (s.reach) {
      assert.ok(at(s, 'reach') >= R);
      assert.ok(at(s, 'armsIn') >= at(s, 'reach'));
    }
    if (s.hot) {
      assert.ok(at(s, 'medalDrop') < at(s, 'medalUp'));
      assert.ok(at(s, 'medalUp') <= M - 300);
      assert.ok(at(s, 'cutin') + 1600 <= M - 300);
      assert.ok(at(s, 'hot') > at(s, 'reach'));
    }
    if (h.hit) assert.ok(at(s, 'jackpot') > M);
    else assert.equal(at(s, 'jackpot'), undefined);
  }
});

test('durations: plain miss 3800ms, fast miss 1800ms, reach 7000–20000ms（注文アニメのぶん長くなる）', () => {
  const rng = mulberry32(16);
  for (let i = 0; i < 5000; i++) {
    const s = buildSpin(MISS, 'normal', rng);
    const plain = !s.reach && s.nyanren === 0;
    if (plain) assert.equal(s.durationMs, 3800);
    else if (s.reach) assert.ok(s.durationMs >= 7000 && s.durationMs <= 20000, `${s.durationMs}`);
    const f = buildSpin(MISS, 'kakuhen', rng);
    if (!f.reach && f.nyanren === 0) assert.equal(f.durationMs, 1800);
  }
});

test('long run keeps invariants', () => {
  const r = simulate({ spins: 50000, seed: 7 });
  assert.equal(r.balls, r.expectedBalls);
  assert.equal(r.finalPhase, 'idle');
  assert.ok(r.hits > 300, `hits ${r.hits}`);
});

// ===== 演出を増やした台本 =====
import { holdColor } from '../src/scenario.js';
import { SYMBOLS } from '../src/symbols.js';

function sample(n, seed, fn) {
  const rng = mulberry32(seed);
  for (let i = 0; i < n; i++) { const h = drawHit('normal', rng); fn(h, buildSpin(h, 'normal', rng), rng); }
}
const rate = ([hit, miss]) => hit / (hit + miss);

test('reach types: misses use the four kinds, premium uses family or all-spin', () => {
  const rng = mulberry32(21);
  const kinds = new Set();
  for (let i = 0; i < 20000; i++) { const s = buildSpin(MISS, 'normal', rng); if (s.reach) kinds.add(s.reach); }
  assert.deepEqual([...kinds].sort(), ['family', 'jarashi', 'nap', 'normal']);
  for (let i = 0; i < 300; i++) assert.ok(['family', 'allspin'].includes(buildSpin(hitOf('trio', 'premium'), 'normal', rng).reach));
});

test('new notices are hot signals', () => {
  const c = { step45: [0, 0], nyan2: [0, 0], pink: [0, 0], honey: [0, 0], sp: [0, 0] };
  let premiumMiss = 0;
  sample(400000, 22, (h, s) => {
    const k = h.hit ? 0 : 1;
    if (s.step >= 4) c.step45[k]++;
    if (s.nyanren >= 2) c.nyan2[k]++;
    if (s.bubble === 'pink') c.pink[k]++;
    if (s.chara === 'honey') c.honey[k]++;
    if (s.reach === 'jarashi' || s.reach === 'nap') c.sp[k]++;
    if (s.premiumNotice && !h.hit) premiumMiss++;
  });
  assert.ok(rate(c.step45) > 0.4, `step ${rate(c.step45)}`);
  assert.ok(rate(c.nyan2) > 0.5, `nyanren ${rate(c.nyan2)}`);
  assert.ok(rate(c.pink) > 0.5, `pink bubble ${rate(c.pink)}`);
  assert.ok(rate(c.honey) > 0.3, `honey ${rate(c.honey)}`);
  assert.ok(rate(c.sp) > 0.2, `sp reach ${rate(c.sp)}`);
  assert.equal(premiumMiss, 0);
});

test('hold colors: gold always hits, red is hot, white is mostly a miss', () => {
  const rng = mulberry32(23);
  const c = { gold: [0, 0], red: [0, 0], white: [0, 0] };
  for (let i = 0; i < 400000; i++) {
    const h = drawHit('normal', rng);
    const col = holdColor(h, rng);
    if (c[col]) c[col][h.hit ? 0 : 1]++;
  }
  assert.equal(c.gold[1], 0);
  assert.ok(c.gold[0] > 0);
  assert.ok(rate(c.red) > 0.4, `red ${rate(c.red)}`);
  assert.ok(rate(c.white) < 0.01, `white ${rate(c.white)}`);
});

test('promotion: some kakuhen hits first show an even symbol and get promoted', () => {
  const rng = mulberry32(24);
  const odd = SYMBOLS.find(s => s.type === 'kakuhen');
  let promoted = 0;
  for (let i = 0; i < 3000; i++) {
    const s = buildSpin(hitOf(odd.id, 'kakuhen'), 'normal', rng);
    if (!s.promo) { assert.deepEqual(s.stops, [odd.id, odd.id, odd.id]); continue; }
    promoted++;
    const shown = SYMBOLS.find(x => x.id === s.stops[0]);
    assert.equal(shown.type, 'normal');
    assert.equal(s.stops[0], s.stops[1]);
    assert.equal(s.stops[1], s.stops[2]);
    assert.equal(s.promo.real, odd.id);
    assert.equal(s.promo.success, true);
  }
  assert.ok(promoted > 600 && promoted < 1500, `promoted ${promoted}`);
  const even = SYMBOLS.find(s => s.type === 'normal');
  for (let i = 0; i < 500; i++) {
    const s = buildSpin(hitOf(even.id, 'normal'), 'normal', rng);
    if (s.promo) assert.equal(s.promo.success, false);
    assert.deepEqual(s.stops, [even.id, even.id, even.id]);
  }
});

test('new cue order: nyanren before the first stop, develop inside the reach', () => {
  const rng = mulberry32(25);
  for (let i = 0; i < 20000; i++) {
    const h = i % 2 ? hitOf('kira', 'normal') : MISS;
    const s = buildSpin(h, 'normal', rng);
    const L = at(s, 'stopL'), M = at(s, 'stopM');
    const nyans = s.cues.filter(c => c.cue === 'nyan');
    assert.equal(nyans.length, s.nyanren);
    for (const c of nyans) assert.ok(c.t < L);
    if (s.develop) assert.ok(at(s, 'develop') > at(s, 'reach') && at(s, 'develop') < M - 1000);
    assert.ok(s.durationMs <= 20000, `long ${s.durationMs}`);
  }
});

test('外れたら、止まった図柄が見えるくらい待ってから次が回る', () => {
  const rng = mulberry32(99);
  const miss = { hit: false, symbolId: null, kind: null };
  const t = c => sp => sp.cues.find(x => x.cue === c).t;
  for (const mode of ['normal', 'jitan', 'kakuhen']) {
    for (let i = 0; i < 300; i++) {
      const sp = buildSpin(miss, mode, rng);
      const wait = t('end')(sp) - t('stopM')(sp);
      const need = sp.reach ? 1600 : mode === 'normal' ? 1000 : 700;
      assert.ok(wait >= need, `${mode} reach=${sp.reach} wait=${wait}`);
    }
  }
});

test('家族予告：外れでも3回に1回くらい出て、当たりではもっと出る。ふきだしが赤いほどアツい', () => {
  const rng = mulberry32(21);
  const n = { miss: 0, missNote: 0, hit: 0, hitNote: 0 };
  const color = {};
  for (let i = 0; i < 300000; i++) {
    const h = drawHit('normal', rng);
    const s = buildSpin(h, 'normal', rng);
    const k = h.hit ? 'hit' : 'miss';
    n[k]++;
    if (!s.famNote) continue;
    n[`${k}Note`]++;
    const c = (color[s.famNote.color] ||= [0, 0]);
    c[h.hit ? 0 : 1]++;
    assert.ok(CAST[s.famNote.who] && CAST[s.famNote.who].human, s.famNote.who);
    assert.ok(LINES[`notice_${s.famNote.color}`].some(l => l.who === s.famNote.who && l.text === s.famNote.text), s.famNote.text);
    assert.ok(s.cues.some(c => c.cue === `fam:${s.famNote.color}`));
  }
  const missRate = n.missNote / n.miss, hitRate = n.hitNote / n.hit;
  assert.ok(missRate > 0.28 && missRate < 0.38, `miss ${missRate}`);
  assert.ok(hitRate > 0.6, `hit ${hitRate}`);
  const rel = c => c[0] / (c[0] + c[1]);
  assert.deepEqual(Object.keys(color).sort(), ['blue', 'green', 'red', 'white']);
  assert.ok(rel(color.red) > 0.1 && rel(color.red) > rel(color.white) * 20, `red ${rel(color.red)} white ${rel(color.white)}`);
  assert.ok(rel(color.white) < rel(color.blue) && rel(color.blue) < rel(color.green) && rel(color.green) < rel(color.red));
});

test('注文アニメ：リーチ中だけ（発展とは別）。確定の注文は当たりのときだけ、外れでもたまに出る', () => {
  const rng = mulberry32(21);
  let missMenus = 0, hitMenus = 0, kakutei = 0;
  for (let i = 0; i < 20000; i++) {
    const miss = buildSpin({ hit: false, symbolId: null, kind: null }, 'normal', rng);
    if (miss.menu) {
      missMenus++;
      assert.ok(miss.reach && !miss.develop);
      assert.notEqual(miss.menu.tier, 'kakutei');
      assert.ok(miss.cues.some(c => c.cue === 'menu'));
    }
    const hit = buildSpin({ hit: true, symbolId: 'kira', kind: 'kakuhen' }, 'normal', rng);
    if (hit.menu) { hitMenus++; if (hit.menu.tier === 'kakutei') kakutei++; }
  }
  assert.ok(missMenus > 0 && missMenus < 20000 * 0.03, `miss ${missMenus}`);
  assert.ok(hitMenus > 20000 * 0.12, `hit ${hitMenus}`);
  assert.ok(kakutei > hitMenus * 0.25, `kakutei ${kakutei}`);
});

test('注文アニメ：大当たりより少ない回数。同じお店は続かない', () => {
  const rng = mulberry32(31);
  let menus = 0, hits = 0, last = null;
  for (let i = 0; i < 40000; i++) {
    const h = drawHit('normal', rng);
    const s = buildSpin(h, 'normal', rng, { lastShop: last });
    if (h.hit) hits++;
    if (s.menu) { menus++; assert.notEqual(s.menu.shop, last); last = s.menu.shop; }
  }
  assert.ok(menus < hits && menus > hits * 0.3, `menus ${menus} hits ${hits}`);
});
