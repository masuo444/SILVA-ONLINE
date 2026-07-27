/* ============================================================
   SILVA — オンライン対戦サーバー
   ------------------------------------------------------------
   ルールは public/game-core.js（ブラウザと共有）が持つ。
   このファイルはネットワーク層だけを担当する：
   ルーム管理・マッチング・切断復帰・AIの手番進行。

   AI対戦はブラウザ側で完結するようになったので、
   ここに来るのは基本的にオンライン対戦だけになる。
   ============================================================ */
const express = require('express');
const { WebSocketServer } = require('ws');
const { createServer } = require('http');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const CORE = require('./public/game-core.js');
const {
  createGame, cp, alivePlayers, processPlay, processDraw, processTargetDiscard,
  processFarmerSelect, stateFor, stateForSpectator, aiChoose, aiPickDiscard,
  addLog, drainEvents, forfeit,
} = CORE;

const app = express();
const server = createServer(app);

/* ALLOWED_ORIGINS を設定すると、そのオリジンからのWS接続だけを受け付ける。
   静的配信を別ドメインに分けたとき、勝手に他サイトから使われるのを防ぐ。
   未設定なら従来どおり全許可（同一ホスト運用ではこれでよい） */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);
const wss = new WebSocketServer({
  server,
  verifyClient: ALLOWED_ORIGINS.length
    ? info => !info.origin || ALLOWED_ORIGINS.includes(info.origin)
    : undefined,
});

/* OGPは絶対URLでないとSNSが画像を拾わない。デプロイ先ドメインを固定したくないので、
   配信時に実際のホスト名を差し込む（__ORIGIN__ プレースホルダ） */
const PAGES = ['index.html', 'rules.html'];
const pageCache = new Map();
function servePage(file) {
  return (req, res, next) => {
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0];
    const host  = req.headers.host;
    if (!host || !/^[A-Za-z0-9.\-:]+$/.test(host)) return next();
    const full = path.join(__dirname, 'public', file);
    /* ファイルが更新されたらキャッシュを捨てる（編集が反映されないのを防ぐ） */
    let mtime;
    try { mtime = fs.statSync(full).mtimeMs; } catch { return next(); }
    const key = `${file}|${proto}://${host}`;
    const hit = pageCache.get(key);
    let html = hit && hit.mtime === mtime ? hit.html : null;
    if (!html) {
      try { html = fs.readFileSync(full, 'utf8'); } catch { return next(); }
      html = html.split('__ORIGIN__').join(`${proto}://${host}`);
      pageCache.set(key, { html, mtime });
    }
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-cache');
    res.send(html);
  };
}
app.get('/', servePage('index.html'));
PAGES.forEach(f => app.get('/' + f, servePage(f)));

/* 画像は中身が変わらないので長期キャッシュしてよいが、
   JS/JSON を長期キャッシュするとデプロイしても古いコードが残り続ける。
   スクリプト類は必ず再検証させる（ETagで実際の転送は起きない） */
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  setHeaders(res, filePath) {
    if (/\.(webp|jpg|png|svg|ico|woff2?)$/i.test(filePath)) res.set('Cache-Control', 'public, max-age=604800');
    else res.set('Cache-Control', 'no-cache');
  },
}));
/* 静的配信をCloudflare Pages等に分離した場合、疎通確認は別オリジンから来る。
   ALLOWED_ORIGINS 未設定なら誰でも叩ける単なる ping なので緩めてよい */
app.get('/ping', (req, res) => {
  const allow = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());
  const origin = req.headers.origin;
  if (allow.includes('*')) res.set('Access-Control-Allow-Origin', '*');
  else if (origin && allow.includes(origin)) res.set('Access-Control-Allow-Origin', origin);
  res.send('pong');
});

// ============================================================
// Input hardening
// ============================================================
const MAX_NAME = 16;

/* 表示名はログにもそのまま埋まるため、HTMLに化けうる文字を根元で落とす。
   '#' はAI名の予約接頭辞（#AI:normal）なので、なりすまし防止で人間からは弾く */
