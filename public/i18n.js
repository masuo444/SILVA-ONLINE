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
    /* ── サーバーからのエラー ── */
    err: {
      invalid_player:'無効なプレイヤーです', not_your_turn:'手番ではありません',
      not_action_phase:'手番フェーズではありません', card_not_found:'カードが見つかりません',
      kukuochi_unplayable:'ククノチは場に出せません', no_self_target:'自分自身は対象にできません',
      invalid_target:'ターゲットが無効です', invalid_guess:'その宣言はできません',
      invalid_action:'無効な操作です', not_chooser:'あなたが選択者ではありません',
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
      hit:'的中！', miss:'外れ...', masuSummoned:'{name} が枡を召喚 — 守護を得た', playedCard:'{name}が「{card}」を使用',
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
    err: {
      invalid_player:'Invalid player', not_your_turn:'It is not your turn',
      not_action_phase:'Not the action phase', card_not_found:'Card not found',
      kukuochi_unplayable:'Kukunochi cannot be played', no_self_target:'You cannot target yourself',
      invalid_target:'Invalid target', invalid_guess:'Invalid card name',
      invalid_action:'Invalid action', not_chooser:'You are not the one choosing',
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
      hit:'Hit!', miss:'Miss…', masuSummoned:'{name} summoned the Masu — Ward gained', playedCard:'{name} played {card}',
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
    '⚔️ 続けて対戦する':'⚔️ Play again', '相手の同意を待っています…':'Waiting for the opponent to agree…',
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
      n.nodeValue = api.L(n._ja);
    }

    /* 原文の控えは dataset ではなく要素の隠しプロパティに持つ。
       dataset は 'aria-label' のようなハイフン付きキーを受け付けないため */
    scope.querySelectorAll('[' + ATTRS.join('],[') + ']').forEach(el => {
      const orig = el._jaAttrs || (el._jaAttrs = {});
      for (const a of ATTRS) {
        if (!el.hasAttribute(a)) continue;
        if (orig[a] === undefined) orig[a] = el.getAttribute(a);
        el.setAttribute(a, api.L(orig[a]));
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
