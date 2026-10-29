import { SYMBOLS, PREMIUM_ID, symbolById } from '../symbols.js';
import { pawPath } from './parts.js';
import { PARTS, FOODS, FLOWERS } from '../parts.js';
import { CAST, EPISODES, FILLER, MENUS, ORDER_LINES, BOARD_IMAGES, SCENE_MS, pickLine } from '../story.js';
import { ORDER_MS } from '../scenario.js';

// 顔イラストに体をつける（人は服・腕・足、猫はそのまま）
// 体の部品の絵（tools/prepare-parts.mjs）がある人は、絵の胴体・腕・足を組み立てる（腕と足は今までどおり回して動かす）
export function figureHTML(who) {
  const c = CAST[who];
  if (!c.human) return `<div class="fig cat"><img class="head" src="${c.img}" alt=""></div>`;
  if (PARTS.includes(who)) {
    const p = n => `assets/img/parts/${who}-${n}.webp`;
    return `<div class="fig person art p-${who}">`
      + `<img class="leg l" src="${p('legR')}" alt=""><img class="leg r" src="${p('legL')}" alt="">`
      + `<img class="body" src="${p('torso')}" alt="">`
      + `<img class="arm l" src="${p('armR')}" alt=""><img class="arm r" src="${p('armL')}" alt="">`
      + `<img class="head" src="${c.img}" alt=""></div>`;
  }
  return `<div class="fig person${c.floral ? ' floral' : ''}" style="--shirt:${c.shirt};--pants:${c.pants}">`
    + '<i class="leg l"></i><i class="leg r"></i><i class="arm l"></i><i class="arm r"></i><i class="body"></i>'
    + `<img class="head" src="${c.img}" alt=""></div>`;
}
const WALK_PX_PER_MS = 0.075;

const ring = s => (s.type === 'premium' ? 'p' : s.type === 'kakuhen' ? 'k' : 'n');
const st = (chars, size, colors, rots) =>
  chars.map((c, i) => `<span class="st" style="font-size:${size}px;color:${colors[i % colors.length]};--r:${rots[i % rots.length]}deg">${c}</span>`).join('');

function symHTML(id, small) {
  const s = symbolById(id);
  return `<div class="sym ${ring(s)}${small ? ' small' : ''}"><img class="${s.id === PREMIUM_ID ? 'wide' : ''}" src="${s.img}" alt=""><span class="num">${s.no ?? '★'}</span></div>`;
}

// 注文アニメで運ばれてくるもの（お店ごとの出し方。tier で中身が豪華になる）
export function foodHTML(shop, tier) {
  // 料理の絵（tools/prepare-parts.mjs）があれば絵を出す
  if (FOODS.includes(`${shop}-${tier}`)) return `<img class="foodPic" src="assets/img/parts/food-${shop}-${tier}.webp" alt="">`;
  const k = tier === 'kakutei', c = tier !== 'normal';
  if (shop === 'burger') {
    const burger = `<div class="burger"><i class="bt"></i><i class="lt"></i>${c ? '<i class="cz"></i>' : ''}<i class="pt"></i>${k ? '<i class="cz"></i><i class="pt"></i>' : ''}<i class="bb"></i></div>`;
    return `<div class="tray">${burger}<div class="fries"><i></i></div><div class="cup"><i></i></div></div>`;
  }
  if (shop === 'donkey') {
    return `<div class="wood"><i class="rice"></i><i class="salad"></i><i class="hb"></i>${c ? '<i class="hbcz"></i>' : ''}${k ? '<i class="potesara"></i>' : ''}</div>`;
  }
  if (shop === 'icecream') {
    const n = k ? 3 : c ? 2 : 1;
    return `<div class="cone">${['s1', 's2', 's3'].slice(0, n).reverse().map(x => `<i class="${x}"></i>`).join('')}<i class="cn"></i></div>`;
  }
  // ケンタッキー：ポテト → チキン → バーレル
  if (k) return '<div class="barrel"><i class="ck a"></i><i class="ck b"></i><i class="ck c"></i><i class="ck d"></i><i class="bk"></i></div>';
  return `<div class="kbox">${c ? '<i class="ck a"></i><i class="ck b"></i>' : '<i class="fr"></i>'}<i class="bx"></i></div>`;
}