function sanitizeName(raw, fallback = 'Player') {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw
    .replace(/[<>&"'`\\#]/g, '')
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, '')
    .trim()
    .slice(0, MAX_NAME);
  return cleaned || fallback;
}
function sanitizeRoomId(raw) {
  if (typeof raw !== 'string') return null;
  const id = raw.trim().toUpperCase();
  return /^[A-Z0-9]{5}$/.test(id) ? id : null;
}
function sanitizeDifficulty(d) { return ['easy','normal','hard'].includes(d) ? d : 'normal'; }

// ============================================================
// State
// ============================================================
const rooms = {};
const playerMap = new Map();   // playerId -> ws
const clientInfo = new Map();  // ws -> { playerId, roomId, spectator }
const sessionTokens = new Map();// playerId -> 再接続用シークレット
const matchQueue = [];

function sendWs(ws, msg)  { if (ws?.readyState === 1) ws.send(JSON.stringify(msg)); }
function sendTo(pid, msg) { const ws = playerMap.get(pid); if (ws) sendWs(ws, msg); }

function broadcastToRoom(roomId, msg, exceptId = null) {
  const room = rooms[roomId]; if (!room) return;
  [...room.players, ...(room.spectators || [])].forEach(p => { if (p.id !== exceptId) sendTo(p.id, msg); });
}
function broadcastStateUpdate(roomId) {
  const room = rooms[roomId]; if (!room?.game) return;
  room.players.forEach(p => { if (!p.isAI) sendTo(p.id, { type:'state_update', state: stateFor(room.game, p.id) }); });
  (room.spectators || []).forEach(s => sendTo(s.id, { type:'state_update', state: stateForSpectator(room.game) }));
}
/* エンジンが溜めた演出イベントをまとめて配信する */
function flush(roomId) {
  const room = rooms[roomId]; if (!room?.game) return;
  for (const ev of drainEvents(room.game)) broadcastToRoom(roomId, ev);
  broadcastStateUpdate(roomId);
}

function createRoom(opts = {}) {
  let id;
  do { id = Math.random().toString(36).substring(2, 7).toUpperCase(); } while (rooms[id]);
  rooms[id] = { id, players: [], spectators: [], state: 'waiting', game: null,
                isPublic: !!opts.isPublic, timers: new Map(), createdAt: Date.now(), touchedAt: Date.now() };
  return id;
}
function touchRoom(roomId) { const r = rooms[roomId]; if (r) r.touchedAt = Date.now(); }

function startGame(room) {
  room.game = createGame(room.players);
  room.state = 'playing';
  return room.game;
}

// ============================================================
// Room lifecycle — 放置ルームを確実に消す（これが無いとメモリが増え続ける）
// ============================================================
const ROOM_TTL_ENDED   = 5  * 60 * 1000;
const ROOM_TTL_IDLE    = 30 * 60 * 1000;
const DISCONNECT_GRACE = 60 * 1000;

function destroyRoom(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  for (const t of room.timers?.values() ?? []) clearTimeout(t);
  [...room.players, ...(room.spectators || [])].forEach(p => {
    const ws = playerMap.get(p.id);
    if (ws && clientInfo.get(ws)?.roomId === roomId) clientInfo.set(ws, { ...clientInfo.get(ws), roomId: null });
  });
  delete rooms[roomId];
}
function roomHasLiveHuman(room) {
  return room.players.some(p => !p.isAI && playerMap.has(p.id))
      || (room.spectators || []).some(s => playerMap.has(s.id));
}
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of Object.entries(rooms)) {
    const ended = room.game?.phase === 'ended';
    if (ended && now - room.touchedAt > ROOM_TTL_ENDED) { destroyRoom(id); continue; }
    if (now - room.touchedAt > ROOM_TTL_IDLE) { destroyRoom(id); continue; }
    if (!roomHasLiveHuman(room) && now - room.touchedAt > DISCONNECT_GRACE) destroyRoom(id);
  }
}, 60 * 1000).unref?.();

// ============================================================
// AI（オンラインルームに混ざっているAIの手番を進める）
// ============================================================
/* 名前は '#AI:難易度[:番号]' の予約形式。表示言語はクライアントが解決する */
function createAI(difficulty, room) {
  const d = sanitizeDifficulty(difficulty);
  const n = (room?.players.filter(p => p.isAI).length ?? 0) + 1;
  return { id: 'AI_' + uuidv4(), name: `#AI:${d}:${n}`, isAI: true, difficulty: d };
}
function scheduleAI(roomId, delay = 1800) { setTimeout(() => aiTurn(roomId), delay); }

