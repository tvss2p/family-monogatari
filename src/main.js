import { CONFIG } from './config.js';
import { LAYOUT } from './board-layout.js';
import { createMachine } from './machine.js';
import { createPhysics } from './physics.js';
import { buildSpin } from './scenario.js';
import { drawBoard } from './render/board.js';
import { createLcd } from './render/lcd.js';
import { createGimmicks } from './render/gimmicks.js';
import { gems } from './render/parts.js';
import { bindInput, powerToDeg } from './input.js';
import { createAudio, vibrate } from './audio.js';
import { save, load, clear } from './storage.js';
import { createTapGuard } from './render/gimmicks.js';
import { createCueRunner } from './cues.js';

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
  const s = Math.min(box.width / 360, box.height / 800);
  cab.style.setProperty('--s', s);
  drawScale = Math.max(1, Math.min(3, s * (window.devicePixelRatio || 1)));
  canvas.width = Math.round(LAYOUT.w * drawScale);
  canvas.height = Math.round(LAYOUT.h * drawScale);
}
window.addEventListener('resize', fit);
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
let power = saved && Number.isFinite(saved.power) ? saved.power : 0.45;
let firing = false;
let fireAcc = 0;
const runner = createCueRunner();
let force = params.get('force');

function setPower(p) {
  power = p;
  $('#handleArc').style.setProperty('--pw', `${powerToDeg(p)}deg`);
}
setPower(power);

bindInput({
  handleEl: $('#handle'), pushEl: $('#push'), rentEl: $('#rent'), menuEl: $('#menu'),
  getPower: () => power,
  onPower: setPower,
  onFire: on => { firing = on; $('#handle').classList.toggle('on', on); },
  onPush: () => { if (gimmicks.push()) { audio.play('push'); vibrate(80); } },
  onRent: () => { machine.rent(); audio.play('payout'); },
  onMenu: () => openMenu(),
  onAnyTap: () => audio.unlock(),
});

// 設定（音・データのリセット）
const menu = $('#menuPanel');
const menuGuard = createTapGuard(500);
function renderMenu() {
  $('#mSound').textContent = audio.on ? '音：オン' : '音：オフ';
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
  if (id === 'mSound') { audio.setOn(!audio.on); renderMenu(); persist(); }
  if (id === 'mReset') { menu.classList.add('confirm'); menuGuard.arm(performance.now()); }
  if (id === 'mResetNo') menu.classList.remove('confirm');
  if (id === 'mResetYes') { resetting = true; clear(); location.reload(); }
  if (id === 'mClose' || e.target === menu) menu.classList.remove('show');
});

// 保存：2秒ごとと、画面を離れるとき
let resetting = false;
function persist() {
  if (resetting) return;
  save({ machine: machine.toJSON(), sound: audio.on, power });
}
setInterval(persist, 2000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { persist(); runner.pause(); }
  else { runner.resume(performance.now()); audio.resume(); }
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
    playCue(cue);
    if (cue === 'end') machine.finishSpin();
  }
}

const CUE_SOUND = { stopL: 'stop', stopR: 'stop', stopM: 'stop', reach: 'reach', hot: 'hot', jackpot: 'jackpot' };
function playCue(cue) {
  if (CUE_SOUND[cue]) audio.play(CUE_SOUND[cue]);
  if (cue === 'hot') vibrate([60, 40, 60]);
  if (cue === 'jackpot') vibrate(250);
}

// 表示（変わったときだけ書きかえる）
const shown = {};
function show(key, value, fn) {
  if (shown[key] === value) return;
  shown[key] = value;
  fn(value);
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
  show('atk', machine.isAttackerOpen(), v => $('#atk').classList.toggle('open', v));
  show('round', s.phase === 'jackpot' ? `${s.round}/${s.roundsTotal}` : '', v => { if (v) { lcd.setRound(s.round, s.roundsTotal); if (s.round > 1) audio.play('round'); } });
  show('phase', s.phase, v => { if (v === 'idle' && !runner.active) gimmicks.reset(); });
}

let last = performance.now();
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
  drawBoard(ctx, LAYOUT, physics.balls, drawScale, opts);
  updateHud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 確かめ用の自動プレイ（?bot=1）：ハンドルを押しっぱなし、玉がなくなったら玉貸、激アツでPUSH
const stats = { frames: 0, maxFrameMs: 0, slowFrames: 0 };
if (params.get('bot')) {
  firing = true;
  setInterval(() => {
    if (machine.state.balls <= 0) machine.rent();
    if ($('#pushwrap').classList.contains('up')) gimmicks.push();
  }, 500);
}

window.__fm = { machine, physics, audio, stats, setPower, persist, fire: on => { firing = on; }, force: f => { force = f; } };

// ホーム画面アプリ・オフライン用
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
