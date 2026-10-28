// ハンドル・PUSH・玉貸・設定のタップ
const ARC = 300;
const START = 210;

function angleOf(el, e) {
  const r = el.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  return (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
}

export function powerToDeg(power) { return power * ARC; }

export function bindInput({ handleEl, pushEl, rentEl, menuEl, getPower, onPower, onFire, onPush, onRent, onMenu, onAnyTap }) {
  let drag = null;
  handleEl.addEventListener('pointerdown', e => {
    e.preventDefault();
    handleEl.setPointerCapture(e.pointerId);
    drag = { a0: angleOf(handleEl, e), p0: getPower() };
    onFire(true);
  });
  handleEl.addEventListener('pointermove', e => {
    if (!drag) return;
    let d = angleOf(handleEl, e) - drag.a0;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    drag.a0 += d;
    drag.p0 = Math.max(0, Math.min(1, drag.p0 + d / ARC));
    onPower(drag.p0);
  });
  const end = () => { if (drag) { drag = null; onFire(false); } };
  handleEl.addEventListener('pointerup', end);
  handleEl.addEventListener('pointercancel', end);
  handleEl.addEventListener('lostpointercapture', end);

  pushEl.addEventListener('click', () => onPush());
  rentEl.addEventListener('click', () => onRent());
  menuEl.addEventListener('click', () => onMenu());
  window.addEventListener('pointerup', () => onAnyTap && onAnyTap(), true);
  window.addEventListener('click', () => onAnyTap && onAnyTap(), true);
}
