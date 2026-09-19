/* ============================================================
   SILVA — ルールエンジン（サーバー／ブラウザ共有）
   ------------------------------------------------------------
   ここが唯一のルールの正典。server.js もブラウザのAI対戦も
   このファイルを使うので、実装がズレることがない。

   ・ログは日本語文ではなく {k:キー, ...引数} の構造化データで積む
     （多言語化のため。表示は i18n.js が担当）
   ・演出イベントは broadcast せず game に溜め、呼び出し側が drainEvents で回収する
     （サーバーはWSで配信、ブラウザは自分で処理）
   ============================================================ */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SILVA_CORE = api;
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';

// ============================================================
// Cards
// ============================================================
const CARDS = [
  { id:'kukuochi_young', level:0,  count:1, emoji:'🌱' },
  { id:'boy',            level:1,  count:2, emoji:'⚡' },
  { id:'trainee',        level:2,  count:2, emoji:'🎯' },
  { id:'scout',          level:3,  count:2, emoji:'🔍' },
  { id:'warrior',        level:4,  count:2, emoji:'⚔️' },
  { id:'kurando',        level:5,  count:1, emoji:'🍶' },
  { id:'masu_craftsman', level:6,  count:2, emoji:'🏺' },
  { id:'farmer',         level:7,  count:2, emoji:'🌾' },
  { id:'spirit',         level:8,  count:2, emoji:'✨' },
  { id:'sword_girl',     level:9,  count:1, emoji:'🗡️' },
  { id:'kukuochi',       level:10, count:1, emoji:'🌳' },
];
const CARD_BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));
const NEEDS_TARGET = ['scout','warrior','kurando','spirit','sword_girl','trainee','boy'];

