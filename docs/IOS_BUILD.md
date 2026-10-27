# iOS 版をビルドして App Store に出す手順（Mac での作業）

きゅうり輪切り名人の iOS 版は、Android 版と同じ Capacitor で作っています（`ios/` フォルダ）。
構成は JET STRIKE（techgymjp/jet-fighter）の iOS 版と同じです。
コードの準備はできているので、Mac では「ビルドして App Store Connect にアップロードする」作業だけを行います。

- Bundle ID：`jp.techgym.cucumber`（Android のパッケージ名と同じ）
- チーム：Team ID `GNM3VTX9YG`（Xcode の設定に入れてあります）。Apple Developer には**個人で登録**しています（App Store の販売元は個人名になります）
- 対応端末：iPhone（横画面固定）。iPad では iPhone 用の画面で動きます
- ホーム画面の名前：日本語の端末では「きゅうり輪切り名人」、それ以外では「Cucumber Slice」
- 広告：AdMob（iOS 用のアプリと広告ユニット）。起動時に「トラッキングの許可」の確認画面が出ます

---

## 0. 先にブラウザでやること（このゲームで1回だけ）

1. **Apple Developer**（developer.apple.com）→「Certificates, Identifiers & Profiles」→「Identifiers」→「＋」→「App IDs」→「App」
   - Description：`Cucumber Slice Master`（英数字のみ）
   - Bundle ID：「Explicit」で `jp.techgym.cucumber`
   - Capabilities：何もチェックしない
2. **App Store Connect**（appstoreconnect.apple.com）→「マイ App」→「＋」→「新規 App」
   - プラットフォーム：iOS ／ 名前：`きゅうり輪切り名人` ／ プライマリ言語：日本語
   - バンドル ID：1 で登録したもの ／ SKU：`cucumber`（あとから変更不可）／ ユーザアクセス：アクセス制限なし
   - 英語の名前（`Cucumber Slice Master`）は、App 情報で英語（米国）のローカリゼーションを追加して入れる
3. **AdMob**
   - 「アプリを追加」→ **iOS** →「ストアに掲載されていない」で登録する
   - バナー・インタースティシャル・リワードの広告ユニットを作る
   - アプリ ID と広告ユニット ID 3 つを Claude Code に渡す（`ios/App/App/Info.plist` と `js/ads.js` に入れてもらう）。**入れるまでは、本番用のビルド（`ios:release`）では広告が出ません**
   - 「プライバシーとメッセージ」→「欧州の規制」のメッセージに iOS アプリも追加する

---

## 1. Mac の準備（最初の1回だけ）

1. **Xcode** を App Store からインストールする（数十 GB あるので時間がかかります）。インストール後に一度起動し、追加コンポーネントのインストールを済ませる
2. Xcode の「Settings…」→「Accounts」→「＋」で、Apple Developer に登録している Apple ID でサインインする（チームが個人名で表示されれば OK）
3. **Node.js**（LTS 版）を https://nodejs.org/ からインストールする
4. ターミナルでリポジトリを取得する
   ```bash
   cd ~/Desktop   # 置きたい場所（どこでもよい）
   git clone https://github.com/techgymjp/cucumber.git
   cd cucumber
   git checkout claude/quirky-pascal-j7nf6e   # いまの作業ブランチ（main を作ったら不要）
   npm ci
   ```
   `git` がないと言われたら、表示に従って「コマンドライン・デベロッパツール」をインストールしてから、もう一度実行します。

2回目以降は、`cd cucumber` のあと `git pull` と `npm ci` で最新にします。

JET STRIKE で Xcode・Node.js・Apple ID の準備が済んでいれば、4 だけで大丈夫です。

---

## 2. 自分の iPhone で動作確認する（テスト広告）

```bash
npm run ios:sync    # ゲームのファイルを iOS のプロジェクトにコピー（テスト広告）
npm run ios:open    # Xcode で開く
```

1. iPhone を USB ケーブルで Mac につなぎ、iPhone で「このコンピュータを信頼」を許可する
2. iPhone の「設定」→「プライバシーとセキュリティ」→「デベロッパモード」をオンにする（再起動を求められます。項目がない場合は、Xcode で一度 iPhone を選ぶと表示されます）
3. Xcode の上部で、実行先に自分の iPhone を選ぶ
4. 左の「App」→「Signing & Capabilities」で、「Automatically manage signing」がオン、Team に自分（個人名）のチームが選ばれていることを確認する
5. ▶（Run）を押すと、iPhone にアプリが入って起動する

確認すること：

- 横画面で全画面表示になる。画面の端（カメラの切り欠き）に時間や点数が隠れていない
- 起動時にトラッキングの確認画面が出る（日本語の端末では日本語の説明）
- タップで切れる・音が鳴る。茄子・人参・牛蒡・大根は長押しで切れる
- **テスト広告**が出る：バナー（タイトル・結果・ポーズ画面の下）、全画面広告（「もう一回！」「タイトルへ」「ポーズからの再開」）、リワード（時間切れの 10 秒延長、🔒の野菜の「▶ 広告で挑戦」）
- 結果の「シェア」で iOS の共有メニューが出る
- ホームに戻って開き直すと一時停止している