function aiTurn(roomId) {
  const room = rooms[roomId]; if (!room?.game) return;
  const game = room.game;
  if (game.phase === 'ended') return;
  const cur = cp(game);
  if (!cur?.isAI) return;
  /* 待ち時間を「考えている」に見せる */
  broadcastToRoom(roomId, { type:'computer_thinking', playerId: cur.id, playerName: cur.name });

  if (game.phase === 'draw') {
    const r = processDraw(game, cur.id);
    flush(roomId);
    if (game.phase === 'farmer_select') {
      setTimeout(() => {
        if (!rooms[roomId]?.game) return;
        const kept = CORE.aiBest(r.farmerDraw, cur.difficulty);
        processFarmerSelect(game, cur.id, kept.uid);
        flush(roomId);
        if (game.phase !== 'ended' && cp(game)?.isAI) scheduleAI(roomId);
      }, 1200);
      return;
    }
    if (game.phase === 'ended') return;
    setTimeout(() => aiTurn(roomId), 1400);
    return;
  }

  if (game.phase === 'action') {
    const action = aiChoose(game, cur, cur.difficulty);
    if (!action) { CORE.nextTurn(game); flush(roomId); return; }
    const result = processPlay(game, cur.id, action.cardUid, action.targetId, action.guess);

    /* 見せ合い・交換の結果は当事者にだけ個別に届ける */
    if (result.myCard && result.theirCard) {
      sendTo(action.targetId, { type:'kurando_reveal', myCard: result.theirCard, theirCard: result.myCard });
    }
    if (result.swapped) sendTo(action.targetId, { type:'spirit_swap', newCard: result.theirNewCard });
    flush(roomId);

    if (result.waitingTarget) {
      const pending = game.pendingAction;
      const tgtP = game.players.find(p => p.id === action.targetId);
      setTimeout(() => {
        if (!rooms[roomId]?.game) return;
        const pick = aiPickDiscard(pending.type, tgtP.hand, cur.difficulty);
        if (pick) processTargetDiscard(game, cur.id, pick.uid);
        flush(roomId);
        if (game.phase !== 'ended' && cp(game)?.isAI) scheduleAI(roomId);
      }, 1500);
      return;
    }
    if (game.phase !== 'ended' && cp(game)?.isAI) scheduleAI(roomId);
    return;
  }

  if (game.phase === 'waiting_target') {
    const pending = game.pendingAction;
    if (pending?.fromPlayerId === cur.id) {
      const tgtP = game.players.find(p => p.id === pending.targetId);
      setTimeout(() => {
        if (!rooms[roomId]?.game) return;
        const pick = aiPickDiscard(pending.type, tgtP.hand, cur.difficulty);
        if (pick) processTargetDiscard(game, cur.id, pick.uid);
        flush(roomId);
        if (game.phase !== 'ended' && cp(game)?.isAI) scheduleAI(roomId);
      }, 1500);
    }
  }
}

// ============================================================
// Matchmaking
// ============================================================
function tryMatch() {
  /* 切断済みのエントリが先頭に残ると永久にマッチしないので先に掃除する */
  for (let i = matchQueue.length - 1; i >= 0; i--)
    if (matchQueue[i].ws.readyState !== 1) matchQueue.splice(i, 1);

  while (matchQueue.length >= 2) {
    const [a, b] = matchQueue.splice(0, 2);
    const roomId = createRoom({ isPublic: true });
    const room = rooms[roomId];
    room.players.push({ id: a.pid, name: a.name, isAI: false });
    room.players.push({ id: b.pid, name: b.name, isAI: false });
    clientInfo.set(a.ws, { playerId: a.pid, roomId });
    clientInfo.set(b.ws, { playerId: b.pid, roomId });
    sendWs(a.ws, { type:'matched', roomId, opponentName: b.name });
    sendWs(b.ws, { type:'matched', roomId, opponentName: a.name });
    const game = startGame(room);
    addLog(game, 'match_made', { a: room.players[0].name, b: room.players[1].name });
    room.players.forEach(p => sendTo(p.id, { type:'game_started', roomId, state: stateFor(game, p.id) }));
  }
}

function publicRooms() {
  return Object.values(rooms)
    .filter(r => r.isPublic && r.state === 'playing' && r.game?.phase !== 'ended')
    .map(r => ({ id: r.id, players: r.players.map(p => p.name), spectators: (r.spectators || []).length, turn: r.game?.turn ?? 0 }));
}

