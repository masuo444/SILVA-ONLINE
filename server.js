const express = require('express');
const { WebSocketServer } = require('ws');
const { createServer } = require('http');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// Cards
// ============================================================
const CARDS = [
  { id:'kukuochi_young', name:'幼きククノチ', level:0,  count:1, effect:'光合成', emoji:'🌱' },
  { id:'boy',            name:'少年',         level:1,  count:2, effect:'変革',   emoji:'⚡' },
  { id:'trainee',        name:'訓練生',       level:2,  count:2, effect:'特攻',   emoji:'🎯' },
  { id:'scout',          name:'偵察隊',       level:3,  count:2, effect:'偵察',   emoji:'🔍' },
  { id:'warrior',        name:'戦士',         level:4,  count:2, effect:'格闘',   emoji:'⚔️' },
  { id:'kurando',        name:'蔵人',         level:5,  count:1, effect:'醸造',   emoji:'🍶' },
  { id:'masu_craftsman', name:'枡職人',       level:6,  count:2, effect:'守護',   emoji:'🏺' },
  { id:'farmer',         name:'農家',         level:7,  count:2, effect:'栽培',   emoji:'🌾' },
  { id:'spirit',         name:'精霊',         level:8,  count:2, effect:'思念',   emoji:'✨' },
  { id:'sword_girl',     name:'刀の少女',     level:9,  count:1, effect:'一閃',   emoji:'🗡️' },
  { id:'kukuochi',       name:'ククノチ',     level:10, count:1, effect:'再生',   emoji:'🌳' },
];