// ムービーの背景の絵：話の絵（tools/prepare-boards.mjs）。家族と猫の場面は、近い絵を使う
const FILLER_PIC = { home: 'catnap', park: 'catrun', night: 'catnight' };
function scenePic(bg, epId) {
  return BOARD_IMAGES[epId] || BOARD_IMAGES[bg] || BOARD_IMAGES[FILLER_PIC[bg]] || null;
}
// 場面ごとにずっと舞っているもの
const SCENE_FX = {
  sushi: 'petals', flower: 'petals', home: 'petals', museum: 'sparkle', karaoke: 'sparkle', hyakkin: 'sparkle', village: 'sparkle',
  icecream: 'sparkle', party: 'sparkle', hamburg: 'steam', chicken: 'steam', burger: 'steam', park: 'butterfly', drive: 'streak',
  market: 'bokeh', night: 'firefly',
};
// 舞うもの・咲くもの（i の位置と時間は番号から決める。毎回同じ見え方）
const FX_COUNT = { petals: 14, sparkle: 12, steam: 5, butterfly: 4, streak: 8, bokeh: 9, firefly: 12, confetti: 26, fireworks: 5, bloom: 7 };
const FX_COLORS = ['#ff8aa6', '#ffd34d', '#7dc6ff', '#9be08a', '#c79bff', '#ffffff', '#ff9f6a'];
export function fxHTML(kind) {
  if (!kind) return '';
  const n = FX_COUNT[kind];
  const items = Array.from({ length: n }, (_, i) => {
    const x = Math.round(((i * 53) % 97) / 97 * 100), y = Math.round(((i * 31) % 89) / 89 * 100);
    const dl = -((i * 0.73) % 6).toFixed(2), du = (4 + (i % 5) * 0.9).toFixed(2), c = FX_COLORS[i % FX_COLORS.length];
    if (kind === 'bloom' && FLOWERS.length) {
      // 花の絵：下から茎ごとのびて、花がひらく
      const left = 4 + i * (92 / (n - 1)), h = 54 + ((i * 13) % 4) * 9;
      return `<b class="flPic" style="left:${left}%;--h:${h}px;--dl:${(i % 2 ? 0.45 : 0) + i * 0.16}s"><img src="assets/img/parts/flower-${FLOWERS[i % FLOWERS.length]}.webp" alt=""><i class="spk"></i></b>`;
    }
    if (kind === 'bloom') {
      const left = 6 + i * (88 / (n - 1)), h = 26 + ((i * 13) % 4) * 7;
      return `<b class="fl" style="left:${left}%;--h:${h}px;--c:${['#ff8aa6', '#ffd34d', '#ff9f6a', '#c79bff', '#ff6a8a', '#7dc6ff', '#ffb3c7'][i]};--dl:${(i % 2 ? 0.5 : 0) + i * 0.18}s"><i class="stem"></i><i class="lf"></i><i class="hd"><i></i><i></i><i></i><i></i><i></i><i class="ct"></i></i><i class="spk"></i></b>`;
    }
    if (kind === 'fireworks') return `<i style="left:${12 + (i * 37) % 76}%;top:${8 + (i * 23) % 40}%;--c:${c};--dl:${(i * 0.55).toFixed(2)}s"></i>`;
    if (kind === 'confetti') return `<i style="left:${x}%;--c:${c};--dl:${(i * 0.09).toFixed(2)}s;--du:${(2.4 + (i % 4) * 0.4).toFixed(2)}s;--r:${(i * 47) % 360}deg"></i>`;
    return `<i style="left:${x}%;top:${y}%;--c:${c};--dl:${dl}s;--du:${du}s"></i>`;
  }).join('');
  return `<div class="fx fx-${kind}">${items}</div>`;
}