let _uidSeq = 0;
function uid() { return (++_uidSeq).toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
function mkCard(id) { return { ...CARD_BY_ID[id], uid: uid() }; }

function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function buildDeck(rng) {
  const deck = [];
  for (const c of CARDS) {
    if (c.id === 'kukuochi_young') continue;
    for (let i = 0; i < c.count; i++) deck.push(mkCard(c.id));
  }
  return shuffle(deck, rng);
}

// ============================================================
// Events & log
// ============================================================
function emit(game, ev) { (game._events || (game._events = [])).push(ev); }
/* 溜まった演出イベントを取り出す。呼び出し側が配信/処理する */
function drainEvents(game) { const e = game._events || []; game._events = []; return e; }

/* ログは翻訳できるよう {k:キー, ...引数} で積む。カードは必ず id で持つ */
function addLog(game, k, args) {
  game.log.unshift(Object.assign({ k }, args || {}));
  if (game.log.length > 40) game.log.pop();
}

// ============================================================
// Game init
// ============================================================
function createGame(players, opts = {}) {
  const rng = opts.rng || Math.random;
  const game = {
    players: players.map(p => ({
      id: p.id, name: p.name, isAI: !!p.isAI, difficulty: p.difficulty || 'normal',
      hand: [], discard: [], alive: true, shield: false, nextTurnBonus: null,
    })),
    deck: buildDeck(rng),
    /* field = 「場に出された」カードのidのみ。捨てさせられた札は含めない。
       枡職人・少年・農家の「2枚目」判定はここを見る */
    field: [],
    knowledge: {},
    currentPlayerIndex: 0,
    phase: 'draw',
    pendingAction: null,
    pendingFarmerDrawn: null,
    winner: null,
    log: [],
    turn: 1,
    _events: [],
    _rng: rng,
  };
  game.players.forEach(p => p.hand.push(game.deck.shift()));
  return game;
}

function cp(game) { return game.players[game.currentPlayerIndex]; }
function alivePlayers(game) { return game.players.filter(p => p.alive); }

function nextTurn(game) {
  if (game.phase === 'ended') return;
  const alive = alivePlayers(game);
  if (alive.length <= 1) { endGame(game, alive[0] ? alive[0].id : null); return; }
  if (!game.deck.length) { checkDeckEmpty(game); return; }
  let next = (game.currentPlayerIndex + 1) % game.players.length;
  while (!game.players[next].alive) next = (next + 1) % game.players.length;
  game.currentPlayerIndex = next; game.phase = 'draw'; game.turn++;
}

function drawCard(game, player) {
  if (!game.deck.length) return null;
  const card = game.deck.shift(); player.hand.push(card); return card;
}

function endGame(game, winnerId) {
  if (game.phase === 'ended') return;   // 二重終了（勝利ログの重複）を防ぐ
  game.phase = 'ended'; game.winner = winnerId;
  const w = game.players.find(p => p.id === winnerId);
  addLog(game, winnerId ? 'winner' : 'draw_game', winnerId ? { name: w.name } : null);
  emit(game, { type: 'game_ended', winnerId });
}

/* opts.noRebirth : ククノチの再生を封じる（刀の少女の一閃でククノチを斬られた場合のみ）
   守護はルール上「次に脱落する効果を1回だけ無効化」なので、例外なく常に先に判定する */
function eliminatePlayer(game, playerId, opts = {}) {
  const player = game.players.find(p => p.id === playerId);
  if (!player || !player.alive) return {};
  // 守護優先（発生源を問わず有効）
  if (player.shield) {
    player.shield = false;
    addLog(game, 'shield_block', { name: player.name });
    emit(game, { type: 'shield_blocked', playerId });
    return { shieldBlocked: true };
  }
  // ククノチ再生
  const kIdx = player.hand.findIndex(c => c.id === 'kukuochi');
  if (kIdx !== -1 && !opts.noRebirth) {
    const others = player.hand.filter((_, i) => i !== kIdx);
    player.discard.push(...others, player.hand[kIdx]);
    player.hand = [mkCard('kukuochi_young')];
    addLog(game, 'rebirth', { name: player.name });
    emit(game, { type: 'rebirth', playerId, playerName: player.name });
    return { rebirth: true };
  }
  player.alive = false; player.discard.push(...player.hand); player.hand = [];
  addLog(game, 'eliminated', { name: player.name });
  emit(game, { type: 'player_eliminated', playerId });
  return { eliminated: true };
}

/* 接続断による不戦敗。カード効果ではないので守護も再生も働かない */
function forfeit(game, playerId) {
  const p = game.players.find(x => x.id === playerId);
  if (!p || !p.alive) return;
  p.alive = false; p.discard.push(...p.hand); p.hand = [];
  addLog(game, 'forfeit', { name: p.name });
  emit(game, { type: 'player_eliminated', playerId });
  const alive = alivePlayers(game);
  if (alive.length <= 1) endGame(game, alive[0] ? alive[0].id : null);
  else if (cp(game).id === playerId) nextTurn(game);
}

// ============================================================
// Knowledge — AIが「正規に見た情報」だけを覚えるための台帳
// （これが無いとAIが相手の手札を直接参照＝カンニングになる）
// ============================================================
function noteKnowledge(game, observerId, aboutId, card) {
  if (!observerId || !aboutId || !card) return;
  if (!game.knowledge[observerId]) game.knowledge[observerId] = {};
  game.knowledge[observerId][aboutId] = card.id;
}
/* aboutId の手札が変わった＝全員の記憶を破棄 */
function forgetAbout(game, aboutId) {
  for (const observerId of Object.keys(game.knowledge)) delete game.knowledge[observerId][aboutId];
}
function recall(game, observerId, aboutId) {
  const m = game.knowledge[observerId];
  return (m && m[aboutId]) || null;
}

// ============================================================
// 山札切れの決着
// ============================================================
function checkDeckEmpty(game) {
  const alive = alivePlayers(game);
  if (alive.length <= 1) { endGame(game, alive[0] ? alive[0].id : null); return; }
  addLog(game, 'deck_empty');
  alive.forEach(p => addLog(game, 'reveal_hand', { name: p.name, card: p.hand[0] ? p.hand[0].id : null }));

  // 1対1 幼きククノチ vs 精霊の特殊勝利
  if (alive.length === 2) {
    const [a, b] = alive;
    const special = (x, y) => x.hand[0] && x.hand[0].id === 'kukuochi_young' && y.hand[0] && y.hand[0].id === 'spirit';
    if (special(a, b)) { addLog(game, 'young_beats_spirit'); endGame(game, a.id); return; }
    if (special(b, a)) { addLog(game, 'young_beats_spirit'); endGame(game, b.id); return; }
  }
  let max = -1, winners = [];
  alive.forEach(p => {
    const lv = p.hand[0] ? p.hand[0].level : -1;
    if (lv > max) { max = lv; winners = [p]; } else if (lv === max) winners.push(p);
  });
  if (winners.length === 1) addLog(game, 'max_level', { level: max, name: winners[0].name });
  else addLog(game, 'tie_level', { level: max });
  endGame(game, winners.length === 1 ? winners[0].id : null);
}

// ============================================================
// Card effects
// ============================================================
function processPlay(game, playerId, cardUid, targetId, guess) {
  targetId = targetId || null; guess = guess || null;
  const player = game.players.find(p => p.id === playerId);
  if (!player || !player.alive) return { error: 'invalid_player' };
  if (cp(game).id !== playerId) return { error: 'not_your_turn' };
  if (game.phase !== 'action') return { error: 'not_action_phase' };
  const cardIndex = player.hand.findIndex(c => c.uid === cardUid);
  if (cardIndex === -1) return { error: 'card_not_found' };
  const card = player.hand[cardIndex];
  if (card.id === 'kukuochi') return { error: 'kukuochi_unplayable' };

  /* 対象を取るカードは自分自身を指定できない */
  if (targetId && targetId === playerId) return { error: 'no_self_target' };
  if (targetId && !game.players.some(p => p.id === targetId && p.alive)) return { error: 'invalid_target' };

  /* 「2枚目」は場に出た枚数で数える。捨てさせられた札は場に出ていないので数えない */
  const prevMasu   = game.field.filter(id => id === 'masu_craftsman').length;
  const prevBoy    = game.field.filter(id => id === 'boy').length;
  const prevFarmer = game.field.filter(id => id === 'farmer').length;

  const noEffect = card.id === 'kukuochi_young'
    || (card.id === 'masu_craftsman' && prevMasu < 1)
    || (card.id === 'boy' && prevBoy < 1);

  /* 対象・宣言が足りなければ差し戻す。まだ場には出さない */
  if (NEEDS_TARGET.indexOf(card.id) !== -1 && !noEffect && (!targetId || (card.id === 'trainee' && !guess)))
    return { needTarget: true, cardUid, effect: card.id === 'boy' ? 'boy_sword' : card.id, requiresGuess: card.id === 'trainee' };
  if (card.id === 'trainee' && !CARD_BY_ID[guess]) return { error: 'invalid_guess' };

  player.hand.splice(cardIndex, 1); player.discard.push(card); game.field.push(card.id);
  addLog(game, 'play', { name: player.name, card: card.id });
  /* 覚えていた札が場に出たなら、その記憶はもう使えない */
  for (const observerId of Object.keys(game.knowledge))
    if (game.knowledge[observerId][playerId] === card.id) delete game.knowledge[observerId][playerId];

  emit(game, { type: 'card_played', cardId: card.id, playerId, playerName: player.name, cardLevel: card.level, noEffect, targetId: noEffect ? null : targetId });

  let result = { ok: true };

  switch (card.id) {
    case 'kukuochi_young':
      addLog(game, 'young_no_effect', { name: player.name }); break;

    case 'boy': {
      /* 2枚目の「変革」は「手札を見て1枚捨てさせる」ところまでが一閃と同じ。
         ククノチを斬れる（再生を封じる）のは刀の少女だけなので noRebirth は立てない */
      if (prevBoy >= 1) result = swordEffect(game, player, targetId, false, 'boy_discard');
      else addLog(game, 'boy_first', { name: player.name });
      break;
    }

    case 'trainee': {
      const tgt = game.players.find(p => p.id === targetId);
      if (tgt.hand[0] && tgt.hand[0].id === guess) {
        addLog(game, 'trainee_hit', { name: player.name, target: tgt.name });
        const er = eliminatePlayer(game, targetId);
        result = { hit: true, rebirth: !!er.rebirth };
      } else { addLog(game, 'trainee_miss', { name: player.name }); result = { hit: false }; }
      emit(game, { type: 'trainee_result', hit: result.hit, playerId, targetId, playerName: player.name, targetName: tgt.name, guess });
      break;
    }

    case 'scout': {
      const tgt = game.players.find(p => p.id === targetId);
      addLog(game, 'scout', { name: player.name, target: tgt.name });
      noteKnowledge(game, playerId, targetId, tgt.hand[0]);
      result = { peekedCard: tgt.hand[0], targetId };
      break;
    }

    case 'warrior': {
      const tgt = game.players.find(p => p.id === targetId);
      if (!drawCard(game, tgt)) { addLog(game, 'warrior_fizzle', { name: player.name }); break; }
      addLog(game, 'warrior', { name: player.name, target: tgt.name });
      /* 戦士でククノチを捨てさせても再生は起きる（封じるのは一閃のみ） */
      game.pendingAction = { type: 'warrior_discard', fromPlayerId: playerId, targetId, noRebirth: false };
      game.phase = 'waiting_target'; result = { waitingTarget: true, targetId }; break;
    }

    case 'kurando': {
      const tgt = game.players.find(p => p.id === targetId);
      const myCard = player.hand[0], theirCard = tgt.hand[0];
      addLog(game, 'kurando', { name: player.name, target: tgt.name });
      noteKnowledge(game, playerId, targetId, theirCard);
      noteKnowledge(game, targetId, playerId, myCard);
      result = { myCard, theirCard, targetId };
      if (!myCard || !theirCard) break;
      /* 醸造の脱落は通常の脱落。使用者側にも守護・再生が正しく働く */
      if (myCard.level < theirCard.level)      eliminatePlayer(game, playerId);
      else if (myCard.level > theirCard.level) eliminatePlayer(game, targetId);
      else { eliminatePlayer(game, playerId); eliminatePlayer(game, targetId); }
      if (alivePlayers(game).length <= 1) endGame(game, (alivePlayers(game)[0] || {}).id || null);
      break;
    }

    case 'masu_craftsman': {
      if (prevMasu >= 1) {
        player.shield = true;
        addLog(game, 'masu_shield', { name: player.name });
        emit(game, { type: 'fomus_summoned', playerName: player.name, success: true });
      } else addLog(game, 'masu_first', { name: player.name });
      break;
    }

    case 'farmer': {
      const cnt = prevFarmer >= 1 ? 3 : 2;
      player.nextTurnBonus = cnt;
      addLog(game, 'farmer', { name: player.name, count: cnt }); break;
    }

    case 'spirit': {
      const tgt = game.players.find(p => p.id === targetId);
      const tmp = player.hand; player.hand = tgt.hand; tgt.hand = tmp;
      addLog(game, 'spirit', { name: player.name, target: tgt.name });
      /* 交換で互いの新しい手札を知る。他者の記憶は無効化される */
      forgetAbout(game, playerId); forgetAbout(game, targetId);
      noteKnowledge(game, playerId, targetId, tgt.hand[0]);
      noteKnowledge(game, targetId, playerId, player.hand[0]);
      result = { swapped: true, targetId, myNewCard: player.hand[0], theirNewCard: tgt.hand[0] }; break;
    }

    case 'sword_girl':
      result = swordEffect(game, player, targetId, true, 'sword_girl_discard'); break;
  }

  if (game.phase !== 'waiting_target' && game.phase !== 'ended') nextTurn(game);
  return result;
}

/* 一閃系（刀の少女／少年2枚目）。相手に1枚引かせ、攻撃者が手札を見て1枚捨てさせる */
function swordEffect(game, player, targetId, noRebirth, pendingType) {
  const tgt = game.players.find(p => p.id === targetId && p.alive);
  if (!tgt) return { error: 'invalid_target' };
  const via = pendingType === 'sword_girl_discard' ? 'sword_girl' : 'boy';
  /* 戦士と同じく、山札が空なら効果不発（相手の唯一の手札を奪ってしまわないため） */
  if (!drawCard(game, tgt)) {
    addLog(game, 'sword_fizzle', { name: player.name, via });
    return { ok: true, noEffect: true };
  }
  addLog(game, 'sword', { name: player.name, via, target: tgt.name });
  game.pendingAction = { type: pendingType, fromPlayerId: player.id, targetId, noRebirth };
  game.phase = 'waiting_target';
  return { waitingTarget: true, targetId, showHand: tgt.hand };
}

function processTargetDiscard(game, playerId, cardUid) {
  if (game.phase !== 'waiting_target') return { error: 'invalid_action' };
  const pending = game.pendingAction;
  /* 捨てる札を選ぶのは攻撃者 */
  if (!pending || pending.fromPlayerId !== playerId) return { error: 'not_chooser' };
  const target = game.players.find(p => p.id === pending.targetId);
  const cardIndex = target.hand.findIndex(c => c.uid === cardUid);
  if (cardIndex === -1) return { error: 'card_not_found' };
  const card = target.hand[cardIndex];

  if (card.id === 'kukuochi' && pending.noRebirth) {
    /* 刀の少女の一閃だけがククノチを斬れる。
       ただし守護は「次の脱落効果を1回だけ無効化」なので、ここでも先に判定する */
    addLog(game, 'kukuochi_slain', { name: target.name });
    target.hand.splice(cardIndex, 1); target.discard.push(card);
    eliminatePlayer(game, target.id, { noRebirth: true });
    const alive = alivePlayers(game);
    if (alive.length <= 1) endGame(game, alive[0] ? alive[0].id : null);
  } else if (card.id === 'kukuochi') {
    /* 戦士／少年2枚目でククノチを捨てさせられた → 全手札捨て + 幼きククノチ(0)として再生 */
    addLog(game, 'kukuochi_forced_rebirth', { name: target.name });
    target.hand.splice(cardIndex, 1); target.discard.push(card);
    target.discard.push(...target.hand.splice(0));
    target.hand.push(mkCard('kukuochi_young'));
    emit(game, { type: 'rebirth', playerId: target.id, playerName: target.name });
  } else {
    target.hand.splice(cardIndex, 1); target.discard.push(card);
    addLog(game, 'discarded', { name: target.name, card: card.id });
  }
  /* 捨てさせた側は残った1枚を見て終える（戦士は裏向きなので見えない） */
  forgetAbout(game, target.id);
  if (pending.type !== 'warrior_discard') noteKnowledge(game, playerId, target.id, target.hand[0]);
  game.pendingAction = null;
  /* 終局していたら phase を戻してはいけない（戻すと nextTurn が再び終局処理を走らせる） */
  if (game.phase !== 'ended') { game.phase = 'action'; nextTurn(game); }
  return { ok: true, discarded: card };
}

/* 手番のドロー。農家効果が乗っていれば複数枚引いて選択フェーズへ */
function processDraw(game, playerId) {
  if (cp(game).id !== playerId) return { error: 'not_your_turn' };
  if (game.phase !== 'draw') return { error: 'cannot_draw' };
  const player = game.players.find(p => p.id === playerId);
  if (player.nextTurnBonus) {
    const count = player.nextTurnBonus; player.nextTurnBonus = null;
    const drawn = [];
    for (let i = 0; i < count; i++) { const c = drawCard(game, player); if (c) drawn.push(c); }
    if (!drawn.length) { checkDeckEmpty(game); return { ok: true }; }
    game.pendingFarmerDrawn = drawn.map(c => c.uid);
    game.phase = 'farmer_select';
    return { ok: true, farmerDraw: drawn };
  }
  const drawn = drawCard(game, player);
  if (!drawn) { checkDeckEmpty(game); return { ok: true }; }
  game.phase = 'action';
  return { ok: true, drawn };
}

function processFarmerSelect(game, playerId, keepCardUid) {
  if (game.phase !== 'farmer_select') return { error: 'not_select_phase' };
  if (cp(game).id !== playerId) return { error: 'not_your_turn' };
  const player = game.players.find(p => p.id === playerId);
  const drawnUids = game.pendingFarmerDrawn || [];
  if (drawnUids.indexOf(keepCardUid) === -1) return { error: 'must_pick_drawn' };
  const keepIndex = player.hand.findIndex(c => c.uid === keepCardUid);
  if (keepIndex === -1) return { error: 'card_not_found' };
  const kept = player.hand.splice(keepIndex, 1)[0];
  /* 選ばなかった引き札だけを山札に戻して切り直す */
  const returns = [];
  for (const uid2 of drawnUids.filter(u => u !== keepCardUid)) {
    const idx = player.hand.findIndex(c => c.uid === uid2);
    if (idx !== -1) returns.push(player.hand.splice(idx, 1)[0]);
  }
  game.deck.push(...returns); game.deck = shuffle(game.deck, game._rng);
  player.hand.push(kept);
  addLog(game, 'farmer_keep', { name: player.name, card: kept.id });
  game.pendingFarmerDrawn = null;
  game.phase = 'action';
  return { ok: true, kept };
}

// ============================================================
// State serialization
// ============================================================
function stateFor(game, playerId) {
  const pa = game.pendingAction;
  const ended = game.phase === 'ended';
  /* 一閃系は攻撃者に手札を公開。戦士は裏向き（uidのみ） */
  const isOpenAttacker  = pa && (pa.type === 'sword_girl_discard' || pa.type === 'boy_discard') && pa.fromPlayerId === playerId;
  const isBlindAttacker = pa && pa.type === 'warrior_discard' && pa.fromPlayerId === playerId;
  return {
    players: game.players.map(p => ({
      id: p.id, name: p.name, alive: p.alive, shield: p.shield, isAI: p.isAI,
      handCount: p.hand.length,
      hand: ended ? p.hand
        : p.id === playerId ? p.hand
        : (isOpenAttacker && p.id === pa.targetId) ? p.hand
        : (isBlindAttacker && p.id === pa.targetId) ? p.hand.map(c => ({ uid: c.uid, hidden: true }))
        : null,
      discard: p.discard,
    })),
    deckCount: game.deck.length,
    currentPlayerId: cp(game) ? cp(game).id : null,
    phase: game.phase,
    pendingAction: pa ? { type: pa.type, targetId: pa.targetId, fromPlayerId: pa.fromPlayerId } : null,
    log: game.log, winner: game.winner, turn: game.turn,
  };
}

/* 観戦者に手札を見せると、対局者が別タブで観戦してカンニングできてしまう。
   終局後のみ全公開する */
function stateForSpectator(game) {
  const ended = game.phase === 'ended';
  const base = stateFor(game, null);
  base.players = game.players.map(p => ({
    id: p.id, name: p.name, alive: p.alive, shield: p.shield, isAI: p.isAI,
    handCount: p.hand.length, hand: ended ? p.hand : null, discard: p.discard,
  }));
  base.isSpectator = true;
  return base;
}

// ============================================================
// AI — 参照してよいのは「場に出た札」と「正規に見た札」だけ
// ============================================================
function aiBest(hand, diff, rng = Math.random) {
  if (diff === 'easy') return hand[Math.floor(rng() * hand.length)];
  return hand.reduce((b, c) => (c.level > b.level ? c : b), hand[0]);
}
function aiWorst(hand, diff, rng = Math.random) {
  if (diff === 'easy') return hand[Math.floor(rng() * hand.length)];
  const cands = hand.filter(c => c.id !== 'kukuochi');
  const pool = cands.length ? cands : hand;
  return pool.reduce((w, c) => (c.level < w.level ? c : w), pool[0]);
}
/* 戦士は「裏向きのまま」選ぶルールなので、AIも中身を見ずにランダムで選ぶ。
   一閃系は手札を見てよいので最弱札を選ぶ */
function aiPickDiscard(pendingType, hand, diff, rng = Math.random) {
  if (!hand || !hand.length) return null;
  if (pendingType === 'warrior_discard') return hand[Math.floor(rng() * hand.length)];
  return aiWorst(hand, diff, rng);
}

function aiChoose(game, player, diff) {
  const rng = game._rng || Math.random;
  const playable = player.hand.filter(c => c.id !== 'kukuochi');
  if (!playable.length) return null;
  const opponents = game.players.filter(p => p.alive && p.id !== player.id);
  if (!opponents.length) return null;

  if (diff === 'easy') {
    const card = playable[Math.floor(rng() * playable.length)];
    const needsTgt = NEEDS_TARGET.indexOf(card.id) !== -1;
    const tgt = needsTgt ? opponents[Math.floor(rng() * opponents.length)] : null;
    const pool = CARDS.filter(c => c.id !== 'kukuochi_young');
    const guess = card.id === 'trainee' ? pool[Math.floor(rng() * pool.length)].id : null;
    return { cardUid: card.uid, targetId: tgt ? tgt.id : null, guess };
  }

  const field = game.field;
  const knownOf = id => recall(game, player.id, id);
  /* 未知の相手のレベル期待値を、まだ場に出ていない札から推定する */
  const seen = new Set(field);
  const unseen = CARDS.filter(c => c.id !== 'kukuochi_young' && !seen.has(c.id));
  const avgUnseen = unseen.length ? unseen.reduce((s, c) => s + c.level, 0) / unseen.length : 5;
  const levelOf = id => {
    const k = knownOf(id);
    return k ? (CARD_BY_ID[k] ? CARD_BY_ID[k].level : avgUnseen) : avgUnseen;
  };

  let best = null, bestScore = -Infinity;
  for (const card of playable) {
    const needsTgt = NEEDS_TARGET.indexOf(card.id) !== -1;
    const targets = needsTgt ? opponents : [null];
    for (const tgt of targets) {
      let score = 0;
      const other = player.hand.find(c => c.uid !== card.uid);
      const myOther = other ? other.level : 0;
      const tgtLevel = tgt ? levelOf(tgt.id) : avgUnseen;
      const tgtKnown = tgt ? knownOf(tgt.id) : null;
      switch (card.id) {
        case 'sword_girl':     score = 90; break;
        case 'warrior':        score = 65; break;
        case 'scout':          score = tgtKnown ? 12 : 46; break;   // 知らない相手ほど偵察の価値が高い
        case 'kurando':        score = myOther > tgtLevel ? 80 : 10; break;
        case 'spirit':         score = myOther < tgtLevel ? 72 : 20; break;
        case 'trainee':        score = tgtKnown ? 95 : (diff === 'hard' ? 30 : 25); break;
        case 'masu_craftsman': score = field.filter(id => id === 'masu_craftsman').length >= 1 ? 88 : 32; break;
        case 'farmer':         score = 35; break;
        case 'boy':            score = field.filter(id => id === 'boy').length >= 1 ? 82 : 18; break;
        case 'kukuochi_young': score = 5; break;
        default:               score = 15;
      }
      if (diff === 'hard' && card.id === 'kurando' && player.hand.find(c => c.id === 'kukuochi')) score = 97;
      score += rng() * (diff === 'hard' ? 6 : 20);
      if (score > bestScore) { bestScore = score; best = { card, tgt }; }
    }
  }
  if (!best) return null;

  let guess = null;
  if (best.card.id === 'trainee') {
    /* 知っていればそれを宣言。知らなければ「まだ場に出ていない札」から推測する */
    const known = diff !== 'easy' ? knownOf(best.tgt.id) : null;
    guess = (known && known !== 'kukuochi_young') ? known : null;
    if (!guess) {
      const pool = (unseen.length ? unseen : CARDS).filter(c => c.id !== 'kukuochi_young');
      guess = pool[Math.floor(rng() * pool.length)].id;
    }
  }
  return { cardUid: best.card.uid, targetId: best.tgt ? best.tgt.id : null, guess };
}

return {
  CARDS, CARD_BY_ID, NEEDS_TARGET,
  createGame, cp, alivePlayers, nextTurn, drawCard, endGame, forfeit,
  eliminatePlayer, checkDeckEmpty,
  processPlay, processDraw, processTargetDiscard, processFarmerSelect,
  stateFor, stateForSpectator,
  aiChoose, aiBest, aiWorst, aiPickDiscard,
  noteKnowledge, forgetAbout, recall,
  addLog, emit, drainEvents, shuffle, buildDeck, mkCard, uid,
};
});
