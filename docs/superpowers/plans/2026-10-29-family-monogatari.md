# ファミリー物語 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** スマホたて画面で遊べる、豪華な筐体と動くギミックのあるパチンコゲーム「ファミリー物語」を作り、GitHub Pages で PWA として公開する。

**Architecture:** ビルドなしの素の JavaScript（ES modules）。ゲームの決まり（抽選・台の状態・演出の台本・玉の物理）は DOM に触らない純粋なモジュールにして `node --test` で確かめる。見た目は、筐体とギミック部品を画像＋CSS（DOM）、釘と玉を Canvas、液晶を DOM で描く。

**Tech Stack:** HTML / CSS / JavaScript（ES2022 modules）、Canvas 2D、Web Audio、Service Worker。テストは Node 24 の `node:test`。画像の加工だけ開発用に `sharp`（devDependency、公開物には入れない）。

**Spec:** `docs/superpowers/specs/2026-10-29-family-monogatari-design.md`

## Global Constraints

- 画面の文言・返事はすべて日本語。台の名前は「ファミリー物語」（「だいすけ家」は入れない）。大当たりの文字は「家族揃って大当たり！」
- 図柄 12 種：1ジル 2リー 3ベリー 4なーふぁん 5ラッキー 6キラ 7グレン 8だいすけ 9ひろこ 10ななえ 11ハニー ★家族3人。奇数＝確変、偶数＝通常、★＝プレミアム
- 当たり：ふだん・時短 1/99、確変 1/10。★は大当たりの約1割。10R（★は16R＋確変）。時短100回。保留4つ
- もち玉250、玉貸1回125玉（無料・何度でも）、ヘソ3玉、アタッカー1R10玉まで・1玉15玉
- 液晶の上の役物＝なーふぁん、ヘソの飾り＝家族3人
- たて 390×844 基準で全体を拡大縮小。横向きは「たてにしてね」。切り欠き・ホームバーは safe-area の内側に寄せる（背景は全面）
- 公開先：https://tvss2p.github.io/family-monogatari/ （リポジトリ tvss2p/family-monogatari、公開）。manifest の start_url・scope と SW の範囲は `./`
- `assets/original/` の元画像はリポジトリに入れない（.gitignore）
- iPhone のホーム画面アプリ：`apple-mobile-web-app-status-bar-style` は `black`（black-translucent にしない）
- 音・振動は pointerup / click の中で始める（iPhone は pointerdown を音の許可に数えない）。AudioContext が running 以外ならいつも resume
- 新しいパネル・ボタンを出したら 0.5 秒はタップを受けない。指の下に大事なボタンを出さない
- 行の途中に `//` の注釈を書かない（注釈は別の行）。JS を直したら `node --check` を通す
- 液晶にかぶる演出：なーふぁん落下・全面カットインは「まん中の図柄がまわっている間」だけ。まん中が止まる 300ms 前までに、なーふぁんは上にもどり、カットインは抜けきる。肉球アームは液晶の外（ヘソのよこ）

## Review Focus

1. **アプリを閉じる・スリープから戻る（とくに大当たり中）**：もち玉・確変・時短・残りラウンドが保存されていて、戻ると続きから。音も鳴る → Task 2（`restores mid-jackpot`）、Task 7（`resumes audio after interrupted`）
2. **玉がなくなる**：ハンドルを押したままでも発射が止まり、保留の消化は続く。玉貸で再開できる → Task 2（`fireBall returns false at zero`）、Task 5（手で確かめる手順）
3. **背の低い画面・切り欠き**：320×568、375×667 で盤面・液晶・ハンドルが重ならず、玉の通り道が見える → Task 5（サイズ一覧の測定）
4. **長く遊ぶ**：何万回まわしても玉の数が合い、止まったままにならない → Task 3（`long run keeps invariants`）、Task 4（`no ball stays stuck`）
5. **同じタップの二重反応**：PUSH・玉貸・リセットの確認で、出した直後のタップが通らない → Task 6（`ignores taps for 500ms after show`）

---

## ファイル構成

