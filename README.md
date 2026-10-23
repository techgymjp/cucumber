# 🥒 きゅうり輪切り名人

きゅうりの輪切りをモチーフにしたゲームです。Web 版（`index.html` をブラウザで開くだけで遊べる）と、Capacitor で包んだ Android アプリ版があります。

## 遊び方
- 制限時間は 30 秒。きゅうりは包丁に向かって自動で流れてきて、だんだん速くなります。
- クリック / タップ / スペースキーで包丁を振り下ろします。
- 速く切るほど薄い輪切りになり高得点（1.0mm 未満で「神業」）。3.5mm 以下を続けるとコンボ倍率（最大 ×3）。
- きゅうりの入れかわり中に切ると「空振り」でコンボが途切れます。
- 終了後に枚数・包丁さばき（回/秒）・平均の厚さ・最薄・称号を表示。自己ベストは端末に保存されます。
- Android アプリでは、時間切れのときに広告を見ると 1 回だけ 10 秒延長できます。

## 効果音
Web Audio API でその場で合成しています（シャキッ＋トン、空振り、神業のキラーン、コンボ、カウントダウン、終了ファンファーレなど）。右上のボタンで ON/OFF できます。

## Android アプリ
JET STRIKE（techgymjp/jet-fighter）の `docs/ANDROID_PORTING.md` と同じ構成です。

- パッケージ名：`jp.techgym.cucumber`（Capacitor 8、横画面固定）
- ビルドは GitHub Actions（`.github/workflows/android.yml`）で行います。既定ブランチに push すると、動作確認用の APK（テスト広告）が Release `android-latest` に載ります。
- GitHub Secrets にアップロード鍵を登録すると、Google Play 用の署名付き AAB（本番広告）が Actions の Artifact に出ます。
- 本番広告の ID は `android/app/src/main/res/values/strings.xml`（アプリ ID）と `js/ads.js`（広告ユニット ID）に入れます。

```
npm ci
npm run build          # www/ に Web ファイルをまとめる
npx cap sync android   # Android プロジェクトへコピー
```

## ファイル構成

```
index.html             画面構成（タイトル・結果・一時停止・延長）
css/style.css          スタイル
js/main.js             ゲーム本体（描画・効果音・得点・シェア・アプリ用の処理）
js/ads.js              AdMob 広告（Android アプリのときだけ動く）
js/ads-config.js       広告モード（ビルド時に生成）
js/build-info.js       バージョン表示（ビルド時に生成）
scripts/build-web.js   www/ を作るスクリプト
assets/                アイコン・起動画面の元画像
android/               Android プロジェクト
ogp.png                SNS シェア用の画像
```

## ライセンス

All rights reserved. 著作権はテックジム株式会社に帰属します。無断での複製・改変・再配布、Web サイトやアプリとしての公開を禁止します。ただし、テックジムの受講生が学習目的で複製・改変することは許可します（商用利用は不可。詳しくは `LICENSE`）。
