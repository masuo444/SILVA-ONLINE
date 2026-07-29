/* カード効果・勝敗判定の決定的テスト。共有ルールエンジンを直接叩く */
const CORE = require('../public/game-core.js');
const I18N = require('../public/i18n.js');
const { CARDS, createGame, processPlay, processTargetDiscard, processFarmerSelect,
        checkDeckEmpty, nextTurn, aiChoose, aiPickDiscard, mkCard } = CORE;

let pass = 0, fail = 0;
const ok = (cond, name, extra='') => { if (cond) { pass++; console.log(`  \u2705 ${name}`); } else { fail++; console.log(`  \u274c ${name}  ${extra}`); } };
const card = id => mkCard(id);

/* 2人対戦の盤面を作り、手札・山札・場を直接指定する */
function setup({ p1Hand = [], p2Hand = [], deck = ['scout','scout'], field = [], p1Shield = false, p2Shield = false }) {
  const game = createGame([{ id:'P1', name:'P1' }, { id:'P2', name:'P2' }]);
  game.deck = deck.map(card);
  game.field = [...field];
  game.players[0].hand = p1Hand.map(card);
  game.players[1].hand = p2Hand.map(card);
  game.players[0].shield = p1Shield;
  game.players[1].shield = p2Shield;
  game.currentPlayerIndex = 0;
  game.phase = 'action';
  return { game, roomId: game, P1: game.players[0], P2: game.players[1] };
}
const play = (game, pid, uid, targetId, guess) => processPlay(game, pid, uid, targetId, guess);

console.log('\n▸ 蔵人（醸造）— 使用者側にも守護・再生が働くか');
{
  // 使用者が低レベルで負ける + 使用者に守護 → 守護で無効化されるべき
  const { game, P1, P2 } = setup({ p1Hand:['kurando','boy'], p2Hand:['spirit'], p1Shield:true });
  play(game, 'P1', P1.hand.find(c=>c.id==='kurando').uid, 'P2');
  ok(P1.alive === true, '使用者が負けても守護で脱落しない');
  ok(P1.shield === false, '守護が1回で消費される');
  ok(P2.alive === true, '勝った側は脱落しない');
}
{
  // 使用者が守護なしで負ける → 通常どおり脱落
  const { game, P1, P2 } = setup({ p1Hand:['kurando','boy'], p2Hand:['spirit'] });
  play(game, 'P1', P1.hand.find(c=>c.id==='kurando').uid, 'P2');
  ok(P1.alive === false, '守護なしなら使用者が脱落する');
}
{
  // 同レベル → 両者脱落。ただし守護持ちは守られる
  const { game, P1, P2 } = setup({ p1Hand:['kurando','warrior'], p2Hand:['warrior'], p2Shield:true });
  play(game, 'P1', P1.hand.find(c=>c.id==='kurando').uid, 'P2');
  ok(P1.alive === false, '同レベルで使用者が脱落');
  ok(P2.alive === true,  '同レベルでも守護持ちは生存');
}
{
  // 相手がククノチ(Lv10)保持 → 使用者が負ける。ククノチはそのまま残る
  const { game, P1, P2 } = setup({ p1Hand:['kurando','spirit'], p2Hand:['kukuochi'] });
  play(game, 'P1', P1.hand.find(c=>c.id==='kurando').uid, 'P2');
  ok(P1.alive === false && P2.alive === true && P2.hand[0]?.id === 'kukuochi',
     'ククノチ(Lv10)は蔵人の見せ合いに負けず、手札に残る');
}
{
  // 負ける側がククノチ保持 …は起こり得ないので、守護なしの通常敗北で再生経路を確認
  const { game, P1, P2 } = setup({ p1Hand:['trainee','scout'], p2Hand:['kukuochi'] });
  play(game, 'P1', P1.hand.find(c=>c.id==='trainee').uid, 'P2', 'kukuochi');
  ok(P2.alive === true && P2.hand[0]?.id === 'kukuochi_young',
     '特攻で脱落するはずのククノチ保持者は幼きククノチとして再生する');
}

