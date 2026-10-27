// Google AdMob 広告（Android / iOS アプリのときだけ動く。Web 版では何もしない）
const Ads = (() => {
  // AdMob では Android と iOS を別のアプリとして登録しているので、広告ユニットも OS ごとに分かれている。
  // test は Google 公式のテスト用広告ユニット。production の空の種類は本番ビルドでは出さない
  const UNITS = {
    android: {
      test: {
        interstitial: 'ca-app-pub-3940256099942544/1033173712',
        rewarded: 'ca-app-pub-3940256099942544/5224354917',
        banner: 'ca-app-pub-3940256099942544/9214589741',
      },
      production: {
        interstitial: 'ca-app-pub-6411535997477460/2601084855',
        rewarded: 'ca-app-pub-6411535997477460/6996333275',
        banner: 'ca-app-pub-6411535997477460/7335244622',
      },
    },
    ios: {
      test: {
        interstitial: 'ca-app-pub-3940256099942544/4411468910',
        rewarded: 'ca-app-pub-3940256099942544/1712485313',
        banner: 'ca-app-pub-3940256099942544/2435281174',
      },
      production: {
        interstitial: 'ca-app-pub-6411535997477460/3659009489',
        rewarded: 'ca-app-pub-6411535997477460/8156657697',
        banner: 'ca-app-pub-6411535997477460/5006703998',
      },
    },
  };
  const RETRY_MS = 20000;      // 読み込みに失敗したら少し待って再挑戦する
  const cap = window.Capacitor;
  const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const AdMob = native && cap.Plugins ? cap.Plugins.AdMob : null;
  const platform = native && cap.getPlatform() === 'ios' ? 'ios' : 'android';
  const testing = window.AD_MODE !== 'production';
  const ids = UNITS[platform][testing ? 'test' : 'production'];

  let ready = false;           // 広告をリクエストしてよい状態（初期化と同意確認が済んだ）
  let showing = false;
  let privacyRequired = false; // 「広告の設定」を利用者が開けるようにする必要があるか（EU など）
  const waiters = {};          // 表示中の広告が閉じたときに呼ぶ処理

  // 広告の種類ごとの読み込み状態
  const slots = {
    inter: { loaded: false, pending: null, load: () => AdMob.prepareInterstitial({ adId: ids.interstitial, isTesting: testing }) },
    reward: { loaded: false, pending: null, load: () => AdMob.prepareRewardVideoAd({ adId: ids.rewarded, isTesting: testing }) },
  };

  // 読み込みを始め、読み込めたら true で resolve する Promise を返す（読み込み中なら同じ Promise）
  function prepare(kind) {
    const s = slots[kind];
    if (!ready) return Promise.resolve(false);
    if (s.loaded) return Promise.resolve(true);
    if (!s.pending) {
      s.pending = s.load()
        .then(() => { s.loaded = true; return true; })
        .catch(() => { setTimeout(() => prepare(kind), RETRY_MS); return false; })
        .finally(() => { s.pending = null; });
    }
    return s.pending;
  }

  // 読み込み済みでなければ、最大 timeout ミリ秒だけ読み込みを待つ
  function ensureLoaded(kind, timeout) {
    if (slots[kind].loaded) return Promise.resolve(true);
    return Promise.race([prepare(kind), new Promise(r => setTimeout(() => r(false), timeout))]);
  }

  function finish(kind, result) {
    showing = false;
    if (window.Sfx) Sfx.resume();
    const w = waiters[kind];
    waiters[kind] = null;
    if (w) w(result);
  }

  async function init() {
    try {
      await AdMob.initialize({ initializeForTesting: testing });
    } catch (e) {
      return;
    }
    // EU・英国などで必要な広告の同意確認（必要な地域でだけフォームが出る）。
    // 確認自体が失敗した場合（AdMob 側でメッセージ未設定など）は、同意不要の地域とみなして続ける
    try {
      let consent = await AdMob.requestConsentInfo();
      if (consent.status === 'REQUIRED' && consent.isConsentFormAvailable) consent = await AdMob.showConsentForm();
      ready = consent.canRequestAds !== false;
      privacyRequired = consent.privacyOptionsRequirementStatus === 'REQUIRED';
    } catch (e) {
      ready = true;
    }
    // iOS では、広告用の ID を使ってよいか（App Tracking Transparency）を利用者に確認する。
    // 同意確認のあとに一度だけ出る。断られても広告は出せる（パーソナライズされないだけ）
    if (platform === 'ios') {
      try {
        const { status } = await AdMob.trackingAuthorizationStatus();
        if (status === 'notDetermined') await AdMob.requestTrackingAuthorization();
      } catch (e) {}
    }
    let rewarded = false;
    AdMob.addListener('interstitialAdDismissed', () => finish('inter'));
    AdMob.addListener('interstitialAdFailedToShow', () => finish('inter'));
    AdMob.addListener('onRewardedVideoAdShowed', () => { rewarded = false; });
    AdMob.addListener('onRewardedVideoAdReward', () => { rewarded = true; });
    AdMob.addListener('onRewardedVideoAdDismissed', () => finish('reward', rewarded));
    AdMob.addListener('onRewardedVideoAdFailedToShow', () => finish('reward', false));
    AdMob.addListener('bannerAdSizeChanged', info => { if (info && info.height > 0) bannerSizeListeners.forEach(f => f(info.height)); });
    AdMob.addListener('bannerAdFailedToLoad', () => {
      // 読み込めなかったら作り直す
      bannerCreated = false;
      setTimeout(() => { if (bannerWanted) showBanner(); }, RETRY_MS);
    });
    if (ids.interstitial) prepare('inter');
    if (ids.rewarded) prepare('reward');
  }

  // バナー（画面の下）。タイトル・結果・ポーズ画面でだけ出す
  let bannerWanted = false;
  let bannerCreated = false;
  const bannerSizeListeners = [];
  async function showBanner() {
    bannerWanted = true;
    if (!AdMob || !ids.banner) return;
    await initDone;
    if (!ready || !bannerWanted) return;
    try {
      if (bannerCreated) await AdMob.resumeBanner();
      else {
        bannerCreated = true;
        await AdMob.showBanner({ adId: ids.banner, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: testing });
      }
      // 表示の準備中に「隠す」が来ていたら隠す
      if (!bannerWanted) await AdMob.hideBanner();
    } catch (e) {
      bannerCreated = false;
    }
  }
  function hideBanner() {
    bannerWanted = false;
    if (!AdMob || !bannerCreated) return;
    AdMob.hideBanner().catch(() => {});
  }

  // 全画面広告を表示し、閉じられたら resolve する（読み込めていないときは出さずにすぐ resolve）
  function showInterstitial() {
    if (!AdMob || !ids.interstitial || !ready || !slots.inter.loaded || showing) return Promise.resolve();
    showing = true; slots.inter.loaded = false;
    if (window.Sfx) Sfx.suspend();
    return new Promise(resolve => {
      waiters.inter = () => { prepare('inter'); resolve(); };
      AdMob.showInterstitial().catch(() => finish('inter'));
    });
  }

  // リワード広告を表示する。結果は 'rewarded'（最後まで見た）/ 'skipped'（途中で閉じた）/ 'unavailable'（読み込めなかった）
  async function showRewarded() {
    if (!AdMob || !ids.rewarded || showing) return 'unavailable';
    await initDone;
    if (!ready || !(await ensureLoaded('reward', 8000))) return 'unavailable';
    showing = true; slots.reward.loaded = false;
    if (window.Sfx) Sfx.suspend();
    return new Promise(resolve => {
      waiters.reward = ok => { prepare('reward'); resolve(ok ? 'rewarded' : 'skipped'); };
      AdMob.showRewardVideoAd().catch(() => finish('reward', false));
    });
  }

  // 同意した内容をあとから変更するための Google のフォームを開く
  function showPrivacyOptions() {
    if (!AdMob) return Promise.resolve();
    return AdMob.showPrivacyOptionsForm().catch(() => {});
  }

  const initDone = AdMob ? init() : Promise.resolve();

  return {
    // リワード広告（延長）が使えるか
    get available() { return !!AdMob && !!ids.rewarded; },
    get bannerAvailable() { return !!AdMob && !!ids.banner; },
    get showing() { return showing; },
    get privacyOptionsRequired() { return privacyRequired; },
    initDone,
    showInterstitial,
    showRewarded,
    showPrivacyOptions,
    showBanner,
    hideBanner,
    // バナーの高さ（CSS ピクセル）が決まったら呼ぶ
    onBannerSize(f) { bannerSizeListeners.push(f); },
  };
})();