// ============================================================
// Disconnect / reconnect
// ============================================================
function scheduleForfeit(roomId, playerId) {
  const room = rooms[roomId]; if (!room) return;
  clearTimeout(room.timers.get(playerId));
  room.timers.set(playerId, setTimeout(() => {
    const r = rooms[roomId]; if (!r) return;
    r.timers.delete(playerId);
    if (playerMap.has(playerId)) return;                 // 復帰済み
    const game = r.game;
    if (!game || game.phase === 'ended') {
      if (!roomHasLiveHuman(r)) destroyRoom(roomId);
      return;
    }
    forfeit(game, playerId);
    flush(roomId);
    if (game.phase !== 'ended' && cp(game)?.isAI) scheduleAI(roomId);
    if (!roomHasLiveHuman(r)) destroyRoom(roomId);
  }, DISCONNECT_GRACE));
}

function handleDisconnect(ws) {
  const info = clientInfo.get(ws);
  clientInfo.delete(ws);
  if (!info) return;
  const { playerId, roomId } = info;
  if (playerMap.get(playerId) === ws) playerMap.delete(playerId);

  const qi = matchQueue.findIndex(q => q.pid === playerId);
  if (qi !== -1) matchQueue.splice(qi, 1);

  const room = roomId && rooms[roomId];
  if (!room) return;

  if (info.spectator) {
    room.spectators = (room.spectators || []).filter(s => s.id !== playerId);
    if (!roomHasLiveHuman(room)) destroyRoom(roomId);
    return;
  }
  const player = room.players.find(p => p.id === playerId);
  if (!player) return;

  if (room.state === 'waiting') {
    room.players = room.players.filter(p => p.id !== playerId);
    if (!room.players.some(p => !p.isAI)) { destroyRoom(roomId); return; }
    broadcastToRoom(roomId, { type:'room_update', players: room.players });
    return;
  }
  broadcastToRoom(roomId, { type:'opponent_disconnected', playerId, playerName: player.name, graceMs: DISCONNECT_GRACE });
  scheduleForfeit(roomId, playerId);
}

// ============================================================
// WS handler
// ============================================================
const RATE_WINDOW = 3000, RATE_MAX = 60;

