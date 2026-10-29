import { CONFIG } from './config.js';
import { LAYOUT } from './board-layout.js';
import { createMachine } from './machine.js';
import { createPhysics } from './physics.js';
import { buildSpin, holdColor } from './scenario.js';
import { pickLine, pickEpisode, CAST, BOARD_IMAGES } from './story.js';
import { drawBoard, resetBoardCache } from './render/board.js';
import { createLcd } from './render/lcd.js';
import { createGimmicks } from './render/gimmicks.js';
import { createTray } from './render/tray.js';
import { gems } from './render/parts.js';
import { bindInput, powerToDeg } from './input.js';
import { createAudio, vibrate, decodeAudio } from './audio.js';
import { save, load, clear } from './storage.js';
import { createTapGuard } from './render/gimmicks.js';
import { createCueRunner } from './cues.js';
import { isFiring, stepPower, powerLabel } from './lever.js';
import { createBgm, trackFor, songFor, songStart } from './bgm.js';
import { fitCabinet } from './fit.js';
import { modeDisplay } from './hud.js';
import { BGM_FILES, SONG_FILES, SE_FILES, AUDIO_DIR } from './sounds.js';
import { VOICE_SAMPLES, voiceSample, pickVoice } from './voices.js';
import { createWakeLock } from './wakelock.js';
import { reloadDecision } from './update.js';
import { connectCloud, decideSync, createUploader } from './cloud.js';
import { FIREBASE_SDK, FIREBASE_CONFIG } from './firebase-config.js';

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
  const { s, top, cut } = fitCabinet(box.width, box.height);
  cab.style.setProperty('--s', s);
  cab.style.setProperty('--top', `${top}px`);
  // 上を切ったときは、回転数などの表示を見えている一番上に下ろす
  cab.style.setProperty('--cut', `${cut}px`);
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
const tray = createTray($('.bottom'));
let trayBoxes = -1;
const JACKPOT_SFX = 0.55;
// 確変昇格チャンスの音
lcd.onEvent = e => {
  if (e === 'promoChance') audio.play('reach');
  if (e === 'promoWin') { audio.play('jackpot'); audio.play('meow', 1.2, 0.4); speak('promoWin'); }
  if (e === 'promoLose') audio.play('miss');
  // 大当たりの話に合わせて、盤面の背景を変える（絵があれば絵、なければ色と花びら）
  if (e.startsWith('episode:')) setBoardBg(e.slice(8));
};
function setBoardBg(id) {
  const el = $('#boardBg');
  el.className = `boardBg t-${id}`;
  el.querySelector('.img').style.backgroundImage = BOARD_IMAGES[id] ? `url(assets/img/${BOARD_IMAGES[id]})` : '';
}
const audio = createAudio();
audio.setOn(!saved || saved.sound !== false);
const filesIn = map => Object.fromEntries(Object.entries(map).map(([k, f]) => [k, `${AUDIO_DIR}/${f}`]));
audio.loadSamples(filesIn(SE_FILES));
audio.loadSamples(filesIn(VOICE_SAMPLES));
const speak = (event, opt, delay = 0) => { const v = pickVoice(event, opt); if (v) audio.voice(voiceSample(v), delay); };
const bgm = createBgm(audio, { files: filesIn({ ...BGM_FILES, ...SONG_FILES }), decode: decodeAudio });
let bgmOn = !saved || saved.bgm !== false;
bgm.setOn(audio.on && bgmOn);
let power = saved && Number.isFinite(saved.power) ? saved.power : 0.55;
let locked = !!(saved && saved.locked);
// 連チャン数（確変・時短のあいだに続けて当たった回数）
let chain = saved && Number.isFinite(saved.chain) ? saved.chain : 0;
// 大当たりのおでかけの話：見た話をおぼえて、まだ見ていない話から流す
let seenEp = saved && Array.isArray(saved.seenEp) ? saved.seenEp : [];
lcd.episodePicker = symbolId => {
  const r = pickEpisode(seenEp, Math.random, CAST[symbolId] && !CAST[symbolId].human ? symbolId : null);
  seenEp = r.seen;
  return r.episode;
};
lcd.setChain(chain);
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
  $('#mLogin').textContent = cloudUser ? 'ログアウト' : 'Googleでログイン';
  $('#mAccount').textContent = cloudUser
    ? `${cloudUser.displayName || cloudUser.email || ''} でログイン中\nスマホとタブレットで同じセーブになります`
    : 'ログインすると、スマホとタブレットで\n同じセーブで遊べます';
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
  if (id === 'mLogin') loginOrOut();
  if (id === 'mClose' || e.target === menu) menu.classList.remove('show');
});

