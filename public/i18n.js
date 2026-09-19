/* ============================================================
   SILVA — 多言語辞書
   ------------------------------------------------------------
   ・カード名は「固有名詞 + 意味」で訳す（Kurando (Brewer) など）。
     和の世界観がこのゲームの差別化なので、翻訳で消さない。
   ・対局ログは game-core.js が {k:キー, ...引数} で積むので、
     ここの log テンプレートに流し込んで文章にする。
   ============================================================ */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SILVA_I18N = api;
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';

const LANGS = {
  ja: { label: '日本語', htmlLang: 'ja' },
  en: { label: 'English', htmlLang: 'en' },
};

const DICT = {
  ja: {
    /* ── カード ── */
    card: {
      kukuochi_young: '幼きククノチ', boy: '少年', trainee: '訓練生', scout: '偵察隊',
      warrior: '戦士', kurando: '蔵人', masu_craftsman: '枡職人', farmer: '農家',
      spirit: '精霊', sword_girl: '刀の少女', kukuochi: 'ククノチ',
    },
    effect: {
      kukuochi_young: '光合成', boy: '変革', trainee: '特攻', scout: '偵察',
      warrior: '格闘', kurando: '醸造', masu_craftsman: '守護', farmer: '栽培',
      spirit: '思念', sword_girl: '一閃', kukuochi: '再生',
    },
    effectDesc: {
      kukuochi_young: '効果なし',
      boy: '2枚目で手札を見て1枚捨てさせる',
      trainee: '相手の手札を予言する',
      scout: '相手の手札を覗く',
      warrior: '相手にカードを引かせ1枚捨てさせる',
      kurando: '相手と手札を見せ合い弱い方が脱落',
      masu_craftsman: '2枚目で自動的に守護を得る',
      farmer: '次の手番で複数枚引いて1枚選ぶ',
      spirit: '相手と手札を交換する',
      sword_girl: '手札を見て1枚捨てさせる（ククノチも斬る）',
      kukuochi: '場に出せない。脱落時に再生',
    },
    /* ── 対局ログ ── */
    log: {
      game_start:   '🎮 ゲーム開始！先手は {name}',
      rematch_start:'🎮 再戦開始！先手は {name}',
      match_made:   '🎮 マッチング成立！{a} vs {b}',
      play:         '🃏 {name}が「{card}」を使用',
      young_no_effect:'🌿 {name}が「幼きククノチ」を使用（効果なし）',
      boy_first:    '⚡ {name}が「少年」を使用（1枚目：効果なし）',
      masu_first:   '🏺 {name}が枡職人を使用（1枚目：効果なし）',
      masu_shield:  '🏺 {name}が枡職人2枚目！自動的に守護を得た！',
      farmer:       '🌾 {name}が農家を使用。次の手番で{count}枚引く',
      farmer_keep:  '🌾 {name}が農家効果で「{card}」を選択',
      trainee_hit:  '🎯 {name}が「{target}」の手札を言い当てた！',
      trainee_miss: '❌ {name}の特攻は外れた',
      scout:        '🔍 {name}が「{target}」の手札を覗いた',
      warrior:      '⚔️ {name}が「戦士」発動。{target}に迫る',
      warrior_fizzle:'⚔️ {name}の戦士は効果不発（山札が空）',
      sword:        '🗡️ {name}が{via}発動。{target}の手札を開示',
      sword_fizzle: '🗡️ {name}の{via}は効果不発（山札が空）',
      kurando:      '🍶 {name}と{target}が手札を見せ合う',
      spirit:       '✨ {name}と{target}が手札を交換',
      shield_block: '🛡 {name}の守護発動！脱落を無効化（ククノチは手札に残る）',
      rebirth:      '🌱 {name}のククノチが再生！幼きククノチとして復活！',
      kukuochi_slain:'🗡 {name}のククノチが刀の少女に斬られた！再生なし！',
      kukuochi_forced_rebirth:'🌱 {name}のククノチが捨てさせられた！幼きククノチとして再生！',
      discarded:    '🃏 {name}が「{card}」を捨てた',
      eliminated:   '💀 {name}が脱落',
      forfeit:      '🚪 {name}が離脱（不戦敗）',
      deck_empty:   '📦 山札が無くなりました！手札を公開して勝負！',
      reveal_hand:  '🃏 {name}の手札：{card}',
      young_beats_spirit:'✨ 幼きククノチが精霊に勝利！',
      max_level:    '👑 最大レベル Lv.{level} — {name}の勝利！',
      tie_level:    '⚖️ 同レベル Lv.{level} — 引き分け！',
      winner:       '🏆 {name}の勝利！',
      draw_game:    '🤝 引き分け！',
      none:         '無し',
    },
    /* ── ルールボット（Q&A） ── */
    bot: {
      fabLabel:'💬 ルール相談',
      title:'SILVA ルール相談', sub:'カード効果や勝利条件をその場で確認できます。',
      placeholder:'例：ククノチは出せる？ 守護って何？', ask:'質問',
      greet:'こんにちは。SILVAのルールで迷ったら質問してください。<br>例：「ククノチは出せる？」「守護って何？」「戦士と刀の少女の違いは？」',
      fallbackIntro:'該当するルールを特定できませんでした。カード名や効果名で聞くと答えやすいです。',
      cardListTitle:'カード一覧', level:'レベル', copies:'枚数',
      adviceTitle:'今やること',
      advicePickDiscard:'相手の手札から捨てさせる1枚を選びます。刀の少女なら見えているカードから選べます。戦士なら裏向きなので推理です。',
      adviceOpponentTurn:'相手の手番です。捨て札と山札残り {deck}枚を見て、相手の手札を予想しましょう。',
      adviceDraw:'カードを1枚引いてください。手札が2枚になったら、1枚を場に出します。',
      adviceFarmer:'農家の効果です。残したいカードを1枚選んでください。',
      adviceSelected:'選択中: {card}',
      advicePlay:'手札から1枚選んで使います。残したカードが次の勝負札になるので、効果だけでなく残り手札のレベルも大事です。',
      tips:{
        kukuochi_young:'効果なし。山札切れで精霊に勝つ特殊な札です。',
        boy:'1枚目は温存情報。2枚目が出ると相手の手札を捨てさせます。',
        trainee:'相手の手札名を当てる攻撃。偵察後や終盤に強いです。',
        scout:'相手の手札を見る安全な一手。次の予言や勝負に使えます。',
        warrior:'相手に1枚引かせ、裏向きで1枚捨てさせます。',
        kurando:'残った手札で勝負します。自分の手札が強い時に使います。',
        masu_craftsman:'2枚目で守護。次の脱落を一度だけ防ぎます。',
        farmer:'次の手番で複数枚から選べます。手札を整えるカードです。',
        spirit:'相手と手札交換。自分の残り札が弱い時に逆転できます。',
        sword_girl:'相手の手札を見て1枚捨てさせる強力な攻撃です。',
        kukuochi:'出せません。持っているだけで山札切れ勝負に強い札です。',
      },
      detail:{
        kukuochi_young:'通常山札には入らず、ククノチの再生で手札に来ます。',
        boy:'1枚目は効果なし。2枚目で相手の手札を見て1枚捨てさせます。ククノチを捨てさせても再生します。',
        trainee:'当てる対象は相手1人。カード名が外れると脱落は起きません。',
        scout:'見た情報は自分だけが確認できます。',
        warrior:'捨てさせるカードは見ずに選びます。ククノチを捨てさせると再生します。山札が空なら不発です。',
        kurando:'残った手札同士で比べます。同レベルなら両者脱落です。守護があれば自分が負けても守られます。',
        masu_craftsman:'守護は発生源を問わず脱落効果を1回だけ防ぎ、使うと消えます。',
        farmer:'効果は次の自分の手番に発動します。',
        spirit:'手札を交換します。弱い手札を渡す使い方が強いです。',
        sword_girl:'相手の手札を見て選べます。ククノチを斬ると再生しません（これができる唯一の札です）。',
        kukuochi:'場に出せません。山札切れでは高レベル勝負に強いです。',
      },
      rules:{
        winning:{title:'勝利条件',body:'勝ち方は2つです。<ul><li>他のプレイヤーを全員脱落させる。</li><li>山札がなくなった時、生存者の手札レベルが一番高い。</li></ul>同レベルで最高なら引き分けです。1対1で「幼きククノチ」と「精霊」が残った場合だけ、幼きククノチが勝ちます。'},
        flow:{title:'手番の流れ',body:'基本は「引く → 出す → 残す」です。手札1枚で始まり、自分の手番で山札から1枚引いて2枚にします。そのうち1枚を場に出して効果を使い、残った1枚が次の手札になります。'},
        deck:{title:'カード枚数',body:'山札は17枚、カードは全11種類です。「幼きククノチ」は山札に入らず、ククノチの再生でだけ手札に現れます。プレイ人数は2〜4人です。'},
        target:{title:'ターゲット',body:'効果に「相手を1人選ぶ」とあるカードは、生存している相手だけを対象にできます。脱落済みのプレイヤーや自分自身は対象にできません。'},
        rebirth:{title:'ククノチの再生',body:'ククノチ Lv.10 は場に出せません。脱落するときに手札に持っていれば、手札をすべて捨てて「幼きククノチ Lv.0」として復活します。戦士や少年2枚目で捨てさせられた場合も再生します。<strong>再生しないのは刀の少女の一閃で捨てさせられた時だけ</strong>です。'},
        ward:{title:'守護',body:'枡職人を<strong>自分で2枚場に出す</strong>と守護を得ます（捨てさせられた枚数は数えません）。守護は発生源を問わず次の脱落を1回だけ無効化します — 特攻・醸造・一閃のどれでも有効で、醸造で自分が負けた時も守られます。発動後は消えます。'},
        boy2:{title:'少年の変革',body:'少年は1枚目が場に出ても効果なしです。2枚目の少年が場に出ると、相手の手札を見て1枚捨てさせます（動きは一閃と同じ）。ただし<strong>ククノチを捨てさせても再生します</strong> — ククノチを斬れるのは刀の少女だけです。'},
        farmer:{title:'農家の栽培',body:'農家を使うと、次の自分の手番で山札から複数枚引き、その中から1枚を選んで手札にします。選ばなかったカードは山札に戻してシャッフルされます。1枚目の農家なら2枚、2枚目なら3枚引きます。'},
        swords:{title:'戦士と刀の少女の違い',body:'どちらも相手に1枚引かせてから1枚捨てさせます。戦士は<strong>裏向き</strong>で選びます。刀の少女は相手の手札を<strong>見て</strong>選べ、ククノチを捨てさせると再生させずに脱落させられます。どちらも山札が空だと効果不発です。'},
        combo:{title:'偵察隊と訓練生',body:'偵察隊で相手の手札を見て、その情報を訓練生の特攻に使うのが基本コンボです。訓練生は宣言が当たれば相手を脱落させます。'},
        empty:{title:'山札切れと効果不発',body:'山札が空のとき、戦士・刀の少女・少年2枚目は「相手に1枚引かせる」ができないため効果不発になります。山札が尽きたら手札を公開し、レベルが一番高い生存者の勝ちです。'},
        tips:{title:'初心者のコツ',body:'最初は安全に情報を取るカードが分かりやすいです。偵察隊で手札を見る、農家で手札を整える、蔵人は自分の残り手札が強い時に使う、という意識で遊ぶと流れが掴みやすいです。'},
      },
      aliases:{
        kukuochi_young:['幼きククノチ','幼いククノチ','若いククノチ','lv0','レベル0'],
        boy:['少年','変革','lv1','レベル1'],
        trainee:['訓練生','特攻','予言','宣言','当てる','lv2','レベル2'],
        scout:['偵察隊','偵察','覗く','手札を見る','lv3','レベル3'],
        warrior:['戦士','格闘','裏向き','捨てさせる','lv4','レベル4'],
        kurando:['蔵人','醸造','見せ合う','公開','lv5','レベル5'],
        masu_craftsman:['枡職人','枡','守護','シールド','無効','lv6','レベル6'],
        farmer:['農家','栽培','戻す','複数枚','lv7','レベル7'],
        spirit:['精霊','思念','交換','手札交換','lv8','レベル8'],
        sword_girl:['刀の少女','一閃','刀','剣','斬る','lv9','レベル9'],
        kukuochi:['ククノチ','再生','復活','出せない','lv10','レベル10'],
      },
      ruleKeys:{
        winning:['勝ち','勝利','勝利条件','終わり','判定','引き分け'],
        flow:['流れ','手番','ターン','何する','遊び方','始め方'],
        deck:['枚数','デッキ','何枚','カード数'],
        target:['対象','ターゲット','相手を選ぶ','選べない','自分を'],
        rebirth:['ククノチ','再生','復活','出せる','出せない'],
        ward:['守護','枡','枡職人','シールド','無効','防げる','防ぐ','効く','負け'],
        boy2:['少年','変革','2枚目'],
        farmer:['農家','栽培','何枚引く','戻す'],
        swords:['刀','刀の少女','一閃','戦士','違い'],
        combo:['偵察','訓練生','コンボ','当てる','予言'],
        empty:['山札切れ','不発','山札が空','引けない','尽き'],
        tips:['おすすめ','戦略','初心者','最初','コツ'],
      },
      suggWelcome:['ククノチは出せる？','守護って何？','勝利条件は？','今なにをすればいい？'],
      suggDefault:['ククノチは出せる？','カード一覧を教えて','初心者のコツは？'],
      suggAfterRule:['関連カードは？','初心者のコツは？','山札切れは？'],
      suggAdvice:['このカードの効果は？','勝利条件は？','初心者のコツは？'],
      suggCompare:['ククノチを捨てたら？','守護で防げる？','初心者のコツは？'],
      suggKukuochi:['刀の少女で斬られたら？','山札切れは？','幼きククノチとは？'],
      suggSwords:['戦士と刀の少女の違いは？','ククノチを捨てたら？','守護で防げる？'],
      suggScout:['偵察隊と訓練生のコンボは？','訓練生が外れたら？','初心者のコツは？'],
      suggFallback:['ククノチは出せる？','戦士と刀の少女の違いは？','農家は何枚引く？'],
    },
    /* ── サーバーからのエラー ── */
    err: {
      invalid_player:'無効なプレイヤーです', not_your_turn:'手番ではありません',
      not_action_phase:'手番フェーズではありません', card_not_found:'カードが見つかりません',
      kukuochi_unplayable:'ククノチは場に出せません', no_self_target:'自分自身は対象にできません',
      invalid_target:'ターゲットが無効です', invalid_guess:'その宣言はできません',
      server_busy:'混み合っています。もう一度お試しください', player_disconnected:'相手の再接続を待っています', invalid_action:'無効な操作です', not_chooser:'あなたが選択者ではありません',
      cannot_draw:'今は引けません', not_select_phase:'選択フェーズではありません',
      must_pick_drawn:'引いたカードから選んでください', no_game:'ゲームが見つかりません',
      room_not_found:'ルームが見つかりません', room_full:'ルームが満員です',
      already_started:'ゲームはすでに開始しています', host_only:'ホストのみ開始できます',
      need_two:'2人以上必要です', no_spectate:'観戦できるゲームがありません',
    },
    /* ── UI ── */
    ui: {
      tagline:'心理戦カードゲーム', subtitle:'FOMUS × KUKU PROJECT',
      selectMode:'モードを選択',
      modeAI:'コンピューター', modeAIDesc:'AIと1人で対戦。3段階の難易度',
      modeCreate:'ルーム作成', modeCreateDesc:'ルームIDを共有してオンライン対戦',
      modeJoin:'ルーム参加', modeJoinDesc:'ルームIDやURLで友達と対戦',
      modeRules:'ルール', modeRulesDesc:'カードの効果と遊び方を確認',
      modeMypage:'マイページ', modeMypageDesc:'戦績・ランク・バッジを確認',
      officialSite:'公式サイト', buyCards:'実物カードを購入',
      back:'戻る', cancel:'キャンセル', close:'閉じる',
      yourName:'あなたの名前', namePlaceholder:'名前を入力',
      difficulty:'難易度', aiEasy:'ゆっくりAI（やさしい）', aiNormal:'策士AI（普通）', aiHard:'鬼神AI（難しい）',
      opponents:'対戦人数', vsAI1:'AI 1人と対戦', vsAI2:'AI 2人と対戦', vsAI3:'AI 3人と対戦',
      startGame:'ゲームを開始', vsAITitle:'vs AI',
      roomId:'ルームID', copyId:'IDをコピー', shareUrl:'招待URLを共有',
      waitingPlayers:'参加者', addAI:'AIを追加', removeAI:'AIを外す',
      yourTurn:'あなたの手番', waitingTurn:'{name}の手番',
      drawCard:'カードを引く', drawPrompt:'カードを引いてください',
      playPrompt:'出すカードを選んでください', selectTarget:'ターゲットを選択',
      guessPrompt:'相手の手札を予言してください', targetFirst:'まずターゲットを選択してください',
      discardPrompt:'{name}に捨てさせるカードを選んでください',
      farmerPrompt:'手札に残す1枚を選んでください',
      deck:'山札', cards:'枚', masu:'枡', discardPile:'捨て札', rebirthCard:'再生札', gameLog:'戦況記録',
      you:'あなた', turnTag:'手番', spectating:'👁 観戦モード — 終局まで手札は伏せられます',
      leave:'退出', rematch:'⚔️ 続けて対戦する', backToMenu:'メニューに戻る',
      rematchVotes:'{voted}/{total} 人が同意',
      win:'勝利', lose:'敗北', drawResult:'引き分け',
      netLost:'📡 接続が切れました — 再接続しています…',
      netOpponentGone:'⏳ {name} の接続が切れました（{sec}秒以内に戻らなければ不戦敗）',
      netOpponentBack:'✅ {name} が復帰しました',
      rejoinFailed:'対局に復帰できませんでした',
      copied:'コピーしました: {v}', urlCopied:'招待URLをコピーしました',
      matched:'✅ マッチング成立！相手：{name}',
      searching:'対戦相手を探しています…', quickMatch:'ランダムマッチ',
      offlineMode:'オフラインで対戦中（AI戦はサーバー不要です）',
      language:'言語',
      aiNameEasy:'ゆっくりAI', aiNameNormal:'策士AI', aiNameHard:'鬼神AI',
      namePlaceholderDefault:'プレイヤー',
      badgeEarned:'🏅 バッジ獲得！「{name}」', rankProgress:'{rank} まであと {n}勝',
      winRate:'勝率 <strong>{rate}%</strong>（{total}戦）', winLoss:'{w}勝 {l}敗',
      discardBlind:'⚔ {name}の手札から1枚選んで捨てさせてください（裏向き）',
      discardOpenBoy:'⚡ {name}の手札から捨てるカードを選んでください（変革）',
      discardOpen:'🗡 {name}の手札から捨てるカードを選んでください',
      handIs:'手札: {card}(Lv.{level})', declareFail:'「{v}」— 宣言失敗',
      thinking:'{name} が考えています…',
      reasonDraw:'最後に残った強さが並び、勝敗がつきませんでした。',
      reasonDeckWin:'{card}が最後の比べ合いで一番強く、勝利しました。',
      reasonDeckLose:'{name}の手札が最後の比べ合いで上回りました。',
      reasonEliminated:'あなたが脱落し、{name}が最後まで残りました。',
      reasonLastStanding:'{name}だけが脱落せずに残りました。',
      reasonWin:'読み合いで相手を脱落させ、最後まで残りました。',
      reasonLose:'相手に先に勝ち筋を通されました。',
      hit:'的中！', miss:'外れ...', masuSummoned:'{name} が枡を召喚 — 守護を得た',
      shareResultBtn:'📤 結果を画像で共有', shareSaved:'画像を保存しました。SNSに貼って共有できます',
      shareText:'SILVAで対戦！手札1枚の心理戦 → {url}',
      shareTagline:'無料・インストール不要のカードゲーム', playedCard:'{name}が「{card}」を使用',
      traineeHit:'{name}が「{card}」を言い当てた！', traineeMiss:'{name}の予言「{card}」は外れた',

      someoneWins:'{name} の勝利', waitingFor:'{name} の手番を待っています…', youWin:'あなたの勝利です',
      pickTargetFor:'「{card}」— ターゲットを選択', confirmPlay:'「{card}」を使用しますか？', peekResult:'相手の手札は「{card}」(Lv.{level})',
    },
  },

  en: {
    card: {
      kukuochi_young: 'Kukunochi Sprout', boy: 'The Boy', trainee: 'Apprentice', scout: 'Scout',
      warrior: 'Warrior', kurando: 'Kurando (Brewer)', masu_craftsman: 'Masu Craftsman', farmer: 'Farmer',
      spirit: 'Spirit', sword_girl: 'Blade Maiden', kukuochi: 'Kukunochi',
    },
    effect: {
      kukuochi_young: 'Photosynthesis', boy: 'Awakening', trainee: 'Strike', scout: 'Recon',
      warrior: 'Duel', kurando: 'Brewing', masu_craftsman: 'Ward', farmer: 'Cultivate',
      spirit: 'Thoughtstream', sword_girl: 'Flash', kukuochi: 'Rebirth',
    },
    effectDesc: {
      kukuochi_young: 'No effect',
      boy: '2nd copy: look at a hand and force a discard',
      trainee: 'Name a card in their hand',
      scout: 'Peek at their hand',
      warrior: 'They draw, you discard one face-down',
      kurando: 'Compare hands — the lower one is out',
      masu_craftsman: '2nd copy grants a Ward',
      farmer: 'Draw extra next turn and keep one',
      spirit: 'Swap hands with a player',
      sword_girl: 'Look and force a discard (slays Kukunochi)',
      kukuochi: 'Cannot be played. Reborn when eliminated',
    },
    log: {
      game_start:   '🎮 Game start! {name} goes first',
      rematch_start:'🎮 Rematch! {name} goes first',
      match_made:   '🎮 Matched! {a} vs {b}',
      play:         '🃏 {name} played "{card}"',
      young_no_effect:'🌿 {name} played Kukunochi Sprout (no effect)',
      boy_first:    '⚡ {name} played The Boy (1st copy: no effect)',
      masu_first:   '🏺 {name} played Masu Craftsman (1st copy: no effect)',
      masu_shield:  '🏺 {name} played a 2nd Masu Craftsman — Ward gained!',
      farmer:       '🌾 {name} played Farmer. Draws {count} next turn',
      farmer_keep:  '🌾 {name} kept "{card}"',
      trainee_hit:  '🎯 {name} named {target}\'s card correctly!',
      trainee_miss: '❌ {name}\'s strike missed',
      scout:        '🔍 {name} peeked at {target}\'s hand',
      warrior:      '⚔️ {name} duels {target}',
      warrior_fizzle:'⚔️ {name}\'s Warrior fizzled (deck empty)',
      sword:        '🗡️ {name} used {via}. {target}\'s hand revealed',
      sword_fizzle: '🗡️ {name}\'s {via} fizzled (deck empty)',
      kurando:      '🍶 {name} and {target} compare hands',
      spirit:       '✨ {name} and {target} swapped hands',
      shield_block: '🛡 {name}\'s Ward blocks the elimination!',
      rebirth:      '🌱 {name}\'s Kukunochi is reborn as a Sprout!',
      kukuochi_slain:'🗡 {name}\'s Kukunochi was slain by the Blade Maiden — no rebirth!',
      kukuochi_forced_rebirth:'🌱 {name}\'s Kukunochi was discarded — reborn as a Sprout!',
      discarded:    '🃏 {name} discarded "{card}"',
      eliminated:   '💀 {name} is out',
      forfeit:      '🚪 {name} left the game (forfeit)',
      deck_empty:   '📦 The deck is empty! Reveal your hands!',
      reveal_hand:  '🃏 {name}\'s hand: {card}',
      young_beats_spirit:'✨ The Sprout defeats the Spirit!',
      max_level:    '👑 Highest level Lv.{level} — {name} wins!',
      tie_level:    '⚖️ Tied at Lv.{level} — a draw!',
      winner:       '🏆 {name} wins!',
      draw_game:    '🤝 It\'s a draw!',
      none:         'none',
    },
    /* ── Rule bot (Q&A) ── */
    bot: {
      fabLabel:'💬 Rules Help',
      title:'SILVA Rules Help', sub:'Check card effects and win conditions any time.',
      placeholder:'e.g. Can I play Kukunochi? What is the Ward?', ask:'Ask',
      greet:'Hi! Ask me anything about the rules of SILVA.<br>Try: “Can I play Kukunochi?” “What is the Ward?” “Warrior vs Blade Maiden?”',
      fallbackIntro:'I could not match that to a rule. Asking by card name or effect name works best.',
      cardListTitle:'Card list', level:'Level', copies:'Copies',
      adviceTitle:'What to do now',
      advicePickDiscard:'Choose one card from their hand to discard. With the Blade Maiden you can see the cards; with the Warrior it is face-down, so use your reads.',
      adviceOpponentTurn:'It is their turn. Study the discards and the {deck} cards left in the deck to guess their hand.',
      adviceDraw:'Draw one card. Once you hold two, play one of them.',
      adviceFarmer:'Farmer effect — choose the one card to keep.',
      adviceSelected:'Selected: {card}',
      advicePlay:'Play one of your two cards. The card you keep becomes your showdown hand, so its level matters as much as the effect.',
      tips:{
        kukuochi_young:'No effect, but it beats the Spirit in a deck-out showdown.',
        boy:'1st copy is safe information. The 2nd forces a discard.',
        trainee:'Name their card to eliminate them. Strong after a Scout.',
        scout:'A safe play that reveals a hand — fuel for a later Strike.',
        warrior:'They draw one; you discard one of theirs face-down.',
        kurando:'A showdown of remaining hands. Play it when yours is strong.',
        masu_craftsman:'2nd copy grants a Ward that blocks one elimination.',
        farmer:'Next turn you draw extra and keep the best. Hand fixing.',
        spirit:'Swap hands — a comeback when your card is weak.',
        sword_girl:'See their hand and force a discard. Powerful.',
        kukuochi:'Unplayable, but it dominates the deck-out showdown.',
      },
      detail:{
        kukuochi_young:'Never in the deck — it only appears via Kukunochi\u2019s rebirth.',
        boy:'1st copy: no effect. 2nd: look at their hand and force a discard. Kukunochi still gets reborn.',
        trainee:'Target one opponent. A wrong guess eliminates no one.',
        scout:'Only you see the revealed card.',
        warrior:'You choose the discard face-down. Kukunochi is reborn. Fizzles if the deck is empty.',
        kurando:'Compares the remaining hands; a tie eliminates both. A Ward protects you even if you lose.',
        masu_craftsman:'The Ward blocks one elimination from any source, then it is spent.',
        farmer:'The effect triggers on your next turn.',
        spirit:'Swaps hands. Handing over a weak card is the strong play.',
        sword_girl:'You see their hand. Slaying Kukunochi prevents its rebirth — the only card that can.',
        kukuochi:'Cannot be played. Wins most deck-out showdowns.',
      },
      rules:{
        winning:{title:'How to win',body:'There are two ways to win:<ul><li>Eliminate every other player.</li><li>Hold the highest-level hand when the deck runs out.</li></ul>A tie at the top is a draw. One exception: one-on-one, the Kukunochi Sprout beats the Spirit.'},
        flow:{title:'Turn flow',body:'The rhythm is draw → play → keep. You start with one card, draw to two on your turn, play one for its effect, and the one you keep becomes your hand.'},
        deck:{title:'Deck size',body:'The deck has 17 cards across 11 kinds. The Kukunochi Sprout is never in the deck — it only appears through Kukunochi\u2019s rebirth. 2–4 players.'},
        target:{title:'Targeting',body:'Cards that say “choose an opponent” can only target living opponents. You cannot target eliminated players or yourself.'},
        rebirth:{title:'Kukunochi\u2019s rebirth',body:'Kukunochi (Lv.10) cannot be played. If you hold it when eliminated, you discard everything and return as the Sprout (Lv.0). This also works when the Warrior or a 2nd Boy forces the discard. <strong>Only the Blade Maiden\u2019s Flash prevents the rebirth.</strong>'},
        ward:{title:'The Ward',body:'Play <strong>two Masu Craftsmen yourself</strong> to gain a Ward (forced discards do not count). It blocks the next elimination from any source — Strike, Brewing or Flash — and protects you even when you lose your own Brewing. It is spent after one use.'},
        boy2:{title:'The Boy\u2019s Awakening',body:'The 1st Boy does nothing. When the 2nd is played, you look at an opponent\u2019s hand and force a discard (the same motion as Flash). But <strong>Kukunochi still gets reborn</strong> — only the Blade Maiden can slay it.'},
        farmer:{title:'Farmer\u2019s Cultivate',body:'On your next turn you draw several cards, keep one, and shuffle the rest back into the deck. Your 1st Farmer draws 2; your 2nd draws 3.'},
        swords:{title:'Warrior vs Blade Maiden',body:'Both make the target draw one card and then discard one. The Warrior chooses <strong>face-down</strong>. The Blade Maiden <strong>sees the hand</strong> and can slay Kukunochi with no rebirth. Both fizzle if the deck is empty.'},
        combo:{title:'Scout into Apprentice',body:'The classic combo: peek with the Scout, then use that knowledge for the Apprentice\u2019s Strike. A correct call eliminates the target.'},
        empty:{title:'Empty deck & fizzles',body:'When the deck is empty, the Warrior, Blade Maiden and 2nd Boy fizzle — they cannot make anyone draw. Once the deck runs out, hands are revealed and the highest level among survivors wins.'},
        tips:{title:'Beginner tips',body:'Start with information: peek with the Scout, fix your hand with the Farmer, and save the Kurando for when your remaining card is strong. That rhythm teaches you the game fast.'},
      },
      aliases:{
        kukuochi_young:['sprout','young kukunochi','lv0','level 0'],
        boy:['boy','awakening','lv1','level 1'],
        trainee:['apprentice','strike','guess','name a card','lv2','level 2'],
        scout:['scout','recon','peek','look at hand','lv3','level 3'],
        warrior:['warrior','duel','face-down','facedown','lv4','level 4'],
        kurando:['kurando','brewer','brewing','showdown','compare','lv5','level 5'],
        masu_craftsman:['masu','craftsman','ward','shield','block','lv6','level 6'],
        farmer:['farmer','cultivate','keep one','extra draw','lv7','level 7'],
        spirit:['spirit','thoughtstream','swap','trade hands','lv8','level 8'],
        sword_girl:['blade maiden','flash','blade','sword','slay','lv9','level 9'],
        kukuochi:['kukunochi','rebirth','reborn','unplayable','lv10','level 10'],
      },
      ruleKeys:{
        winning:['win','victory','how to win','end','draw game','tie'],
        flow:['flow','turn','how to play','what do i do','basics'],
        deck:['how many cards','deck size','count','cards in deck'],
        target:['target','choose','myself','targeting'],
        rebirth:['kukunochi','rebirth','reborn','play kukunochi'],
        ward:['ward','masu','shield','block','protect'],
        boy2:['boy','awakening','second boy','2nd boy'],
        farmer:['farmer','cultivate','how many draw','shuffle back'],
        swords:['blade','maiden','warrior','difference','versus','vs'],
        combo:['scout','apprentice','combo','guess'],
        empty:['empty deck','fizzle','deck out','no cards left','runs out'],
        tips:['tips','strategy','beginner','advice','best'],
      },
      suggWelcome:['Can I play Kukunochi?','What is the Ward?','How do I win?','What should I do now?'],
      suggDefault:['Can I play Kukunochi?','Show me the card list','Beginner tips?'],
      suggAfterRule:['Related cards?','Beginner tips?','Empty deck rules?'],
      suggAdvice:['What does this card do?','How do I win?','Beginner tips?'],
      suggCompare:['What if Kukunochi is discarded?','Does the Ward block it?','Beginner tips?'],
      suggKukuochi:['What if the Blade Maiden slays it?','Empty deck rules?','What is the Sprout?'],
      suggSwords:['Warrior vs Blade Maiden?','What if Kukunochi is discarded?','Does the Ward block it?'],
      suggScout:['Scout into Apprentice combo?','What if the guess is wrong?','Beginner tips?'],
      suggFallback:['Can I play Kukunochi?','Warrior vs Blade Maiden?','How many does the Farmer draw?'],
    },
    err: {
      invalid_player:'Invalid player', not_your_turn:'It is not your turn',
      not_action_phase:'Not the action phase', card_not_found:'Card not found',
      kukuochi_unplayable:'Kukunochi cannot be played', no_self_target:'You cannot target yourself',
      invalid_target:'Invalid target', invalid_guess:'Invalid card name',
      server_busy:'Please try again in a moment', player_disconnected:'Waiting for the other player to reconnect', invalid_action:'Invalid action', not_chooser:'You are not the one choosing',
      cannot_draw:'You cannot draw right now', not_select_phase:'Not the selection phase',
      must_pick_drawn:'Pick one of the cards you drew', no_game:'Game not found',
      room_not_found:'Room not found', room_full:'The room is full',
      already_started:'The game has already started', host_only:'Only the host can start',
      need_two:'At least 2 players are required', no_spectate:'No game available to spectate',
    },
    ui: {
      tagline:'A game of bluff and deduction', subtitle:'FOMUS × KUKU PROJECT',
      selectMode:'Select a mode',
      modeAI:'Computer', modeAIDesc:'Play solo against AI. Three difficulties',
      modeCreate:'Create Room', modeCreateDesc:'Share a room ID to play online',
      modeJoin:'Join Room', modeJoinDesc:'Join friends with a room ID or link',
      modeRules:'Rules', modeRulesDesc:'Card effects and how to play',
      modeMypage:'My Page', modeMypageDesc:'Record, rank and badges',
      officialSite:'Official Site', buyCards:'Buy Physical Cards',
      back:'Back', cancel:'Cancel', close:'Close',
      yourName:'Your name', namePlaceholder:'Enter a name',
      difficulty:'Difficulty', aiEasy:'Drowsy AI (Easy)', aiNormal:'Tactician AI (Normal)', aiHard:'Oni AI (Hard)',
      opponents:'Opponents', vsAI1:'1 AI opponent', vsAI2:'2 AI opponents', vsAI3:'3 AI opponents',
      startGame:'Start Game', vsAITitle:'vs AI',
      roomId:'Room ID', copyId:'Copy ID', shareUrl:'Share invite link',
      waitingPlayers:'Players', addAI:'Add AI', removeAI:'Remove AI',
      yourTurn:'Your turn', waitingTurn:'{name}\'s turn',
      drawCard:'Draw a card', drawPrompt:'Draw a card',
      playPrompt:'Choose a card to play', selectTarget:'Choose a target',
      guessPrompt:'Name a card in their hand', targetFirst:'Choose a target first',
      discardPrompt:'Choose a card for {name} to discard',
      farmerPrompt:'Choose the card to keep',
      deck:'Deck', cards:'cards', masu:'Masu', discardPile:'Discard', rebirthCard:'Rebirth', gameLog:'Log',
      you:'you', turnTag:'turn', spectating:'👁 Spectating — hands stay hidden until the end',
      leave:'Leave', rematch:'⚔️ Play again', backToMenu:'Back to menu',
      rematchVotes:'{voted}/{total} agreed',
      win:'Victory', lose:'Defeat', drawResult:'Draw',
      netLost:'📡 Connection lost — reconnecting…',
      netOpponentGone:'⏳ {name} disconnected (forfeits in {sec}s if they don\'t return)',
      netOpponentBack:'✅ {name} reconnected',
      rejoinFailed:'Could not rejoin the game',
      copied:'Copied: {v}', urlCopied:'Invite link copied',
      matched:'✅ Matched! Opponent: {name}',
      searching:'Searching for an opponent…', quickMatch:'Quick Match',
      offlineMode:'Playing offline (AI games need no server)',
      language:'Language',
      aiNameEasy:'Drowsy AI', aiNameNormal:'Tactician AI', aiNameHard:'Oni AI',
      namePlaceholderDefault:'Player',
      badgeEarned:'🏅 Badge unlocked: “{name}”', rankProgress:'{n} more wins to {rank}',
      winRate:'Win rate <strong>{rate}%</strong> ({total} games)', winLoss:'{w}W {l}L',
      discardBlind:'⚔ Choose a card from {name}\'s hand to discard (face-down)',
      discardOpenBoy:'⚡ Choose a card from {name}\'s hand to discard (Awakening)',
      discardOpen:'🗡 Choose a card from {name}\'s hand to discard',
      handIs:'Hand: {card} (Lv.{level})', declareFail:'“{v}” — declaration failed',
      thinking:'{name} is thinking…',
      reasonDraw:'The final hands were tied — no winner this time.',
      reasonDeckWin:'{card} was the strongest hand in the final showdown.',
      reasonDeckLose:'{name}\'s hand came out on top in the final showdown.',
      reasonEliminated:'You were eliminated, and {name} outlasted everyone.',
      reasonLastStanding:'{name} was the last one standing.',
      reasonWin:'You read your opponents, eliminated them, and survived.',
      reasonLose:'Your opponent found the winning line first.',
      hit:'Hit!', miss:'Miss…', masuSummoned:'{name} summoned the Masu — Ward gained',
      shareResultBtn:'📤 Share result image', shareSaved:'Image saved — post it anywhere',
      shareText:'A duel in SILVA! One-card mind games → {url}',
      shareTagline:'Free browser card game — no install', playedCard:'{name} played {card}',
      traineeHit:'{name} named {card} correctly!', traineeMiss:'{name} guessed {card} — wrong',

      someoneWins:'{name} wins', waitingFor:'Waiting for {name}…', youWin:'You win!',
      pickTargetFor:'{card} — choose a target', confirmPlay:'Play {card}?', peekResult:'Their hand is {card} (Lv.{level})',
    },
  },
};