wss.on('connection', ws => {
  let pid = uuidv4();
  const token = uuidv4();
  playerMap.set(pid, ws);
  sessionTokens.set(pid, token);
  clientInfo.set(ws, { playerId: pid, roomId: null });
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  let windowStart = Date.now(), msgCount = 0;
  sendWs(ws, { type:'connected', playerId: pid, token });

  const fail = (code) => sendWs(ws, { type:'error', code });

  ws.on('message', raw => {
    /* 単純なトークンバケット。連打でメモリを膨らませる系の悪用を弾く */
    const now = Date.now();
    if (now - windowStart > RATE_WINDOW) { windowStart = now; msgCount = 0; }
    if (++msgCount > RATE_MAX) return;
    if (typeof raw?.length === 'number' && raw.length > 4096) return;

    let msg; try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return;
    const { type } = msg;

    /* 再接続：playerIdだけでは他人になりすませるので、接続時に配ったtokenを必須にする */
    if (type === 'rejoin') {
      const oldPid = msg.playerId, roomId = sanitizeRoomId(msg.roomId);
      const room = roomId && rooms[roomId];
      const seat = room?.players.find(p => p.id === oldPid && !p.isAI);
      if (!oldPid || !seat || sessionTokens.get(oldPid) !== msg.token) { sendWs(ws, { type:'rejoin_failed' }); return; }
      const stale = playerMap.get(oldPid);
      if (stale && stale !== ws) { clientInfo.delete(stale); try { stale.close(); } catch {} }
      playerMap.delete(pid); sessionTokens.delete(pid);
      pid = oldPid;
      playerMap.set(pid, ws);
      clientInfo.set(ws, { playerId: pid, roomId });
      clearTimeout(room.timers.get(pid)); room.timers.delete(pid);
      touchRoom(roomId);
      /* クライアントの myId を元の席のIDに戻させる。
         これを送らないと、直前の 'connected' で配った新IDのまま手番判定が壊れる */
      sendWs(ws, { type:'rejoined', playerId: pid, token: sessionTokens.get(pid), roomId });
      broadcastToRoom(roomId, { type:'opponent_reconnected', playerId: pid, playerName: seat.name }, pid);
      if (room.game) sendWs(ws, { type:'game_started', roomId, state: stateFor(room.game, pid) });
      else { sendWs(ws, { type:'room_joined', roomId }); sendWs(ws, { type:'room_update', players: room.players }); }
      return;
    }

    const info = clientInfo.get(ws);
    touchRoom(info?.roomId);
    const room = rooms[info?.roomId];
    const game = room?.game;

    switch (type) {

      case 'create_room': {
        if (info?.roomId) return;                       // 連打で無人ルームを量産させない
        const roomId = createRoom();
        rooms[roomId].players.push({ id: pid, name: sanitizeName(msg.name), isAI: false });
        clientInfo.set(ws, { playerId: pid, roomId });
        sendWs(ws, { type:'room_created', roomId });
        sendWs(ws, { type:'room_update', players: rooms[roomId].players });
        return;
      }

      case 'join_room': {
        const roomId = sanitizeRoomId(msg.roomId);
        const target = roomId && rooms[roomId];
        if (!target) return fail('room_not_found');
        if (target.state !== 'waiting') return fail('already_started');
        if (target.players.length >= 4) return fail('room_full');
        if (target.players.some(p => p.id === pid)) return;
        target.players.push({ id: pid, name: sanitizeName(msg.name, `Player${target.players.length + 1}`), isAI: false });
        clientInfo.set(ws, { playerId: pid, roomId });
        sendWs(ws, { type:'room_joined', roomId });
        broadcastToRoom(roomId, { type:'room_update', players: target.players });
        return;
      }

      case 'add_ai': {
        if (!room || room.state !== 'waiting' || room.players[0].id !== pid) return;
        if (room.players.length >= 4) return fail('room_full');
        room.players.push(createAI(msg.difficulty, room));
        broadcastToRoom(info.roomId, { type:'room_update', players: room.players });
        return;
      }

      case 'remove_ai': {
        if (!room || room.state !== 'waiting' || room.players[0].id !== pid) return;
        const idx = room.players.findIndex(p => p.isAI);
        if (idx !== -1) room.players.splice(idx, 1);
        broadcastToRoom(info.roomId, { type:'room_update', players: room.players });
        return;
      }

      case 'start_game': {
        if (!room) return;
        if (room.state !== 'waiting') return fail('already_started');
        if (room.players[0].id !== pid) return fail('host_only');
        if (room.players.length < 2) return fail('need_two');
        const g = startGame(room);
        addLog(g, 'game_start', { name: cp(g).name });
        room.players.forEach(p => { if (!p.isAI) sendTo(p.id, { type:'game_started', roomId: room.id, state: stateFor(g, p.id) }); });
        if (cp(g).isAI) scheduleAI(info.roomId);
        return;
      }

      case 'rematch': {
        if (!room) return;
        const humans = room.players.filter(p => !p.isAI);
        room.rematchVotes ||= new Set();
        if (humans.length > 1) {
          room.rematchVotes.add(pid);
          broadcastToRoom(info.roomId, { type:'rematch_vote', votedCount: room.rematchVotes.size, totalHumans: humans.length, votedBy: pid });
          if (room.rematchVotes.size < humans.length) return;
        }
        room.rematchVotes.clear();
        room.state = 'waiting';
        const g = startGame(room);
        addLog(g, 'rematch_start', { name: cp(g).name });
        room.players.forEach(p => { if (!p.isAI) sendTo(p.id, { type:'game_started', roomId: room.id, state: stateFor(g, p.id) }); });
        if (cp(g).isAI) scheduleAI(info.roomId);
        return;
      }

      /* AI戦は通常ブラウザ内で完結するが、古いキャッシュのクライアントが
         これを送ってくる可能性があるので受け口を残しておく（移行用） */
      case 'start_vs_ai': {
        if (info?.roomId && rooms[info.roomId]) destroyRoom(info.roomId);
        const roomId = createRoom();
        const r = rooms[roomId];
        r.players.push({ id: pid, name: sanitizeName(msg.name), isAI: false });
        const cnt = Math.min(Math.max(Number(msg.aiCount) || 1, 1), 3);
        for (let i = 0; i < cnt; i++) r.players.push(createAI(msg.difficulty, r));
        clientInfo.set(ws, { playerId: pid, roomId });
        const g = startGame(r);
        addLog(g, 'game_start', { name: cp(g).name });
        sendWs(ws, { type:'game_started', roomId, state: stateFor(g, pid) });
        if (cp(g).isAI) scheduleAI(roomId);
        return;
      }

      case 'join_queue': {
        if (matchQueue.find(q => q.pid === pid)) return;
        if (room?.state === 'playing') return;
        matchQueue.push({ pid, name: sanitizeName(msg.name), ws });
        sendWs(ws, { type:'queue_joined', position: matchQueue.length });
        tryMatch();
        return;
      }

      case 'leave_queue': {
        const idx = matchQueue.findIndex(q => q.pid === pid);
        if (idx !== -1) matchQueue.splice(idx, 1);
        sendWs(ws, { type:'queue_left' });
        return;
      }

      case 'get_public_rooms':
        sendWs(ws, { type:'public_rooms', rooms: publicRooms() });
        return;

      case 'spectate': {
        const roomId = sanitizeRoomId(msg.roomId);
        const target = roomId && rooms[roomId];
        if (!target || target.state !== 'playing') return fail('no_spectate');
        target.spectators ||= [];
        if (target.spectators.some(s => s.id === pid)) return;
        target.spectators.push({ id: pid, name: sanitizeName(msg.name, 'Spectator') });
        clientInfo.set(ws, { playerId: pid, roomId, spectator: true });
        sendWs(ws, { type:'spectating', state: stateForSpectator(target.game) });
        return;
      }

      case 'draw_card': {
        if (!game) return;
        const r = processDraw(game, pid);
        if (r.error) return fail(r.error);
        if (r.farmerDraw) sendWs(ws, { type:'farmer_draw', cards: r.farmerDraw });
        flush(info.roomId);
        return;
      }

      case 'farmer_select': {
        if (!game) return;
        const r = processFarmerSelect(game, pid, msg.keepCardUid);
        if (r.error) return fail(r.error);
        flush(info.roomId);
        if (game.phase !== 'ended' && cp(game)?.isAI) scheduleAI(info.roomId);
        return;
      }

      case 'play_card': {
        if (!game) return;
        const r = processPlay(game, pid, msg.cardUid, msg.targetId, msg.guess);
        if (r.error) return fail(r.error);
        if (r.needTarget) { sendWs(ws, { type:'need_target', cardUid: r.cardUid, effect: r.effect, requiresGuess: r.requiresGuess }); return; }
        if (r.peekedCard) sendWs(ws, { type:'peek_result', card: r.peekedCard });
        if (r.myCard && r.theirCard) {
          sendWs(ws, { type:'kurando_reveal', myCard: r.myCard, theirCard: r.theirCard });
          sendTo(r.targetId, { type:'kurando_reveal', myCard: r.theirCard, theirCard: r.myCard });
        }
        if (r.swapped) sendTo(r.targetId, { type:'spirit_swap', newCard: r.theirNewCard });
        flush(info.roomId);
        if (r.waitingTarget) return;   // 捨てる札を選ぶのは攻撃者本人
        if (game.phase !== 'ended' && cp(game)?.isAI) scheduleAI(info.roomId);
        return;
      }

      case 'target_discard': {
        if (!game) return;
        const r = processTargetDiscard(game, pid, msg.cardUid);
        if (r.error) return fail(r.error);
        flush(info.roomId);
        if (game.phase !== 'ended' && cp(game)?.isAI) scheduleAI(info.roomId);
        return;
      }
    }
  });

  ws.on('error', () => {});
  ws.on('close', () => handleDisconnect(ws));
});

/* モバイルはタブを裏に回すと黙って切れる。生存確認しないと幽霊接続が溜まり続ける */
const heartbeat = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) { handleDisconnect(ws); return ws.terminate(); }
    ws.isAlive = false;
    try { ws.ping(); } catch {}
  });
}, 30000);
heartbeat.unref?.();
wss.on('close', () => clearInterval(heartbeat));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  server.listen(PORT, () => console.log(`SILVA server running on http://localhost:${PORT}`));
}

module.exports = { app, server, rooms, createRoom, startGame, sanitizeName, sanitizeRoomId, createAI, CORE };