// 液晶：リール・予告・リーチ・大当たりムービー
export function createLcd(root) {
  root.innerHTML = `<div class="rays"></div>
    <div class="bn reach">${st(['リ', 'ー', 'チ', '！'], 28, ['#ffe14d', '#ffe14d', '#ffe14d', '#fff'], [-4, 3, -2, 6])}</div>
    <div class="bn hot">${st(['ボ', 'タ', 'ン', 'を', '押', 'せ', '！'], 22, ['#fff', '#fff', '#fff', '#fff', '#ffe14d', '#ffe14d', '#ffe14d'], [-4, 3, -2, 4, -3, 5, 6])}</div>
    <div class="reels"><div class="reel"></div><div class="reel"></div><div class="reel"></div></div>
    <div class="famcast"><img src="assets/img/sym-daisuke.png" alt=""><img src="assets/img/sym-hiroko.png" alt=""><img src="assets/img/sym-nanae.png" alt=""><img src="assets/img/sym-oe.png" alt=""></div>
    <div class="paws">${[[20, 30], [150, 20], [60, 110], [180, 120], [110, 60]].map(([x, y], i) => `<i style="left:${x}px;top:${y}px;animation-delay:${i * 0.12}s"><svg viewBox="0 0 24 24" fill="#ff8fae">${pawPath}</svg></i>`).join('')}</div>
    <img class="honeyRun" src="assets/img/sym-honey.png" alt="">
    <div class="parade">${['jill', 'lee', 'berry', 'nafan', 'kira', 'glen', 'honey', 'lucky'].map(n => `<img src="assets/img/sym-${n}.png" alt="">`).join('')}</div>
    <div class="worldDeco"><i class="lantern"></i><i class="lantern"></i><i class="lantern"></i><i class="lantern"></i><i class="fw a"></i><i class="fw b"></i><i class="fw c"></i><i class="cloud a"></i><i class="cloud b"></i></div>
    <div class="nyan">${st(['に', 'ゃ', 'ん', '連'], 24, ['#fff', '#ffe14d', '#fff', '#ff8aa6'], [-4, 3, -2, 5])}<b class="nyanN"></b></div>
    <div class="stepup"><i class="stamp"><svg viewBox="0 0 24 24">${pawPath}</svg></i><b class="stepN"></b></div>
    <div class="chara"><img alt=""><span class="say"></span></div>
    <div class="famNote"><img alt=""><span></span></div>
    <div class="bubbles">${Array.from({ length: 14 }, (_, i) => `<i style="left:${8 + (i * 37) % 210}px;width:${10 + (i % 4) * 6}px;height:${10 + (i % 4) * 6}px;animation-delay:${(i % 7) * 0.12}s"></i>`).join('')}</div>
    <div class="premiumNote"><img alt=""><b></b></div>
    <div class="develop">${st(['リ', 'ー', 'チ', '!', '!'], 38, ['#fff', '#fff', '#fff', '#ffe14d', '#ffe14d'], [-6, 4, -3, 6, 10])}</div>
    <div class="rtDeco"><img class="toy" src="assets/img/part-jarashi.webp" alt=""><img class="napper" src="assets/img/sym-honey.png" alt=""><span class="zzz">Z z z</span><b class="allspinTxt">全回転</b></div>
    <div class="order"><div class="bgArt"><i></i><i></i><i></i><i></i><i></i></div><div class="ofam"></div><i class="otable"></i><i class="oglow"></i><div class="food"></div><div class="ostaff">おまたせしました〜♪</div><div class="oname"></div><div class="oshop"></div></div>
    <div class="talk"><img alt=""><span></span></div>
    <div class="modeCut"></div>
    <div class="chain"></div>
    <div class="movie"></div>
    <div class="shine"></div>`;
  const reels = [...root.querySelectorAll('.reel')];
  const movie = root.querySelector('.movie');
  const state = reels.map((_, i) => ({ spin: false, id: SYMBOLS[[0, 4, 7][i]].id }));
  let lastTick = 0;
  let nyanCount = 0;
  let sceneTimer = null;
  let timers = [];
  let sceneTimers = [];
  let talkTimer = null;
  let onEvent = () => {};
  // 次に流すおでかけの話を決める（main.js が、まだ見ていない話から選ぶ）
  let pickEpisode = () => EPISODES[Math.floor(Math.random() * EPISODES.length)];
  const rnd = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].id;
  const idx = id => SYMBOLS.findIndex(s => s.id === id);
  const around = (id, d) => SYMBOLS[(idx(id) + d + SYMBOLS.length) % SYMBOLS.length].id;

  // リールの部品は一度だけ作り、まわすときは絵と番号だけを入れかえる
  reels.forEach(r => { r.innerHTML = symHTML(SYMBOLS[0].id, true) + symHTML(SYMBOLS[0].id, false) + symHTML(SYMBOLS[0].id, true); });
  function setSym(el, id, small) {
    const s = symbolById(id);
    const cls = `sym ${ring(s)}${small ? ' small' : ''}`;
    if (el.className !== cls) el.className = cls;
    const img = el.firstChild;
    if (img.getAttribute('src') !== s.img) { img.setAttribute('src', s.img); img.className = s.id === PREMIUM_ID ? 'wide' : ''; }
    el.lastChild.textContent = s.no ?? '★';
  }
  function drawReel(i) {
    const s = state[i];
    const id = s.spin ? rnd() : s.id;
    reels[i].classList.toggle('spinning', s.spin);
    const [top, mid, bot] = reels[i].children;
    setSym(top, s.spin ? rnd() : around(id, -1), true);
    setSym(mid, id, false);
    setSym(bot, s.spin ? rnd() : around(id, 1), true);
  }
  function stop(i, id) {
    state[i] = { spin: false, id };
    drawReel(i);
    reels[i].classList.remove('stopped');
    void reels[i].offsetWidth;
    reels[i].classList.add('stopped');
  }
  function replay(sel) {
    const el = root.querySelector(sel);
    el.classList.remove('go');
    void el.offsetWidth;
    el.classList.add('go');
  }
  state.forEach((_, i) => drawReel(i));

  // ムービーの 1 場面：人と猫が歩いてきて、ばあちゃんに話しかける
  // epId：いま流している話（その話の絵を背景にする）、k：話の中で何場面目か（カメラの動きを変える）
  function playScene(stage, sc, epId, k = 0) {
    sceneTimers.forEach(clearTimeout);
    sceneTimers = [];
    const later = (ms, fn) => sceneTimers.push(setTimeout(fn, ms));
    const pic = scenePic(sc.bg, epId);
    stage.className = `stage bg-${sc.bg}${pic ? ' hasPic' : ''}`;
    stage.innerHTML = (pic ? `<div class="pic cam${k % 4}" style="background-image:url(assets/img/${pic})"></div>` : '')
      + '<div class="bgArt"><i></i><i></i><i></i><i></i><i></i></div><i class="light"></i>'
      + fxHTML(SCENE_FX[sc.bg])
      + (sc.fx ? `<div class="fxOne"></div>` : '')
      + sc.actors.map(a => `<div class="actor${a.star ? ' star' : ''}${CAST[a.who].human ? '' : ' isCat'}" style="left:${a.from}px">${figureHTML(a.who)}</div>`).join('')
      + `<div class="speech"></div><div class="cap"><span>${sc.cap}</span></div><i class="wipe"></i>`;
    // 場面だけの演出（花が咲く・紙吹雪・花火）
    if (sc.fx) later(sc.fxAt || 0, () => { stage.querySelector('.fxOne').innerHTML = fxHTML(sc.fx); });
    const els = [...stage.querySelectorAll('.actor')];
    sc.actors.forEach((a, i) => {
      const el = els[i];
      const delay = a.delay || 0;
      const dist = Math.abs(a.to - a.from);
      if (!dist) { el.classList.add('idle'); return; }
      const ms = a.walk ? SCENE_MS - delay : Math.round(dist / WALK_PX_PER_MS);
      el.classList.toggle('flip', a.to < a.from);
      later(delay, () => {
        void el.offsetWidth; // 置いた位置をいったん確定させないと、歩かずに飛んでしまう
        el.classList.add('walking');
        el.style.transition = `left ${ms}ms linear`;
        el.style.left = `${a.to}px`;
      });
      if (!a.walk) later(delay + ms, () => { el.classList.remove('walking'); el.classList.add('idle'); });
    });
    const speech = stage.querySelector('.speech');
    sc.lines.forEach(l => later(l.at, () => {
      const el = els[sc.actors.findIndex(a => a.who === l.who)];
      if (!el) return;
      els.forEach(e => e.classList.toggle('talking', e === el));
      const w = Math.min(150, [...l.text].length * 11 + 18);
      const cx = el.offsetLeft + el.offsetWidth / 2;
      const left = Math.max(3, Math.min(stage.offsetWidth - w - 3, cx - w / 2));
      speech.textContent = l.text;
      speech.style.width = `${w}px`;
      speech.style.left = `${left}px`;
      speech.style.bottom = `${el.offsetHeight + 12}px`;
      speech.style.setProperty('--tail', `${Math.max(10, Math.min(w - 10, cx - left))}px`);
      speech.classList.remove('show');
      void speech.offsetWidth;
      speech.classList.add('show');
      later(l.at + 1900, () => el.classList.remove('talking'));
    }));
  }

  let current = null;
  return {
    // ふだんのひとこと（顔とふきだし）。top:true で上に出す
    say(line, top = false) {
      if (!line) return;
      const el = root.querySelector('.talk');
      el.querySelector('img').src = CAST[line.who].img;
      el.querySelector('span').textContent = line.text;
      el.className = `talk${top ? ' top' : ''}`;
      void el.offsetWidth;
      el.classList.add('show');
      clearTimeout(talkTimer);
      talkTimer = setTimeout(() => el.classList.remove('show'), 2400);
    },
    onCue(cue, spin) {
      const [kind, arg] = cue.split(':');
      if (cue === 'start') {
        current = spin; nyanCount = 0;
        state.forEach(s => { s.spin = true; });
        movie.innerHTML = '';
        root.className = root.className.replace(/\brt-\w+|\bsp\b/g, '').trim();
      }
      // にゃん連：いったん止まって、また回る
      else if (cue === 'nyan') {
        nyanCount++;
        state.forEach((s, i) => { s.spin = false; s.id = rnd(); drawReel(i); });
        setTimeout(() => state.forEach(s => { s.spin = true; }), 650);
        root.querySelector('.nyanN').textContent = `×${nyanCount + 1}`;
        replay('.nyan');
      }
      else if (kind === 'step') {
        const el = root.querySelector('.stepup');
        el.className = `stepup lv${arg}`;
        root.querySelector('.stepN').textContent = `STEP ${arg}`;
        replay('.stepup');
      }
      else if (kind === 'chara') {
        const el = root.querySelector('.chara');
        el.querySelector('img').src = symbolById(arg).img;
        el.querySelector('.say').textContent = arg === 'honey' ? 'にゃ!!' : 'にゃ？';
        el.classList.toggle('hot', arg === 'honey');
        replay('.chara');
      }
      // 家族予告：右下から顔を出してひとこと（ふきだしの色でアツさがわかる）
      else if (kind === 'fam' && spin && spin.famNote) {
        const el = root.querySelector('.famNote');
        el.querySelector('img').src = CAST[spin.famNote.who].img;
        el.querySelector('span').textContent = spin.famNote.text;
        el.className = `famNote ${arg}`;
        replay('.famNote');
      }
      else if (kind === 'bubble') {
        root.querySelector('.bubbles').classList.toggle('pink', arg === 'pink');
        replay('.bubbles');
      }
      else if (kind === 'premium') {
        const el = root.querySelector('.premiumNote');
        el.querySelector('img').src = symbolById(arg === 'wave' ? PREMIUM_ID : 'honey').img;
        el.querySelector('b').textContent = arg === 'wave' ? 'みんなで手をふってる…？' : 'ふぁ〜あ…';
        el.className = `premiumNote ${arg}`;
        replay('.premiumNote');
      }
      // 注文アニメ：家族がお店で待っていると、注文が運ばれてくる（豪華なほどアツい）
      else if (cue === 'menu' && spin && spin.menu) this.order(spin.menu);
      else if (cue === 'develop') { root.classList.add('sp'); replay('.develop'); }
      else if (kind === 'rt') root.classList.add(`rt-${arg}`);
      else if (cue === 'stopL') stop(0, spin.stops[0]);
      else if (cue === 'stopR') stop(2, spin.stops[2]);
      else if (cue === 'stopM') stop(1, spin.stops[1]);
      else if (cue === 'notice:paw') replay('.paws');
      else if (cue === 'notice:honey') replay('.honeyRun');
      else if (cue === 'notice:parade') replay('.parade');
      else if (cue === 'jackpot') this.showJackpot(spin.stops[1], spin);
    },
    order({ shop, tier }) {
      const m = MENUS[shop];
      const el = root.querySelector('.order');
      el.className = `order bg-${m.bg} ${shop} ${tier}`;
      const opic = BOARD_IMAGES[m.bg] || BOARD_IMAGES[shop];
      el.style.backgroundImage = opic ? `url(assets/img/${opic})` : '';
      el.classList.toggle('hasPic', !!opic);
      el.querySelector('.ofam').innerHTML = [['nanae', 22], ['hiroko', 92], ['daisuke', 162]]
        .map(([who, x]) => `<div class="actor idle" style="left:${x}px">${figureHTML(who)}</div>`).join('');
      el.querySelector('.food').innerHTML = foodHTML(shop, tier);
      el.querySelector('.oname').textContent = m[tier];
      el.querySelector('.oshop').textContent = m.shop;
      void el.offsetWidth;
      el.classList.add('show');
      const pick = list => list[Math.floor(Math.random() * list.length)];
      this.say(pick(ORDER_LINES.wait), true);
      setTimeout(() => el.classList.add('come'), 1000);
      setTimeout(() => this.say(pick(ORDER_LINES[shop][tier]), true), 1900);
      setTimeout(() => el.classList.remove('show', 'come'), ORDER_MS - 250);
    },
    showJackpot(id, spin) {
      const s = symbolById(id);
      clearTimeout(sceneTimer);
      timers.forEach(clearTimeout);
      sceneTimers.forEach(clearTimeout);
      // リーチの飾りは片づけてからムービーへ
      root.className = root.className.replace(/\brt-\w+|\bsp\b/g, '').replace(/\s+/g, ' ').trim();
      const conf = Array.from({ length: 24 }, (_, i) => `<i class="conf" style="left:${(i * 37) % 230}px;top:${(i * 53) % 180}px;background:${['#ff8aa6', '#ffc94d', '#7dc6ff', '#9be08a', '#fff'][i % 5]};animation-delay:${-(i * 0.13) % 1.6}s"></i>`).join('');
      const head = id === PREMIUM_ID
        ? `<div class="stars"><span>★</span><span>★</span><span>★</span></div><img class="trio" src="${s.img}" alt="">`
        : `<div class="big ${ring(s)}"><img src="${s.img}" alt=""></div>`;
      const title = id === PREMIUM_ID
        ? st(['家', '族', '揃', 'っ', 'て'], 17, ['#ff8aa6', '#ffc94d', '#7dc6ff', '#9be08a', '#ff8aa6'], [-5, 4, -3, 5, -4]) + '<br>'
        : st([s.type === 'kakuhen' ? '確変' : '通常'], 15, ['#fff'], [0]) + '<br>';
      const marchers = [...SYMBOLS.filter(x => x.id !== PREMIUM_ID), ...SYMBOLS.filter(x => x.id !== PREMIUM_ID)]
        .map((x, i) => `<img src="${x.img}" alt="" style="animation-delay:${-(i * 0.17).toFixed(2)}s">`).join('');
      const hearts = id === PREMIUM_ID ? Array.from({ length: 10 }, (_, i) => `<i class="heartUp" style="left:${8 + i * 23}px;animation-delay:${-(i * 0.37) % 2.6}s">♥</i>`).join('') : '';
      movie.innerHTML = `${conf}${hearts}<div class="bob">${head}</div><div class="ttl">${title}${st(['大', '当', 'た', 'り', '！'], 28, ['#ffe14d'], [-4, 3, -2, 4, 6])}</div><div class="march"><div class="track">${marchers}</div></div><div class="round"></div><div class="roundCut"></div>`
        + `<div class="jpTop"><b class="jpR">ROUND 1</b><span class="pips">${'<i></i>'.repeat(10)}</span></div>`
        + `<div class="jpGain">獲得 <b>0</b>玉</div><div class="dancer"></div>`
        + `<div class="guide"><div>${st(['ア', 'タ', 'ッ', 'カ', 'ー', 'O', 'P', 'E', 'N', '！'], 20, ['#ffe14d'], [-3, 3, -2, 2, 0, 0, 0, 0, 0, 6])}</div><p>そのまま打ちっぱなしでOK！<br>「固定」にしておくとらくちん</p></div>`;
      movie.insertAdjacentHTML('afterbegin', '<div class="stage"></div>');
      movie.insertAdjacentHTML('beforeend', '<div class="promo"></div><div class="epTitle"></div>');
      movie.classList.remove('guiding', 'playing');
      root.classList.remove('movieOn');
      void movie.offsetWidth;
      movie.classList.add('guiding');
      const promo = spin && spin.promo;
      const t = [];
      const at = (ms, fn) => t.push(setTimeout(fn, ms));
      // 確変昇格チャンス（偶数で当たったとき）
      if (promo) {
        const box = movie.querySelector('.promo');
        at(4200, () => { box.innerHTML = `<div>${st(['昇', '格', 'チ', 'ャ', 'ン', 'ス', '!'], 24, ['#ffe14d', '#ffe14d', '#fff', '#fff', '#fff', '#fff', '#ff8aa6'], [-4, 3, -2, 4, -3, 5, 8])}</div>`; box.className = 'promo show'; onEvent('promoChance'); });
        at(6400, () => {
          if (promo.success) {
            const real = symbolById(promo.real);
            const big = movie.querySelector('.big');
            if (big) { big.className = `big ${ring(real)}`; big.innerHTML = `<img src="${real.img}" alt="">`; }
            const ttl = movie.querySelector('.ttl');
            if (ttl) ttl.firstElementChild.outerHTML = st(['確変'], 15, ['#fff'], [0]);
            box.innerHTML = `<div>${st(['確', '変', '昇', '格', '!', '!'], 30, ['#ffe14d', '#ffe14d', '#ff8aa6', '#ff8aa6', '#fff', '#fff'], [-5, 4, -3, 5, 8, 12])}</div>`;
            box.className = 'promo show win';
            onEvent('promoWin');
          } else {
            box.innerHTML = '<p>通常大当たり<br>このあと時短100回</p>';
            box.className = 'promo show lose';
            onEvent('promoLose');
          }
        });
        at(8400, () => { box.className = 'promo'; });
      }
      // 案内のあと、家族のひとこと。そのあとは家族と猫・おでかけのムービーが流れる（7 秒ごとに場面が変わる）
      at(3500, () => this.say(pickLine(id === PREMIUM_ID ? 'family' : 'jackpot', Math.random)));
      const stage = movie.querySelector('.stage');
      // 大当たりのたびに、おでかけの話を 1 話（spin.episode は確かめ用に話を決めるとき）。話のあとは家族と猫の場面
      // 1話（4場面）が終わったら、まだ見ていない話を次々に流す（大当たりが終わるまで）
      let ep = EPISODES.find(e => e.id === (spin && spin.episode)) || pickEpisode(id);
      let k = 0;
      const next = () => {
        movie.classList.add('playing');
        root.classList.add('movieOn');
        if (k === ep.scenes.length) { ep = pickEpisode(); k = 0; }
        if (k === 0) {
          onEvent(`episode:${ep.id}`);
          const et = movie.querySelector('.epTitle');
          et.innerHTML = `<small>${ep.cats ? 'ねこたちのおはなし' : 'きょうのおでかけ'}</small>${ep.title}`;
          et.classList.remove('go');
          void et.offsetWidth;
          et.classList.add('go');
        }
        playScene(stage, ep.scenes[k], ep.id, k);
        k++;
        sceneTimer = setTimeout(next, SCENE_MS);
      };
      at(promo ? 8600 : 6000, next);
      timers = t;
    },
    endJackpot() {
      clearTimeout(sceneTimer);
      timers.forEach(clearTimeout);
      sceneTimers.forEach(clearTimeout);
      movie.classList.remove('playing', 'guiding');
      root.classList.remove('movieOn');
      root.style.removeProperty('--hue');
    },
    // 連チャン数（2 回目から）と、確変・時短に入ったときのカットイン
    setChain(n) {
      const el = root.querySelector('.chain');
      el.textContent = n >= 2 ? `${n}連チャン中` : '';
      el.classList.toggle('show', n >= 2);
    },
    showMode(mode) {
      const el = root.querySelector('.modeCut');
      el.innerHTML = mode === 'kakuhen'
        ? `<div>${st(['確', '変', '突', '入', '!', '!'], 30, ['#ffe14d', '#ffe14d', '#ff8aa6', '#ff8aa6', '#fff', '#fff'], [-5, 4, -3, 5, 8, 12])}</div><p>夜のねこ祭り　次の大当たりまで！</p>`
        : `<div>${st(['時', '短', '1', '0', '0', '回'], 26, ['#7dc6ff', '#7dc6ff', '#fff', '#fff', '#fff', '#7dc6ff'], [-4, 3, 0, 0, 0, 4])}</div><p>お昼のおさんぽ　玉がへりにくい！</p>`;
      el.className = `modeCut ${mode}`;
      void el.offsetWidth;
      el.classList.add('go');
    },
    // 大当たり中の表示：ラウンド・このラウンドの入賞数（10 個）・獲得した玉
    setJackpotStats({ round, total, count, gain }) {
      const r = movie.querySelector('.jpR');
      if (!r) return;
      r.textContent = `ROUND ${round}/${total}`;
      movie.querySelectorAll('.pips i').forEach((el, i) => el.classList.toggle('on', i < count));
      movie.querySelector('.jpGain b').textContent = gain.toLocaleString();
    },
    setRound(n, total) {
      const r = movie.querySelector('.round');
      if (r) r.textContent = `${n}R / ${total}R`;
      // ラウンドが変わるたびに「ROUND n」と、その回の主役が飛び出す
      const cut = movie.querySelector('.roundCut');
      if (!cut) return;
      const star = SYMBOLS[(n - 1) % SYMBOLS.length];
      cut.innerHTML = `<img src="${star.img}" alt="">${st(['R', 'O', 'U', 'N', 'D', ' ', String(n)], 22, ['#fff', '#ffe14d'], [-4, 3, -2, 4, 0, 0, 6])}`;
      // ラウンドごとに背景の色と、主役の猫（大きく踊る）が変わる
      root.style.setProperty('--hue', `${(n * 47) % 360}deg`);
      const dancer = movie.querySelector('.dancer');
      if (dancer && n > 1) {
        dancer.innerHTML = `<img src="${star.img}" alt="">`;
        dancer.classList.remove('go');
        void dancer.offsetWidth;
        dancer.classList.add('go');
      }
      cut.classList.remove('go');
      void cut.offsetWidth;
      cut.classList.add('go');
    },
    update(now) {
      if (now - lastTick < 80) return;
      lastTick = now;
      state.forEach((s, i) => { if (s.spin) drawReel(i); });
    },
    get spin() { return current; },
    // 確かめ用：話の k 場面目をすぐ映す（大当たりの画面にしてから使う）
    debugScene(epId, k) {
      const ep = EPISODES.find(e => e.id === epId);
      const sc = ep ? ep.scenes[k] : FILLER[k];
      clearTimeout(sceneTimer);
      timers.forEach(clearTimeout);
      movie.classList.add('playing');
      root.classList.add('movieOn');
      playScene(movie.querySelector('.stage'), sc, ep ? ep.id : null, k);
    },
    set onEvent(fn) { onEvent = fn; },
    set episodePicker(fn) { pickEpisode = fn; },
    get spinning() { return state.filter(s => s.spin).length; },
  };
}
