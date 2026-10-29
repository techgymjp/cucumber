# 🥒 きゅうり輪切り名人

きゅうりの輪切りをモチーフにしたゲームです。Web 版（`index.html` をブラウザで開くだけで遊べる）と、Capacitor で包んだ Android アプリ版があります。

## 遊び方
- 制限時間は 30 秒。きゅうりは包丁に向かって自動で流れてきて、だんだん速くなります。
- クリック / タップ / スペースキーで包丁を振り下ろします。
- 速く切るほど薄い輪切りになり高得点（1.0mm 未満で「神業」）。3.5mm 以下を続けるとコンボ倍率（最大 ×3）。
- きゅうりの入れかわり中に切ると「空振り」でコンボが途切れます。
- 終了後に枚数・包丁さばき（回/秒）・平均の厚さ・最薄・称号を表示。自己ベストは端末に保存されます。
- Android アプリでは、時間切れのときに広告を見ると 1 回だけ 10 秒延長できます。

## 野菜のバリエーション
きゅうり → 茄子 → 人参 → 牛蒡 → 大根 の順に挑戦できます。前の野菜で 7,000 点（称号「一人前の板前」）以上を取ると、次の野菜に挑戦できるようになります。タイトル画面で野菜を選べ、自己ベストは野菜ごとに保存されます。

| 野菜 | 太さ | 流れる速さ | 切り方 | 1 枚の点数 |
| --- | --- | --- | --- | --- |
| きゅうり | 32mm | 6 → 20 mm/秒 | タップ | ×1 |
| 茄子 | 44mm | 5 → 15 mm/秒 | 切れるまで長押し（0.12 秒） | ×1.4 |
| 人参 | 30mm | 3.5 → 10 mm/秒 | 切れるまで長押し（0.2 秒） | ×2 |
| 牛蒡 | 18mm | 2 → 5 mm/秒 | 切れるまで長押し（0.5 秒） | ×5 |
| 大根 | 60mm | 1 → 2.8 mm/秒 | 切れるまで長押し（1 秒） | ×8 |

長押しの野菜は、押す時間＋押し直す時間で 1 枚あたり 1〜3mm くらいになるよう流れる速さを遅くし、切れる枚数が少ないぶん 1 枚の点数を上げています。

かたい野菜は、押しているあいだ包丁が沈んでいき、最後まで押し切ると切れます。途中で離すと「浅い！」で切れません。野菜の設定は `js/main.js` の `VEGS` にあります。

## 日本語 / 英語
端末の言語が日本語なら日本語、それ以外は英語で表示します（`js/i18n.js`）。タイトル画面のボタンで切り替えられ、選んだ言語は端末に保存されます。英語名は **Cucumber Slice Master** です。Android のアプリ名も端末の言語に合わせて切り替わります（`android/app/src/main/res/values/strings.xml` と `values-ja/strings.xml`）。

## 効果音
Web Audio API でその場で合成しています（シャキッ＋トン、空振り、神業のキラーン、コンボ、カウントダウン、終了ファンファーレなど）。右上のボタンで ON/OFF できます。

## Android アプリ
Google Play で公開中：https://play.google.com/store/apps/details?id=jp.techgym.cucumber（Web 版のタイトル・結果画面からもリンクしています）

JET STRIKE（techgymjp/jet-fighter）の `docs/ANDROID_PORTING.md` と同じ構成です。

- パッケージ名：`jp.techgym.cucumber`（Capacitor 8、横画面固定）
- ビルドは GitHub Actions（`.github/workflows/android.yml`）で行います。既定ブランチに push すると、動作確認用の APK（テスト広告）が Release `android-latest` に載ります。
- 動作確認用 APK：`https://github.com/techgymjp/cucumber/releases/latest/download/cucumber.apk`（QR コード：`docs/apk-qr.png`）
- GitHub Secrets にアップロード鍵を登録すると、Google Play 用の署名付き AAB（本番広告）が Actions の Artifact に出ます。
- 本番広告の ID は `android/app/src/main/res/values/strings.xml`（アプリ ID）と `js/ads.js`（広告ユニット ID）にあります。
- 広告の出し方（Android アプリのみ）
  - バナー：タイトル・結果・ポーズ画面の下（プレイ中は出さない。結果画面では 1 秒遅らせて出す）
  - インタースティシャル：「もう一回！」「次の野菜に挑戦！」「タイトルへ」「ポーズからの再開」のたびに毎回
  - リワード：時間切れのときに 10 秒延長（1 ゲーム 1 回）／まだ挑戦できない野菜に今回だけ挑戦

```
npm ci
npm run build          # www/ に Web ファイルをまとめる
npx cap sync android   # Android プロジェクトへコピー
```

## iOS アプリ
JET STRIKE（techgymjp/jet-fighter）の iOS 版と同じ構成です。Mac での作業手順は `docs/IOS_BUILD.md` にあります。

- Bundle ID：`jp.techgym.cucumber`（Capacitor 8、iPhone 専用・横画面固定）
- `npm run ios:sync`（テスト広告）／`npm run ios:release`（本番広告。App Store 用）／`npm run ios:open`（Xcode で開く）
- GitHub Actions（`.github/workflows/ios.yml`）で、push のたびにシミュレーター向けに署名なしでビルドできるかを確認します
- AdMob の iOS 用 ID（アプリ ID とバナー・インタースティシャル・リワード）は `ios/App/App/Info.plist` と `js/ads.js` に設定済みです
- App Store 用の画像：`docs/store/ios/`（スクリーンショット 2622×1206 日英各 4 枚、ヘッダ 3840×1646、検索結果 3840×2560）

## ファイル構成

```
index.html             画面構成（タイトル・結果・一時停止・延長）
css/style.css          スタイル
js/main.js             ゲーム本体（描画・効果音・得点・シェア・アプリ用の処理）
js/i18n.js             日本語 / 英語の文言
js/ads.js              AdMob 広告（Android アプリのときだけ動く）
js/ads-config.js       広告モード（ビルド時に生成）
js/build-info.js       バージョン表示（ビルド時に生成）
scripts/build-web.js   www/ を作るスクリプト
assets/                アイコン・起動画面の元画像
android/               Android プロジェクト
ios/                   iOS プロジェクト（Xcode）
ogp.png                SNS シェア用の画像
```

## ライセンス

All rights reserved. 著作権はテックジム株式会社に帰属します。無断での複製・改変・再配布、Web サイトやアプリとしての公開を禁止します。ただし、テックジムの受講生が学習目的で複製・改変することは許可します（商用利用は不可。詳しくは `LICENSE`）。
