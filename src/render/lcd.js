import { SYMBOLS, PREMIUM_ID, symbolById } from '../symbols.js';
import { pawPath } from './parts.js';

const ring = s => (s.type === 'premium' ? 'p' : s.type === 'kakuhen' ? 'k' : 'n');
const st = (chars, size, colors, rots) =>
  chars.map((c, i) => `<span class="st" style="font-size:${size}px;color:${colors[i % colors.length]};--r:${rots[i % rots.length]}deg">${c}</span>`).join('');

function symHTML(id, small) {
  const s = symbolById(id);
  return `<div class="sym ${ring(s)}${small ? ' small' : ''}"><img class="${s.id === PREMIUM_ID ? 'wide' : ''}" src="${s.img}" alt=""><span class="num">${s.no ?? '★'}</span></div>`;
}

// 液晶：リール・予告・リーチ・大当たりムービー
export function createLcd(root) {
  root.innerHTML = `<div class="rays"></div>
    <div class="bn reach">${st(['リ', 'ー', 'チ', '！'], 28, ['#ffe14d', '#ffe14d', '#ffe14d', '#fff'], [-4, 3, -2, 6])}</div>
    <div class="bn hot">${st(['ボ', 'タ', 'ン', 'を', '押', 'せ', '！'], 22, ['#fff', '#fff', '#fff', '#fff', '#ffe14d', '#ffe14d', '#ffe14d'], [-4, 3, -2, 4, -3, 5, 6])}</div>
    <div class="reels"><div class="reel"></div><div class="reel"></div><div class="reel"></div></div>
    <div class="famcast"><img src="assets/img/sym-daisuke.png" alt=""><img src="assets/img/sym-hiroko.png" alt=""><img src="assets/img/sym-nanae.png" alt=""></div>
    <div class="paws">${[[20, 30], [150, 20], [60, 110], [180, 120], [110, 60]].map(([x, y], i) => `<i style="left:${x}px;top:${y}px;animation-delay:${i * 0.12}s"><svg viewBox="0 0 24 24" fill="#ff8fae">${pawPath}</svg></i>`).join('')}</div>
    <img class="honeyRun" src="assets/img/sym-honey.png" alt="">
    <div class="parade">${['jill', 'lee', 'berry', 'nafan', 'kira', 'glen', 'honey', 'lucky'].map(n => `<img src="assets/img/sym-${n}.png" alt="">`).join('')}</div>
    <div class="movie"></div>
    <div class="shine"></div>`;
  const reels = [...root.querySelectorAll('.reel')];
  const movie = root.querySelector('.movie');
  const state = reels.map((_, i) => ({ spin: false, id: SYMBOLS[[0, 4, 7][i]].id }));
  let lastTick = 0;
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

  let current = null;
  return {
    onCue(cue, spin) {
      if (cue === 'start') { current = spin; state.forEach(s => { s.spin = true; }); movie.innerHTML = ''; }
      else if (cue === 'stopL') stop(0, spin.stops[0]);
      else if (cue === 'stopR') stop(2, spin.stops[2]);
      else if (cue === 'stopM') stop(1, spin.stops[1]);
      else if (cue === 'notice:paw') replay('.paws');
      else if (cue === 'notice:honey') replay('.honeyRun');
      else if (cue === 'notice:parade') replay('.parade');
      else if (cue === 'jackpot') this.showJackpot(spin.stops[1]);
    },
    showJackpot(id) {
      const s = symbolById(id);
      const conf = Array.from({ length: 24 }, (_, i) => `<i class="conf" style="left:${(i * 37) % 230}px;top:${(i * 53) % 180}px;background:${['#ff8aa6', '#ffc94d', '#7dc6ff', '#9be08a', '#fff'][i % 5]};animation-delay:${-(i * 0.13) % 1.6}s"></i>`).join('');
      const head = id === PREMIUM_ID
        ? `<div class="stars"><span>★</span><span>★</span><span>★</span></div><img class="trio" src="${s.img}" alt="">`
        : `<div class="big ${ring(s)}"><img src="${s.img}" alt=""></div>`;
      const title = id === PREMIUM_ID
        ? st(['家', '族', '揃', 'っ', 'て'], 17, ['#ff8aa6', '#ffc94d', '#7dc6ff', '#9be08a', '#ff8aa6'], [-5, 4, -3, 5, -4]) + '<br>'
        : st([s.type === 'kakuhen' ? '確変' : '通常'], 15, ['#fff'], [0]) + '<br>';
      movie.innerHTML = `${conf}${head}<div class="ttl">${title}${st(['大', '当', 'た', 'り', '！'], 28, ['#ffe14d'], [-4, 3, -2, 4, 6])}</div><div class="round"></div>`;
    },
    setRound(n, total) {
      const r = movie.querySelector('.round');
      if (r) r.textContent = `${n}R / ${total}R`;
    },
    update(now) {
      if (now - lastTick < 80) return;
      lastTick = now;
      state.forEach((s, i) => { if (s.spin) drawReel(i); });
    },
    get spin() { return current; },
  };
}
