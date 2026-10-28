import { CONFIG } from './config.js';
import { LAYOUT } from './board-layout.js';
import { createMachine } from './machine.js';
import { createPhysics } from './physics.js';
import { buildSpin } from './scenario.js';
import { drawBoard, resetBoardCache } from './render/board.js';
import { createLcd } from './render/lcd.js';
import { createGimmicks } from './render/gimmicks.js';
import { gems } from './render/parts.js';
import { bindInput, powerToDeg } from './input.js';
import { createAudio, vibrate } from './audio.js';
import { save, load, clear } from './storage.js';
import { createTapGuard } from './render/gimmicks.js';
import { createCueRunner } from './cues.js';
import { isFiring, stepPower, powerLabel } from './lever.js';
import { createBgm, trackFor } from './bgm.js';
import { createWakeLock } from './wakelock.js';

const wake = createWakeLock();

const $ = sel => document.querySelector(sel);
const cab = $('#cab');

// 飾りの宝石
document.querySelectorAll('.pil').forEach(el => el.insertAdjacentHTML('beforeend', gems(8, 50, 24, 'top')));
$('#lcdf').insertAdjacentHTML('afterbegin', [[18, -3], [119, -4], [220, -3], [-4, 96], [240, 96], [56, 200], [182, 200]]
  .map(([x, y], i) => `<i class="gem ${i % 2 ? 'b' : 'a'}" style="left:${x}px;top:${y}px"></i>`).join(''));
$('#cutinTxt').innerHTML = `<img src="assets/img/sym-nafan.png" alt="">${['激', 'ア', 'ツ', '！', '！'].map((c, i) => `<span class="st" style="font-size:46px;color:${i < 3 ? '#ffe14d' : '#fff'};--r:${[-6, 4, -3, 8, 12][i]}deg">${c}</span>`).join('')}<img src="assets/img/sym-honey.png" alt="">`;

// 画面に合わせる
const canvas = $('#boardCanvas');
const ctx = canvas.getContext('2d');
let drawScale = 1;
function fit() {
  const box = $('#fit').getBoundingClientRect();
  const s = Math.min(box.width / 352, box.height / 784);
  cab.style.setProperty('--s', s);
  cab.style.setProperty('--top', `${Math.max(0, (box.height - 800 * s) / 2)}px`);
  drawScale = Math.max(1, Math.min(3, s * (window.devicePixelRatio || 1)));
  canvas.width = Math.round(LAYOUT.w * drawScale);
  canvas.height = Math.round(LAYOUT.h * drawScale);
}
window.addEventListener('resize', fit);
// 画面の Canvas が作りなおされたとき（GPU のリセット）も描きなおす
canvas.addEventListener('contextrestored', () => resetBoardCache());
window.addEventListener('pageshow', () => resetBoardCache());
fit();

// ゲーム
const params = new URLSearchParams(location.search);
const saved = load();
const machine = createMachine({ saved: saved && saved.machine });
const physics = createPhysics(LAYOUT);
const lcd = createLcd($('#lcd'));
const gimmicks = createGimmicks(cab);
const audio = createAudio();
audio.setOn(!saved || saved.sound !== false);
const bgm = createBgm(audio);
let bgmOn = !saved || saved.bgm !== false;
bgm.setOn(audio.on && bgmOn);
let power = saved && Number.isFinite(saved.power) ? saved.power : 0.55;
let locked = !!(saved && saved.locked);
let holding = false;
let firing = false;
let fireAcc = 0;
const runner = createCueRunner();
let force = params.get('force');

let labelTimer = null;
function setPower(p, show = true) {
  power = p;
  $('#handleArc').style.setProperty('--pw', `${powerToDeg(p)}deg`);
  $('#knob').style.setProperty('--rot', `${-150 + p * 300}deg`);
  if (!show) return;
  const el = $('#powerLabel');
  el.textContent = powerLabel(p);
  el.classList.add('show');
  clearTimeout(labelTimer);
  labelTimer = setTimeout(() => el.classList.remove('show'), 1500);
}
function updateFiring() {
  firing = isFiring({ locked, holding });
  $('#handle').classList.toggle('on', firing);
  $('#handle').classList.toggle('locked', locked);
  $('#lock').classList.toggle('on', locked);
  $('#lock').textContent = locked ? '固定中' : '固定';
  wake.set(locked);
}
setPower(power, false);
updateFiring();

