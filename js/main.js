(() => {
  'use strict';

  // ===== 設定 =====
  const W = 960, H = 540;
  const GAME_TIME = 30;            // 秒
  const S = 3.6;                   // 1mm あたりのピクセル
  const BOARD_Y = 400;             // まな板の上面
  const KNIFE_X = 380;
  // 挑戦する野菜。前の野菜で UNLOCK_SCORE 点以上を取ると次の野菜に挑戦できる
  // diam: 直径 (mm) / len: 1 本の長さ (mm) / speed: 流れる速さ (mm/秒、開始→終了) / stub: 手で持つ端っこ (mm)
  // press: 切れるまでに押し続ける時間 (ミリ秒)。0 ならタップで切れる。かたい・太い野菜は長押しが必要
  const UNLOCK_SCORE = 7000;
  const VEGS = [
    {
      id: 'cucumber', diam: 32, len: [140, 180], speed: [6, 20], stub: 12, press: 0,
      body: ['#5aa83f', '#7cc35a', '#3f8f2f', '#23561a'], bumps: 'rgba(230, 255, 200, 0.55)',
      side: '#2f6a22', skin: '#3d7f2b', flesh: '#d8efb0', core: '#c3e396', seed: '#f4fbe0', face: 'cucumber',
      cut: '#cfe9a3', end: 'stem', endColor: '#6b5a2a', juice: 'rgba(200, 240, 170, 0.9)',
    },
    {
      id: 'eggplant', diam: 44, len: [130, 160], speed: [7, 22], stub: 18, press: 0,
      body: ['#6a3580', '#8c4fa3', '#45205a', '#25102f'], bumps: null,
      side: '#2a1236', skin: '#4a1f5c', flesh: '#f4eed4', core: '#ece2bd', seed: '#a8925c', face: 'eggplant',
      cut: '#efe6c6', end: 'calyx', endColor: '#2f4a25', juice: 'rgba(240, 232, 200, 0.9)',
    },
    {
      id: 'burdock', diam: 18, len: [230, 290], speed: [5, 15], stub: 14, press: 120,
      body: ['#9a7a55', '#b08e66', '#76583a', '#4f3a24'], bumps: 'rgba(70, 45, 20, 0.35)',
      side: '#5a4026', skin: '#6e5236', flesh: '#efe2c4', core: '#dcc79c', seed: '#c9b07e', face: 'burdock',
      cut: '#e8d8b4', end: 'root', endColor: '#5a4026', juice: 'rgba(235, 220, 190, 0.9)',
    },
    {
      id: 'daikon', diam: 60, len: [150, 180], speed: [4, 12], stub: 20, press: 200,
      body: ['#ffffff', '#fbfbf6', '#e8eadf', '#c9cdbb'], bumps: 'rgba(150, 150, 130, 0.22)',
      side: '#d3d7c6', skin: '#eef0e6', flesh: '#fcfcf6', core: '#f1f4e6', seed: '#e3e7d6', face: 'daikon',
      cut: '#f6f8ee', end: 'leaves', endColor: '#5a9a3a', juice: 'rgba(245, 248, 238, 0.95)',
    },
  ];
  let veg = VEGS[0];
  const GRADES = [
    { max: 1.0, pts: 100, color: '#e0402a', combo: true },
    { max: 2.0, pts: 60, color: '#e8a33d', combo: true },
    { max: 3.5, pts: 30, color: '#3f8f2f', combo: true },
    { max: 6.0, pts: 10, color: '#6b7a5e', combo: false },
    { max: Infinity, pts: 2, color: '#8a6d4f', combo: false },
  ];
  const RANKS = [
    { min: 16000 }, // 伝説のきゅうり仙人
    { min: 11000 }, // 料亭の花板
    { min: 7000 }, // 一人前の板前
    { min: 3500 }, // 修行中の若衆
    { min: 1000 }, // 見習い
    { min: 0 }, // きゅうりに負けた人
  ];

  // 表示言語に合わせた文言（js/i18n.js）
  const tr = (key, vars) => I18N.t(key, vars);
  const fmt = n => n.toLocaleString(I18N.lang === 'ja' ? 'ja-JP' : 'en-US');

  // Android アプリ（Capacitor）で動いているか
  const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const plugin = name => (NATIVE && window.Capacitor.Plugins ? window.Capacitor.Plugins[name] : null);

  // ===== キャンバス =====
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  }
  window.addEventListener('resize', resize);

  // ===== 効果音 (Web Audio で合成) =====
  let actx = null, master = null, noiseBuf = null, muted = false;
  try { muted = localStorage.getItem('cuke-muted') === '1'; } catch (e) {}
  function initAudio() {
    if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    actx = new AC();
    master = actx.createGain();
    master.gain.value = muted ? 0 : 0.8;
    master.connect(actx.destination);
    noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.5, actx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  // 広告の表示中やアプリが裏に回ったときに音を止める（js/ads.js からも使う）
  window.Sfx = {
    suspend() { if (actx && actx.state === 'running') actx.suspend().catch(() => {}); },
    resume() { if (actx && actx.state === 'suspended' && !document.hidden) actx.resume().catch(() => {}); },
  };
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function tone(freq, dur, type = 'sine', vol = 0.3, when = 0, slideTo = null) {
    if (!actx) return;
    const t = actx.currentTime + when;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    env(g, t, 0.005, vol, dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, filterType, freq, q, vol, when = 0) {
    if (!actx) return;
    const t = actx.currentTime + when;
    const src = actx.createBufferSource();
    src.buffer = noiseBuf;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const f = actx.createBiquadFilter();
    f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = actx.createGain();
    env(g, t, 0.002, vol, dur);
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random() * 0.3); src.stop(t + dur + 0.05);
  }
  const sfx = {
    // シャキッ（きゅうりを切る音）＋ トン（まな板）
    chop(thick) {
      noise(0.05, 'highpass', 3500 + Math.random() * 1500, 0.8, 0.35);
      noise(0.03, 'bandpass', 1800, 2, 0.25, 0.01);
      tone(150 + Math.random() * 20, 0.09, 'sine', 0.55, 0.012, 70);
      noise(0.04, 'lowpass', 600, 1, 0.3, 0.012);
      if (thick > 6) tone(90, 0.12, 'triangle', 0.25, 0.015, 50); // ドスッ
    },
    whiff() { // 空振り: スカッ＋トン
      noise(0.12, 'bandpass', 900, 0.7, 0.18);
      tone(160, 0.08, 'sine', 0.45, 0.01, 80);
      tone(220, 0.15, 'square', 0.06, 0.02, 110);
    },
    grade(i, combo) {
      if (i === 0) { // 神業: キラーン
        const base = 1320 + Math.min(combo, 30) * 12;
        tone(base, 0.12, 'triangle', 0.12, 0.02);
        tone(base * 1.5, 0.18, 'triangle', 0.1, 0.07);
      } else if (i === 1) {
        tone(990 + Math.min(combo, 30) * 10, 0.1, 'triangle', 0.08, 0.02);
      }
    },
    comboUp(n) { // 10コンボごと
      [0, 4, 7, 12].forEach((s, k) => tone(660 * Math.pow(2, s / 12), 0.12, 'square', 0.06, k * 0.06));
    },
    comboBreak() { tone(330, 0.18, 'sawtooth', 0.06, 0, 160); },
    newCuke() { // コロコロ
      noise(0.08, 'bandpass', 400, 3, 0.15);
      tone(500, 0.06, 'sine', 0.12, 0.0, 700);
      tone(600, 0.06, 'sine', 0.12, 0.07, 850);
    },
    press() { // ググッ（かたい野菜に刃が入る）
      noise(Math.max(0.08, veg.press / 1000), 'bandpass', 700, 1.5, 0.12);
      tone(110, Math.max(0.08, veg.press / 1000), 'sawtooth', 0.04, 0, 90);
    },
    shallow() { // 浅い！
      tone(300, 0.1, 'square', 0.06, 0, 200);
      noise(0.05, 'highpass', 2500, 0.8, 0.12);
    },
    toss() { tone(400, 0.12, 'sine', 0.12, 0, 200); },
    count() { tone(880, 0.12, 'square', 0.12); },
    go() { tone(1320, 0.35, 'square', 0.14); tone(1760, 0.35, 'triangle', 0.1, 0.02); },
    tick() { tone(1500, 0.04, 'square', 0.06); },
    finish() {
      tone(1046, 0.25, 'square', 0.12);
      tone(784, 0.25, 'square', 0.12, 0.18);
      tone(1046, 0.6, 'square', 0.12, 0.36);
      tone(1318, 0.6, 'triangle', 0.08, 0.36);
    },
    fanfare(good) {
      const notes = good ? [0, 4, 7, 12, 7, 12, 16] : [0, 4, 7, 12];
      notes.forEach((s, k) => tone(523 * Math.pow(2, s / 12), 0.2, 'triangle', 0.13, k * 0.11));
    },
    click() { tone(700, 0.05, 'triangle', 0.12); },
  };
  const muteBtn = document.getElementById('mute');
  function updateMute() {
    muteBtn.textContent = muted ? '🔇' : '🔊';
    if (master) master.gain.value = muted ? 0 : 0.8;
  }
  muteBtn.addEventListener('pointerdown', e => e.stopPropagation());
  muteBtn.addEventListener('click', e => {
    e.stopPropagation();
    muted = !muted;
    try { localStorage.setItem('cuke-muted', muted ? '1' : '0'); } catch (err) {}
    initAudio(); updateMute();
    sfx.click();
  });
  updateMute();

  // ===== ベストスコア・挑戦できる野菜（端末に保存） =====
  const bestKey = v => (v.id === 'cucumber' ? 'cuke-best' : `cuke-best-${v.id}`);
  function loadBest(v = veg) { try { return +localStorage.getItem(bestKey(v)) || 0; } catch (e) { return 0; } }
  function saveBest(val, v = veg) { try { localStorage.setItem(bestKey(v), String(val)); } catch (e) {} }
  // 挑戦できる野菜の数。自己ベストからも判定するので、保存が消えても大きくは戻らない
  function unlockedCount() {
    let n = 1;
    while (n < VEGS.length && loadBest(VEGS[n - 1]) >= UNLOCK_SCORE) n++;
    return n;
  }
  try {
    const savedVeg = VEGS.findIndex(v => v.id === localStorage.getItem('cuke-veg'));
    if (savedVeg > 0 && savedVeg < unlockedCount()) veg = VEGS[savedVeg];
  } catch (e) {}

  // ===== ゲーム状態 =====
  let state = 'title'; // title | countdown | play | finish | result
  let g = null;
  let knifeT = 1;      // 0 = 振り下ろし直後, 1 = 上
  let shake = 0;
  let slices = [];     // まな板に積まれた輪切り
  let flying = [];     // 倒れていく途中の輪切り
  let popups = [];
  let particles = [];
  let stubs = [];      // 捨てられるヘタ

  function newCucumber() {
    return {
      len: veg.len[0] + Math.random() * (veg.len[1] - veg.len[0]),   // mm
      pos: 0,                          // 包丁を越えた長さ (mm)
      lastCut: 0,                      // 最後に切った位置 (mm)
      enterT: 0.45,                    // スライドイン中の残り秒
      bend: (Math.random() - 0.5) * 6,
      seed: Math.random() * 1000,
    };
  }

  function resetGame() {
    g = {
      time: GAME_TIME,
      score: 0,
      combo: 0, maxCombo: 0,
      count: 0, chops: 0,
      sumThick: 0, minThick: Infinity, god: 0,
      cuke: newCucumber(),
      countdown: 3.0,
      lastTick: 4,
      finishT: 0,
    };
    g.cuke.enterT = 0;
    slices = []; flying = []; popups = []; particles = []; stubs = [];
    knifeT = 1;
  }

  function speedNow() {
    const p = 1 - g.time / GAME_TIME;
    return veg.speed[0] + (veg.speed[1] - veg.speed[0]) * p;
  }

  function chop() {
    if (state !== 'play') return;
    knifeT = 0;
    g.chops++;
    const c = g.cuke;
    const pending = c.pos - c.lastCut;
    if (c.enterT > 0 || pending < 0.3) {
      // 空振り
      sfx.whiff();
      if (g.combo >= 3) sfx.comboBreak();
      g.combo = 0;
      addPopup(tr('pop.miss'), '#888', KNIFE_X, BOARD_Y - veg.diam * S - 30, 22, true);
      shake = 4;
      return;
    }
    const t = pending;
    c.lastCut = c.pos;
    const gi = GRADES.findIndex(gr => t < gr.max);
    const gr = GRADES[gi];
    if (gr.combo) {
      g.combo++;
      if (g.combo % 10 === 0) sfx.comboUp(g.combo);
    } else {
      if (g.combo >= 3) sfx.comboBreak();
      g.combo = 0;
    }
    g.maxCombo = Math.max(g.maxCombo, g.combo);
    const mult = gr.combo ? Math.min(3, 1 + Math.floor(g.combo / 10) * 0.5) : 1;
    const pts = Math.round(gr.pts * mult);
    g.score += pts;
    g.count++;
    g.sumThick += t;
    g.minThick = Math.min(g.minThick, t);
    if (gi === 0) g.god++;

    sfx.chop(t);
    sfx.grade(gi, g.combo);
    shake = t > 6 ? 6 : 2;

    // 切れた輪切りを倒す
    flying.push({
      x: KNIFE_X - t * S / 2 - 2,
      thick: t,
      age: 0,
      tx: 40 + Math.random() * (KNIFE_X - 170),
      ty: BOARD_Y + 10 + Math.random() * 100,
      rot: Math.random() * Math.PI * 2,
    });
    // 水しぶき
    for (let i = 0; i < 6; i++) {
      particles.push({
        x: KNIFE_X, y: BOARD_Y - Math.random() * veg.diam * S,
        vx: -60 - Math.random() * 160, vy: -80 - Math.random() * 180,
        life: 0.4 + Math.random() * 0.3, age: 0,
      });
    }
    addPopup(`${tr('grade.' + gi)} ${t.toFixed(1)}mm`, gr.color, KNIFE_X - 60, BOARD_Y - veg.diam * S - 40, gi <= 1 ? 30 : 24, true);
    if (mult > 1) {
      popups = popups.filter(p => !p.multMsg);
      addPopup(`+${pts} ×${mult}`, '#d1452f', KNIFE_X - 60, BOARD_Y - veg.diam * S - 4, 18);
      popups[popups.length - 1].multMsg = true;
    }

    // きゅうりの終わり
    if (c.len - c.lastCut <= veg.stub + 0.3) finishCucumber();
  }

  function finishCucumber() {
    stubs.push({ x: KNIFE_X, len: g.cuke.len - g.cuke.lastCut, age: 0, seed: g.cuke.seed });
    sfx.toss();
    g.cuke = newCucumber();
    setTimeout(() => { if (state === 'play') sfx.newCuke(); }, 120);
  }

  function addPopup(text, color, x, y, size, chopMsg = false) {
    if (chopMsg) popups = popups.filter(p => !p.chopMsg);
    popups.push({ text, color, x, y, size, age: 0, chopMsg });
  }

  // ===== 入力 =====
  // かたい野菜は、押しているあいだ包丁が沈み、press ミリ秒押し続けると切れる
  let pressing = null; // { t0, done }
  function onPress(e) {
    initAudio();
    if (state !== 'play') return;
    e && e.preventDefault && e.preventDefault();
    if (!veg.press) { chop(); return; }
    if (pressing) return;
    pressing = { t0: performance.now(), done: false };
    sfx.press();
  }
  function onRelease() {
    if (!pressing) return;
    const p = pressing;
    pressing = null;
    if (p.done || state !== 'play') return;
    // 切れる前に離した
    knifeT = 0.3;
    sfx.shallow();
    addPopup(tr('pop.shallow'), '#8a6d4f', KNIFE_X, BOARD_Y - veg.diam * S - 30, 22, true);
  }
  function updatePress() {
    if (!pressing || pressing.done) return;
    if (state !== 'play') { pressing = null; return; }
    if (performance.now() - pressing.t0 >= veg.press) {
      pressing.done = true;
      chop();
    }
  }
  const pressProgress = () => (pressing && !pressing.done ? Math.min(1, (performance.now() - pressing.t0) / veg.press) : 0);
  canvas.addEventListener('pointerdown', onPress);
  canvas.addEventListener('pointerup', onRelease);
  canvas.addEventListener('pointercancel', onRelease);
  canvas.addEventListener('pointerleave', onRelease);
  window.addEventListener('keyup', e => {
    if (e.code === 'Space' || e.code === 'Enter' || /^Key[A-Z]$/.test(e.code)) onRelease();
  });
  window.addEventListener('blur', onRelease);
  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'Enter' || /^Key[A-Z]$/.test(e.code)) {
      if (userPaused) { e.preventDefault(); setUserPaused(false); }
      else if (state === 'play') { e.preventDefault(); onPress(e); }
      else if ((state === 'title' || state === 'result') && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault(); startGame();
      }
    }
  });

  const titleEl = document.getElementById('title');
  const resultEl = document.getElementById('result');
  // スマホ: スタート時にフルスクリーン＋横向き固定を試す（対応ブラウザのみ。iPhone は回転の案内で対応）
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  function goLandscape() {
    if (!isTouch || NATIVE) return; // アプリは AndroidManifest で横画面に固定している
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req || document.fullscreenElement || document.webkitFullscreenElement) return lockLandscape();
    try {
      const r = req.call(el, { navigationUI: 'hide' });
      if (r && r.then) r.then(lockLandscape, () => {});
    } catch (e) {}
  }
  function lockLandscape() {
    try {
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    } catch (e) {}
  }
  function startFromButton() { goLandscape(); startGame(); }
  document.getElementById('startBtn').addEventListener('click', startFromButton);
  // 2 回に 1 回、「もう一回！」の前に全画面広告を出す（Android アプリのみ）
  let retryCount = 0, retryBusy = false;
  document.getElementById('retryBtn').addEventListener('click', async () => {
    if (retryBusy) return;
    retryBusy = true;
    initAudio();
    retryCount++;
    if (retryCount % 2 === 0) await Ads.showInterstitial();
    retryBusy = false;
    startFromButton();
  });

  // 縦向きのスマホでは案内を出し、プレイ中なら一時停止
  const rotateEl = document.getElementById('rotate');
  let allowPortrait = false;
  let paused = false;
  function needsRotate() {
    return isTouch && !NATIVE && !allowPortrait && window.innerHeight > window.innerWidth && window.innerWidth < 700;
  }
  function checkOrientation() {
    const show = needsRotate();
    rotateEl.hidden = !show;
    if (show && (state === 'play' || state === 'countdown')) {
      paused = true;
    } else if (!show && paused) {
      paused = false;
      resumeCountdown();
    }
    resize();
  }
  function resumeCountdown() {
    if (!g || (state !== 'play' && state !== 'countdown')) return;
    g.countdown = 3.0;
    g.lastTick = 4;
    g.resumed = true;
    state = 'countdown';
  }
  document.getElementById('portraitBtn').addEventListener('click', () => {
    initAudio(); sfx.click();
    allowPortrait = true;
    checkOrientation();
  });
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', () => setTimeout(checkOrientation, 200));
  // ===== 一時停止（戻るボタン・アプリが裏に回ったとき） =====
  const pauseEl = document.getElementById('pauseOv');
  let userPaused = false;
  function setUserPaused(on) {
    if (on) {
      if (userPaused || (state !== 'play' && state !== 'countdown')) return;
      userPaused = true;
      pauseEl.classList.remove('hidden');
    } else {
      if (!userPaused) return;
      userPaused = false;
      pauseEl.classList.add('hidden');
      initAudio();
      resumeCountdown();
    }
  }
  pauseEl.addEventListener('pointerdown', e => { e.preventDefault(); setUserPaused(false); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { setUserPaused(true); Sfx.suspend(); }
    else if (!Ads.showing) Sfx.resume();
  });
  // Android の戻るボタン：プレイ中はポーズ切替、タイトル・結果画面ではアプリを閉じる
  if (plugin('App')) {
    plugin('App').addListener('backButton', () => {
      if (state === 'title' || state === 'result') plugin('App').exitApp();
      else if (state === 'continue') giveUp();
      else if (state === 'play' || state === 'countdown') setUserPaused(!userPaused);
    });
  }

  // ===== 広告を見て延長（リワード広告。Android アプリのみ、1 ゲーム 1 回） =====
  const contEl = document.getElementById('continue');
  const contMsg = document.getElementById('contMsg');
  const CONTINUE_SEC = 10;
  let contBusy = false;
  function canContinue() { return Ads.available && !g.continued; }
  // 連打の勢いでボタンを押してしまわないよう、表示から少しのあいだは押せないようにする
  const CONTINUE_GUARD_MS = 1500;
  let contShownAt = 0;
  const contGuarded = () => performance.now() - contShownAt < CONTINUE_GUARD_MS;
  function showContinue() {
    state = 'continue';
    contShownAt = performance.now();
    g.contT = 10;
    contBusy = false;
    contMsg.hidden = true;
    document.getElementById('contSec').textContent = '10';
    contEl.classList.remove('hidden');
  }
  function hideContinue() { contEl.classList.add('hidden'); }
  function giveUp() {
    if (state !== 'continue' || contBusy) return;
    hideContinue();
    showResult();
  }
  document.getElementById('contNoBtn').addEventListener('click', () => {
    if (contGuarded()) return;
    sfx.click(); giveUp();
  });
  document.getElementById('contAdBtn').addEventListener('click', async () => {
    if (state !== 'continue' || contBusy || contGuarded()) return;
    contBusy = true;
    sfx.click();
    const result = await Ads.showRewarded();
    contBusy = false;
    if (state !== 'continue') return;
    if (result === 'rewarded') {
      hideContinue();
      g.continued = true;
      g.time = CONTINUE_SEC;
      state = 'play';
      resumeCountdown();
    } else {
      contMsg.textContent = tr(result === 'skipped' ? 'cont.skipped' : 'cont.fail');
      contMsg.hidden = false;
      g.contT = Math.max(g.contT, 5);
    }
  });

  // どのビルドが入っているか分かるよう、アプリ版はタイトル画面にバージョンを出す
  if (window.APP_VERSION && window.APP_VERSION !== 'dev') document.getElementById('buildInfo').textContent = window.APP_VERSION;
  // EU など同意が必要な地域では、タイトル画面から広告の同意内容を変更できるようにする
  Ads.initDone.then(() => { if (Ads.privacyOptionsRequired) document.getElementById('adPrivacy').hidden = false; });
  document.getElementById('adPrivacyLink').addEventListener('click', e => { e.preventDefault(); Ads.showPrivacyOptions(); });
  // アプリではキー操作の案内を出さない
  // 言語に合わせてタイトル画面の文言を出す（アプリではキー操作の案内を出さない）
  const vegName = v => tr('veg.' + v.id);
  function renderTexts() {
    I18N.apply();
    let rules = tr('title.rules', { veg: tr('veg.lc.' + veg.id), ctl: tr(NATIVE ? 'ctl.tc' : 'ctl.kb') });
    if (veg.press) rules += tr('rule.press', { veg: vegName(veg), why: tr('why.' + veg.id) });
    document.getElementById('rulesText').innerHTML = rules;
    renderVegSel();
    showBest();
  }
  // タイトル画面の野菜選び。まだ挑戦できない野菜には条件を出す
  const vegSelEl = document.getElementById('vegSel');
  function renderVegSel() {
    const open = unlockedCount();
    vegSelEl.textContent = '';
    VEGS.forEach((v, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'vegBtn' + (v === veg ? ' on' : '') + (i >= open ? ' locked' : '');
      b.disabled = i >= open;
      const sw = document.createElement('span');
      sw.className = 'vegSwatch';
      sw.style.background = `radial-gradient(circle, ${v.core} 0 30%, ${v.flesh} 31% 72%, ${v.skin} 73%)`;
      const name = document.createElement('span');
      name.className = 'vegName';
      name.textContent = (i >= open ? '🔒 ' : '') + vegName(v);
      const sub = document.createElement('span');
      sub.className = 'vegSub';
      const best = loadBest(v);
      sub.textContent = i >= open
        ? tr('veg.lock', { prev: vegName(VEGS[i - 1]), n: fmt(UNLOCK_SCORE) })
        : best ? tr('veg.best', { n: fmt(best) }) : '';
      b.append(sw, name, sub);
      b.addEventListener('click', () => { initAudio(); sfx.click(); selectVeg(v); });
      vegSelEl.appendChild(b);
    });
  }
  function selectVeg(v) {
    veg = v;
    try { localStorage.setItem('cuke-veg', v.id); } catch (e) {}
    slices = [];
    renderTexts();
  }
  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => {
    initAudio(); sfx.click();
    I18N.setLang(b.dataset.lang);
  }));
  I18N.onChange(renderTexts);

  document.getElementById('nextBtn').addEventListener('click', () => {
    const next = VEGS[VEGS.indexOf(veg) + 1];
    if (!next) return;
    selectVeg(next);
    document.getElementById('retryBtn').click(); // 「もう一回！」と同じ流れ（広告の回数も共通）
  });
  document.getElementById('titleBtn').addEventListener('click', () => {
    initAudio(); sfx.click();
    resultEl.classList.add('hidden');
    titleEl.classList.remove('hidden');
    state = 'title';
    renderTexts();
  });

  function showBest() {
    const b = loadBest();
    const txt = b ? tr('best', { n: fmt(b) }) : '';
    document.getElementById('bestTitle').textContent = txt;
  }

  function startGame() {
    initAudio();
    sfx.click();
    titleEl.classList.add('hidden');
    resultEl.classList.add('hidden');
    resetGame();
    state = 'countdown';
  }

  function endGame() {
    state = 'finish';
    g.finishT = 1.4;
    sfx.finish();
  }

  function showResult() {
    state = 'result';
    const best = loadBest();
    const isNew = g.score > best;
    const openBefore = unlockedCount();
    if (isNew) saveBest(g.score);
    // 次の野菜に挑戦できるなら、そのボタンを出す（今回はじめて挑戦できるようになったら 🔓 を付ける）
    const vi = VEGS.indexOf(veg);
    const next = VEGS[vi + 1];
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.hidden = !(next && vi + 1 < unlockedCount());
    if (next) nextBtn.textContent = tr(vi + 1 >= openBefore ? 'res.unlocked' : 'res.next', { veg: vegName(next) });
    const rankName = tr('rank.' + RANKS.findIndex(r => g.score >= r.min));
    document.getElementById('rRank').textContent = tr('res.rank', { veg: vegName(veg), r: rankName });
    document.getElementById('rScore').textContent = fmt(g.score);
    document.getElementById('rCount').textContent = tr('unit.slices', { n: g.count });
    document.getElementById('rSpeed').textContent = tr('unit.cps', { n: (g.chops / (GAME_TIME + (g.continued ? CONTINUE_SEC : 0))).toFixed(1) });
    document.getElementById('rAvg').textContent = g.count ? `${(g.sumThick / g.count).toFixed(2)} mm` : '- mm';
    document.getElementById('rMin').textContent = g.count ? `${g.minThick.toFixed(2)} mm` : '- mm';
    document.getElementById('rGod').textContent = tr('unit.slices', { n: g.god });
    document.getElementById('rCombo').textContent = `${g.maxCombo}`;
    document.getElementById('rNew').style.display = isNew && g.score > 0 ? 'block' : 'none';
    document.getElementById('bestResult').textContent = tr('best', { n: fmt(Math.max(best, g.score)) });
    setupShare(rankName);
    resultEl.classList.remove('hidden');
    sfx.fanfare(isNew || g.score >= UNLOCK_SCORE);
  }

  // ===== シェア =====
  // シェアには techgym.jp の紹介記事の URL を付ける
  const SHARE_URL = 'https://techgym.jp/column/claude-code-game-cucumber/';
  function shareUrl() {
    return SHARE_URL;
  }
  let shareText = '';
  function setupShare(rankName) {
    // X で弾かれないよう、ちゃぶ台返しと同じく1行・絵文字なしの文にする
    const detail = g.count ? tr('share.detail', { n: g.count, avg: (g.sumThick / g.count).toFixed(2) }) : '';
    const tag = veg.id === 'cucumber' ? '' : tr('veg.tag', { veg: vegName(veg) });
    shareText = tr('share.text', { tag, score: fmt(g.score), rank: rankName, detail });
    const url = shareUrl();
    const enc = encodeURIComponent;
    document.getElementById('shareX').href =
      `https://twitter.com/intent/tweet?text=${enc(shareText)}${url ? `&url=${enc(url)}` : ''}`;
    document.getElementById('shareLine').href =
      `https://line.me/R/share?text=${enc(shareText + (url ? ` ${url}` : ''))}`;
    const fb = document.getElementById('shareFb');
    fb.hidden = !url;
    fb.href = `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`;
    document.getElementById('shareMore').hidden = !(plugin('Share') || navigator.share);
    // アプリでは Android の共有メニュー（「シェア」ボタン）だけを出す
    for (const id of ['shareX', 'shareLine', 'shareFb', 'shareCopy']) {
      if (NATIVE) document.getElementById(id).hidden = true;
    }
  }
  document.getElementById('shareMore').addEventListener('click', async () => {
    const url = shareUrl();
    const nativeShare = plugin('Share');
    if (nativeShare) {
      try { await nativeShare.share({ title: tr('game.name'), text: shareText, url, dialogTitle: tr('share.dialog') }); } catch (e) { /* キャンセル */ }
      return;
    }
    const data = { title: tr('game.name'), text: shareText };
    if (url) data.url = url;
    navigator.share(data).catch(() => {});
  });
  const copyBtn = document.getElementById('shareCopy');
  copyBtn.addEventListener('click', () => {
    const url = shareUrl();
    const text = shareText + (url ? `\n${url}` : '');
    const done = () => {
      sfx.click();
      copyBtn.textContent = tr('share.copied');
      setTimeout(() => { copyBtn.textContent = tr('share.copy'); }, 1600);
    };
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  });

  // ===== 更新 =====
  function update(dt) {
    knifeT = Math.min(1, knifeT + dt * 9);
    shake = Math.max(0, shake - dt * 40);

    if (paused || userPaused) { pressing = null; return; }
    updatePress();
    if (state === 'countdown') {
      g.countdown -= dt;
      const n = Math.ceil(g.countdown);
      if (n < g.lastTick && n >= 1) { g.lastTick = n; sfx.count(); }
      if (g.countdown <= 0) {
        state = 'play';
        g.lastTick = Math.min(6, Math.ceil(g.time) + 1);
        sfx.go();
        addPopup(tr(g.resumed ? 'pop.resume' : 'pop.start'), '#d1452f', W / 2 - 60, 200, 56);
        g.resumed = false;
      }
    } else if (state === 'play') {
      g.time -= dt;
      const sec = Math.ceil(g.time);
      if (g.time > 0 && g.time <= 5 && sec < g.lastTick) { g.lastTick = sec; sfx.tick(); }
      if (g.time > 5) g.lastTick = 6;
      const c = g.cuke;
      if (c.enterT > 0) {
        c.enterT -= dt;
      } else {
        c.pos = Math.min(c.len - veg.stub, c.pos + speedNow() * dt);
      }
      if (g.time <= 0) { g.time = 0; endGame(); }
    } else if (state === 'finish') {
      g.finishT -= dt;
      if (g.finishT <= 0) {
        if (canContinue()) showContinue();
        else showResult();
      }
    } else if (state === 'continue') {
      // 広告の表示中は時間を止める
      if (!contBusy && !Ads.showing) {
        g.contT -= dt;
        document.getElementById('contSec').textContent = String(Math.max(0, Math.ceil(g.contT)));
        if (g.contT <= 0) giveUp();
      }
    }

    for (const f of flying) f.age += dt;
    for (let i = flying.length - 1; i >= 0; i--) {
      if (flying[i].age >= 0.35) {
        slices.push(flying[i]);
        flying.splice(i, 1);
      }
    }
    if (slices.length > 140) slices.splice(0, slices.length - 140);
    for (const p of popups) p.age += dt;
    popups = popups.filter(p => p.age < 0.8);
    for (const p of particles) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; }
    particles = particles.filter(p => p.age < p.life);
    for (const s of stubs) s.age += dt;
    stubs = stubs.filter(s => s.age < 0.8);
  }

  // ===== 描画 =====
  function drawBackground() {
    // 壁
    const wall = ctx.createLinearGradient(0, 0, 0, BOARD_Y);
    wall.addColorStop(0, '#fbf6e6'); wall.addColorStop(1, '#efe6cc');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, H);
    // タイル
    ctx.strokeStyle = 'rgba(180, 165, 120, 0.25)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 300); ctx.stroke(); }
    for (let y = 0; y <= 300; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // 調理台
    ctx.fillStyle = '#b9b2a0';
    ctx.fillRect(0, 300, W, H - 300);
    // まな板
    const by = 300;
    const bg = ctx.createLinearGradient(0, by, 0, H);
    bg.addColorStop(0, '#e9c98f'); bg.addColorStop(1, '#d4a865');
    ctx.fillStyle = bg;
    roundRect(20, by + 20, W - 40, H - by - 10, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140, 95, 40, 0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      const y = by + 40 + i * 22;
      ctx.moveTo(40, y);
      for (let x = 40; x < W - 40; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 3);
      ctx.stroke();
    }
    ctx.fillStyle = '#c4955a';
    ctx.fillRect(20, H - 14, W - 40, 14);
  }

  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 輪切りの断面（上から見た図）。野菜ごとに皮・身・種の描き方を変える
  function drawSliceFace(x, y, r, thick, rot) {
    const v = veg;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    // 薄いほど透ける
    const alpha = Math.max(0.45, Math.min(1, 0.4 + thick * 0.18));
    ctx.globalAlpha = alpha;
    const oval = (rx, ry = rx * 0.62, dy = 0) => { ctx.beginPath(); ctx.ellipse(0, dy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
    // 影・側面の厚み・皮
    ctx.fillStyle = 'rgba(80, 50, 10, 0.18)';
    ctx.beginPath(); ctx.ellipse(2, 3 + thick * 0.6, r, r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = v.side; oval(r, r * 0.62, thick * 0.6);
    ctx.fillStyle = v.skin; oval(r);
    const skinW = v.face === 'daikon' ? 0.95 : v.face === 'eggplant' ? 0.92 : 0.86;
    ctx.fillStyle = v.flesh; oval(r * skinW);
    ctx.fillStyle = v.core; oval(r * 0.5);
    ctx.fillStyle = v.seed;
    if (v.face === 'cucumber') {
      for (let k = 0; k < 3; k++) {
        const a = k * Math.PI * 2 / 3 + 0.5;
        for (let j = 0; j < 2; j++) {
          const rr = r * (0.22 + j * 0.14);
          ctx.beginPath();
          ctx.ellipse(Math.cos(a) * rr, Math.sin(a) * rr * 0.62, r * 0.07, r * 0.045, a, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (v.face === 'eggplant') {
      // 身の中に小さな種が散らばる
      for (let k = 0; k < 18; k++) {
        const a = k * 2.399, rr = r * (0.18 + (k % 4) * 0.1);
        ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.62, Math.max(0.8, r * 0.035), 0, Math.PI * 2); ctx.fill();
      }
    } else if (v.face === 'burdock') {
      // 年輪のような輪と、中心の筋
      ctx.strokeStyle = v.seed; ctx.lineWidth = Math.max(0.8, r * 0.06);
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.68, r * 0.68 * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
      oval(r * 0.18);
    } else if (v.face === 'daikon') {
      // 中心から広がる細い筋
      ctx.strokeStyle = v.seed; ctx.lineWidth = 1;
      for (let k = 0; k < 12; k++) {
        const a = k * Math.PI / 6;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8 * 0.62); ctx.stroke();
      }
    }
    ctx.restore();
  }
  // まな板に積む輪切りの大きさ（大根でも大きくなりすぎないようにする）
  const pileR = () => Math.min(48, veg.diam * S / 2 * 0.55);

  function cucumberPath(x0, x1, top, bot, roundL, roundR) {
    const h = bot - top, r = h / 2;
    ctx.beginPath();
    if (roundL) { ctx.moveTo(x0 + r, top); } else { ctx.moveTo(x0, top); }
    ctx.lineTo(x1 - (roundR ? r : 0), top);
    if (roundR) ctx.arc(x1 - r, top + r, r, -Math.PI / 2, Math.PI / 2);
    else ctx.lineTo(x1, bot);
    ctx.lineTo(x0 + (roundL ? r : 0), bot);
    if (roundL) ctx.arc(x0 + r, top + r, r, Math.PI / 2, Math.PI * 1.5);
    else ctx.lineTo(x0, top);
    ctx.closePath();
  }

  function fillCucumberBody(x0, x1, top, bot, seed) {
    const v = veg;
    const gr = ctx.createLinearGradient(0, top, 0, bot);
    gr.addColorStop(0, v.body[0]);
    gr.addColorStop(0.25, v.body[1]);
    gr.addColorStop(0.55, v.body[2]);
    gr.addColorStop(1, v.body[3]);
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.save();
    ctx.clip();
    const rnd = (i, a, b) => ((Math.sin(seed + i * a) * b) % 1 + 1) % 1;
    if (v.face === 'burdock') {
      // 牛蒡は細い筋
      ctx.strokeStyle = v.bumps; ctx.lineWidth = 1;
      for (let i = 0; i < 40; i++) {
        const px = x0 + rnd(i, 12.9898, 43758.5453) * (x1 - x0);
        const py = top + rnd(i, 78.233, 12345.678) * (bot - top);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 14 + rnd(i, 3.1, 999.1) * 30, py); ctx.stroke();
      }
    } else if (v.bumps) {
      // きゅうりのイボイボ、大根の細かい点
      ctx.fillStyle = v.bumps;
      for (let i = 0; i < 80; i++) {
        const px = x0 + rnd(i, 12.9898, 43758.5453) * (x1 - x0);
        const py = top + rnd(i, 78.233, 12345.678) * (bot - top);
        ctx.beginPath(); ctx.arc(px, py, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    // つや（茄子は強め）
    ctx.fillStyle = v.face === 'eggplant' ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.18)';
    ctx.fillRect(x0, top + (bot - top) * 0.15, x1 - x0, (bot - top) * 0.1);
    ctx.restore();
  }

  // 右端（手で持つ側）の飾り：きゅうりのヘタ、茄子のガク、牛蒡の根の先、大根の葉
  function drawVegEnd(x, cy, h) {
    const v = veg;
    ctx.save();
    ctx.fillStyle = v.endColor;
    if (v.end === 'calyx') {
      ctx.beginPath();
      ctx.moveTo(x - h * 0.35, cy - h * 0.5);
      for (let i = 0; i <= 6; i++) {
        const yy = cy - h * 0.5 + (h * i) / 6;
        ctx.lineTo(x - h * (i % 2 ? 0.1 : 0.4), yy);
      }
      ctx.lineTo(x + 6, cy + h * 0.3); ctx.lineTo(x + 6, cy - h * 0.3);
      ctx.closePath(); ctx.fill();
      ctx.fillRect(x + 4, cy - 5, 18, 10);
    } else if (v.end === 'leaves') {
      ctx.fillStyle = '#c9e2a4';
      ctx.fillRect(x - 8, cy - h * 0.45, 12, h * 0.9);
      ctx.fillStyle = v.endColor;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.ellipse(x + 26, cy + i * h * 0.16, 30, 8, i * 0.25, 0, Math.PI * 2); ctx.fill();
      }
    } else if (v.end === 'root') {
      ctx.beginPath(); ctx.ellipse(x + 2, cy, 5, h * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.ellipse(x + 4, cy, 6, 9, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawCucumber() {
    if (!g) return;
    const c = g.cuke;
    const h = veg.diam * S;
    const top = BOARD_Y - h, bot = BOARD_Y;
    const enterOff = c.enterT > 0 ? (c.enterT / 0.45) * 500 : 0;
    const pending = c.pos - c.lastCut;
    // 包丁より右側（まだ切っていない本体）
    const xCutFace = KNIFE_X - pending * S + enterOff;
    const xRight = KNIFE_X + (c.len - c.pos) * S + enterOff;
    const startRound = c.lastCut === 0;
    cucumberPath(xCutFace, xRight, top, bot, startRound, true);
    fillCucumberBody(xCutFace, xRight, top, bot, c.seed);
    // 切り口
    if (!startRound) {
      ctx.fillStyle = veg.cut;
      ctx.beginPath();
      ctx.ellipse(xCutFace, (top + bot) / 2, 4, h / 2 - 1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // ヘタなど
    drawVegEnd(xRight, (top + bot) / 2, h);
    // 包丁位置の目安線（切る前の部分）
    drawHand(xRight - 26, top, h);
  }

  function drawHand(x, top, h) {
    // 猫の手（左手）
    ctx.save();
    ctx.fillStyle = '#f5cfa8';
    ctx.strokeStyle = '#c99a72';
    ctx.lineWidth = 2;
    roundRect(x, top - 34, 120, 54, 26);
    ctx.fill(); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(x + 10 + i * 4, top - 8 + i * 8, 14, 10, 0.3, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    // 腕
    ctx.fillStyle = '#f5cfa8';
    ctx.fillRect(x + 90, top - 30, 200, 44);
    ctx.fillStyle = '#4a7bb5';
    ctx.fillRect(x + 150, top - 36, 200, 56);
    ctx.restore();
  }

  function drawKnife() {
    // 振り下ろしアニメ: knifeT 0 → 下, 1 → 上
    const h = veg.diam * S;
    const e = knifeT < 0.25 ? 0 : (knifeT - 0.25) / 0.75;
    const lift = 20 + (1 - Math.pow(1 - e, 2)) * 60;
    const blendDown = knifeT < 0.25;
    const prog = pressProgress();
    // 長押し中は刃が少しずつ沈む
    const bladeBottom = prog > 0 ? BOARD_Y - h * (1 - prog) * 0.95 - 2 : blendDown ? BOARD_Y : BOARD_Y - h - lift;
    const bladeTop = bladeBottom - 200;
    ctx.save();
    // 刃（少し斜めから見た包丁）
    const skew = 26;
    const grd = ctx.createLinearGradient(KNIFE_X - 4, 0, KNIFE_X + skew + 4, 0);
    grd.addColorStop(0, '#f6f8fa');
    grd.addColorStop(0.5, '#b7c0c8');
    grd.addColorStop(1, '#8a949c');
    ctx.fillStyle = grd;
    ctx.strokeStyle = '#59636b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(KNIFE_X - 2, bladeBottom);
    ctx.lineTo(KNIFE_X - 2, bladeTop + 20);
    ctx.lineTo(KNIFE_X + skew, bladeTop);
    ctx.lineTo(KNIFE_X + skew, bladeBottom - 40);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // 刃先のハイライト
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(KNIFE_X - 1, bladeBottom - 2); ctx.lineTo(KNIFE_X - 1, bladeTop + 26); ctx.stroke();
    // 柄
    ctx.fillStyle = '#5a3a1e';
    roundRect(KNIFE_X + 2, bladeTop - 110, 22, 118, 8);
    ctx.fill();
    ctx.fillStyle = '#c8b28a';
    ctx.fillRect(KNIFE_X + 2, bladeTop - 4, 22, 10);
    // 右手
    ctx.fillStyle = '#f5cfa8';
    ctx.strokeStyle = '#c99a72';
    roundRect(KNIFE_X - 14, bladeTop - 90, 50, 70, 20);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f5cfa8';
    ctx.fillRect(KNIFE_X + 4, bladeTop - 260, 40, 175);
    ctx.fillStyle = '#4a7bb5';
    ctx.fillRect(KNIFE_X - 2, bladeTop - 300, 52, 130);
    ctx.restore();
    // 長押しのゲージ
    if (prog > 0) {
      ctx.save();
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(KNIFE_X + 70, BOARD_Y - h - 40, 18, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#e8a33d';
      ctx.beginPath(); ctx.arc(KNIFE_X + 70, BOARD_Y - h - 40, 18, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // 振り下ろし時のエフェクト
    if (blendDown && prog === 0) {
      ctx.strokeStyle = `rgba(255,255,255,${0.8 - knifeT * 3})`;
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(KNIFE_X + 40 + i * 10, BOARD_Y - h - 60 + i * 20);
        ctx.lineTo(KNIFE_X + 40 + i * 10, BOARD_Y - h + 10 + i * 20);
        ctx.stroke();
      }
    }
  }

  function drawFlying() {
    const h = veg.diam * S;
    for (const f of flying) {
      const p = Math.min(1, f.age / 0.35);
      const ease = 1 - Math.pow(1 - p, 3);
      if (p < 0.4) {
        // まだ立っている状態で倒れはじめ
        const a = (p / 0.4) * -Math.PI / 2.4;
        ctx.save();
        ctx.translate(f.x - f.thick * S / 2, BOARD_Y);
        ctx.rotate(a);
        ctx.fillStyle = veg.skin;
        ctx.fillRect(-Math.max(1.5, f.thick * S), -h, Math.max(1.5, f.thick * S), h);
        ctx.fillStyle = veg.flesh;
        ctx.fillRect(-Math.max(1.5, f.thick * S) + 0.5, -h + 3, Math.max(1, f.thick * S - 1), h - 6);
        ctx.restore();
      } else {
        const x = f.x + (f.tx - f.x) * ease;
        const y = (BOARD_Y - h / 2) + (f.ty - (BOARD_Y - h / 2)) * ease - Math.sin(p * Math.PI) * 40;
        drawSliceFace(x, y, pileR() * (0.7 + 0.3 * ease), f.thick, f.rot * ease);
      }
    }
  }

  function drawSlices() {
    for (const s of slices) drawSliceFace(s.tx, s.ty, pileR(), s.thick, s.rot);
  }

  function drawStubs() {
    const h = veg.diam * S;
    for (const s of stubs) {
      const p = s.age / 0.8;
      const x = KNIFE_X + 20 + p * 600;
      const y = BOARD_Y - h + (-Math.sin(p * Math.PI) * 120) + p * 60;
      ctx.save();
      ctx.globalAlpha = 1 - p;
      ctx.translate(x, y + h / 2);
      ctx.rotate(p * 6);
      cucumberPath(-s.len * S / 2, s.len * S / 2, -h / 2, h / 2, false, true);
      fillCucumberBody(-s.len * S / 2, s.len * S / 2, -h / 2, h / 2, s.seed);
      ctx.restore();
    }
  }

  function drawParticles() {
    ctx.fillStyle = veg.juice;
    for (const p of particles) {
      ctx.globalAlpha = 1 - p.age / p.life;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawPopups() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of popups) {
      const k = p.age / 0.8;
      ctx.globalAlpha = 1 - k * k;
      ctx.font = `bold ${p.size}px "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#fff';
      const y = p.y - k * 40;
      ctx.strokeText(p.text, p.x, y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHUD() {
    if (!g) return;
    ctx.textBaseline = 'middle';
    // タイマー
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    roundRect(16, 14, 210, 56, 14); ctx.fill();
    ctx.fillStyle = g.time <= 5 && state === 'play' ? '#d1452f' : '#2f3b23';
    ctx.font = 'bold 34px "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`⏱ ${g.time.toFixed(1)}`, 30, 43);
    // タイムバー
    ctx.fillStyle = '#ddd';
    ctx.fillRect(16, 74, 210, 8);
    ctx.fillStyle = g.time <= 5 ? '#d1452f' : '#3f8f2f';
    ctx.fillRect(16, 74, 210 * (g.time / GAME_TIME), 8);

    // スコア
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    roundRect(W - 300, 14, 230, 56, 14); ctx.fill();
    ctx.fillStyle = '#23561a';
    ctx.textAlign = 'right';
    ctx.font = 'bold 34px "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif';
    ctx.fillText(tr('hud.pt', { n: fmt(g.score) }), W - 84, 43);

    // コンボ & 速度
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif';
    if (g.combo >= 2) {
      const mult = Math.min(3, 1 + Math.floor(g.combo / 10) * 0.5);
      ctx.fillStyle = '#d1452f';
      ctx.fillText(`${tr('hud.combo', { n: g.combo })}${mult > 1 ? `  ×${mult}` : ''}`, 250, 32);
    }
    ctx.fillStyle = '#5c6b4f';
    ctx.font = '16px "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif';
    ctx.fillText(tr('hud.info', { speed: speedNow().toFixed(1), n: g.count }), 250, 58);

    // 厚さゲージ（いま切ったら何mmか）
    if (state === 'play' && g.cuke.enterT <= 0) {
      const pending = g.cuke.pos - g.cuke.lastCut;
      const gi = GRADES.findIndex(gr => pending < gr.max);
      ctx.textAlign = 'center';
      ctx.font = 'bold 16px "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif';
      ctx.fillStyle = GRADES[gi].color;
      ctx.fillText(tr('hud.next', { mm: pending.toFixed(1) }), KNIFE_X - 60, BOARD_Y + 28);
    }
  }

  function drawCountdown() {
    if (state !== 'countdown') return;
    const n = Math.ceil(g.countdown);
    const frac = g.countdown - Math.floor(g.countdown);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${120 + frac * 60}px "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif`;
    ctx.lineWidth = 10; ctx.strokeStyle = '#fff';
    ctx.strokeText(String(n), W / 2, H / 2 - 20);
    ctx.fillStyle = '#3f8f2f';
    ctx.fillText(String(n), W / 2, H / 2 - 20);
    ctx.font = 'bold 26px "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif';
    ctx.lineWidth = 6;
    const hint = tr(veg.press ? 'hint.press' : NATIVE ? 'hint.tc' : 'hint.kb');
    ctx.strokeText(hint, W / 2, H / 2 + 90);
    ctx.fillStyle = '#23561a';
    ctx.fillText(hint, W / 2, H / 2 + 90);
    ctx.restore();
  }

  function drawFinish() {
    if (state !== 'finish') return;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const sc = 1 + Math.max(0, g.finishT - 1.1) * 3;
    ctx.translate(W / 2, H / 2);
    ctx.scale(sc, sc);
    ctx.font = 'bold 90px "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif';
    ctx.lineWidth = 10; ctx.strokeStyle = '#fff';
    ctx.strokeText(tr('pop.finish'), 0, 0);
    ctx.fillStyle = '#d1452f';
    ctx.fillText(tr('pop.finish'), 0, 0);
    ctx.restore();
  }

  function drawTitleScene() {
    // タイトル画面の背景用: 輪切りを並べておく
    if (slices.length === 0) {
      for (let i = 0; i < 26; i++) {
        slices.push({ tx: 60 + Math.random() * (W - 120), ty: BOARD_Y + 10 + Math.random() * 110, thick: 0.6 + Math.random() * 3, rot: Math.random() * 6 });
      }
    }
  }

  function render() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    drawBackground();
    if (state === 'title') drawTitleScene();
    drawSlices();
    if (g && state !== 'title') {
      drawCucumber();
      drawStubs();
      drawFlying();
      drawKnife();
      drawParticles();
    }
    ctx.restore();
    if (g && state !== 'title') {
      drawPopups();
      drawHUD();
      drawCountdown();
      drawFinish();
    }
  }

  let last = performance.now();
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  resize();
  checkOrientation();
  renderTexts();
  requestAnimationFrame(loop);
})();