```
index.html                 画面のひな形（meta・manifest・各レイヤーのコンテナ）
manifest.webmanifest       PWA
sw.js                      サービスワーカー（事前キャッシュ、版の名前で更新）
styles/cabinet.css         筐体・ギミック・場面ごとの動き（デザイン案3から移植）
styles/lcd.css             液晶（リール・予告・リーチ・大当たりムービー）
src/config.js              数値の設定（Global Constraints の数字はここだけ）
src/symbols.js             図柄表
src/lottery.js             抽選
src/machine.js             台の状態（玉・保留・モード・ラウンド）
src/scenario.js            1回転ぶんの演出の台本（止まる図柄・予告・リーチ・合図の時刻）
src/board-layout.js        盤面の座標（釘・レール・ヘソ・アタッカー・液晶のわく）
src/physics.js             玉の物理と入賞の判定
src/render/board.js        Canvas に釘・玉を描く
src/render/lcd.js          液晶の DOM を台本どおりに動かす
src/render/gimmicks.js     台本の合図で筐体に場面のクラスを付ける
src/input.js               ハンドル・PUSH・玉貸・設定のタップ
src/audio.js               合成の効果音、振動
src/storage.js             端末への保存
src/main.js                組み立てと毎コマの処理
assets/img/                ゲームで使う大きさの画像（図柄・筐体・部品・アイコン）
tools/prepare-images.mjs   元画像 → assets/img（sharp）
tools/sim.mjs              長時間の自動プレイ（数値の確かめ）
tests/*.test.js            node:test
```

---

### Task 1: ひな形・設定・図柄・抽選

**Files:**
- Create: `package.json`（`"type":"module"`, scripts `test: node --test tests/`, devDependencies `sharp`）, `.gitignore`（`node_modules/`, `assets/original/`, `.DS_Store`）, `src/config.js`, `src/symbols.js`, `src/lottery.js`
- Test: `tests/lottery.test.js`

**Interfaces:**
- Produces:
  - `CONFIG`（`src/config.js`）: `{ odds:{normal:99, kakuhen:10}, premiumShare:0.1, jitanSpins:100, holdMax:4, startBalls:250, rentBalls:125, hesoPayout:3, rounds:{normal:10, premium:16}, attackerMaxPerRound:10, attackerPayout:15, roundTimeoutMs:30000, fireRatePerSec:1.6 }`
  - `SYMBOLS: Array<{id:string, name:string, no:number|null, type:'kakuhen'|'normal'|'premium', img:string}>`（12件、上の順）, `PREMIUM_ID='trio'`, `NUMBERED: SYMBOLS 中 no!==null の11件`
  - `drawHit(mode:'normal'|'jitan'|'kakuhen', rng:()=>number) -> {hit:boolean, symbolId:string|null, kind:'kakuhen'|'normal'|'premium'|null}`

- [ ] **Step 1: `git init`、package.json・.gitignore を作り、`npm i -D sharp`**
- [ ] **Step 2: 失敗するテストを書く**（`tests/lottery.test.js`、乱数は `mulberry32(seed)` をテスト内で定義）
  - `symbols table matches spec`：12件、`SYMBOLS[3].name==='なーふぁん'`、`SYMBOLS[7].name==='だいすけ'`、`no` 奇数は `kakuhen`、偶数は `normal`、最後は `trio`/`premium`
  - `hit rate normal ≈ 1/99`：200,000 回で 0.0085〜0.0117
  - `hit rate kakuhen ≈ 1/10`：100,000 回で 0.095〜0.105
  - `premium share ≈ 10%`：当たりのうち ★ が 0.08〜0.12、★ の kind は `premium`
  - `numbered hits are uniform and kind follows parity`：11種それぞれ当たりの 7〜11%
- [ ] **Step 3: `npm test` → FAIL を確かめる**
- [ ] **Step 4: `config.js`・`symbols.js`・`lottery.js` を実装**（`img` は `assets/img/sym-<id>.png`）
- [ ] **Step 5: `npm test` → PASS**
- [ ] **Step 6: Commit** `feat: config, symbols and lottery`

### Task 2: 台の状態（machine）

**Files:**
- Create: `src/machine.js`
- Test: `tests/machine.test.js`