bindInput({
  handleEl: $('#handle'), pushEl: $('#push'), rentEl: $('#rent'), menuEl: $('#menu'),
  lockEl: $('#lock'), plusEl: $('#pPlus'), minusEl: $('#pMinus'),
  getPower: () => power,
  onPower: setPower,
  onFire: on => { holding = on; updateFiring(); if (on) audio.play('grab'); },
  onLock: () => { locked = !locked; updateFiring(); audio.play('click'); persist(); },
  onStep: dir => { setPower(stepPower(power, dir)); audio.play('click'); },
  onPush: () => { if (gimmicks.push()) { audio.play('push'); audio.play('meow', 1.2, 0.25); vibrate(80); } },
  onRent: () => { machine.rent(); audio.play('payout'); },
  onMenu: () => { audio.play('click'); openMenu(); },
  onAnyTap: () => { audio.unlock(); wake.visible(); },
});

// 設定（音・データのリセット）
const menu = $('#menuPanel');
const menuGuard = createTapGuard(500);
function renderMenu() {
  $('#mSound').textContent = audio.on ? '効果音：オン' : '効果音：オフ';
  $('#mBgm').textContent = bgmOn ? 'BGM：オン' : 'BGM：オフ';
}
function openMenu() {
  menu.classList.add('show');
  menu.classList.remove('confirm');
  menuGuard.arm(performance.now());
  renderMenu();
}
menu.addEventListener('click', e => {
  if (!menuGuard.allowed(performance.now())) return;
  const id = e.target.closest('button')?.id;
  if (id) audio.play('click');
  if (id === 'mSound') { audio.setOn(!audio.on); renderMenu(); persist(); }
  if (id === 'mBgm') { bgmOn = !bgmOn; bgm.setOn(bgmOn); renderMenu(); persist(); }
  if (id === 'mReset') { menu.classList.add('confirm'); menuGuard.arm(performance.now()); }
  if (id === 'mResetNo') menu.classList.remove('confirm');
  if (id === 'mResetYes') { resetting = true; clear(); location.reload(); }
  if (id === 'mClose' || e.target === menu) menu.classList.remove('show');
});

// 保存：2秒ごとと、画面を離れるとき
let resetting = false;
function persist() {
  if (resetting) return;
  save({ machine: machine.toJSON(), sound: audio.on, bgm: bgmOn, power, locked });
}
setInterval(persist, 2000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { persist(); runner.pause(); }
  else { runner.resume(performance.now()); audio.resume(); resetBoardCache(); wake.lost(); wake.visible(); }
});
window.addEventListener('pagehide', persist);

// 1回転を始める（?force=premium|hot|reach|miss で次の1回を決められる。確かめ用）
function startSpin(now) {
  let hold = machine.startNextSpin();
  if (!hold) return;
  let spin;
  if (force) {
    if (force === 'premium') hold = { hit: true, symbolId: 'trio', kind: 'premium' };
    if (force === 'hot' || force === 'reach') hold = { hit: true, symbolId: 'kira', kind: 'normal' };
    if (force === 'miss') hold = { hit: false, symbolId: null, kind: null };
    machine.state.current = hold;
    for (let i = 0; i < 200; i++) {
      spin = buildSpin(hold, machine.state.mode, Math.random);
      if (force !== 'hot' || spin.hot) break;
    }
    force = null;
  } else spin = buildSpin(hold, machine.state.mode, Math.random);
  runner.start(spin, now);
}

function runCues(now) {
  const spin = runner.spin;
  for (const cue of runner.due(now)) {
    lcd.onCue(cue, spin);
    gimmicks.onCue(cue, spin);
    playCue(cue, spin);
    if (cue === 'end') machine.finishSpin();
  }
}

const CUE_SOUND = { start: 'spin', stopL: 'stop', stopR: 'stop', reach: 'reach', hot: 'hot', jackpot: 'jackpot', 'notice:paw': 'paw', medalDrop: 'drop', cutin: 'cutin' };
function playCue(cue, sp) {
  if (CUE_SOUND[cue]) audio.play(CUE_SOUND[cue]);
  if (cue === 'notice:honey') audio.play('meow', 1, 0.3);
  if (cue === 'armsIn') { audio.play('punch', null, 0.3); audio.play('punch', null, 0.65); }
  if (cue === 'stopM') {
    const hit = sp && sp.stops[0] === sp.stops[1] && sp.stops[1] === sp.stops[2];
    audio.play(sp && sp.reach ? 'stopBig' : 'stop');
    // リーチが外れたら「ざんねん…」
    if (sp && sp.reach && !hit) audio.play('miss', null, 0.25);
  }
  if (cue === 'notice:parade') [1.25, 1, 1.4, 0.9, 1.15].forEach((p, i) => audio.play('meow', p, 0.25 + i * 0.32));
  if (cue === 'jackpot') { audio.play('meow', 1.1, 0.9); audio.play('meow', 0.85, 1.3); }
  if (cue === 'hot') vibrate([60, 40, 60]);
  if (cue === 'jackpot') vibrate(250);
}