console.log('\n▸ ククノチを斬れるのは刀の少女だけ（再生の可否）');
{
  const { game, P1, P2 } = setup({ p1Hand:['sword_girl','boy'], p2Hand:['kukuochi'], deck:['scout','scout'] });
  play(game, 'P1', P1.hand.find(c=>c.id==='sword_girl').uid, 'P2');
  const kuku = P2.hand.find(c => c.id === 'kukuochi');
  processTargetDiscard(game, 'P1', kuku.uid);
  ok(P2.alive === false, '刀の少女でククノチを斬られたら再生せず脱落');
}
{
  // 守護持ちが刀の少女でククノチを斬られた → 守護が優先される
  const { game, P1, P2 } = setup({ p1Hand:['sword_girl','boy'], p2Hand:['kukuochi'], p2Shield:true });
  play(game, 'P1', P1.hand.find(c=>c.id==='sword_girl').uid, 'P2');
  const kuku = P2.hand.find(c => c.id === 'kukuochi');
  processTargetDiscard(game, 'P1', kuku.uid);
  ok(P2.alive === true,   '守護は刀の少女による脱落も無効化する');
  ok(P2.shield === false, '守護が消費される');
}
{
  // 少年2枚目 = 一閃と同じ → 再生しない（場に少年が1枚出ている状態から）
  /* 少年2枚目は「手札を見て捨てさせる」まで。ククノチを斬れるのは刀の少女だけ */
  const { game, P1, P2 } = setup({ p1Hand:['boy','scout'], p2Hand:['kukuochi'], field:['boy'] });
  play(game, 'P1', P1.hand.find(c=>c.id==='boy').uid, 'P2');
  const kuku = P2.hand.find(c => c.id === 'kukuochi');
  processTargetDiscard(game, 'P1', kuku.uid);
  ok(P2.alive === true && P2.hand.length === 1 && P2.hand[0].id === 'kukuochi_young',
     '少年2枚目でククノチを捨てさせられても、幼きククノチとして再生する');
}
{
  /* 終局処理が二重に走らないこと（刀の少女で決着させて確認） */
  const { game, P1, P2 } = setup({ p1Hand:['sword_girl','scout'], p2Hand:['kukuochi'] });
  play(game, 'P1', P1.hand.find(c=>c.id==='sword_girl').uid, 'P2');
  processTargetDiscard(game, 'P1', P2.hand.find(c => c.id === 'kukuochi').uid);
  ok(game.phase === 'ended', '相手を倒しきったら終局状態のまま維持される');
  ok(game.log.filter(l => l.k==='winner').length === 1, '勝利ログが二重に出ない');
}
{
  // 戦士は再生する
  const { game, P1, P2 } = setup({ p1Hand:['warrior','scout'], p2Hand:['kukuochi'] });
  play(game, 'P1', P1.hand.find(c=>c.id==='warrior').uid, 'P2');
  const kuku = P2.hand.find(c => c.id === 'kukuochi');
  processTargetDiscard(game, 'P1', kuku.uid);
  ok(P2.alive === true && P2.hand.length === 1 && P2.hand[0].id === 'kukuochi_young',
     '戦士でククノチを捨てさせられたら幼きククノチとして再生');
}