---

## 3. App Store 用にビルドしてアップロードする（本番広告）

```bash
git pull && npm ci
npm run ios:release   # 本番の広告 ID でコピーする（ここが ios:sync と違う）
npm run ios:open
```

1. Xcode の左で「App」→「General」→「Identity」を開き、**Build の番号を前回より大きくする**（初回は 1。アップロードのたびに 2、3…と上げる。同じ番号は二度アップロードできない）。Version は 1.0.0
2. 上部の実行先を「**Any iOS Device (arm64)**」にする
3. メニューの「Product」→「**Archive**」（「Product」は画面最上部のメニューバー。全画面表示だと隠れるので、マウスを画面の上端に動かす）
4. 終わると Organizer が開くので、「**Distribute App**」→「**App Store Connect**」→「Upload」で進める（途中の確認は既定のまま「Next」でよい。「Xcode Cloud can automate…」は「Remind Me Later」で閉じてよい）
5. 10〜30 分ほどで、App Store Connect の「TestFlight」タブにビルドが表示される

輸出コンプライアンス（暗号化）の質問は、Info.plist で「独自の暗号化は使っていない」と設定済みなので、聞かれません。

**注意**：`ios:release` でビルドしたアプリは本番の広告が出ます。TestFlight で確認するときも、**本番の広告はタップしない**でください（AdMob のアカウント停止の対象）。Xcode から iPhone に直接入れて試すときは、`npm run ios:sync` でテスト広告に戻してから実行します。

---

## 4. TestFlight で確認し、審査用の画面録画を撮る

1. App Store Connect の「TestFlight」→「内部テスト」でグループを作り、自分を追加する
2. iPhone に「TestFlight」アプリを App Store から入れ、届いた招待からきゅうり輪切り名人をインストールする
3. **審査用の画面録画を撮る**（審査の実績が少ないアカウントは、初回の審査で実機の操作の録画を求められます。先に用意して、申請時に添えると早く進みます）
   - iPhone の「設定」→「コントロールセンター」に「画面収録」を追加し、コントロールセンターから収録を始める
   - **アプリの起動から**撮る：起動 → トラッキングの確認 → タイトル → きゅうりで 1 回遊ぶ → 結果画面（シェア・広告）→ 野菜を選ぶ → 大根などの長押し → タイトルに戻る（1〜2 分）
   - 本番広告が出ても**タップしない**
   - ファイルが大きいと App Review への返信に添付できない（400MB でも失敗した例あり）。Mac の Finder で右クリック →「選択したビデオファイルをエンコード」→ 720p で小さくするか、Google ドライブの共有リンクを使う

---

## 5. App Store Connect で審査に出す

「配信」タブ（iOS App のバージョン 1.0.0）で入力します。バージョンが「1.0」になっていたら **1.0.0 に直して保存**します（違っているとアップロードしたビルドを選べません）。

| 項目 | 入力内容 |
| --- | --- |
| スクリーンショット | 「Dynamic Island 搭載 iPhone（中型ディスプレイ）」の欄に、`docs/store/ios/6.3inch/` の 2622 × 1206（横向き）を入れる。日本語版（ja-）と英語版（en-）各 4 枚。6.9 インチ（2868 × 1320）は受け付けられない |
| ヘッダ・検索結果 | 「ヘッダと検索結果」タブに `docs/store/ios/appstore-header-3840x1646.png` と `appstore-search-3840x2560.png`（文字なし。App Store がアプリ名を重ねる）。ヘッダを入れたら検索結果も入れる（片方だけだと赤枠になる） |
| 概要 | Google Play 用の「詳しい説明」（`docs/store/listing.md`、英語は `listing-en.txt`）を流用 |
| プロモーション用テキスト・キーワード | 下記 |
| サポート URL | https://techgym.jp/ |
| プライバシーポリシー URL（App 情報・アプリのプライバシー） | https://techgym.jp/privacy-policy/ |
| 著作権 | 2026 TECH GYM K.K. |
| カテゴリ（App 情報） | ゲーム（サブカテゴリ：カジュアル） |
| コンテンツの配信権（App 情報） | 第三者のコンテンツ：いいえ（絵・音はすべて自作。音はプログラムで合成） |
| ビルド | TestFlight で確認したビルドを選ぶ |
| 年齢制限 | 質問に答える（包丁で野菜を切る描写のみ。暴力・流血・人物への危害なし） |
| App のプライバシー | AdMob が収集するデータを申告する（下記） |
| App Review に関する情報 | ログイン不要。連絡先を入力。メモに下記の文を入れ、4 章の画面録画を添える |

**プロモーション用テキスト**（170 文字以内）

- 日本語：`30秒で、きゅうりをどこまで薄く切れる？ 連打で包丁をさばき、1.0mm未満の「神業」を狙え。茄子・人参・牛蒡・大根にも挑戦！`
- 英語：`How thin can you slice a cucumber in 30 seconds? Chop fast for Godlike slices under 1.0 mm, then take on eggplant, carrot, burdock and daikon!`