function buildDeck() {
  const deck = [];
  for (const c of CARDS) {
    if (c.id === 'kukuochi_young') continue;
    for (let i = 0; i < c.count; i++) deck.push({ ...c, uid: uuidv4() });
  }
  return shuffle(deck);
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// State
// ============================================================
const rooms = {};
const playerMap = new Map();   // playerId -> ws
const clientInfo = new Map();  // ws -> { playerId, roomId, spectator }
const matchQueue = [];

function sendWs(ws, msg)       { if (ws?.readyState === 1) ws.send(JSON.stringify(msg)); }
function sendTo(pid, msg)      { const ws = playerMap.get(pid); if (ws) sendWs(ws, msg); }

function broadcastToRoom(roomId, msg, exceptId = null) {
  const room = rooms[roomId]; if (!room) return;
  [...room.players, ...(room.spectators||[])].forEach(p => { if (p.id !== exceptId) sendTo(p.id, msg); });
}
function broadcastStateUpdate(roomId) {
  const room = rooms[roomId]; if (!room?.game) return;
  room.players.forEach(p => { if (!p.isAI) sendTo(p.id, { type:'state_update', state: stateFor(room.game, p.id) }); });
  (room.spectators||[]).forEach(s => sendTo(s.id, { type:'state_update', state: stateForSpectator(room.game) }));
}

function createRoom(opts = {}) {
  const id = Math.random().toString(36).substring(2,7).toUpperCase();
  rooms[id] = { id, players:[], spectators:[], state:'waiting', game:null, isPublic: opts.isPublic||false };
  return id;
}

// ============================================================
// Game init
// ============================================================
function initGame(room) {
  const deck = buildDeck();
  const rebirthCard = { ...CARDS.find(c => c.id==='kukuochi_young'), uid: uuidv4() };
  const gamePlayers = room.players.map(p => ({
    id: p.id, name: p.name, isAI: p.isAI||false,
    difficulty: p.difficulty||'normal',
    hand:[], discard:[], alive:true, shield:false, nextTurnBonus:null,
  }));
  const game = { players: gamePlayers, deck, rebirthCard, currentPlayerIndex:0, phase:'draw', pendingAction:null, winner:null, log:[], turn:1 };
  gamePlayers.forEach(p => p.hand.push(game.deck.shift()));
  room.game = game; room.state = 'playing';
  return game;
}

function cp(game)    { return game.players[game.currentPlayerIndex]; }
function addLog(game, msg) { game.log.unshift(msg); if (game.log.length>40) game.log.pop(); }

function nextTurn(game) {
  const alive = game.players.filter(p => p.alive);
  if (alive.length <= 1) { endGame(game, alive[0]?.id??null); return null; }
  if (!game.deck.length) { checkDeckEmpty(game); return null; }
  let next = (game.currentPlayerIndex + 1) % game.players.length;
  while (!game.players[next].alive) next = (next+1) % game.players.length;
  game.currentPlayerIndex = next; game.phase = 'draw'; game.turn++;
  return null;
}

function drawCard(game, player) {
  if (!game.deck.length) return null;
  const card = game.deck.shift(); player.hand.push(card); return card;
}

function eliminatePlayer(game, playerId, byKill=false) {
  const player = game.players.find(p => p.id===playerId);
  if (!player || !player.alive) return {};
  // 守護優先
  if (player.shield && !byKill) {
    player.shield = false;
    addLog(game, `🛡 ${player.name}の守護発動！脱落を無効化（ククノチは手札に残る）`);
    return { shieldBlocked:true };
  }
  // ククノチ再生
  const kIdx = player.hand.findIndex(c => c.id==='kukuochi');
  if (kIdx !== -1 && !byKill) {
    const others = player.hand.filter((_,i) => i!==kIdx);
    player.discard.push(...others, player.hand[kIdx]);
    player.hand = [{ ...game.rebirthCard, uid:uuidv4() }];
    addLog(game, `🌱 ${player.name}のククノチが再生！幼きククノチとして復活！`);
    return { rebirth:true };
  }
  player.alive = false; player.discard.push(...player.hand); player.hand = [];
  addLog(game, `💀 ${player.name}が脱落`);
  return { eliminated:true };
}

function checkDeckEmpty(game) {
  const alive = game.players.filter(p => p.alive);
  if (alive.length <= 1) { endGame(game, alive[0]?.id??null); return; }
  // 1v1 幼きククノチ vs 精霊特殊ルール
  if (alive.length === 2) {
    const [a, b] = alive;
    if (a.hand[0]?.id==='kukuochi_young' && b.hand[0]?.id==='spirit') { addLog(game,'✨ 幼きククノチが精霊に勝利！'); endGame(game,a.id); return; }
    if (b.hand[0]?.id==='kukuochi_young' && a.hand[0]?.id==='spirit') { addLog(game,'✨ 幼きククノチが精霊に勝利！'); endGame(game,b.id); return; }
  }
  let max=-1, winners=[];
  alive.forEach(p => { const lv=p.hand[0]?.level??-1; if(lv>max){max=lv;winners=[p];}else if(lv===max)winners.push(p); });
  endGame(game, winners.length===1 ? winners[0].id : null);
}

function endGame(game, winnerId) {
  game.phase='ended'; game.winner=winnerId;
  const w = game.players.find(p => p.id===winnerId);
  addLog(game, winnerId ? `🏆 ${w.name}の勝利！` : `🤝 引き分け！`);
}

// ============================================================
// Card Effects
// ============================================================
function processPlay(roomId, playerId, cardUid, targetId=null, guess=null) {
  const room = rooms[roomId]; if (!room?.game) return { error:'ゲームなし' };
  const game = room.game;
  const player = game.players.find(p => p.id===playerId);
  if (!player?.alive) return { error:'無効なプレイヤー' };
  if (cp(game).id !== playerId) return { error:'手番ではありません' };
  if (game.phase !== 'action') return { error:'手番フェーズではありません' };
  const cardIndex = player.hand.findIndex(c => c.uid===cardUid);
  if (cardIndex === -1) return { error:'カードが見つかりません' };
  const card = player.hand[cardIndex];
  if (card.id === 'kukuochi') return { error:'ククノチは場に出せません' };

  player.hand.splice(cardIndex,1); player.discard.push(card);
  addLog(game, `🃏 ${player.name}が「${card.name}」を使用`);

  const allD = game.players.flatMap(p => p.discard);
  const prevMasu   = allD.filter(c => c.id==='masu_craftsman').length - 1;
  const prevBoy    = allD.filter(c => c.id==='boy').length - 1;

  // 効果なしカードかどうか判定
  const noEffect = card.id==='kukuochi_young' || (card.id==='masu_craftsman' && prevMasu < 1) || (card.id==='boy' && prevBoy < 1);

  // Broadcast card play FX event to all players
  broadcastToRoom(roomId, { type:'card_played', cardId:card.id, playerId, playerName:player.name, cardName:card.name, cardLevel:card.level, cardEffect:card.effect, cardEmoji:card.emoji, noEffect });
  const prevFarmer = allD.filter(c => c.id==='farmer').length - 1;

  let result = { ok:true };

  switch(card.id) {
    case 'kukuochi_young':
      addLog(game, `🌿 ${player.name}が「幼きククノチ」を使用（効果なし）`); break;

    case 'boy': {
      if (prevBoy >= 1) {
        if (!targetId) { player.hand.push(card); player.discard.pop(); return { needTarget:true, cardUid, effect:'boy_sword' }; }
        result = swordEffect(game, player, targetId, false);
      } else addLog(game, `⚡ ${player.name}が「少年」を使用（1枚目：効果なし）`);
      break;
    }

    case 'trainee': {
      if (!targetId||!guess) { player.hand.push(card); player.discard.pop(); return { needTarget:true, cardUid, effect:'trainee', requiresGuess:true }; }
      const tgt = game.players.find(p => p.id===targetId && p.alive);
      if (!tgt) { result={error:'ターゲットが無効'}; break; }
      if (tgt.hand[0]?.id === guess) {
        addLog(game, `🎯 ${player.name}が「${tgt.name}」の手札を言い当てた！`);
        const elimResult = eliminatePlayer(game, targetId, false);
        if (elimResult.eliminated) broadcastToRoom(roomId, { type:'player_eliminated', playerId:targetId });
        if (elimResult.shieldBlocked) broadcastToRoom(roomId, { type:'shield_blocked', playerId:targetId });
        if (elimResult.rebirth) broadcastToRoom(roomId, { type:'rebirth', playerId:targetId, playerName:tgt.name });
        result={hit:true, rebirth:!!elimResult.rebirth};
      } else { addLog(game, `❌ ${player.name}の特攻は外れた`); result={hit:false}; }
      const guessCard = CARDS.find(c=>c.id===guess);
      broadcastToRoom(roomId, { type:'trainee_result', hit:result.hit, playerId, targetId, playerName:player.name, targetName:tgt.name, guessName:guessCard?.name||guess });
      break;
    }

    case 'scout': {
      if (!targetId) { player.hand.push(card); player.discard.pop(); return { needTarget:true, cardUid, effect:'scout' }; }
      const tgt = game.players.find(p => p.id===targetId && p.alive);
      if (!tgt) { result={error:'ターゲットが無効'}; break; }
      addLog(game, `🔍 ${player.name}が「${tgt.name}」の手札を覗いた`);
      result = { peekedCard: tgt.hand[0], targetId };
      break;
    }

    case 'warrior': {
      if (!targetId) { player.hand.push(card); player.discard.pop(); return { needTarget:true, cardUid, effect:'warrior' }; }
      const tgt = game.players.find(p => p.id===targetId && p.alive);
      if (!tgt) { result={error:'ターゲットが無効'}; break; }
      const drawn = drawCard(game, tgt);
      if (!drawn) { addLog(game, `⚔️ ${player.name}の戦士は効果不発（山札が空）`); break; }
      addLog(game, `⚔️ ${player.name}が「戦士」発動。${tgt.name}に迫る`);
      game.pendingAction = { type:'warrior_discard', fromPlayerId:playerId, targetId, isByKill:false };
      game.phase = 'waiting_target'; result={ waitingTarget:true, targetId }; break;
    }

    case 'kurando': {
      if (!targetId) { player.hand.push(card); player.discard.pop(); return { needTarget:true, cardUid, effect:'kurando' }; }
      const tgt = game.players.find(p => p.id===targetId && p.alive);
      if (!tgt) { result={error:'ターゲットが無効'}; break; }
      const myCard = player.hand[0], theirCard = tgt.hand[0];
      addLog(game, `🍶 ${player.name}と${tgt.name}が手札を見せ合う`);
      result = { myCard, theirCard };
      if (!myCard || !theirCard) break;
      if (myCard.level < theirCard.level) {
        const er = eliminatePlayer(game, playerId, true);
        if (er.eliminated) broadcastToRoom(roomId, { type:'player_eliminated', playerId });
      } else if (myCard.level > theirCard.level) {
        const er = eliminatePlayer(game, targetId, false);
        if (er.eliminated) broadcastToRoom(roomId, { type:'player_eliminated', playerId:targetId });
        if (er.shieldBlocked) broadcastToRoom(roomId, { type:'shield_blocked', playerId:targetId });
        if (er.rebirth) broadcastToRoom(roomId, { type:'rebirth', playerId:targetId, playerName:game.players.find(p=>p.id===targetId)?.name });
      } else {
        const er1 = eliminatePlayer(game, playerId, true);
        const er2 = eliminatePlayer(game, targetId, true);
        if (er1.eliminated) broadcastToRoom(roomId, { type:'player_eliminated', playerId });
        if (er2.eliminated) broadcastToRoom(roomId, { type:'player_eliminated', playerId:targetId });
      }
      break;
    }

    case 'masu_craftsman': {
      if (prevMasu >= 1) {
        player.shield = true;
        addLog(game, `🏺 ${player.name}が枡職人2枚目！自動的に守護を得た！`);
        broadcastToRoom(roomId, { type:'fomus_summoned', playerName:player.name, success:true });
      } else addLog(game, `🏺 ${player.name}が枡職人を使用（1枚目：効果なし）`);
      break;
    }

    case 'farmer': {
      const cnt = prevFarmer >= 1 ? 3 : 2;
      player.nextTurnBonus = cnt;
      addLog(game, `🌾 ${player.name}が農家を使用。次の手番で${cnt}枚引く`); break;
    }

    case 'spirit': {
      if (!targetId) { player.hand.push(card); player.discard.pop(); return { needTarget:true, cardUid, effect:'spirit' }; }
      const tgt = game.players.find(p => p.id===targetId && p.alive);
      if (!tgt) { result={error:'ターゲットが無効'}; break; }
      [player.hand, tgt.hand] = [tgt.hand, player.hand];
      addLog(game, `✨ ${player.name}と${tgt.name}が手札を交換`);
      result = { swapped:true, targetId, myNewCard:player.hand[0], theirNewCard:tgt.hand[0] }; break;
    }

    case 'sword_girl': {
      if (!targetId) { player.hand.push(card); player.discard.pop(); return { needTarget:true, cardUid, effect:'sword_girl' }; }
      result = swordEffect(game, player, targetId, true); break;
    }
  }

  if (game.phase !== 'waiting_target' && game.phase !== 'waiting_fomus' && game.phase !== 'ended') nextTurn(game);
  return result;
}

function swordEffect(game, player, targetId, isByKill) {
  const tgt = game.players.find(p => p.id===targetId && p.alive);
  if (!tgt) return { error:'ターゲットが無効' };
  drawCard(game, tgt);
  addLog(game, `🗡️ ${player.name}が${isByKill?'刀の少女':'少年（変革）'}発動。${tgt.name}の手札を開示`);
  game.pendingAction = { type: isByKill ? 'sword_girl_discard' : 'boy_discard', fromPlayerId:player.id, targetId, isByKill };
  game.phase = 'waiting_target';
  return { waitingTarget:true, targetId, showHand:tgt.hand };
}

function processTargetDiscard(roomId, playerId, cardUid) {
  const room = rooms[roomId]; const game = room?.game;
  if (!game || game.phase !== 'waiting_target') return { error:'無効な操作' };
  const pending = game.pendingAction;
  /* warrior & sword_girl: 攻撃者が選ぶ */
  if (!pending || pending.fromPlayerId !== playerId) return { error:'あなたが選択者ではありません' };
  const target = game.players.find(p => p.id===pending.targetId);
  const cardIndex = target.hand.findIndex(c => c.uid===cardUid);
  if (cardIndex === -1) return { error:'カードが見つかりません' };
  const card = target.hand[cardIndex];
  const player = target;
  if (card.id === 'kukuochi' && pending.type === 'sword_girl_discard') {
    /* 9（剣の少女）でククノチ捨て → 脱落、復活なし */
    addLog(game, `🗡 ${target.name}のククノチが刀の少女に斬られた！復活なし！`);
    target.hand.splice(cardIndex,1); target.discard.push(card);
    target.alive = false;
    broadcastToRoom(roomId, { type:'player_eliminated', playerId:pending.targetId });
    const alive = game.players.filter(p => p.alive);
    if (alive.length <= 1) endGame(game, alive[0]?.id ?? null);
  } else if (card.id === 'kukuochi' && (pending.type === 'warrior_discard' || pending.type === 'boy_discard')) {
    /* 4（戦士）/ 1（変革）でククノチ捨て → 全手札捨て + 幼きククノチ(0)を手札に */
    addLog(game, `🌱 ${target.name}のククノチが捨てさせられた！幼きククノチとして再生！`);
    target.hand.splice(cardIndex,1); target.discard.push(card);
    /* 残りの手札も全て捨てる */
    const remaining = target.hand.splice(0);
    target.discard.push(...remaining);
    /* 幼きククノチを手札に加える */
    const rebirthCard = { ...CARDS.find(c => c.id==='kukuochi_young'), uid: uuidv4() };
    target.hand.push(rebirthCard);
    broadcastToRoom(roomId, { type:'rebirth', playerId:pending.targetId, playerName:target.name });
  } else {
    player.hand.splice(cardIndex,1); player.discard.push(card);
    addLog(game, `🃏 ${player.name}が「${card.name}」を捨てた`);
  }
  game.pendingAction = null; game.phase = 'action';
  nextTurn(game);
  return { ok:true, discarded:card };
}

function processFomus(roomId, playerId, declaration) {
  const room = rooms[roomId]; const game = room?.game;
  if (!game || game.phase !== 'waiting_fomus') return { error:'無効な操作' };
  if (game.pendingAction?.fromPlayerId !== playerId) return { error:'宣言者ではありません' };
  const player = game.players.find(p => p.id===playerId);
  const success = (declaration||'').trim().toUpperCase() === 'FOMUS';
  if (success) { player.shield=true; addLog(game, `🏺 ${player.name}が「FOMUS！」と宣言！守護を得た！`); }
  else addLog(game, `🏺 ${player.name}が枡職人2枚目（宣言失敗：守護なし）`);
  game.pendingAction=null; game.phase='action'; nextTurn(game);
  return { ok:true, success };
}

function processFarmerSelect(roomId, playerId, keepCardUid) {
  const room = rooms[roomId]; const game = room?.game;
  if (!game) return { error:'ゲームなし' };
  const player = game.players.find(p => p.id===playerId);
  const drawnUids = game.pendingFarmerDrawn || [];
  if (!drawnUids.includes(keepCardUid)) return { error:'引いたカードから選んでください' };
  const keepIndex = player.hand.findIndex(c => c.uid===keepCardUid);
  if (keepIndex === -1) return { error:'カードが見つかりません' };
  const kept = player.hand.splice(keepIndex,1)[0];
  /* 引いたカードのうち選ばなかったものだけ山札に戻す */
  const returnUids = drawnUids.filter(uid => uid !== keepCardUid);
  const returns = [];
  for (const uid of returnUids) {
    const idx = player.hand.findIndex(c => c.uid === uid);
    if (idx !== -1) returns.push(player.hand.splice(idx, 1)[0]);
  }
  game.deck.push(...returns); game.deck = shuffle(game.deck);
  player.hand.push(kept);
  addLog(game, `🌾 ${player.name}が農家効果で「${kept.name}」を選択`);
  game.pendingFarmerDrawn = null;
  game.phase = 'action';
  return { ok:true, kept };
}

// ============================================================
// State serialization
// ============================================================
function stateFor(game, playerId) {
  const pa = game.pendingAction;
  /* sword_girl: 攻撃者にターゲットの手札を公開 / warrior: uidのみ（裏向き） */
  const isSwordAttacker = pa && (pa.type==='sword_girl_discard' || pa.type==='boy_discard') && pa.fromPlayerId===playerId;
  const isWarriorAttacker = pa && pa.type==='warrior_discard' && pa.fromPlayerId===playerId;
  return {
    players: game.players.map(p => ({
      id:p.id, name:p.name, alive:p.alive, shield:p.shield, isAI:p.isAI,
      handCount:p.hand.length,
      hand: p.id===playerId ? p.hand
        : (isSwordAttacker && p.id===pa.targetId) ? p.hand
        : (isWarriorAttacker && p.id===pa.targetId) ? p.hand.map(c=>({uid:c.uid, hidden:true}))
        : null,
      discard:p.discard,
    })),
    deckCount:game.deck.length, currentPlayerId:cp(game)?.id,
    phase:game.phase,
    pendingAction: pa ? { type:pa.type, targetId:pa.targetId, fromPlayerId:pa.fromPlayerId } : null,
    log:game.log, winner:game.winner, turn:game.turn,
  };
}
function stateForSpectator(game) {
  return { ...stateFor(game, null), players: game.players.map(p => ({ id:p.id, name:p.name, alive:p.alive, shield:p.shield, isAI:p.isAI, handCount:p.hand.length, hand:p.hand, discard:p.discard })), isSpectator:true };
}

// ============================================================
// AI
// ============================================================
function createAI(difficulty) {
  const labels = { easy:'ゆっくりAI', normal:'策士AI', hard:'鬼神AI' };
  return { id:'AI_'+uuidv4(), name:`[${labels[difficulty]||'AI'}]`, isAI:true, difficulty };
}

function scheduleAI(roomId, delay=700) { setTimeout(() => aiTurn(roomId), delay); }

function aiTurn(roomId) {
  const room = rooms[roomId]; if (!room?.game) return;
  const game = room.game; if (game.phase==='ended') return;
  const cur = cp(game); if (!cur?.isAI) return;

  if (game.phase === 'draw') {
    if (cur.nextTurnBonus) {
      const count = cur.nextTurnBonus; cur.nextTurnBonus = null;
      const drawn = [];
      for (let i=0;i<count;i++){const c=drawCard(game,cur);if(c)drawn.push(c);}
      game.pendingFarmerDrawn = drawn.map(c=>c.uid);
      game.phase = 'farmer_select';
      broadcastStateUpdate(roomId);
      setTimeout(() => {
        if (!rooms[roomId]?.game) return;
        const kept = aiBest(drawn, cur.difficulty);
        const rets = drawn.filter(c => c.uid!==kept.uid);
        for(const r of rets){const idx=cur.hand.findIndex(c=>c.uid===r.uid);if(idx!==-1)cur.hand.splice(idx,1);}
        game.deck.push(...rets); game.deck = shuffle(game.deck);
        game.pendingFarmerDrawn = null;
        addLog(game, `🌾 ${cur.name}が「${kept.name}」を選択`);
        game.phase = 'action'; broadcastStateUpdate(roomId);
        if (game.phase!=='ended' && cp(game)?.isAI) scheduleAI(roomId);
      }, 400);
      return;
    }
    const drawn = drawCard(game, cur);
    if (!drawn) { checkDeckEmpty(game); broadcastStateUpdate(roomId); return; }
    game.phase = 'action'; broadcastStateUpdate(roomId);
    setTimeout(() => aiTurn(roomId), 500);
    return;
  }

  if (game.phase === 'action') {
    const action = aiChoose(game, cur, cur.difficulty);
    if (!action) { nextTurn(game); broadcastStateUpdate(roomId); return; }
    const result = processPlay(roomId, cur.id, action.cardUid, action.targetId, action.guess);

    if (result.swapped) {
      const tgtP = game.players.find(p=>p.id===action.targetId);
      if (tgtP && !tgtP.isAI) sendTo(tgtP.id, { type:'spirit_swap', newCard:result.theirNewCard });
    }
    if (result.myCard && result.theirCard) {
      broadcastToRoom(roomId, { type:'kurando_reveal_all', aiName:cur.name, myCard:result.myCard, theirCard:result.theirCard, myName:cur.name, theirName: game.players.find(p=>p.id===action.targetId)?.name });
    }
    broadcastStateUpdate(roomId);
    if (result.waitingTarget) {
      const pending = game.pendingAction;
      /* warrior & sword_girl: 攻撃者AI がターゲットの手札から最弱カードを選んで捨てさせる */
      if (pending && (pending.type === 'warrior_discard' || pending.type === 'sword_girl_discard' || pending.type === 'boy_discard')) {
        if (cur.isAI) {
          const tgtP = game.players.find(p=>p.id===action.targetId);
          setTimeout(() => { processTargetDiscard(roomId,cur.id,aiWorst(tgtP.hand,cur.difficulty).uid); broadcastStateUpdate(roomId); if(game.phase!=='ended'&&cp(game)?.isAI)scheduleAI(roomId); }, 500);
        }
      }
      return;
    }
    if (game.phase!=='ended' && cp(game)?.isAI) scheduleAI(roomId);
    return;
  }

  if (game.phase === 'waiting_target') {
    const pending = game.pendingAction;
    if ((pending?.type === 'warrior_discard' || pending?.type === 'sword_girl_discard') && pending.fromPlayerId === cur.id && cur.isAI) {
      /* warrior & sword_girl: 攻撃者AIがターゲットの手札から選ぶ */
      const tgtP = game.players.find(p=>p.id===pending.targetId);
      setTimeout(() => { processTargetDiscard(roomId,cur.id,aiWorst(tgtP.hand,cur.difficulty).uid); broadcastStateUpdate(roomId); if(game.phase!=='ended'&&cp(game)?.isAI)scheduleAI(roomId); }, 500);
    }
  }
}

function aiBest(hand, diff) {
  if (diff==='easy') return hand[Math.floor(Math.random()*hand.length)];
  return hand.reduce((b,c) => c.level>b.level?c:b, hand[0]);
}
function aiWorst(hand, diff) {
  if (diff==='easy') return hand[Math.floor(Math.random()*hand.length)];
  const cands = hand.filter(c=>c.id!=='kukuochi');
  const pool = cands.length ? cands : hand;
  return pool.reduce((w,c) => c.level<w.level?c:w, pool[0]);
}
function aiChoose(game, player, diff) {
  const playable = player.hand.filter(c=>c.id!=='kukuochi');
  if (!playable.length) return null;
  const opponents = game.players.filter(p=>p.alive && p.id!==player.id);
  if (!opponents.length) return null;

  if (diff==='easy') {
    const card = playable[Math.floor(Math.random()*playable.length)];
    const needsTgt = ['scout','warrior','kurando','spirit','sword_girl','trainee','boy'].includes(card.id);
    const tgt = needsTgt ? opponents[Math.floor(Math.random()*opponents.length)] : null;
    const guess = card.id==='trainee' ? CARDS.filter(c=>c.id!=='kukuochi_young')[Math.floor(Math.random()*10)].id : null;
    return { cardUid:card.uid, targetId:tgt?.id, guess };
  }

  let best=null, bestScore=-Infinity;
  const allD = game.players.flatMap(p=>p.discard);

  for (const card of playable) {
    const needsTgt = ['scout','warrior','kurando','spirit','sword_girl','trainee','boy'].includes(card.id);
    const targets = needsTgt ? opponents : [null];
    for (const tgt of targets) {
      let score = 0;
      const myOther = player.hand.find(c=>c.uid!==card.uid)?.level??0;
      switch(card.id) {
        case 'sword_girl':     score=90; break;
        case 'warrior':        score=65; break;
        case 'scout':          score=40; break;
        case 'kurando':        score = myOther>(tgt?.hand[0]?.level??5) ? 80 : 10; break;
        case 'spirit':         score = myOther<(tgt?.hand[0]?.level??5) ? 72 : 20; break;
        case 'trainee':        score = diff==='hard'?50:25; break;
        case 'masu_craftsman': score = allD.filter(c=>c.id==='masu_craftsman').length>=1 ? 88 : 32; break;
        case 'farmer':         score=35; break;
        case 'boy':            score = allD.filter(c=>c.id==='boy').length>=1 ? 82 : 18; break;
        case 'kukuochi_young': score=5; break;
        default:               score=15;
      }
      // Hard bonus: use kukuochi advantage in kurando
      if (diff==='hard' && card.id==='kurando' && player.hand.find(c=>c.id==='kukuochi')) score=97;
      score += Math.random() * (diff==='hard'?6:20);
      if (score>bestScore) { bestScore=score; best={card,tgt}; }
    }
  }
  if (!best) return null;
  const guess = best.card.id==='trainee' ? CARDS.filter(c=>c.id!=='kukuochi_young'&&c.id!=='kukuochi')[Math.floor(Math.random()*9)].id : null;
  return { cardUid:best.card.uid, targetId:best.tgt?.id, guess };
}

// ============================================================
// Matchmaking
// ============================================================
function tryMatch() {
  while (matchQueue.length >= 2) {
    const [a, b] = matchQueue.splice(0,2);
    const roomId = createRoom({ isPublic:true });
    const room = rooms[roomId];
    room.players.push({ id:a.pid, name:a.name, isAI:false });
    room.players.push({ id:b.pid, name:b.name, isAI:false });
    clientInfo.set(a.ws, { playerId:a.pid, roomId });
    clientInfo.set(b.ws, { playerId:b.pid, roomId });
    sendWs(a.ws, { type:'matched', roomId, opponentName:b.name });
    sendWs(b.ws, { type:'matched', roomId, opponentName:a.name });
    const game = initGame(room);
    addLog(game, `🎮 マッチング成立！${room.players[0].name} vs ${room.players[1].name}`);
    room.players.forEach(p => sendTo(p.id, { type:'game_started', state:stateFor(game,p.id) }));
  }
}

function publicRooms() {
  return Object.values(rooms)
    .filter(r => r.isPublic && r.state==='playing')
    .map(r => ({ id:r.id, players:r.players.map(p=>p.name), spectators:(r.spectators||[]).length, turn:r.game?.turn??0 }));
}

// ============================================================
// WS handler
// ============================================================
wss.on('connection', ws => {
  const pid = uuidv4();
  playerMap.set(pid, ws);
  clientInfo.set(ws, { playerId:pid, roomId:null });
  sendWs(ws, { type:'connected', playerId:pid });

  ws.on('message', raw => {
    let msg; try { msg=JSON.parse(raw); } catch { return; }
    const info = clientInfo.get(ws);
    const { type } = msg;

    if (type==='create_room') {
      const roomId = createRoom();
      rooms[roomId].players.push({ id:pid, name:msg.name||'プレイヤー', isAI:false });
      clientInfo.set(ws, { playerId:pid, roomId });
      sendWs(ws, { type:'room_created', roomId });
      sendWs(ws, { type:'room_update', players:rooms[roomId].players });
    }

    else if (type==='join_room') {
      const room = rooms[msg.roomId];
      if (!room) { sendWs(ws,{type:'error',msg:'ルームが見つかりません'}); return; }
      if (room.state!=='waiting') { sendWs(ws,{type:'error',msg:'ゲームはすでに開始しています'}); return; }
      if (room.players.length>=4) { sendWs(ws,{type:'error',msg:'ルームが満員です'}); return; }
      room.players.push({ id:pid, name:msg.name||`プレイヤー${room.players.length+1}`, isAI:false });
      clientInfo.set(ws, { playerId:pid, roomId:msg.roomId });
      sendWs(ws, { type:'room_joined', roomId:msg.roomId });
      broadcastToRoom(msg.roomId, { type:'room_update', players:room.players });
    }

    else if (type==='add_ai') {
      const room = rooms[info?.roomId];
      if (!room||room.state!=='waiting') return;
      if (room.players[0].id!==pid) return;
      if (room.players.length>=4) { sendWs(ws,{type:'error',msg:'満員です'}); return; }
      room.players.push(createAI(msg.difficulty||'normal'));
      broadcastToRoom(info.roomId, { type:'room_update', players:room.players });
    }

    else if (type==='remove_ai') {
      const room = rooms[info?.roomId];
      if (!room||room.state!=='waiting'||room.players[0].id!==pid) return;
      const idx = room.players.findIndex(p=>p.isAI);
      if (idx!==-1) room.players.splice(idx,1);
      broadcastToRoom(info.roomId, { type:'room_update', players:room.players });
    }

    else if (type==='start_game') {
      const room = rooms[info?.roomId];
      if (!room) return;
      if (room.players[0].id!==pid) { sendWs(ws,{type:'error',msg:'ホストのみ開始できます'}); return; }
      if (room.players.length<2) { sendWs(ws,{type:'error',msg:'2人以上必要です'}); return; }
      const game = initGame(room);
      addLog(game, `🎮 ゲーム開始！先手は ${cp(game).name}`);
      room.players.forEach(p => { if(!p.isAI) sendTo(p.id,{type:'game_started',state:stateFor(game,p.id)}); });
      if (cp(game).isAI) scheduleAI(info.roomId);
    }

    else if (type==='start_vs_ai') {
      const roomId = createRoom();
      const room = rooms[roomId];
      room.players.push({ id:pid, name:msg.name||'プレイヤー', isAI:false });
      const cnt = Math.min(Math.max(msg.aiCount||1,1),3);
      for (let i=0;i<cnt;i++) room.players.push(createAI(msg.difficulty||'normal'));
      clientInfo.set(ws, { playerId:pid, roomId });
      const game = initGame(room);
      addLog(game, `🎮 ゲーム開始！先手は ${cp(game).name}`);
      sendWs(ws, { type:'game_started', state:stateFor(game,pid) });
      if (cp(game).isAI) scheduleAI(roomId);
    }

    else if (type==='join_queue') {
      if (matchQueue.find(q=>q.pid===pid)) return;
      matchQueue.push({ pid, name:msg.name||'プレイヤー', ws });
      sendWs(ws, { type:'queue_joined', position:matchQueue.length });
      tryMatch();
    }

    else if (type==='leave_queue') {
      const idx = matchQueue.findIndex(q=>q.pid===pid);
      if (idx!==-1) matchQueue.splice(idx,1);
      sendWs(ws, { type:'queue_left' });
    }

    else if (type==='get_public_rooms') {
      sendWs(ws, { type:'public_rooms', rooms:publicRooms() });
    }

    else if (type==='spectate') {
      const room = rooms[msg.roomId];
      if (!room||room.state!=='playing') { sendWs(ws,{type:'error',msg:'観戦できるゲームがありません'}); return; }
      if (!room.spectators) room.spectators=[];
      room.spectators.push({ id:pid, name:msg.name||'観戦者' });
      clientInfo.set(ws, { playerId:pid, roomId:msg.roomId, spectator:true });
      sendWs(ws, { type:'spectating', state:stateForSpectator(room.game) });
    }

    else if (type==='draw_card') {
      const room = rooms[info?.roomId]; if (!room?.game) return;
      const game = room.game; const roomId = info.roomId;
      if (cp(game).id!==pid) { sendWs(ws,{type:'error',msg:'手番ではありません'}); return; }
      if (game.phase!=='draw') { sendWs(ws,{type:'error',msg:'引けません'}); return; }
      const player = game.players.find(p=>p.id===pid);
      if (player.nextTurnBonus) {
        const count=player.nextTurnBonus; player.nextTurnBonus=null;
        const drawn=[];
        for(let i=0;i<count;i++){const c=drawCard(game,player);if(c)drawn.push(c);}
        game.pendingFarmerDrawn=drawn.map(c=>c.uid);
        game.phase='farmer_select';
        sendWs(ws,{type:'farmer_draw',cards:drawn});
        broadcastStateUpdate(roomId); return;
      }
      const drawn = drawCard(game, player);
      if (!drawn) { checkDeckEmpty(game); broadcastStateUpdate(roomId); return; }
      game.phase='action'; broadcastStateUpdate(roomId);
    }

    else if (type==='farmer_select') {
      const result = processFarmerSelect(info?.roomId, pid, msg.keepCardUid);
      if (result.error) { sendWs(ws,{type:'error',msg:result.error}); return; }
      broadcastStateUpdate(info.roomId);
      const game=rooms[info.roomId]?.game;
      if (game&&cp(game)?.isAI) scheduleAI(info.roomId);
    }

    else if (type==='play_card') {
      const roomId=info?.roomId;
      const result = processPlay(roomId, pid, msg.cardUid, msg.targetId, msg.guess);
      if (result.error) { sendWs(ws,{type:'error',msg:result.error}); return; }
      if (result.needTarget) { sendWs(ws,{type:'need_target',cardUid:result.cardUid,effect:result.effect,requiresGuess:result.requiresGuess}); return; }
      if (result.waitingFomus) { sendWs(ws,{type:'waiting_fomus'}); broadcastStateUpdate(roomId); return; }
      if (result.peekedCard) sendWs(ws,{type:'peek_result',card:result.peekedCard});
      if (result.myCard&&result.theirCard) {
        sendWs(ws,{type:'kurando_reveal',myCard:result.myCard,theirCard:result.theirCard});
        const tw=playerMap.get(msg.targetId); if(tw) sendWs(tw,{type:'kurando_reveal',myCard:result.theirCard,theirCard:result.myCard});
      }
      if (result.swapped) { const tw=playerMap.get(msg.targetId); if(tw) sendWs(tw,{type:'spirit_swap',newCard:result.theirNewCard}); }
      broadcastStateUpdate(roomId);
      const game=rooms[roomId]?.game;
      if (result.waitingTarget) {
        const tgtP=game?.players.find(p=>p.id===msg.targetId);
        if (tgtP?.isAI) setTimeout(()=>{ processTargetDiscard(roomId,tgtP.id,aiWorst(tgtP.hand,tgtP.difficulty).uid); broadcastStateUpdate(roomId); if(game.phase!=='ended'&&cp(game)?.isAI)scheduleAI(roomId); },400);
        return;
      }
      if (game&&game.phase!=='ended'&&cp(game)?.isAI) scheduleAI(roomId);
    }

    else if (type==='target_discard') {
      const roomId=info?.roomId;
      const result=processTargetDiscard(roomId,pid,msg.cardUid);
      if (result.error) { sendWs(ws,{type:'error',msg:result.error}); return; }
      broadcastStateUpdate(roomId);
      const game=rooms[roomId]?.game;
      if (game&&game.phase!=='ended'&&cp(game)?.isAI) scheduleAI(roomId);
    }

    else if (type==='fomus_declare') {
      const roomId=info?.roomId;
      const result=processFomus(roomId,pid,msg.declaration);
      if (result.error) { sendWs(ws,{type:'error',msg:result.error}); return; }
      broadcastToRoom(roomId,{type:'fomus_summoned',playerName:rooms[roomId]?.players.find(p=>p.id===pid)?.name,success:result.success,declaration:msg.declaration});
      broadcastStateUpdate(roomId);
      const game=rooms[roomId]?.game;
      if (game&&game.phase!=='ended'&&cp(game)?.isAI) scheduleAI(roomId);
    }
  });

  ws.on('close', () => {
    const info = clientInfo.get(ws);
    if (info) {
      playerMap.delete(info.playerId);
      const idx=matchQueue.findIndex(q=>q.pid===info.playerId);
      if (idx!==-1) matchQueue.splice(idx,1);
      if (info.roomId&&info.spectator) {
        const room=rooms[info.roomId];
        if (room) room.spectators=room.spectators.filter(s=>s.id!==info.playerId);
      }
      clientInfo.delete(ws);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`SILVA server running on http://localhost:${PORT}`));