// 保存：2秒ごとと、画面を離れるとき。savedAt は中身が変わったときだけ進める
// （さわっていない端末が「新しいセーブ」になって、ほかの端末の続きを上書きしないように）
let resetting = false;
let lastSig = null, lastSavedAt = (saved && saved.savedAt) || Date.now();
function currentData() {
  const d = { machine: machine.toJSON(), sound: audio.on, bgm: bgmOn, power, locked, chain, jackpotGain, seenEp };
  const sig = JSON.stringify(d);
  if (lastSig !== null && sig !== lastSig) lastSavedAt = Date.now();
  lastSig = sig;
  return { ...d, savedAt: lastSavedAt };
}
function persist() {
  if (resetting) return;
  const d = currentData();
  save(d);
  if (cloudUser && cloudSynced) uploader.queue(d);
}
setInterval(persist, 2000);
// バックグラウンドに行ったら、ゲームの時計・玉・演出・音をすべて止める。戻ったら続きから
let paused = document.hidden;
function pauseGame() {
  if (paused) return;
  paused = true;
  persist();
  uploader.flush();
  runner.pause();
  audio.suspend();
}
function resumeGame() {
  if (!paused || document.hidden) return;
  paused = false;
  last = performance.now();
  runner.resume(last);
  audio.resume();
  resetBoardCache();
  wake.lost();
  wake.visible();
}
document.addEventListener('visibilitychange', () => (document.hidden ? pauseGame() : resumeGame()));
window.addEventListener('pagehide', pauseGame);
window.addEventListener('pageshow', resumeGame);
window.addEventListener('blur', () => { if (document.hidden) pauseGame(); });