**Interfaces:**
- Consumes: `CONFIG`, `drawHit`
- Produces: `createMachine({config, rng, saved?}) -> Machine`
  - `m.state: {balls, holds:Hold[], mode:'normal'|'jitan'|'kakuhen', jitanLeft, spins, hits, phase:'idle'|'spinning'|'jackpot', current:Hold|null, round, roundsTotal, roundCount, rent}`
  - `Hold = {hit, symbolId, kind}`（drawHit の結果）
  - `m.fireBall() -> boolean`（玉が0なら false）
  - `m.onHeso() -> Hold|null`（3玉もどす。保留が4未満なら抽選して積む）
  - `m.startNextSpin() -> Hold|null`（idle で保留があれば取り出し `spinning` に。spins+1。時短なら jitanLeft-1、0 で normal へ）
  - `m.finishSpin()`（当たりなら `jackpot` に入り round=1、roundsTotal=10 or 16。外れなら idle）
  - `m.onAttacker() -> boolean`（jackpot 中のみ 15玉。roundCount が 10 で次のラウンドへ）
  - `m.tick(ms)`（ラウンドの時間切れ 30 秒で次のラウンドへ）
  - `m.isAttackerOpen() -> boolean`, `m.isHesoBoost() -> boolean`（時短・確変中 true。ヘソの羽が開く）
  - `m.rent()`（+125）
  - `m.toJSON() -> object` / 保存データから復元（`saved`）。大当たり中に保存されたものは、残りラウンド×10×15 玉を足して idle で復元する
  - 大当たり終了時：kind が kakuhen/premium → `kakuhen`、normal → `jitan`（jitanLeft=100）

- [ ] **Step 1: 失敗するテストを書く**
  - `starts with 250 balls`、`fireBall returns false at zero`
  - `heso pays 3 and holds max 4`（5回 onHeso → holds.length===4、balls は +15）
  - `normal hit leads to 10 rounds then jitan 100`、`kakuhen hit leads to kakuhen`、`premium has 16 rounds`
  - `attacker pays 15 and advances after 10`、`round times out after 30s`
  - `jitan counts down to normal`（100 回外れで normal）
  - `restores mid-jackpot`（10R 中 3R 目で保存 → 復元で idle、balls が残り 8R 分 ×150 増えている）
- [ ] **Step 2: `npm test` → FAIL**
- [ ] **Step 3: `src/machine.js` を実装**
- [ ] **Step 4: `npm test` → PASS**
- [ ] **Step 5: Commit** `feat: machine state`

### Task 3: 演出の台本（scenario）

**Files:**
- Create: `src/scenario.js`, `tools/sim.mjs`
- Test: `tests/scenario.test.js`

**Interfaces:**
- Consumes: `SYMBOLS`, `NUMBERED`, `PREMIUM_ID`, `Hold`
- Produces: `buildSpin(hold:Hold, mode, rng) -> Spin`
  - `Spin = {stops:[l,m,r] (symbolId), reach:null|'normal'|'family', notices:Array<'paw'|'honey'|'parade'>, hot:boolean, durationMs:number, cues:Array<{t:number, cue:Cue}>}`
  - `Cue = 'start'|'notice:paw'|'notice:honey'|'notice:parade'|'stopL'|'stopR'|'reach'|'armsIn'|'hot'|'medalDrop'|'pushUp'|'cutin'|'medalUp'|'armsOut'|'stopM'|'jackpot'|'end'`
  - 目安の割合（作る人が調整してよい。テストは不等式で固定）：外れのリーチ 1/8、当たりは必ずリーチ。家族リーチ＝当たり 50%／外れリーチ 3%。にゃんこ大行進＝当たり 40%／外れ 1.5%。激アツ＝当たり 60%／外れリーチ 5%。★は家族リーチ・激アツ必ず
  - 長さ：ふだん外れ 3000ms、リーチ 7000〜11000ms、時短・確変中の外れ 1200ms

- [ ] **Step 1: 失敗するテストを書く**（各 20,000 回）
  - `miss never shows three equal`、`hit shows three equal = symbolId`、`premium stops are all trio`
  - `reach pair is l and r`（リーチなら l===r、外れなら m!==l）
  - `family reach and parade are hot signals`：P(当たり|家族リーチ) > 0.5、P(当たり|大行進) > 0.6（ふだんの当たり率で混ぜて計算）
  - `cue order`：stopL < stopR < stopM < end、hot なら medalDrop < medalUp ≤ stopM-300、cutin+1600 ≤ stopM-300、armsIn は reach の後
  - `long run keeps invariants`（`tools/sim.mjs` の関数 `simulate({spins:50000, seed})` を使う：balls の出入りの合計が一致、phase が idle に戻る）