/* ============================================================
   静的UI文字列の対訳表
   ------------------------------------------------------------
   index.html は日本語を直書きしている巨大な単一ファイルなので、
   全てにキーを振るのではなく「日本語原文 → 訳文」で引く方式にした。
   起動時にDOMのテキストノードを走査して差し替える（applyStatic）。
   新しい日本語を足したら、ここに1行足すだけでよい。
   ※ 未対訳は test/rules.test.js が機械的に検出する
   ============================================================ */
const STATIC = {
  en: {
    "遊び方":"How to play",
    "戦績":"Your record",
    "一枚に、":"One card.",
    "すべてを隠せ。":"Countless secrets.",
    "森の精霊と、人の思惑。\n相手の一枚を読み、生き残る心理戦。":"Spirits of the forest. Secrets in every hand.\nRead your rival. Be the last one standing.",
    "2–4人":"2–4 players",
    "1局 約5分":"About 5 minutes",
    "登録不要":"No sign-up",
    "まずは、練習の一局から":"Learn with a practice game",
    "ククノチ":"Kukunochi",
    "さあ、森の対局へ。":"Your next move starts here.",
    "ひとりで、気軽に":"AT YOUR OWN PACE",
    "ひとりで遊ぶ":"Play solo",
    "3つの強さのAIと、読み合いを磨く。":"Sharpen your instincts against three AI levels.",
    "オフラインでもプレイ可能":"Also available offline",
    "離れていても、一緒に":"A SHARED TABLE",
    "友達と遊ぶ":"Play with friends",
    "部屋を作って、招待リンクを送るだけ。":"Create a room. Share a link. Play together.",
    "2–4人のオンライン対戦":"ONLINE · 2–4 PLAYERS",
    "招待されたら":"GOT AN INVITATION?",
    "ルームに参加":"Join a room",
    "5文字の合言葉で、同じテーブルへ。":"A five-character code brings you to the table.",
    "ルームIDを入力 →":"ENTER ROOM CODE →",
    "誰かと対戦する ↗":"Find an opponent ↗",
    "対局を観る ↗":"Watch a match ↗",
    "カードとルール ↗":"Cards & rules ↗",
    "SILVAの世界を知る ↗":"Explore the world of SILVA ↗",
    "森の精霊と、人の思惑。":"Spirits of the forest.",
    "相手の一枚を読み、生き残る心理戦。":"Read your rival. Be the last one standing.",
    "森に宿る、十一の物語":"Eleven stories of the forest",
    "👁 観戦モード — 手札は対局終了後に公開されます":"Spectating — hands are revealed after the match",
    "観戦モード — 手札は対局終了後に公開されます":"Spectating — hands are revealed after the match",

    /* モード選択・トップ */
    '心理戦カードゲーム':'A game of bluff and deduction',
    'モードを選択':'Select a mode',
    'コンピューター':'Computer', 'AIと1人で対戦。3段階の難易度':'Play solo vs AI. Three difficulty levels',
    'ルーム作成':'Create Room', 'ルームIDを共有してオンライン対戦':'Share a room ID to play online',
    'ルーム参加':'Join Room', 'ルームIDやURLで友達と対戦':'Join friends with a room ID or link',
    'ルール':'Rules', 'カードの効果と遊び方を確認':'Card effects and how to play',
    'マイページ':'My Page', '戦績・ランク・バッジを確認':'Record, rank and badges',
    '🌐 公式サイト':'🌐 Official Site', '🃏 実物カードを購入':'🃏 Buy Physical Cards',
    '購入ページは準備中です':'The store is coming soon',

    /* 共通 */
    '戻る':'Back', 'キャンセル':'Cancel', '閉じる':'Close', '共有':'Share',
    'あなた':'You', '(あなた)':'(you)', '相手':'Opponent', '対象':'Target', '攻撃者':'Attacker',
    '名前':'Name', 'あなたの名前':'Your name', '名前を入力':'Enter a name',
    'プレイヤー':'Player', '名無しの冒険者':'Nameless Wanderer', '観戦者':'Spectator',
    '難易度':'Difficulty', '対戦人数':'Opponents', 'ゲームを開始':'Start Game',
    '枚':' cards', '残り':'left', '結果':'Result', '記録':'Record', '履歴':'History',
    '使用する':'Use', '使用済み':'Used', '未設定':'Not set', '引き分け':'Draw',

    /* AI */
    'ゆっくりAI':'Drowsy AI', '策士AI':'Tactician AI', '鬼神AI':'Oni AI',
    '🟢 ゆっくりAI（簡単）':'🟢 Drowsy AI (Easy)',
    '🟡 策士AI（普通）':'🟡 Tactician AI (Normal)',
    '🔴 鬼神AI（強い）':'🔴 Oni AI (Hard)',
    'AI 1人と対戦':'1 AI opponent', 'AI 2人と対戦':'2 AI opponents', 'AI 3人と対戦':'3 AI opponents',
    'コンピューター対戦':'Computer match', '＋ AI追加':'+ Add AI', 'AI削除':'Remove AI',

    /* ルーム・マッチング */
    'ルームID':'Room ID', 'ルームIDを入力してください':'Please enter a room ID',
    'ルームを作成する':'Create a room', '対局に参加':'Join a game', '参加する':'Join',
    '対局ルーム':'Game room', '対局を開始する':'Start the game',
    '2〜4人（AIを含む）で対局できます':'Play with 2–4 players (AI included)',
    'タップでIDをコピー':'Tap to copy the ID', '🔗 招待URLをコピー':'🔗 Copy invite link',
    '📱 QRコードで招待':'📱 Invite by QR code', 'スマホで読み取って参加':'Scan with a phone to join',
    'QR生成エラー':'Could not generate a QR code',
    'コピーしました:':'Copied:', '招待URLをコピーしました':'Invite link copied',
    'オンラインマッチング':'Online matchmaking', 'マッチングを開始':'Find a match',
    '相手を探す':'Find an opponent', '対戦相手を探しています...':'Searching for an opponent…',
    '⚔️ 対戦の準備が整いました':'⚔️ Ready to play',
    '待機中...':'Waiting…', '✓ 待機中…':'✓ Waiting…', '準備完了！':'Ready!',
    '部屋を出る':'Leave room', '部屋を出ますか？':'Leave this room?', 'ルームを出ますか？':'Leave this room?',
    'ロビーへ戻る':'Back to lobby', '退出':'Leave', '新しい対局':'New game',
    '⚔️ 続けて対戦する':'⚔️ Play again', '例：ククノチは出せる？ 守護って何？':'e.g. Can I play Kukunochi? What is the Ward?', '📤 結果を画像で共有':'📤 Share result image', '💬 ルール相談':'💬 Rules Help', '相手の同意を待っています…':'Waiting for the opponent to agree…',
    '対局を見る':'Watch a game', '観戦':'Spectate', '観戦モード':'Spectating', '観戦中...':'Spectating…',
    '👁 観戦モード — 全員の手札が表示されています':'👁 Spectating — hands stay hidden until the game ends',
    '🔄 対局一覧を更新':'🔄 Refresh game list',
    '進行中の対局がありません':'No games in progress',
    '更新ボタンを押してください':'Press refresh to look again',

    /* 対局画面 */
    '⚡ あなたの手番':'⚡ Your turn', '手番':'turn', '脱落':'out',
    '🃏 カードを引く':'🃏 Draw a card', 'カードを引いてください':'Draw a card',
    '手札からカードを選んでください':'Choose a card from your hand',
    'ターゲットを選択':'Choose a target', 'ターゲットを選択してください':'Choose a target',
    'まずターゲットを選択してください':'Choose a target first',
    '相手の手札を予言してください':'Name a card in their hand',
    '1枚を選んで手札に加えてください':'Pick one card to keep',
    '山札':'Deck', '再生札':'Rebirth', '🌱 再生札':'🌱 Rebirth', '戦況記録':'Log',
    'ログがありません':'No entries yet', '手札なし':'no cards',
    '⚔ 格闘対象':'⚔ Duel target', '🛡 守護':'🛡 Ward', '守護':'Ward',
    '的中！':'Hit!', '外れ...':'Miss…',
    '👁 偵察結果':'👁 Recon result', '🍶 醸造の儀':'🍶 The Brewing',
    '🌾 農家の効果':'🌾 Farmer effect',
    '🌾 農家の効果 — 手札から1枚選んでください':'🌾 Farmer — choose one card to keep',
    '✨ 精霊の効果で手札が交換された！':'✨ The Spirit swapped your hand!',
    '🏺 枡職人2枚目 — タップで召喚':'🏺 Second Masu Craftsman — tap to summon',
    '🏆 あなたの勝利':'🏆 You win',
    '📡 接続が切れました — 再接続しています…':'📡 Connection lost — reconnecting…',
    '対局に復帰できませんでした':'Could not rejoin the game',

    /* カード名・効果 */
    '幼きククノチ':'Kukunochi Sprout', '少年':'The Boy', '訓練生':'Apprentice', '偵察隊':'Scout',
    '戦士':'Warrior', '蔵人':'Kurando', '枡職人':'Masu Craftsman', '農家':'Farmer',
    '精霊':'Spirit', '刀の少女':'Blade Maiden', 'ククノチ':'Kukunochi',
    '幼きククノチ Lv.0':'Kukunochi Sprout Lv.0', '少年 Lv.1':'The Boy Lv.1',
    '訓練生 Lv.2':'Apprentice Lv.2', '偵察隊 Lv.3':'Scout Lv.3', '戦士 Lv.4':'Warrior Lv.4',
    '蔵人 Lv.5':'Kurando Lv.5', '枡職人 Lv.6':'Masu Craftsman Lv.6', '農家 Lv.7':'Farmer Lv.7',
    '精霊 Lv.8':'Spirit Lv.8', '刀の少女 Lv.9':'Blade Maiden Lv.9', 'ククノチ Lv.10':'Kukunochi Lv.10',
    '光合成':'Photosynthesis', '変革':'Awakening', '特攻':'Strike', '偵察':'Recon',
    '格闘':'Duel', '醸造':'Brewing', '栽培':'Cultivate', '思念':'Thoughtstream', '一閃':'Flash', '再生':'Rebirth',
    '効果なし':'No effect',
    '効果なし。1対1なら精霊(Lv.8)に勝つ':'No effect. Beats the Spirit (Lv.8) one-on-one',
    '1枚目は効果なし。2枚目で手札を見て1枚捨てさせる':'1st copy: no effect. 2nd: look at a hand and force a discard',
    '2枚目で手札を見て1枚捨てさせる':'2nd copy: look at a hand and force a discard',
    '相手の手札を宣言。当たれば脱落させる':'Name a card in their hand — a hit eliminates them',
    '相手の手札を予言する':'Name a card in their hand',
    '相手1人の手札を覗き見る':'Peek at one opponent’s hand',
    '相手の手札を覗く':'Peek at their hand',
    '相手に1枚引かせ、裏向きのまま1枚捨てさせる':'They draw one; you discard one of theirs face-down',
    '相手にカードを引かせ1枚捨てさせる':'They draw one; you force a discard',
    '相手にカードを引かせ1枚捨てさせる(即死)':'They draw one; you force a discard (lethal)',
    '手札を見せ合い、低い方が脱落':'Compare hands — the lower one is eliminated',
    '相手と手札を見せ合い弱い方が脱落':'Compare hands — the weaker one is eliminated',
    '2枚目で「守護」— 脱落を1回だけ無効化':'2nd copy grants a Ward — blocks one elimination',
    '2枚目で自動的に守護を得る':'2nd copy automatically grants a Ward',
    '次の手番で2枚引き、好きな1枚を残す':'Draw 2 next turn and keep the one you like',
    '次の手番で複数枚引いて1枚選ぶ':'Draw extra next turn and keep one',
    '相手1人と手札を交換する':'Swap hands with one opponent',
    '相手と手札を交換する':'Swap hands with an opponent',
    '手札を見て1枚捨てさせる。ククノチも斬る':'Look at a hand and force a discard — slays Kukunochi',
    '場に出せない。脱落時に再生':'Cannot be played. Reborn when eliminated',
    '場に出せない。脱落時に幼きククノチとして再生':'Cannot be played. Reborn as a Sprout when eliminated',

    /* スプラッシュ */
    '森の世界を準備しています…':'Growing the forest…',
    'カードをシャッフルしています…':'Shuffling the deck…',
    '職人たちを呼び集めています…':'Gathering the artisans…',
    '森の結界を張っています…':'Raising the forest ward…',
    'もう少しで準備完了です…':'Almost ready…',

    /* マイページ・戦績 */
    '戦績':'Record', 'バッジ':'Badges', 'ハイライト':'Highlights',
    'プロフィール編集':'Edit profile', 'プロフィールを保存しました':'Profile saved',
    'ひとこと':'Bio', '自己紹介（任意）':'About you (optional)', '国':'Country',
    'データをリセット':'Reset data', 'データをリセットしました':'Data has been reset',
    '全ての戦績データをリセットしますか？':'Reset all of your record data?',
    'オンライン':'Online', '現在の連勝':'Current streak', '最高連勝記録':'Best streak',
    '最終プレイ':'Last played', '最高ランク到達！':'Highest rank reached!',
    'AI難易度別':'By AI difficulty',
    '種子':'Seed', '芽吹き':'Sprout', '若木':'Sapling', '樹木':'Tree',
    '古木':'Elder Tree', '霊樹':'Sacred Tree', '森の守護者':'Forest Guardian',
    '森の王':'Forest King', '伝説の大樹':'Legendary Titan', '百戦錬磨':'Battle-Hardened',
    '初勝利':'First Win', '初めて勝利した':'Won your first game',
    '5勝達成':'5 Wins', '5回勝利した':'Won 5 games',
    '10勝達成':'10 Wins', '10回勝利した':'Won 10 games',
    '30勝達成':'30 Wins', '30回勝利した':'Won 30 games',
    '50勝の猛者':'50-Win Veteran', '50回勝利した':'Won 50 games',
    '100回勝利した':'Won 100 games', '100回対戦した':'Played 100 games',
    '対戦10回':'10 Games', '10回対戦した':'Played 10 games',
    '対戦50回':'50 Games', '50回対戦した':'Played 50 games',
    '対戦100回':'100 Games',
    '3連勝':'3 in a Row', '3連勝した':'Won 3 in a row',
    '5連勝':'5 in a Row', '5連勝した':'Won 5 in a row',
    '10連勝':'10 in a Row', '10連勝した':'Won 10 in a row',
    'ゆっくり撃破':'Drowsy Slayer', 'ゆっくりAIに勝利':'Beat the Drowsy AI',
    '策士撃破':'Tactician Slayer', '策士AIに勝利':'Beat the Tactician AI',
    '鬼神撃破':'Oni Slayer', '鬼神AIに勝利':'Beat the Oni AI',
    '鬼神の天敵':'Bane of the Oni', '鬼神AIに10回勝利':'Beat the Oni AI 10 times',
    'オンライン勝者':'Online Victor', 'オンライン対戦で勝利':'Won an online match',

    /* PWA案内・その他 */
    'アプリとして追加':'Add to home screen',
    'Safariの共有ボタンから「ホーム画面に追加」でアプリとして遊べます 🌳':'Tap Share in Safari, then “Add to Home Screen”, to play it like an app 🌳',
    '▶ 再生':'▶ Play', '⏸ 停止':'⏸ Pause', '◀ 前':'◀ Prev', '次 ▶':'Next ▶',
    'SILVAで対戦しよう！':'Come play SILVA!', 'SILVA対戦':'SILVA match',
    '🏺 枡 0':'🏺 Masu 0', '🏺 枡 守護中🛡':'🏺 Masu — Warded 🛡',

    /* ── はじめてガイド ── */
    'SILVA はじめてガイド':'SILVA — First-Time Guide',
    '1. 引く':'1. Draw',
    '手札1枚から始まり、自分の手番で1枚引きます。':'You start with one card and draw one on your turn.',
    '2. 出す':'2. Play',
    '2枚から1枚を使います。残った1枚があなたの強さです。':'Play one of your two cards. The one you keep is your strength.',
    '3. 読む':'3. Read',
    '相手の手札を見たり、当てたり、交換したりして生き残ります。':'Peek, guess and swap your way to survival.',
    '勝ち方':'How to win',
    '最後まで残る。山札切れなら手札レベルが一番高い人が勝ち。':'Outlast everyone — or hold the highest card when the deck runs out.',
    '大事':'Key rule',
    'ククノチ Lv.10 は出せませんが、脱落時に再生することがあります。':'Kukunochi (Lv.10) cannot be played, but it may be reborn when you fall.',
    '最初のおすすめ':'First game',
    'やさしいAIと1人で、カード効果を見ながら1戦だけ遊ぶ。':'Play one round against the easy AI while reading the card effects.',
    '🌱 練習をはじめる':'🌱 Start a practice game',
    '🌱 はじめて遊ぶ':'🌱 New here? Start guide',

    /* ── ルール説明ページ（rules.html） ── */
    'トップへ戻る':'Back to top',
    '心理戦カードゲーム — ルール説明':'A game of bluff and deduction — Rules',
    'ゲーム概要':'Overview',
    'SILVAは、日本の職人文化と森の精霊をテーマにした心理戦カードゲームです。':'SILVA is a game of bluff and deduction themed on Japanese artisan culture and forest spirits.',
    '手札はたった':'Your hand is just ',
    '1枚':'one card',
    '。山札から引いて2枚になったら、1枚を場に出して効果を発動。相手の手札を読み、生き残れ。':'. Draw to two, play one and trigger its effect. Read your opponents\u2019 hands — and survive.',
    '勝利条件':'How to win',
    '他のプレイヤーを全員脱落させるか、山札がなくなった時に最もレベルの高いカードを持っていれば勝利。':'Eliminate every other player, or hold the highest-level card when the deck runs out.',
    'プレイ人数：':'Players: ',
    '2〜4人':'2–4 players',
    'カード枚数：':'Cards: ',
    '全17枚（11種類）':'17 cards (11 kinds)',
    '手札：':'Hand: ',
    '常に1枚（ターン中のみ2枚）':'Always 1 card (2 during your turn)',
    'ゲームの流れ':'How a turn works',
    '準備':'Setup',
    '山札をシャッフルし、各プレイヤーに1枚ずつ配る。':'Shuffle the deck and deal one card to each player.',
    'カードを引く':'Draw',
    '自分の手番が来たら、山札から1枚引いて手札を2枚にする。':'On your turn, draw one card so you hold two.',
    'カードを出す':'Play',
    '手札2枚のうち1枚を場に出し、その効果を発動する。':'Play one of your two cards and trigger its effect.',
    '残り1枚が次の手札となる。':'The remaining card becomes your hand.',
    '繰り返し':'Repeat',
    '次のプレイヤーの手番へ。山札がなくなるか、生存者が1人になるまで続ける。':'Play passes on. Continue until the deck runs out or one player remains.',
    'カード一覧と効果':'Cards & effects',
    'レベルが高いほど強力ですが、枚数が少なく狙われやすい。低レベルでも効果で逆転が可能です。':'Higher levels are stronger but rarer — and bigger targets. Low cards can still turn the game with their effects.',
    'カード名':'Card',
    '枚数':'Qty',
    '効果':'Effect',
    '説明':'Description',
    'ククノチ(Lv.10)の再生で手札に加わる特殊カード。効果なし。精霊(Lv.8)に対して勝利する特殊ルールあり。':'A special card gained when Kukunochi (Lv.10) is reborn. No effect. Beats the Spirit (Lv.8) in a one-on-one showdown.',
    '1枚目は効果なし。2枚目が場に出ると相手の手札を見て1枚捨てさせる。ククノチを捨てさせても再生は発動する（斬れるのは刀の少女のみ）。':'1st copy: no effect. 2nd copy: look at an opponent\u2019s hand and force a discard. Kukunochi still gets reborn — only the Blade Maiden can slay it.',
    '相手を1人選び、手札のカード名を宣言。当たれば相手は脱落。':'Choose an opponent and name a card. If you\u2019re right, they\u2019re out.',
    '相手を1人選び、手札を覗き見る。':'Choose an opponent and peek at their hand.',
    '相手を1人選ぶ。相手は山札から1枚引き、あなたが相手の手札から1枚を裏向きのまま選んで捨てさせる。ククノチを捨てさせた場合は再生が発動する。山札が空なら効果不発。':'Choose an opponent. They draw one card, then you pick one of their cards face-down to discard. Kukunochi is still reborn. Fizzles if the deck is empty.',
    '相手を1人選び、互いに手札を公開。レベルが低い方が脱落。同レベルなら両者脱落。':'Choose an opponent and compare hands. The lower level is out; on a tie, both are out.',
    '1枚目は効果なし。2枚目が場に出ると':'1st copy: no effect. Playing the 2nd grants a ',
    '「守護」':'Ward',
    'を獲得。次に脱落する効果を1回だけ無効化する。':' — it negates the next elimination, once.',
    '次の手番で山札から2枚引き（2枚目は3枚）、1枚を選んで残りを山札に戻す。':'Next turn, draw 2 cards (3 if it\u2019s your 2nd Farmer), keep one and shuffle the rest back.',
    '相手を1人選び、手札を交換する。':'Choose an opponent and swap hands.',
    '相手を1人選ぶ。相手は山札から1枚引き、あなたが相手の手札を見て1枚を選んで捨てさせる。ククノチを捨てさせた場合、再生は発動しない。':'Choose an opponent. They draw one card, then you look at their hand and choose one to discard. If it\u2019s Kukunochi, no rebirth.',
    '場に出すことはできない。':'Cannot be played.',
    '脱落時にこのカードを持っていれば、手札を全て捨てて「幼きククノチ(Lv.0)」として復活する。':'When eliminated while holding it, discard everything and come back as the Kukunochi Sprout (Lv.0).',
    '特殊ルール':'Special rules',
    'ククノチの再生：':'Kukunochi\u2019s Rebirth: ',
    '脱落時にククノチ(Lv.10)を手札に持っていれば、手札を全て捨てて「幼きククノチ(Lv.0)」として復活する。戦士(Lv.4)や少年2枚目(Lv.1)で捨てさせられた場合も再生する。':'If you hold Kukunochi (Lv.10) when eliminated, discard everything and return as the Sprout (Lv.0). This also triggers when the Warrior (Lv.4) or a 2nd Boy (Lv.1) forces the discard.',
    'ククノチを斬れるのは刀の少女(Lv.9)の「一閃」だけ':'Only the Blade Maiden\u2019s Flash (Lv.9) can slay Kukunochi',
    '— これで捨てさせられた場合のみ再生しない。':' — only then is there no rebirth.',
    '守護（枡職人）：':'Ward (Masu Craftsman): ',
    '枡職人を':'Play',
    '自分で2枚場に出す':'two Masu Craftsmen yourself',
    'と「守護」を得る（捨てさせられた枚数は数えない）。発生源を問わず、次の脱落を1回だけ無効化する — 特攻・醸造・一閃のいずれにも有効。醸造で自分が負けた場合も守られる。':' to gain a Ward (forced discards don\u2019t count). It negates the next elimination from any source — Strike, Brewing or Flash — and protects you even when you lose your own Brewing.',
    '幼きククノチ vs 精霊：':'Sprout vs Spirit: ',
    '山札がなくなった時、1対1で幼きククノチ(Lv.0)と精霊(Lv.8)が残った場合、幼きククノチが勝利する（特殊勝利）。':'If the deck runs out with the Sprout (Lv.0) facing the Spirit (Lv.8) one-on-one, the Sprout wins.',
    '変革（少年）：':'Awakening (The Boy): ',
    '少年が2枚場に出ると、2枚目は相手に1枚引かせ、':'When a 2nd Boy is played, the target draws one card and you',
    '手札を見て1枚捨てさせる':'look at their hand and force a discard',
    '（一閃と同じ動き）。ただしククノチを捨てさせても':' (the same motion as Flash). But even if Kukunochi is discarded,',
    '再生は発動する':'the rebirth still triggers',
    '— ククノチを斬れるのは刀の少女だけ。':' — only the Blade Maiden can slay it.',
    '山札切れ：':'Deck out: ',
    '山札がなくなった時点で生存者が複数いる場合、手札のレベルが最も高いプレイヤーが勝利。':'If several players survive when the deck runs out, the highest-level hand wins.',
    '戦略のヒント':'Strategy tips',
    '高レベルのカードは強いが、場に出せば捨て札から相手にバレる。あえて低レベルを手元に残す選択肢も。':'High cards are strong, but playing them reveals information. Sometimes keeping a low card is the sharper play.',
    '偵察隊(Lv.3)で得た情報は、訓練生(Lv.2)の「特攻」に活かせる。':'What the Scout (Lv.3) sees, the Apprentice (Lv.2) can Strike.',
    'ククノチ(Lv.10)は最強だが場に出せない。蔵人(Lv.5)の「醸造」と組み合わせると確実に相手を倒せる。':'Kukunochi (Lv.10) can\u2019t be played — but pair it with the Kurando\u2019s Brewing (Lv.5) and you win the comparison every time.',
    '捨て札をよく観察しよう。場に出たカードから相手の手札を推理できる。':'Watch the discards. Every card played narrows down what your opponents hold.',
    '守護は強力だが、枡職人2枚は運が必要。守護を過信しすぎないこと。':'The Ward is powerful, but drawing two Craftsmen takes luck. Don\u2019t build your plan around it.',
    'ルールを覚えたら、さっそく対戦してみよう':'Know the rules? Time to play.',
    'ゲームをプレイする':'Play now',

    /* 国 */
    '🇯🇵 日本':'🇯🇵 Japan', '🇺🇸 アメリカ':'🇺🇸 United States', '🇬🇧 イギリス':'🇬🇧 United Kingdom',
    '🇫🇷 フランス':'🇫🇷 France', '🇩🇪 ドイツ':'🇩🇪 Germany', '🇮🇹 イタリア':'🇮🇹 Italy',
    '🇪🇸 スペイン':'🇪🇸 Spain', '🇷🇺 ロシア':'🇷🇺 Russia', '🇨🇳 中国':'🇨🇳 China',
    '🇰🇷 韓国':'🇰🇷 South Korea', '🇹🇼 台湾':'🇹🇼 Taiwan', '🇹🇭 タイ':'🇹🇭 Thailand',
    '🇻🇳 ベトナム':'🇻🇳 Vietnam', '🇮🇩 インドネシア':'🇮🇩 Indonesia', '🇮🇳 インド':'🇮🇳 India',
    '🇧🇷 ブラジル':'🇧🇷 Brazil', '🇲🇽 メキシコ':'🇲🇽 Mexico', '🇨🇦 カナダ':'🇨🇦 Canada',
    '🇦🇺 オーストラリア':'🇦🇺 Australia', '🌍 その他':'🌍 Other',
  },
};

