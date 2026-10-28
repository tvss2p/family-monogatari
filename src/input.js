// ハンドル・PUSH・玉貸・設定・固定・強さのタップ
import { dragPower } from './lever.js';
const ARC = 300;

export function powerToDeg(power) { return power * ARC; }

export function bindInput({ handleEl, pushEl, rentEl, menuEl, lockEl, plusEl, minusEl, getPower, onPower, onFire, onPush, onRent, onMenu, onLock, onStep, onAnyTap }) {
  let drag = null;
  handleEl.addEventListener('pointerdown', e => {
    e.preventDefault();
    handleEl.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, p0: getPower() };
    onFire(true);
  });
  handleEl.addEventListener('pointermove', e => {
    if (!drag) return;
    onPower(dragPower(drag.p0, e.clientX - drag.x, e.clientY - drag.y));
  });
  const end = () => { if (drag) { drag = null; onFire(false); } };
  handleEl.addEventListener('pointerup', end);
  handleEl.addEventListener('pointercancel', end);
  handleEl.addEventListener('lostpointercapture', end);

  pushEl.addEventListener('click', () => onPush());
  rentEl.addEventListener('click', () => onRent());
  menuEl.addEventListener('click', () => onMenu());
  lockEl.addEventListener('click', () => onLock());
  // −・＋は押しっぱなしで続けて動く
  for (const [el, dir] of [[plusEl, 1], [minusEl, -1]]) {
    let timer = null;
    const stop = () => { clearInterval(timer); timer = null; };
    el.addEventListener('pointerdown', e => { e.preventDefault(); onStep(dir); stop(); timer = setInterval(() => onStep(dir), 120); });
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
    el.addEventListener('pointerleave', stop);
  }
  window.addEventListener('pointerup', () => onAnyTap && onAnyTap(), true);
  window.addEventListener('click', () => onAnyTap && onAnyTap(), true);
}
