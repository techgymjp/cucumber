// 表示言語（日本語 / 英語）。端末の言語が日本語なら日本語、それ以外は英語。タイトル画面で切り替えも可能
const I18N = (() => {
  const dict = {
    ja: {
      'doc.title': 'きゅうり輪切り名人',
      'game.name': 'きゅうり輪切り名人',
      'rotate.msg': 'スマホを横向きにして<br>遊んでね！',
      'rotate.lock': '画面の回転ロックがオンのときは、オフにしてください。',
      'rotate.portrait': '縦のまま遊ぶ',
      'mute': '効果音 ON/OFF',
      'title.sub': '制限時間 <b>30秒</b>。すばやく、うすく、切りまくれ！',
      'title.rules': '・{veg}は包丁に向かって <b>どんどん流れてくる</b>（だんだん速くなる！）<br>' +
        '・<b>{ctl}</b> で包丁をトン！<br>' +
        '・連打が速いほど <b>うすい輪切り</b> になって高得点<br>' +
        '・次の{veg}が入ってくる間に切ると <b>空振り</b>でコンボが途切れる',
      'ctl.kb': 'クリック / タップ / スペースキー',
      'ctl.tc': '画面をタップ',
      'grade.table': '<tr><td>〜1.0mm</td><td><b>神業</b> 100点</td><td>〜2.0mm</td><td><b>極うす</b> 60点</td></tr>' +
        '<tr><td>〜3.5mm</td><td><b>うすい</b> 30点</td><td>〜6.0mm</td><td>ふつう 10点</td></tr>' +
        '<tr><td>6.0mm〜</td><td>ぶあつい 2点</td><td colspan="2">3.5mm以下でコンボ継続！</td></tr>',
      'title.start': 'スタート！',
      'legal.privacy': 'プライバシーポリシー',
      'legal.adSettings': '広告の設定',
      'url.privacy': 'https://techgym.jp/privacy-policy/',
      'best': '自己ベスト: {n} 点',
      'pause.head': '一時停止中',
      'pause.sub': '画面をタップすると再開します',
      'pause.btn': 'さいかい',
      'cont.head': 'あと10秒！',
      'cont.lead': '広告を見ると、いまの点数のまま<b>10秒延長</b>できます（1回のみ）',
      'cont.watch': '広告を見て延長する',
      'cont.giveUp': '結果を見る',
      'cont.timer': '<span id="contSec">10</span> 秒後に結果へ',
      'cont.skipped': '最後まで見ると延長できます',
      'cont.fail': '広告を読み込めませんでした',
      'res.head': 'しゅうりょう！',
      'res.pt': ' 点',
      'res.new': '★ 自己ベスト更新！ ★',
      'res.count': '切った枚数', 'res.speed': '包丁さばき', 'res.avg': '平均の厚さ',
      'res.min': 'いちばん薄い', 'res.god': '神業の数', 'res.combo': '最大コンボ',
      'res.rank': '{veg}｜称号：{r}',
      'unit.slices': '{n} 枚',
      'unit.cps': '{n} 回/秒',
      'res.retry': 'もう一回！',
      'res.title': 'タイトルへ',
      'share.label': '結果をシェア',
      'share.more': 'シェア',
      'share.post': 'ポスト',
      'share.copy': 'コピー',
      'share.copied': 'コピーしました',
      'share.dialog': '結果をシェア',
      'share.text': 'きゅうり輪切り名人{tag}で{score}点！ 称号「{rank}」{detail} #きゅうり輪切り名人',
      'share.detail': ' {n}枚を平均{avg}mmで輪切り',
      'grade.0': '神業！', 'grade.1': '極うす！', 'grade.2': 'うすい', 'grade.3': 'ふつう', 'grade.4': 'ぶあつい…',
      'rank.0': '伝説のきゅうり仙人', 'rank.1': '料亭の花板', 'rank.2': '一人前の板前',
      'rank.3': '修行中の若衆', 'rank.4': '見習い', 'rank.5': 'きゅうりに負けた人',
      'pop.miss': '空振り',
      'pop.start': 'はじめ！',
      'pop.resume': 'さいかい！',
      'pop.finish': 'そこまで！',
      'hud.pt': '{n} 点',
      'hud.combo': '{n} コンボ',
      'hud.info': '流れる速さ {speed} mm/秒   切った枚数 {n} 枚',
      'hud.next': 'いま切ると {mm}mm',
      'hint.kb': 'クリック / タップ / スペースで切る！',
      'hint.tc': '画面をタップして切る！',
      'hint.press': '切れるまで長押し！',
      'veg.cucumber': 'きゅうり', 'veg.eggplant': '茄子', 'veg.carrot': '人参', 'veg.burdock': '牛蒡', 'veg.daikon': '大根',
      'veg.lc.cucumber': 'きゅうり', 'veg.lc.eggplant': '茄子', 'veg.lc.carrot': '人参', 'veg.lc.burdock': '牛蒡', 'veg.lc.daikon': '大根',
      'veg.tag': '【{veg}】',
      'veg.pick': '挑戦する野菜',
      'veg.lock': '{prev}で{n}点',
      'veg.best': '{n}点',
      'rule.press': '<br>・{veg}は{why}ので、<b>切れるまで長押し</b>（離すと「浅い！」で切れない）',
      'why.carrot': '少しかたい', 'why.burdock': 'かたい', 'why.daikon': '太くてかたい',
      'pop.shallow': '浅い！',
      'res.next': '{veg}に挑戦！',
      'veg.adTry': '▶ 広告で挑戦',
      'unlock.head': '{veg}に挑戦',
      'unlock.lead': '{veg}は、{prev}で{n}点以上を取ると挑戦できます。<br>広告を最後まで見ると、<b>今回だけ</b>{veg}に挑戦できます。',
      'unlock.watch': '広告を見て挑戦する',
      'unlock.cancel': 'やめる',
      'unlock.skipped': '最後まで見ると挑戦できます',
      'res.unlocked': '🔓 {veg}に挑戦！',
    },
    en: {
      'doc.title': 'Cucumber Slice Master',
      'game.name': 'Cucumber Slice Master',
      'rotate.msg': 'Turn your phone<br>sideways to play!',
      'rotate.lock': 'If rotation lock is on, please turn it off.',
      'rotate.portrait': 'Play in portrait',
      'mute': 'Sound on / off',
      'title.sub': '<b>30 seconds</b>. Slice fast, slice thin, slice it all!',
      'title.rules': '• The {veg} <b>keeps sliding</b> toward the knife (and it speeds up!)<br>' +
        '• <b>{ctl}</b> to bring the knife down<br>' +
        '• The faster you chop, the <b>thinner the slices</b> and the higher your score<br>' +
        '• Chopping while the next {veg} slides in is a <b>miss</b> and breaks your combo',
      'ctl.kb': 'Click / tap / Space',
      'ctl.tc': 'Tap the screen',
      'grade.table': '<tr><td>under 1.0mm</td><td><b>Godlike</b> 100 pts</td><td>under 2.0mm</td><td><b>Paper-thin</b> 60 pts</td></tr>' +
        '<tr><td>under 3.5mm</td><td><b>Thin</b> 30 pts</td><td>under 6.0mm</td><td>Normal 10 pts</td></tr>' +
        '<tr><td>6.0mm+</td><td>Chunky 2 pts</td><td colspan="2">3.5mm or less keeps the combo!</td></tr>',
      'title.start': 'Start!',
      'legal.privacy': 'Privacy Policy',
      'legal.adSettings': 'Ad settings',
      'url.privacy': 'https://techgym.jp/privacy-policy-en/',
      'best': 'Best: {n} pts',
      'pause.head': 'Paused',
      'pause.sub': 'Tap the screen to resume',
      'pause.btn': 'Resume',
      'cont.head': '10 more seconds!',
      'cont.lead': 'Watch an ad to keep your score and get <b>10 extra seconds</b> (once per game)',
      'cont.watch': 'Watch ad for more time',
      'cont.giveUp': 'See results',
      'cont.timer': 'Results in <span id="contSec">10</span> s',
      'cont.skipped': 'Watch the whole ad to get more time',
      'cont.fail': 'The ad could not be loaded',
      'res.head': "Time's up!",
      'res.pt': ' pts',
      'res.new': '★ New personal best! ★',
      'res.count': 'Slices', 'res.speed': 'Knife speed', 'res.avg': 'Average thickness',
      'res.min': 'Thinnest', 'res.god': 'Godlike slices', 'res.combo': 'Max combo',
      'res.rank': '{veg} | Title: {r}',
      'unit.slices': '{n}',
      'unit.cps': '{n} chops/s',
      'res.retry': 'Play again!',
      'res.title': 'Menu',
      'share.label': 'Share your result',
      'share.more': 'Share',
      'share.post': 'Post',
      'share.copy': 'Copy',
      'share.copied': 'Copied',
      'share.dialog': 'Share your result',
      'share.text': 'I scored {score} pts in Cucumber Slice Master{tag}! Title: {rank}{detail} #CucumberSliceMaster',
      'share.detail': ' / {n} slices, {avg}mm on average',
      'grade.0': 'GODLIKE!', 'grade.1': 'PAPER-THIN!', 'grade.2': 'Thin', 'grade.3': 'Normal', 'grade.4': 'Chunky…',
      'rank.0': 'Legendary Cucumber Sage', 'rank.1': 'Head Chef', 'rank.2': 'Skilled Cook',
      'rank.3': 'Apprentice Cook', 'rank.4': 'Kitchen Rookie', 'rank.5': 'Beaten by a Cucumber',
      'pop.miss': 'Miss',
      'pop.start': 'Go!',
      'pop.resume': 'Resume!',
      'pop.finish': "Time's up!",
      'hud.pt': '{n} pts',
      'hud.combo': '{n} combo',
      'hud.info': 'Speed {speed} mm/s   Slices {n}',
      'hud.next': 'Chop now: {mm}mm',
      'hint.kb': 'Click / tap / Space to chop!',
      'hint.tc': 'Tap the screen to chop!',
      'hint.press': 'Hold until it cuts through!',
      'veg.cucumber': 'Cucumber', 'veg.eggplant': 'Eggplant', 'veg.carrot': 'Carrot', 'veg.burdock': 'Burdock', 'veg.daikon': 'Daikon',
      'veg.lc.cucumber': 'cucumber', 'veg.lc.eggplant': 'eggplant', 'veg.lc.carrot': 'carrot', 'veg.lc.burdock': 'burdock root', 'veg.lc.daikon': 'daikon',
      'veg.tag': ' ({veg})',
      'veg.pick': 'Choose a vegetable',
      'veg.lock': '{n} pts with {prev}',
      'veg.best': '{n} pts',
      'rule.press': '<br>• The {veg} is {why}, so <b>hold until it cuts through</b> (let go early and it only scratches)',
      'why.carrot': 'a little firm', 'why.burdock': 'tough', 'why.daikon': 'thick and tough',
      'pop.shallow': 'Not deep enough!',
      'res.next': 'Try {veg}!',
      'veg.adTry': '▶ Try with an ad',
      'unlock.head': 'Try {veg}',
      'unlock.lead': 'Score {n} pts or more with {prev} to unlock {veg}.<br>Watch a whole ad to try {veg} <b>this time only</b>.',
      'unlock.watch': 'Watch ad and play',
      'unlock.cancel': 'Cancel',
      'unlock.skipped': 'Watch the whole ad to play',
      'res.unlocked': '🔓 Try {veg}!',
    },
  };

  const STORE_KEY = 'cuke-lang';
  let saved = null;
  try { saved = localStorage.getItem(STORE_KEY); } catch (e) { /* 保存不可 */ }
  const deviceLang = (navigator.languages && navigator.languages[0]) || navigator.language || 'ja';
  let lang = dict[saved] ? saved : (/^ja\b/i.test(deviceLang) ? 'ja' : 'en');
  const listeners = [];

  // t('best', { n: '1,234' }) → '自己ベスト: 1,234 点'
  function t(key, vars) {
    let s = dict[lang][key];
    if (s === undefined) s = dict.ja[key];
    if (s === undefined) return key;
    return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m)) : s;
  }

  // data-i18n（文字）/ data-i18n-html（タグを含む）/ data-i18n-href（リンク先）/ data-i18n-title（説明）の付いた要素を書き換える
  function apply() {
    document.documentElement.lang = lang;
    document.title = t('doc.title');
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-href]').forEach(el => { el.href = t(el.dataset.i18nHref); });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle);
      el.setAttribute('aria-label', el.title);
    });
    document.querySelectorAll('[data-lang]').forEach(el => el.classList.toggle('on', el.dataset.lang === lang));
  }

  function setLang(l) {
    if (!dict[l] || l === lang) return;
    lang = l;
    try { localStorage.setItem(STORE_KEY, l); } catch (e) { /* 保存不可 */ }
    apply();
    listeners.forEach(f => f(l));
  }

  return {
    t, apply, setLang,
    get lang() { return lang; },
    onChange(f) { listeners.push(f); },
  };
})();