console.log('\n▸ 「2枚目」判定に捨て札が混入しないか');
{
  // 相手の枡職人が戦士で「捨てさせられた」状態から、自分が枡職人1枚目を出す
  const { game, P1, P2 } = setup({ p1Hand:['masu_craftsman','scout'], p2Hand:['scout'] });
  P2.discard.push(card('masu_craftsman'));            // 場には出ていない捨て札
  play(game, 'P1', P1.hand.find(c=>c.id==='masu_craftsman').uid);
  ok(P1.shield === false, '捨てさせられた枡職人は「場に出た枚数」に数えない（誤って守護が付かない）');
}
{
  const { game, P1 } = setup({ p1Hand:['masu_craftsman','scout'], p2Hand:['scout'], field:['masu_craftsman'] });
  play(game, 'P1', P1.hand.find(c=>c.id==='masu_craftsman').uid);
  ok(P1.shield === true, '場に1枚出ている状態で2枚目を出せば守護を得る');
}
{
  const { game, P1 } = setup({ p1Hand:['farmer','scout'], p2Hand:['scout'] });
  P1.discard.push(card('farmer'));
  play(game, 'P1', P1.hand.find(c=>c.id==='farmer').uid);
  ok(P1.nextTurnBonus === 2, '農家も捨て札を数えない（誤って3枚ドローにならない）');
}

console.log('\n▸ 訓練生（特攻）');
{
  const { game, P1, P2 } = setup({ p1Hand:['trainee','scout'], p2Hand:['spirit'] });
  play(game, 'P1', P1.hand.find(c=>c.id==='trainee').uid, 'P2', 'spirit');
  ok(P2.alive === false, '宣言が当たれば相手が脱落');
}
{
  const { game, P1, P2 } = setup({ p1Hand:['trainee','scout'], p2Hand:['spirit'], p2Shield:true });
  play(game, 'P1', P1.hand.find(c=>c.id==='trainee').uid, 'P2', 'spirit');
  ok(P2.alive === true, '守護持ちには特攻が通らない');
}
{
  const { game, P1, P2 } = setup({ p1Hand:['trainee','scout'], p2Hand:['spirit'] });
  const r = play(game, 'P1', P1.hand.find(c=>c.id==='trainee').uid, 'P2', 'not_a_card');
  ok(!!r.error, '存在しないカード名の宣言は拒否される', `→ ${JSON.stringify(r)}`);
  ok(P2.alive === true, '不正宣言で相手が脱落しない');
}

console.log('\n▸ 山札が空のときの一閃系');
{
  const { P1, P2, game } = setup({ p1Hand:['sword_girl','scout'], p2Hand:['spirit'], deck:[] });
  play(game, 'P1', P1.hand.find(c=>c.id==='sword_girl').uid, 'P2');
  ok(P2.hand.length === 1, '山札が空なら刀の少女は効果不発（相手の唯一の手札を奪わない）');
}

console.log('\n▸ 山札切れの勝敗判定');
{
  const { game, P1, P2 } = setup({ p1Hand:['kukuochi_young'], p2Hand:['spirit'], deck:[] });
  checkDeckEmpty(game);
  ok(game.winner === 'P1', '1対1で 幼きククノチ は 精霊 に勝つ（特殊勝利）');
}
{
  const { game } = setup({ p1Hand:['warrior'], p2Hand:['spirit'], deck:[] });
  checkDeckEmpty(game);
  ok(game.winner === 'P2', '山札切れは高レベルが勝つ');
}
{
  const { game } = setup({ p1Hand:['warrior'], p2Hand:['warrior'], deck:[] });
  checkDeckEmpty(game);
  ok(game.winner === null, '同レベルなら引き分け');
}
{
  const { game } = setup({ p1Hand:['warrior'], p2Hand:['spirit'], deck:[] });
  checkDeckEmpty(game);
  const logs = game.log.filter(l => l.k==='winner').length;
  nextTurn(game);
  ok(game.log.filter(l => l.k==='winner').length === logs, '終局後に勝利ログが二重に出ない');
}

console.log('\n▸ ククノチは場に出せない');
{
  const { game, P1 } = setup({ p1Hand:['kukuochi','scout'], p2Hand:['scout'] });
  const r = play(game, 'P1', P1.hand.find(c=>c.id==='kukuochi').uid);
  ok(!!r.error, 'ククノチのプレイが拒否される', `→ ${JSON.stringify(r)}`);
}

