# ファミリー物語

ばあちゃんのための、スマホで遊ぶパチンコゲーム（PWA）。家族と猫たちが図柄になっています。

遊ぶ：https://tvss2p.github.io/family-monogatari/

## 音について

音楽・効果音：魔王魂 https://maou.audio/（CC BY 4.0、形式変換・音量調整・一部カットあり）

ボイス：edge-tts（Microsoft の ja-JP-NanamiNeural を、高さ +100Hz・速さ +15% にして子どもっぽく）で作成。セリフは src/voices.js、作り直しは `node tools/make-voices.mjs`

使っている曲・効果音の一覧と元のページは [assets/audio/CREDITS.txt](assets/audio/CREDITS.txt) にあります。

## 作り方のメモ

- テスト：`npm test`
- 手元で動かす：`node tools/serve.mjs 8770`
- 音のファイルを作りなおす（macOS）：`node tools/prepare-audio.mjs`（元の素材は assets/original/audio、git には入れない）
- ファイルを変えたら：`node tools/build-sw.mjs`