// 前の注文アニメのお店
let lastShop = null;
// 1回転を始める（?force=premium|hot|reach|mom|miss で次の1回を決められる。確かめ用。mom はおかあさんの図柄で当たり）
function startSpin(now) {
  let hold = machine.startNextSpin();
  if (!hold) return;
  let spin;
  if (force) {
    if (force === 'premium') hold = { hit: true, symbolId: 'trio', kind: 'premium' };
    if (force === 'hot' || force === 'reach') hold = { hit: true, symbolId: 'kira', kind: 'normal' };
    if (force === 'mom') hold = { hit: true, symbolId: 'nanae', kind: 'normal' };
    if (force === 'miss') hold = { hit: false, symbolId: null, kind: null };
    machine.state.current = hold;
    for (let i = 0; i < 200; i++) {
      spin = buildSpin(hold, machine.state.mode, Math.random, { lastShop });
      if (force !== 'hot' || spin.hot) break;
    }
    force = null;
  } else spin = buildSpin(hold, machine.state.mode, Math.random, { lastShop });
  if (spin.menu) lastShop = spin.menu.shop;
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
  // 新しい予告の音
  if (cue === 'nyan') { audio.play('stopBig'); audio.play('meow', 1.3, 0.15); }
  if (cue.startsWith('step:')) audio.play('paw', 0.8 + Number(cue.slice(5)) * 0.15);
  if (cue.startsWith('chara:')) audio.play('meow', cue === 'chara:honey' ? 0.8 : 1.2);
  if (cue.startsWith('bubble:')) [0, 0.1, 0.2, 0.32, 0.45].forEach((d, i) => audio.play('pin', cue === 'bubble:pink' ? 1.4 + i * 0.1 : 1 + i * 0.1, d));
  if (cue.startsWith('premium:')) audio.play('ending');
  // 家族予告：赤はアツい音とふるえ、緑はカットイン、白・青は軽い音
  if (cue.startsWith('fam:')) audio.play({ red: 'hot', green: 'cutin' }[cue.slice(4)] || 'paw');
  if (cue === 'fam:red') vibrate([40, 30, 40]);
  if (cue === 'develop') audio.play('cutin');
  // メニュー予告：バーン！ 確定はファンファーレとふるえ
  if (cue === 'menu' && sp && sp.menu) {
    audio.play('stopBig');
    if (sp.menu.tier === 'chance') audio.play('reach', null, 0.2);
    if (sp.menu.tier === 'kakutei') { audio.play('ending', null, 0.2); vibrate([80, 40, 80]); }
  }
  if (cue === 'rt:allspin') audio.play('jackpot');
  // ボイス：リーチ・激アツ・大当たり（家族そろいは専用の声）
  if (cue === 'reach' || cue === 'hot') speak(cue);
  // 次の大当たりが家族の歌なら、リーチのあいだに読んでおく
  if (cue === 'reach') bgm.prefetch(songFor(machine.state.hits + 1));
  if (cue === 'jackpot') speak('jackpot', { premium: !!(sp && sp.stops[1] === 'trio') }, 0.6);
  // 家族のひとこと（ばあちゃんに話しかける）
  if (cue === 'reach' && sp && sp.reach !== 'family') lcd.say(pickLine('reach', Math.random));
  if (cue === 'hot') lcd.say(pickLine('hot', Math.random), true);
  if (cue === 'stopM' && sp && sp.reach && !(sp.stops[0] === sp.stops[1] && sp.stops[1] === sp.stops[2])) lcd.say(pickLine('miss', Math.random));
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
  show('k', `${s.mode}/${s.jitanLeft}`, () => {
    const d = modeDisplay(s.mode, s.jitanLeft), k = $('#cK');
    $('#cKl').textContent = d.label;
    k.textContent = d.value;
    k.classList.toggle('off', !d.on);
  });
  show('balls', s.balls, v => {
    $('#cBalls').textContent = v;
  });
  show('hold', s.holds.map(h => h.color || 'white').join(','), () => {
    $('#hold').querySelectorAll('i').forEach((el, i) => { el.className = i < s.holds.length ? `on c-${s.holds[i].color || 'white'}` : ''; });
  });
  // 確変中は「夜のねこ祭り」、時短中は「お昼のおさんぽ」の画面
  show('mode', s.mode, v => {
    cab.classList.toggle('world-kakuhen', v === 'kakuhen');
    cab.classList.toggle('world-jitan', v === 'jitan');
    if (v === 'normal') { chain = 0; lcd.setChain(0); }
  });
  show('boost', machine.isHesoBoost(), v => cab.classList.toggle('boost', v));
  show('atk', machine.isAttackerOpen(), v => { $('#atk').classList.toggle('open', v); if (v) audio.play('open'); });
  show('round', s.phase === 'jackpot' ? `${s.round}/${s.roundsTotal}` : '', v => { if (v) { lcd.setRound(s.round, s.roundsTotal); if (s.round > 1) { audio.play('round'); audio.play('meow', 0.9 + (s.round % 4) * 0.12, 0.2); } } });
  if (s.phase === 'jackpot') {
    show('jp', `${s.round}/${s.roundsTotal}/${s.roundCount}/${jackpotGain}`, () =>
      lcd.setJackpotStats({ round: s.round, total: s.roundsTotal, count: s.roundCount, gain: jackpotGain }));
  }
  show('phase', s.phase, (v, prev) => {
    // prev がないのは、大当たり中に開きなおしたとき（獲得玉・連チャンは保存したものを使う）
    if (v === 'jackpot' && prev !== undefined) {
      jackpotGain = 0;
      chain = s.mode === 'normal' ? 1 : chain + 1;
      lcd.setChain(chain);
    }
    if (v === 'idle' && !runner.active) gimmicks.reset();
    if (v === 'idle' && prev === 'jackpot') {
      audio.play('ending');
      lcd.endJackpot();
      lcd.showMode(s.mode);
      speak(`mode:${s.mode}`);
      lcd.say(pickLine('end', Math.random));
      setTimeout(() => lcd.say(pickLine(s.mode, Math.random)), 2600);
      audio.play('meow', 1.2, 0.5);
    }
  });
}