console.log('\n▸ AIが相手の手札をカンニングしていないか');
{
  const { game, P1, P2 } = setup({ p1Hand:['trainee','scout'], p2Hand:['sword_girl'] });
  P1.isAI = true; P1.difficulty = 'hard';
  // 何も見ていない状態で 100 回選択させ、相手の実手札を的中させる率を測る
  let hits = 0, tries = 300;
  for (let i = 0; i < tries; i++) {
    const a = aiChoose(game, P1, 'hard');
    if (a?.guess === 'sword_girl') hits++;
  }
  ok(hits < tries * 0.5, 'AIは未知の相手の手札を当て続けられない（カンニングしていない）', `的中率 ${(hits/tries*100).toFixed(1)}%`);

  // 正規に「見た」場合は活用できる
  game.knowledge = { P1: { P2: 'sword_girl' } };
  const a2 = aiChoose(game, P1, 'hard');
  ok(a2.guess === 'sword_girl', 'AIは偵察等で正規に見た情報なら宣言に活かす', `→ ${a2.guess}`);
}
{
  // 戦士は「裏向きのまま」選ぶ → AIも中身で選んではいけない
  const hand = [card('kukuochi'), card('boy')];
  const picks = new Set();
  for (let i = 0; i < 200; i++) picks.add(aiPickDiscard('warrior_discard', hand, 'hard').id);
  ok(picks.size === 2, '戦士ではAIも裏向き＝ランダムに選ぶ', `→ ${[...picks]}`);
  const sword = new Set();
  for (let i = 0; i < 50; i++) sword.add(aiPickDiscard('sword_girl_discard', hand, 'hard').id);
  ok(sword.size === 1 && sword.has('boy'), '一閃では手札を見て最弱を選んでよい', `→ ${[...sword]}`);
}