- [ ] **Step 2: `npm test` → FAIL**
- [ ] **Step 3: `src/scenario.js` と `tools/sim.mjs`（machine と scenario をつないで回すだけ。物理は使わず、1回転に使う玉を CONFIG に置いた平均値で減らす）を実装**
- [ ] **Step 4: `npm test` → PASS。`node tools/sim.mjs` で 1 時間ぶんの玉の増減と大当たり回数を表示し、数字を報告に書く**
- [ ] **Step 5: Commit** `feat: spin scenario and simulator`

### Task 4: 盤面の座標と玉の物理

**Files:**
- Create: `src/board-layout.js`, `src/physics.js`
- Test: `tests/physics.test.js`

**Interfaces:**
- Produces:
  - `LAYOUT = {w:320, h:404, pins:[{x,y}], walls:[{x1,y1,x2,y2}], lcdFrame:{x:28,y:58,w:264,h:206,r:28}, heso:{x:160,y:340,w:22}, hesoBoostW:40, attacker:{x:160,y:371,w:96}, out:{x:160,y:398,w:44}, launch:{x:150,y:20}}`（デザイン案3の盤面と同じ座標。釘の並べ方は v3 の `boardSvg` と同じ規則）
  - `createPhysics(layout) -> Physics`
    - `p.launch(power:number 0..1)`：レール出口から右向きに玉を出す。弱いと左に落ちる
    - `p.step(dtSec, {attackerOpen:boolean, hesoBoost:boolean}) -> Array<{type:'heso'|'attacker'|'out', id:number}>`（内部は 1/240 秒の固定刻み）
    - `p.balls: Array<{id,x,y,vx,vy}>`
- [ ] **Step 1: 失敗するテストを書く**
  - `ball bounces off a pin`（真上から落とすと横向きの速さが出る）
  - `ball dropped into heso emits heso`、`closed attacker emits nothing, open emits attacker`
  - `no ball stays stuck`（power 0.2〜0.9 で 3000 玉、すべて 15 秒以内に heso/attacker/out のどれか）
  - `heso rate at best power is 5–10%`（いちばん良い power で 3000 玉。hesoBoost なら 1.5 倍以上）
- [ ] **Step 2: `npm test` → FAIL**
- [ ] **Step 3: 実装**（円と円・円と線分の衝突、反発 0.5、釘の半径 2、玉の半径 4、重力 900px/s²）
- [ ] **Step 4: `npm test` → PASS。power ごとのヘソ率の表を報告に書く**
- [ ] **Step 5: Commit** `feat: board layout and ball physics`

### Task 5: 画面（筐体・盤面・ハンドル）を組み立てて遊べるようにする

仮の筐体はデザイン案3（`design/v3.html`）の CSS と部品をそのまま移す。ChatGPT の絵は Task 9 で差しかえる。

**Files:**
- Create: `index.html`, `styles/cabinet.css`, `src/render/board.js`, `src/input.js`, `src/main.js`, `tools/prepare-images.mjs`, `assets/img/sym-*.png`（12枚、各 192px 正方形）
- Test: ブラウザで確かめる（下の手順）

**Interfaces:**
- Consumes: `createMachine`, `createPhysics`, `LAYOUT`, `CONFIG`
- Produces:
  - `drawBoard(ctx, layout, balls, scale)`（`src/render/board.js`）
  - `bindInput({handleEl, pushEl, rentEl, onPower(power), onFire(on:boolean), onPush(), onRent()})`（`src/input.js`）。ハンドルは指が触れている間 onFire(true)、ハンドル中心からの角度で power（210°〜510° を 0〜1）
  - `main.js` の毎コマ：発射（1.6玉/秒）→ physics.step → 入賞を machine へ → idle なら startNextSpin → scenario の合図をレンダラーへ