/* {name} 形式のプレースホルダを埋める */
function fill(tpl, args) {
  if (!tpl) return '';
  return String(tpl).replace(/\{(\w+)\}/g, (m, key) =>
    (args && args[key] !== undefined && args[key] !== null) ? args[key] : m);
}

function pick(lang) { return DICT[lang] || DICT.ja; }

function makeT(getLang) {
  const d = () => pick(getLang());
  const api = {
    /* ui.xxx を引く */
    t(key, args) {
      const dict = d();
      const val = key.split('.').reduce((o, k) => (o ? o[k] : undefined), dict);
      const fb  = key.split('.').reduce((o, k) => (o ? o[k] : undefined), DICT.ja);
      return fill(val !== undefined ? val : fb !== undefined ? fb : key, args);
    },
    cardName: id => d().card[id] || DICT.ja.card[id] || id,
    effectName: id => d().effect[id] || DICT.ja.effect[id] || '',
    effectDesc: id => d().effectDesc[id] || DICT.ja.effectDesc[id] || '',
    err: code => d().err[code] || DICT.ja.err[code] || code,
    /* AI名は '#AI:normal' の予約形式で来るので、表示時に各言語へ差し替える。
       人間の名前は '#' を弾いてあるので衝突しない */
    displayName(name) {
      const m = /^#AI:(easy|normal|hard)(?::(\d+))?$/.exec(name || '');
      if (!m) return name || '';
      const key = 'ui.aiName' + m[1][0].toUpperCase() + m[1].slice(1);
      return '[' + api.t(key) + (m[2] ? ' ' + m[2] : '') + ']';
    },
    /* game-core が積んだ {k, ...args} を1行の文章にする */
    logLine(entry) {
      if (typeof entry === 'string') return entry;      // 旧形式のログも壊さない
      if (!entry || !entry.k) return '';
      const dict = d();
      const args = Object.assign({}, entry);
      if (args.card !== undefined) args.card = args.card ? api.cardName(args.card) : api.t('log.none');
      if (args.via !== undefined)  args.via  = api.cardName(args.via);
      for (const k of ['name', 'target', 'a', 'b']) if (args[k] !== undefined) args[k] = api.displayName(args[k]);
      return fill(dict.log[entry.k] || DICT.ja.log[entry.k] || entry.k, args);
    },
  };
  /* 日本語の原文を渡すと現在の言語の訳を返す。JS内のリテラルにも使える */
  api.L = function (ja) {
    const lang = getLang();
    if (lang === 'ja' || !ja) return ja;
    const table = STATIC[lang];
    if (!table) return ja;
    const hit = table[String(ja).trim()];
    return hit !== undefined ? String(ja).replace(String(ja).trim(), hit) : ja;
  };

  /* DOM内の静的テキストを一括で差し替える。
     初回に原文を data-ja / _ja に控えるので、言語を戻しても復元できる */
  const ATTRS = ['placeholder', 'title', 'alt', 'aria-label'];
  api._applying = false;
  api.applyStatic = function (rootEl) {
    const scope = rootEl || document.body;
    if (!scope) return;
    api._applying = true;

    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const tag = n.parentNode && n.parentNode.nodeName;
        if (tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT;
        return n.nodeValue && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);
    for (const n of nodes) {
      if (n._ja === undefined) n._ja = n.nodeValue;
      const translated = api.L(n._ja);
      if(n.nodeValue !== translated) n.nodeValue = translated;
    }

    /* 原文の控えは dataset ではなく要素の隠しプロパティに持つ。
       dataset は 'aria-label' のようなハイフン付きキーを受け付けないため */
    scope.querySelectorAll('[' + ATTRS.join('],[') + ']').forEach(el => {
      const orig = el._jaAttrs || (el._jaAttrs = {});
      for (const a of ATTRS) {
        if (!el.hasAttribute(a)) continue;
        if (orig[a] === undefined) orig[a] = el.getAttribute(a);
        const translated = api.L(orig[a]);
        if(el.getAttribute(a) !== translated) el.setAttribute(a, translated);
      }
    });

    /* <option> は textContent が差し替わっても value は変えない（値は日本語に依存しない） */
    document.documentElement.lang = (LANGS[getLang()] || LANGS.ja).htmlLang;
    api._applying = false;
  };

  /* 画面はJSで動的に組み立てられるので、静的な初回変換だけでは追いつかない。
     DOMの変化を監視して、増えたテキストも自動で訳す。
     （自分の書き換えで再帰しないよう _applying でガードする） */
  api.autoApply = function () {
    if (typeof MutationObserver === 'undefined' || api._observer) return;
    let queued = false;
    const run = () => {
      queued = false;
      api._applying = true;
      try { api.applyStatic(); } finally { api._applying = false; }
    };
    api._observer = new MutationObserver(() => {
      if (api._applying || queued) return;
      queued = true;
      /* requestAnimationFrame はタブが非表示だと発火しないので使わない */
      setTimeout(run, 16);
    });
    api._observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };

  return api;
}

return { LANGS, DICT, STATIC, fill, makeT };
});