// 表示（変わったときだけ書きかえる）
const shown = {};
function show(key, value, fn) {
  if (shown[key] === value) return;
  const prev = shown[key];
  shown[key] = value;
  fn(value, prev);
}
function updateHud() {
  const s = machine.state;
  show('spin', s.spins, v => { $('#cSpin').textContent = String(Math.min(v, 999)).padStart(3, '0'); });
  show('hit', s.hits, v => { $('#cHit').textContent = String(Math.min(v, 99)).padStart(2, '0'); });
  show('k', s.mode, v => { const k = $('#cK'); k.textContent = v === 'kakuhen' ? 'ON' : v === 'jitan' ? '時短' : '--'; k.classList.toggle('off', v === 'normal'); });
  show('balls', s.balls, v => {
    $('#cBalls').textContent = v;
  });
  show('hold', s.holds.map(h => (h.hit ? 2 : 1)).join(''), () => {
    $('#hold').querySelectorAll('i').forEach((el, i) => { el.className = i < s.holds.length ? 'on' : ''; });
  });
  show('boost', machine.isHesoBoost(), v => cab.classList.toggle('boost', v));
  show('atk', machine.isAttackerOpen(), v => { $('#atk').classList.toggle('open', v); if (v) audio.play('open'); });
  show('round', s.phase === 'jackpot' ? `${s.round}/${s.roundsTotal}` : '', v => { if (v) { lcd.setRound(s.round, s.roundsTotal); if (s.round > 1) { audio.play('round'); audio.play('meow', 0.9 + (s.round % 4) * 0.12, 0.2); } } });
  show('phase', s.phase, (v, prev) => {
    if (v === 'idle' && !runner.active) gimmicks.reset();
    if (v === 'idle' && prev === 'jackpot') audio.play('ending');
  });
}

let last = performance.now();
let lastTick = 0, lastPin = 0, lastHits = 0;
function frame(now) {
  const ms = now - last;
  stats.frames++;
  if (stats.frames > 30) { stats.maxFrameMs = Math.max(stats.maxFrameMs, ms); if (ms > 34) stats.slowFrames++; }
  const dt = Math.min(0.05, ms / 1000);
  last = now;
  if (firing) {
    fireAcc += dt;
    const interval = 1 / CONFIG.fireRatePerSec;
    while (fireAcc >= interval) {
      fireAcc -= interval;
      if (machine.fireBall()) { physics.launch(power); audio.play('fire'); }
    }
  } else fireAcc = Math.min(fireAcc, 1 / CONFIG.fireRatePerSec);

  const opts = { attackerOpen: machine.isAttackerOpen(), hesoBoost: machine.isHesoBoost() };
  for (const e of physics.step(dt, opts)) {
    if (e.type === 'heso') { machine.onHeso(); audio.play('heso'); }
    else if (e.type === 'attacker' && machine.onAttacker()) audio.play('payout');
  }
  machine.tick(dt * 1000);
  if (!runner.active && machine.state.phase === 'idle') startSpin(now);
  runCues(now);
  lcd.update(now);
  // リールが回っている音（カタカタ）と、玉が釘に当たる音（チン。鳴らしすぎない）
  if (lcd.spinning && now - lastTick > 85) { lastTick = now; audio.play('tick', 0.9 + lcd.spinning * 0.08); }
  if (physics.pinHits !== lastHits) {
    if (now - lastPin > 70) { lastPin = now; audio.play('pin', 0.85 + Math.random() * 0.4); }
    lastHits = physics.pinHits;
  }
  drawBoard(ctx, LAYOUT, physics.balls, drawScale, opts);
  updateHud();
  const scene = (cab.className.match(/ph-(\w+)/) || [])[1];
  const st = machine.state;
  const premium = (st.current && st.current.kind === 'premium') || (runner.spin && runner.spin.stops[1] === 'trio' && scene === 'jackpot');
  bgm.play(trackFor({ phase: st.phase, mode: st.mode, scene, premium }));
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 確かめ用の自動プレイ（?bot=1）：ハンドルを押しっぱなし、玉がなくなったら玉貸、激アツでPUSH
const stats = { frames: 0, maxFrameMs: 0, slowFrames: 0 };
if (params.get('bot')) {
  locked = true;
  updateFiring();
  setInterval(() => {
    if (machine.state.balls <= 0) machine.rent();
    if ($('#pushwrap').classList.contains('up')) gimmicks.push();
  }, 500);
}

window.__fm = { machine, physics, audio, bgm, stats, setPower, persist, fire: on => { holding = on; updateFiring(); }, force: f => { force = f; } };

// ホーム画面アプリ・オフライン用
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