- [ ] **Step 1: `tools/prepare-images.mjs` を書き、`assets/original/*.webp` から `assets/img/sym-<id>.png`（192px、3人は 400px 幅）を作る。`node tools/prepare-images.mjs` が12枚を出す**
- [ ] **Step 2: index.html と cabinet.css（v3 から移植。390×844 の箱を `transform: scale()` で画面に合わせる。背景は全面、ボタンは safe-area の内側）、横向きの「たてにしてね」**
- [ ] **Step 3: board.js・input.js・main.js を実装。この時点で液晶は図柄が止まるだけでよい**
- [ ] **Step 4: 確かめる**：`npx serve`ではなく `python3 -m http.server` で開き、内蔵ブラウザで 320×568・375×667・390×844・430×932 を撮る。盤面・液晶・ハンドル・上皿が重ならない（各部品の getBoundingClientRect を数で比べる）。ハンドルを押すと玉が出てヘソで液晶がまわる。玉が0で発射が止まり、玉貸で戻る。コンソールのエラー0
- [ ] **Step 5: Commit** `feat: playable cabinet with physics`

### Task 6: 液晶と演出・ギミック

**Files:**
- Create: `styles/lcd.css`, `src/render/lcd.js`, `src/render/gimmicks.js`
- Modify: `src/main.js`（Spin の cues を流す）
- Test: `tests/gimmicks.test.js`（DOM を使わない部分：合図 → 付けるクラス名の対応表）、ブラウザで確かめる

**Interfaces:**
- Consumes: `Spin`, `Cue`
- Produces:
  - `cueToPhase(cue) -> 'normal'|'reach'|'hot'|'jackpot'|null`（`gimmicks.js`、筐体に `ph-*` を付ける。v3 と同じクラス名）
  - `createLcd(rootEl) -> {play(spin), showJackpot(kind), setRound(n,total), idle()}`
  - `guardTap(el, ms=500)`（出した直後のタップを無視）
- [ ] **Step 1: 失敗するテスト**：`cueToPhase` の対応、`ignores taps for 500ms after show`（時刻を渡せる形で）
- [ ] **Step 2: 実装**。v3 の10種のギミック（クラウン・なーふぁん落下・肉球アーム・家族ヘソ・PUSH・羽・ねこじゃらし・ブルブル・カットイン・LED/風車/フラッシュ/後光）を合図につなぐ。PUSH は激アツ中に押すと「押した」演出（押さなくても結果は同じ）。ヘソの羽（hesoBoost）は時短・確変中に開いて見える
- [ ] **Step 3: `npm test` → PASS**
- [ ] **Step 4: 確かめる**：`?force=premium|hot|reach|miss` で次の1回転を強制できるようにし、それぞれをコマ撮り（0.2秒ごと）。止まった図柄・リーチ・大当たりの文字・家族の顔に、なーふぁん・カットイン・アームがかぶっていない（要素の矩形の重なりを数える）
- [ ] **Step 5: Commit** `feat: lcd and gimmicks`

### Task 7: 音・振動・保存・設定

**Files:**
- Create: `src/audio.js`, `src/storage.js`
- Modify: `src/main.js`, `index.html`（設定ボタン：音のオン・オフ、データをリセット）
- Test: `tests/storage.test.js`

**Interfaces:**
- Produces:
  - `createAudio() -> {unlock(), play(name), setOn(bool), resume()}`、name は `fire|heso|reach|hot|push|jackpot|payout|round`
  - `vibrate(pattern)`（`navigator.vibrate` があるときだけ）
  - `save(state)` / `load() -> state|null`（キー `family-monogatari:v1`、try/catch、壊れたデータは null）
- [ ] **Step 1: 失敗するテスト**：`load returns null on broken json`、`save/load roundtrip`（localStorage のかわりを渡せる形で）
- [ ] **Step 2: 実装**。保存は 2 秒ごとと `visibilitychange`(hidden)。音は pointerup/click で unlock、`visibilitychange`(visible) とタップで running 以外なら resume、起きなければ作りなおす（`resumes audio after interrupted` を手で：内蔵ブラウザで `ctx.suspend()` → タップで鳴る）
- [ ] **Step 3: `npm test` → PASS。効果音は OfflineAudioContext で録って大きさをそろえる（だいたい同じ聞こえ方）**
- [ ] **Step 4: Commit** `feat: audio, vibration, save and settings`

