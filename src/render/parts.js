// 仮の筐体部品（SVG）。ChatGPT の絵ができたら画像に差しかえる
export const pawPath = '<ellipse cx="12" cy="16" rx="5.5" ry="4.5"/><circle cx="5.5" cy="10" r="2.4"/><circle cx="9.5" cy="6" r="2.4"/><circle cx="14.5" cy="6" r="2.4"/><circle cx="18.5" cy="10" r="2.4"/>';

export const miniCrown = '<svg viewBox="0 0 30 20"><path d="M2 18 L4 6 L10 12 L15 2 L20 12 L26 6 L28 18 Z" fill="var(--m2)" stroke="var(--m3)" stroke-width="1.2" stroke-linejoin="round"/><circle cx="15" cy="3" r="2" fill="var(--gemA)"/><circle cx="4" cy="6" r="1.6" fill="var(--gemB)"/><circle cx="26" cy="6" r="1.6" fill="var(--gemB)"/></svg>';

const logoChars = () =>
  ['フ', 'ァ', 'ミ', 'リ', 'ー'].map((c, i) => `<span class="st" style="font-size:${i === 1 ? 17 : 23}px;--r:${[-6, 4, -3, 5, -2][i]}deg;color:${['#ff8aa6', '#ffc94d', '#7dc6ff', '#9be08a', '#c9a0ff'][i]}">${c}</span>`).join('')
  + ['物', '語'].map((c, i) => `<span class="st" style="font-size:30px;--r:${[4, -4][i]}deg;color:#ffd34d">${c}</span>`).join('');

export function crownHTML() {
  const lamps = [[60, 34], [90, 30], [120, 27], [140, 26], [220, 26], [240, 27], [270, 30], [300, 34], [6, 62], [354, 62]];
  return `<svg viewBox="0 0 360 112">
    <defs><linearGradient id="cm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--m1)"/><stop offset=".55" style="stop-color:var(--m2)"/><stop offset="1" style="stop-color:var(--m3)"/></linearGradient>
    <linearGradient id="cp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--p1)"/><stop offset="1" style="stop-color:var(--p3)"/></linearGradient></defs>
    <g class="ear l"><path d="M14 50 L38 2 Q41 -1 44 2 L88 40 Z" fill="url(#cm)" stroke="var(--m3)" stroke-width="1.5" stroke-linejoin="round"/><path d="M30 42 L40 15 L68 37 Z" fill="#ffb3c6"/></g>
    <g class="ear r"><path d="M346 50 L322 2 Q319 -1 316 2 L272 40 Z" fill="url(#cm)" stroke="var(--m3)" stroke-width="1.5" stroke-linejoin="round"/><path d="M330 42 L320 15 L292 37 Z" fill="#ffb3c6"/></g>
    <path d="M0 112 L0 68 Q0 48 16 44 Q60 32 156 30 Q168 14 180 10 Q192 14 204 30 Q300 32 344 44 Q360 48 360 68 L360 112 Z" fill="url(#cm)" stroke="var(--m3)" stroke-width="1.5"/>
    <rect x="70" y="44" width="220" height="66" rx="22" fill="var(--m3)"/>
    <rect x="73" y="47" width="214" height="60" rx="19" fill="url(#cp)"/>
    ${lamps.map(([x, y], i) => `<circle class="lamp" data-i="${i}" cx="${x}" cy="${y}" r="3.5" fill="#fff3b0" stroke="var(--m3)" stroke-width=".8"/>`).join('')}
  </svg>
  <div class="heart"><svg viewBox="0 0 40 34"><path d="M20 32 C2 20 0 8 9 3 C15 0 19 4 20 8 C21 4 25 0 31 3 C40 8 38 20 20 32 Z" fill="var(--gemA)" stroke="var(--m1)" stroke-width="2.5"/><path d="M11 9 Q13 5 17 7" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg></div>
  <div class="spk l"></div><div class="spk r"></div>
  <div class="logo">${logoChars()}</div>`;
}

export const wingSvg = `<svg viewBox="0 0 96 160"><defs><linearGradient id="wg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".6" style="stop-color:var(--m1)"/><stop offset="1" style="stop-color:var(--m2)"/></linearGradient></defs>
  ${[[4, 52], [10, 22], [28, 6], [52, 2], [74, 10]].map(([x, y]) => `<path d="M92 156 Q${x - 6} ${y + 70} ${x} ${y} Q${x + 30} ${y + 40} 92 156 Z" fill="url(#wg)" stroke="var(--m3)" stroke-width="1.4"/>`).join('')}
  <circle cx="86" cy="146" r="7" fill="var(--gemA)" stroke="var(--m1)" stroke-width="2"/></svg>`;

export const armSvg = `<svg viewBox="0 0 104 66"><rect x="0" y="17" width="66" height="32" rx="14" fill="#fff7ee" stroke="#d2a98a" stroke-width="2"/>
  <rect x="44" y="15" width="10" height="36" rx="3" fill="var(--m2)" stroke="var(--m3)" stroke-width="1.2"/><circle cx="49" cy="33" r="3" fill="var(--gemA)"/>
  <ellipse cx="78" cy="33" rx="24" ry="28" fill="#fff7ee" stroke="#d2a98a" stroke-width="2"/>
  <ellipse cx="76" cy="35" rx="8" ry="10" fill="#ffa8bd"/><circle cx="90" cy="16" r="4.5" fill="#ffa8bd"/><circle cx="96" cy="28" r="4.5" fill="#ffa8bd"/><circle cx="96" cy="41" r="4.5" fill="#ffa8bd"/><circle cx="90" cy="52" r="4.5" fill="#ffa8bd"/></svg>`;

export const jarashiSvg = `<svg viewBox="0 0 40 66"><path d="M20 66 Q18 40 20 26" stroke="#8a5a14" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  ${Array.from({ length: 14 }, (_, i) => `<path d="M20 28 Q${20 + Math.cos(i / 14 * 6.28) * 10} ${18 + Math.sin(i / 14 * 6.28) * 6} ${20 + Math.cos(i / 14 * 6.28) * 17} ${16 + Math.sin(i / 14 * 6.28) * 13}" stroke="${i % 2 ? '#ff9fb6' : '#fff'}" stroke-width="3" fill="none" stroke-linecap="round"/>`).join('')}
  <circle cx="20" cy="18" r="5" fill="#ffd34d" stroke="#fff" stroke-width="1.5"/></svg>`;

export const windmillSvg = `<svg viewBox="0 0 30 30">${[0, 60, 120, 180, 240, 300].map(a => `<path d="M15 15 L15 3 Q20 6 15 15" fill="${a % 120 ? '#ff9fb6' : '#ffd34d'}" stroke="#fff" stroke-width=".8" transform="rotate(${a} 15 15)"/>`).join('')}<circle cx="15" cy="15" r="3" fill="#fff" stroke="#c99a3c"/></svg>`;

export const gems = (n, step, start, prop) => Array.from({ length: n }, (_, i) => `<i class="gem ${i % 2 ? 'b' : 'a'}" style="${prop}:${start + i * step}px"></i>`).join('');