**キーワード**（100 文字以内、カンマ区切り）

- 日本語：`きゅうり,輪切り,包丁,料理,野菜,連打,タップ,反射神経,カジュアル,ミニゲーム,大根,茄子,人参,牛蒡`
- 英語：`cucumber,slice,knife,chop,cooking,vegetable,tap,reflex,casual,mini game,daikon,eggplant,carrot`

**App Review に関する情報のメモ**（初回の審査で「Guideline 2.1 - Information Needed」が来たら、同じ文で返信する）

```
1. Screen recording: A screen recording on a physical iPhone (latest iOS), starting from app launch, is attached.
2. Purpose and audience: A casual single-player game for anyone 13 and older. Players tap (or press and hold) to chop vegetables as thinly and quickly as possible within 30 seconds.
3. How to use: No login or account is required. Tap "Start", then tap the screen to chop. Eggplant, carrot, burdock and daikon need a press and hold until the knife cuts through.
4. External services: Google AdMob shows banner, interstitial and rewarded ads. App Tracking Transparency is requested at launch, after Google's consent message where required. The share button uses the standard iOS share sheet. No other third-party services, no in-app purchases.
5. Regional differences: None, except that Google's consent message (UMP) appears only in regions that require it (EEA, UK, etc.).
6. Regulated content / third-party material: None. All graphics and sounds were created for this app (sounds are synthesized in code).
```

**App のプライバシー（AdMob を使うアプリの目安）**
Google の「Apple の App Store のデータ開示要件への準備」（AdMob のヘルプ）に、AdMob が収集するデータの一覧があります。必ずそちらを見て最終確認してください。目安は次のとおりです（JET STRIKE と同じ）。

- 収集する：ID（デバイス ID）、使用状況データ（広告データ、製品の操作）、診断（クラッシュデータ、パフォーマンスデータ、その他の診断データ）、位置情報（おおよその場所）
- 目的：サードパーティ広告、アナリティクス
- ユーザーに関連付け：しない
- トラッキングに使用：デバイス ID と広告データは「する」

入力が終わったら「審査用に追加」→「審査へ提出」。

---

## 6. 公開後にやること

- AdMob で iOS アプリを App Store のアプリに紐づける（「アプリ」→ iOS のきゅうり輪切り名人 →「アプリの設定」）
- App Store からインストールして、起動・同意画面・トラッキングの確認・広告を確認する

---

## 7. 自動化の準備（2回目以降を GitHub Actions に任せる場合）

JET STRIKE の `docs/IOS_BUILD.md` 7 章と同じです。App Store Connect の API キーと配布用の証明書（.p12）はチーム共通なので、JET STRIKE で作ったものを使い回せます。
このリポジトリの Settings → Secrets and variables → Actions（https://github.com/techgymjp/cucumber/settings/secrets/actions）に、次の 5 つを登録します。

| 名前 | 内容 |
| --- | --- |
| `IOS_DIST_CERT_P12_BASE64` | 証明書（.p12）を変換した文字列（`base64 -i 証明書.p12 \| tr -d '\n' \| pbcopy`） |
| `IOS_DIST_CERT_PASSWORD` | .p12 を書き出したときのパスワード |
| `ASC_KEY_ID` | API キーのキー ID |
| `ASC_ISSUER_ID` | Issuer ID |
| `ASC_KEY_P8_BASE64` | API キー（.p8）を変換した文字列（`base64 -i AuthKey_XXXXXXXXXX.p8 \| tr -d '\n' \| pbcopy`） |

登録が終わったら、Claude Code に「iOS の自動アップロードのワークフローを作って」と頼みます。

**注意**：証明書（.p12）、そのパスワード、API キー（.p8）は、チャット・AI へのアップロード・リポジトリへのコミットで**絶対に共有しない**でください。

---

## つまずきやすいところ

| 症状 | 対処 |
| --- | --- |
| アップロードで「同じビルド番号がすでにある」 | General の Build の番号を上げてから Archive し直す |
| Signing でエラー（チームが選べない、証明書がない） | Xcode の Accounts で Apple ID にサインインし直し、Team を選ぶ。「Automatically manage signing」をオンにする |
| 実行先に iPhone が出ない | ケーブルをつなぎ直し、iPhone で「信頼」を許可。デベロッパモードをオンにする |
| 実行先に「iOS 26.x Not Installed」と出る | 「Get」で iOS のシミュレーターと部品をダウンロードする（8 GB ほど。Archive にも必要） |
| ビルドが古いゲームのまま | `npm run ios:sync`（または `ios:release`）を実行し忘れている。`git pull` してから実行し直す |
| アップロードしたビルドが選べない | App Store Connect のバージョンを 1.0.0 に直して保存する |
| 「審査用に追加できません」 | 「コンテンツの配信権」と「アプリのプライバシー」のプライバシーポリシー URL が入っているか確認する |
| 広告が出ない（本番） | `js/ads.js` の iOS の production と `Info.plist` の `GADApplicationIdentifier` に本物の ID が入っているか確認する |
| App Store の審査で「Xcode が古い」と言われる | Xcode を最新版に更新してから Archive し直す |