let last = performance.now();
let lastTick = 0, lastPin = 0, lastHits = 0;
let jackpotGain = saved && Number.isFinite(saved.jackpotGain) ? saved.jackpotGain : 0;
// 大当たり中に開きなおしたら、大当たりの画面から続ける
if (machine.state.phase === 'jackpot' && machine.state.current) {
  const id = machine.state.current.symbolId;
  cab.className = cab.className.replace(/\bph-\w+/, 'ph-jackpot');
  lcd.setChain(chain);
  lcd.showJackpot(id, { stops: [id, id, id] });
}
// アタッカーに入った玉の上に「+15」
function popPlus(x) {
  const el = document.createElement('div');
  el.className = 'plus15';
  el.textContent = `+${CONFIG.attackerPayout}`;
  el.style.left = `${(x ?? LAYOUT.attacker.x) - 12}px`;
  el.style.top = `${LAYOUT.attacker.y - 22}px`;
  $('#board').appendChild(el);
  setTimeout(() => el.remove(), 950);
}
function frame(now) {
  if (paused) { last = now; requestAnimationFrame(frame); return; }
  const ms = now - last;
  stats.frames++;
  if (stats.frames > 30) { stats.maxFrameMs = Math.max(stats.maxFrameMs, ms); if (ms > 34) stats.slowFrames++; }
  const dt = Math.min(0.05, ms / 1000);
  last = now;
  const upd = reloadDecision({ pending: updatePending || !!cloudPending, ballsOnBoard: physics.balls.length, hidden: document.hidden, waitedMs: now - updateSince });
  if (upd.reload) (cloudPending ? reloadWithSave(cloudPending) : reloadForUpdate());
  if (firing && !upd.holdFire) {
    fireAcc += dt;
    const interval = 1 / CONFIG.fireRatePerSec;
    while (fireAcc >= interval) {
      fireAcc -= interval;
      if (machine.fireBall()) { physics.launch(power); audio.play('fire'); }
    }
  } else fireAcc = Math.min(fireAcc, 1 / CONFIG.fireRatePerSec);

  const opts = { attackerOpen: machine.isAttackerOpen(), hesoBoost: machine.isHesoBoost() };
  for (const e of physics.step(dt, opts)) {
    if (e.type === 'heso') {
      const h = machine.onHeso();
      if (h) h.color = holdColor(h, Math.random);
      audio.play('heso');
      tray.pour(CONFIG.hesoPayout);
      audio.play('jara', 3, 0.15);
    }
    else if (e.type === 'attacker' && machine.onAttacker()) {
      audio.play('payout');
      audio.play('jara', 12, 0.1);
      tray.pour(CONFIG.attackerPayout);
      jackpotGain += CONFIG.attackerPayout;
      popPlus(e.x);
    }
  }
  machine.tick(dt * 1000);
  if (!runner.active && machine.state.phase === 'idle') startSpin(now);
  runCues(now);
  lcd.update(now);
  // 上皿とドル箱（箱が満タンになったらファンファーレ）
  const boxes = tray.update(now, machine.state.balls);
  if (trayBoxes >= 0 && boxes > trayBoxes) { audio.play('open'); audio.play('meow', 1.3, 0.3); vibrate(60); }
  trayBoxes = boxes;
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
  // 何回目の大当たりか（大当たりの瞬間はまだ数が増えていないので +1）
  const jackpotNo = st.phase === 'jackpot' ? st.hits : st.hits + 1;
  const reachOn = runner.spin && runner.spin.reach ? runner.spin.stops[0] : null;
  bgm.play(trackFor({ phase: st.phase, mode: st.mode, scene, premium, jackpotNo, reachOn }), songStart(jackpotNo));
  // 大当たり中は効果音（玉のジャラジャラなど）を小さくして、曲を聞かせる
  audio.setDuck(st.phase === 'jackpot' ? JACKPOT_SFX : 1);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 確かめ用の自動プレイ（?bot=1）：ハンドルを押しっぱなし、玉がなくなったら玉貸、激アツでPUSH
const stats = { frames: 0, maxFrameMs: 0, slowFrames: 0 };
if (params.get('bot')) {
  locked = true;
  updateFiring();
  setInterval(() => {
    if (paused) return;
    if (machine.state.balls <= 0) machine.rent();
    if ($('#pushwrap').classList.contains('up')) gimmicks.push();
  }, 500);
}

window.__fm = { machine, physics, audio, bgm, lcd, stats, setPower, persist, fire: on => { holding = on; updateFiring(); }, force: f => { force = f; } };

// ホーム画面アプリ・オフライン用。新しい版が届いたら、保存してから自動で再読み込み（update.js）
let updatePending = false, updateSince = 0, reloading = false;
function reloadForUpdate() {
  if (reloading) return;
  reloading = true;
  persist();
  location.reload();
}
// ほかの端末のセーブで続けるとき：そのセーブを端末に入れてから読みこみなおす
function reloadWithSave(data) {
  if (reloading) return;
  reloading = true;
  resetting = true;
  save(data);
  location.reload();
}

// Googleログイン：スマホとタブレットでセーブを共通にする（cloud.js）
const LINK_KEY = 'family-monogatari:cloud-uid';
const getLink = () => { try { return localStorage.getItem(LINK_KEY); } catch (e) { return null; } };
const setLink = uid => { try { localStorage.setItem(LINK_KEY, uid); } catch (e) { /* なにもしない */ } };
let cloud = null, cloudUser = null, cloudSynced = false, cloudPending = null;
const uploader = createUploader({ send: d => { if (cloud && cloudUser) cloud.save(cloudUser.uid, d).catch(() => {}); } });
async function syncCloud() {
  if (!cloud || !cloudUser || cloudPending) return;
  const uid = cloudUser.uid;
  let remote;
  try { remote = await cloud.load(uid); } catch (e) { return; }
  if (!cloudUser || cloudUser.uid !== uid) return;
  const local = currentData();
  const how = decideSync({ uid, linkedUid: getLink(), local, remote });
  setLink(uid);
  if (how === 'useRemote') {
    // 盤面の玉がなくなるのを待ってから、ほかの端末のセーブで読みこみなおす
    cloudPending = remote;
    updateSince = performance.now();
    lcd.say({ who: 'nanae', text: 'おかあさん、続きから遊ぼう！' });
    return;
  }
  cloudSynced = true;
  if (how === 'upload') cloud.save(uid, local).catch(() => {});
}
async function loginOrOut() {
  if (!cloud) { $('#mAccount').textContent = 'いまはログインできません（電波を確かめてね）'; return; }
  try {
    if (cloudUser) { uploader.flush(); await cloud.signOut(); }
    else await cloud.signIn();
  } catch (e) {
    $('#mAccount').textContent = 'ログインできませんでした。もう一度ためしてね';
  }
}
connectCloud({
  sdk: FIREBASE_SDK, config: FIREBASE_CONFIG,
  standalone: navigator.standalone === true || matchMedia('(display-mode: standalone)').matches,
}).then(c => {
  cloud = c;
  if (!cloud) return;
  cloud.onUser(user => {
    cloudUser = user;
    cloudSynced = false;
    renderMenu();
    if (user) syncCloud();
  });
});
// 画面にもどったら、ほかの端末で遊んだ続きがないか確かめる
document.addEventListener('visibilitychange', () => { if (!document.hidden && cloudUser) { cloudSynced = false; syncCloud(); } });
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  const sw = navigator.serviceWorker;
  // はじめて開いたときに保存のしくみが動きだすのは、新しい版ではないので数えない
  let controlled = !!sw.controller;
  sw.addEventListener('controllerchange', () => {
    if (!controlled) { controlled = true; return; }
    if (updatePending) return;
    updatePending = true;
    updateSince = performance.now();
    lcd.say('新しい版にするね。ちょっと待ってね');
    if (document.hidden) reloadForUpdate();
  });
  // 開いたままでも、5分ごとと画面に戻ったときに新しい版を確かめる
  window.addEventListener('load', () => sw.register('./sw.js').then(reg => {
    const check = () => reg.update().catch(() => {});
    setInterval(check, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  }).catch(() => {}));
}