console.log('\n▸ 多言語辞書の網羅性（翻訳漏れの検出）');
{
  const fs = require('fs'), path = require('path');
  const langs = Object.keys(I18N.LANGS);

  for (const lang of langs) {
    const d = I18N.DICT[lang];
    const missingCard = CARDS.filter(c => !d.card[c.id]).map(c => c.id);
    const missingEff  = CARDS.filter(c => !d.effect[c.id]).map(c => c.id);
    const missingDesc = CARDS.filter(c => !d.effectDesc[c.id]).map(c => c.id);
    ok(!missingCard.length, `[${lang}] 全カードに名前がある`, missingCard.join(','));
    ok(!missingEff.length,  `[${lang}] 全カードに効果名がある`, missingEff.join(','));
    ok(!missingDesc.length, `[${lang}] 全カードに効果説明がある`, missingDesc.join(','));
  }

  /* エンジンが実際に積むログキーが、全言語に存在するか */
  const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'game-core.js'), 'utf8');
  const usedKeys = [...new Set([...src.matchAll(/addLog\(game,\s*'([a-z_]+)'/g)].map(m => m[1]))];
  ok(usedKeys.length > 15, `エンジンのログキーを検出（${usedKeys.length}個）`);
  for (const lang of langs) {
    const miss = usedKeys.filter(k => !I18N.DICT[lang].log[k]);
    ok(!miss.length, `[${lang}] 全ログキーが翻訳されている`, miss.join(','));
  }

  /* ja と en でキー集合が一致しているか（片方だけ追加した事故を防ぐ） */
  for (const section of ['card','effect','effectDesc','log','err','ui','bot']) {
    const ja = Object.keys(I18N.DICT.ja[section]).sort();
    const en = Object.keys(I18N.DICT.en[section]).sort();
    const diff = [...ja.filter(k=>!en.includes(k)).map(k=>'en欠:'+k), ...en.filter(k=>!ja.includes(k)).map(k=>'ja欠:'+k)];
    ok(!diff.length, `${section} のキーが ja/en で一致`, diff.join(','));
  }

  /* ルールボット辞書の内側キーも ja/en で一致していること */
  for (const sub of ['rules','tips','detail','aliases','ruleKeys']) {
    const ja = Object.keys(I18N.DICT.ja.bot[sub]).sort();
    const en2 = Object.keys(I18N.DICT.en.bot[sub]).sort();
    const diff = [...ja.filter(k=>!en2.includes(k)).map(k=>'en欠:'+k), ...en2.filter(k=>!ja.includes(k)).map(k=>'ja欠:'+k)];
    ok(!diff.length, `bot.${sub} のキーが ja/en で一致`, diff.join(','));
  }

  /* ボットの回答が確定裁定と食い違っていないこと（v2からの移植時に誤りを3件直した） */
  {
    const jaBot = JSON.stringify(I18N.DICT.ja.bot);
    ok(!jaBot.includes('16枚'), 'bot辞書に「山札16枚」の誤記が無い（正:17枚）');
    ok(I18N.DICT.ja.bot.rules.rebirth.body.includes('少年2枚目で捨てさせられた場合も再生'),
       'botの再生説明: 少年2枚目では再生する（確定裁定）');
    ok(I18N.DICT.ja.bot.rules.rebirth.body.includes('刀の少女'),
       'botの再生説明: 斬れるのは刀の少女のみ');
    ok(I18N.DICT.ja.bot.rules.ward.body.includes('醸造で自分が負けた時も守られます'),
       'botの守護説明: 醸造の自己敗北も防ぐ');
    ok(I18N.DICT.en.bot.rules.rebirth.body.includes('Only the Blade Maiden'),
       'EN botの再生説明も裁定と一致');
  }

  /* ルール説明ページに全カードが載っているか */
  const rules = fs.readFileSync(path.join(__dirname, '..', 'public', 'rules.html'), 'utf8');
  const missing = CARDS.filter(c => !rules.includes(I18N.DICT.ja.card[c.id]));
  ok(!missing.length, 'rules.html に全カードが載っている', missing.map(c=>c.id).join(','));

  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  ok(!/木こり|見習い|商人|鍛冶師|踊り子|ククオチ/.test(html + rules), '旧バージョンの存在しないカード名が残っていない');

  /* カード紹介は手書きせずエンジンから生成する方針。ハードコードが復活したら落とす */
  ok(!/CARD_DATA\s*=\s*\[\s*\{\s*img:/.test(html),
     'スプラッシュのカード一覧がハードコードされていない（エンジンから生成）');
  /* 共有モジュールはキャッシュ対策のバージョン付きで読み込むこと。
     付け忘れると、古い端末が古いルールで対局してしまう */
  const modules = ['game-core.js', 'i18n.js', 'local-game.js'];
  const unversioned = modules.filter(m => new RegExp(`src="/${m.replace('.','\\.')}"`).test(html));
  ok(!unversioned.length, '共有スクリプトが ?v= 付きで読み込まれている', unversioned.join(','));
  const vers = [...html.matchAll(/src="\/(?:game-core|i18n|local-game)\.js\?v=(\d+)"/g)].map(m => m[1]);
  ok(vers.length === modules.length && new Set(vers).size === 1,
     '共有スクリプトのバージョンが揃っている', vers.join(','));

  /* sw.js のプリキャッシュと index.html の ?v= がズレると、
     オフライン初回にコアJSが無くてAI戦が起動できない */
  const sw = fs.readFileSync(path.join(__dirname, '..', 'public', 'sw.js'), 'utf8');
  const swVer = (sw.match(/ASSET_VER = '(\d+)'/) || [])[1];
  ok(swVer === vers[0], `sw.js の ASSET_VER が index.html の ?v= と一致（sw=${swVer} / html=${vers[0]}）`);

  /* rules.html も同じ辞書を読むので、バージョンを揃える */
  const rulesHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'rules.html'), 'utf8');
  const rulesVer = (rulesHtml.match(/src="\/i18n\.js\?v=(\d+)"/) || [])[1];
  ok(rulesVer === vers[0], `rules.html の i18n バージョンが一致（rules=${rulesVer} / html=${vers[0]}）`);

  /* クライアントが独自にカード定義を持っていないこと */
  ok(!/ALL_CARDS\s*=\s*\[\s*\{\s*id:/.test(html),
     'クライアントがカード定義を二重に持っていない');

  /* index.html に残っている日本語のうち、対訳表に無いものを洗い出す。
     これを通しておけば「英語にしたつもりが日本語のまま」を機械的に防げる */
  const jp = /[ぁ-んァ-ヶ一-龠]/;
  const body = html.slice(html.indexOf('<body'));
  const found = new Set();
  for (const m of body.matchAll(/>([^<>]*?)</g)) {
    const t = m[1].trim();
    /* JS文字列連結（'+esc(L(...))+'）の断片は表示テキストではないので除外 */
    if (t && jp.test(t) && t.length < 70 && !t.includes('${') && !t.includes('`') && !t.includes("+") && !t.includes("('")) found.add(t);
  }
  for (const m of body.matchAll(/(?:placeholder|title|alt)="([^"]*)"/g)) {
    const t = m[1].trim();
    if (t && jp.test(t)) found.add(t);
  }
  const en = I18N.STATIC.en;
  const untranslated = [...found].filter(t => !en[t]);
  ok(untranslated.length === 0,
     `静的UIに未対訳の日本語が残っていない（${found.size}件中）`,
     untranslated.length ? `→ 未対訳 ${untranslated.length}件: ${untranslated.slice(0, 8).join(' / ')}` : '');

  /* 変数を埋め込む日本語テンプレートは対訳表では拾えないので、
     t('ui.xxx') のキー化を強制する（英語のまま日本語が出るのを防ぐ） */
  /* rules.html の静的テキストも全て対訳表にあること */
  const rBody = rulesHtml.slice(rulesHtml.indexOf('<body'));
  const rFound = new Set();
  for (const m of rBody.matchAll(/>([^<>]+?)</g)) {
    const t2 = m[1].trim();
    if (t2 && jp.test(t2) && !t2.includes('${') && !t2.includes('=')) rFound.add(t2);
  }
  const knownNames = new Set([...Object.values(I18N.DICT.ja.card), ...Object.values(I18N.DICT.ja.effect)]);
  const rMissing = [...rFound].filter(t2 => !en[t2] && !knownNames.has(t2));
  ok(rMissing.length === 0,
     `rules.html に未対訳の日本語が残っていない（${rFound.size}件中）`,
     rMissing.length ? `→ ${rMissing.length}件: ${rMissing.slice(0, 5).join(' / ')}` : '');

  const interpolated = [...html.matchAll(/`([^`]*)`/g)]
    .map(m => m[1])
    .filter(s2 => jp.test(s2) && s2.includes('${') && !s2.includes('\n'));
  ok(interpolated.length === 0,
     '変数入りの日本語テンプレートが残っていない（t()でキー化されている）',
     interpolated.length ? `→ ${interpolated.length}件: ${interpolated.slice(0, 3).map(s2=>s2.slice(0,50)).join(' / ')}` : '');
}

console.log('\n▸ ソースの健全性');
{
  const fs = require('fs'), path = require('path');
  const root = path.join(__dirname, '..');
  const files = ['server.js', 'public/game-core.js', 'public/i18n.js', 'public/local-game.js',
                 'public/index.html', 'public/rules.html', 'public/sw.js'];
  /* ソースに制御文字が混ざると git がバイナリ扱いして差分が読めなくなる。
     正規表現に生の制御文字を書いてしまった事故があったので固定する */
  const dirty = files.filter(f => {
    const b = fs.readFileSync(path.join(root, f));
    return b.some(c => c < 9 || (c > 13 && c < 32));
  });
  ok(dirty.length === 0, 'ソースに生の制御文字が混ざっていない（gitがバイナリ扱いしない）', dirty.join(','));
}

console.log(`\n${'═'.repeat(52)}\n  合計: ${pass} passed, ${fail} failed\n${'═'.repeat(52)}`);
process.exit(fail ? 1 : 0);