### Task 8: PWA

**Files:**
- Create: `manifest.webmanifest`, `sw.js`, `assets/img/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`（なーふぁん＋ロゴ。四隅まで不透明）
- Modify: `index.html`（manifest、apple-touch-icon、`apple-mobile-web-app-capable`、status-bar-style `black`、viewport `viewport-fit=cover`）
- [ ] **Step 1: manifest**（name・short_name「ファミリー物語」、start_url `./`、scope `./`、display `standalone`、orientation `portrait`）
- [ ] **Step 2: sw.js**（版の名前 `fm-v1` で全ファイルを事前キャッシュ、古い版を削除。読み込む CSS/JS の URL に `?v=1`）
- [ ] **Step 3: 確かめる**：内蔵ブラウザで登録されること、サーバーを止めて再読み込みしても開くこと
- [ ] **Step 4: Commit** `feat: pwa`

### Task 9: ChatGPT の絵で筐体を差しかえる

Claude がだいすけの Chrome の ChatGPT（会話「筐体コンセプトイラスト作成」）で頼む。参考に `gpt/concept2.png` とイラストを添付。どれも「添付のイメージ図2と同じ絵柄」「背景は透明」と書く。

**Files:**
- Create: `assets/img/cab-frame.png`（盤面と液晶の窓が空いた筐体。窓は透明、なければ #00ff00 で塗ってもらい `prepare-images.mjs` で抜く）、`part-wing.png`、`part-nafan.png`、`part-arm.png`、`part-heso.png`、`part-jarashi.png`、`part-windmill.png`、`part-push.png`、`part-crown.png`
- Modify: `styles/cabinet.css`（仮の CSS 部品を画像に置きかえ。動きのクラスはそのまま）, `tools/prepare-images.mjs`
- [ ] **Step 1: 筐体のわくを頼み、窓の位置が LAYOUT（盤面 320×404、液晶のわく）に合うよう、切り抜き・拡大の数値を決める**
- [ ] **Step 2: 部品を1つずつ頼む。届いたら透明か（sharp の `hasAlpha`）、絵柄がわくと合うかを並べて見る。合わないものは描きなおし**
- [ ] **Step 3: 組み立てて、ふだん・リーチ・激アツ・大当たりを撮り、だいすけに見せて OK をもらう**（OK まで次へ進まない）
- [ ] **Step 4: 画像の合計を 6MB 以下に（大きさ・PNG の色数）。Task 5・6 の確かめを、差しかえた絵でもう一度通す**
- [ ] **Step 5: Commit** `feat: chatgpt cabinet art`

### Task 10: GitHub に公開

- [ ] **Step 1: Chrome の GitHub（tvss2p でログイン中）で公開リポジトリ `family-monogatari` を作る**（作る前にだいすけに一言確認）
- [ ] **Step 2: `git remote add origin https://github.com/tvss2p/family-monogatari.git` → `git push -u origin main`。認証で止まったら、Chrome の GitHub の「Add file → Upload files」で入れる（10MB ごとに分ける）**
- [ ] **Step 3: Settings → Pages を main / root で有効化。https://tvss2p.github.io/family-monogatari/ が開き、コンソールのエラー0、SW が登録されること**
- [ ] **Step 4: 公開 URL で Task 5 の画面サイズの確かめをもう一度。だいすけに iPhone で「ホーム画面に追加」して開いてもらう**
- [ ] **Step 5: 成果物をドライブの成果物フォルダに入れ、成果物一覧に1行**

### Task 11: 仕上げの確かめ

- [ ] **Step 1: `npm test` 全部 PASS、全 JS に `node --check`**
- [ ] **Step 2: 自動プレイ（`?bot=1` でハンドルを押しっぱなしにする）を 10 分。玉の数・回転・大当たりの数がデータカウンターと保存データで一致、コンソールのエラー0、画面が動き続けている**
- [ ] **Step 3: 遊び直し：玉が0→玉貸、大当たり中にタブを閉じる→開き直す、設定のリセット、の3つで状態が正しく戻る**
- [ ] **Step 4: CPU を4倍遅くした計測で、大当たり中の1コマの時間を測る（16ms を大きく超えないか）**
