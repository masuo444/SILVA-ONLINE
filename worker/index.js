import { DurableObject } from 'cloudflare:workers';
import CORE from '../public/game-core.js';

const GRACE = 120_000, IDLE = 30 * 60_000;
const roomId = value => typeof value === 'string' && /^[A-Z0-9]{5}$/.test(value.toUpperCase()) ? value.toUpperCase() : null;
const nameOf = value => (typeof value === 'string' ? value.replace(/[<>&"'`\\#\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, '').trim().slice(0, 16) : '') || 'Player';
const difficulty = d => ['easy', 'normal', 'hard'].includes(d) ? d : 'normal';
const token = () => crypto.randomUUID();
function code() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return [...crypto.getRandomValues(new Uint8Array(5))].map(n => chars[n % 32]).join('');
}
function send(ws, value) { try { ws.send(JSON.stringify(value)); } catch {} }
function parse(ws, raw) {
  if (typeof raw !== 'string' || raw.length > 4096) return null;
  const a = ws.deserializeAttachment();
  if (!a) return null;
  if (Date.now() - a.window > 3000) { a.window = Date.now(); a.count = 0; }
  a.count++;
  ws.serializeAttachment(a);
  if (a.count > 60) return null;
  try { const m = JSON.parse(raw); return m && typeof m.type === 'string' ? m : null; } catch { return null; }
}
function equalSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.subtle.timingSafeEqual(new TextEncoder().encode(a), new TextEncoder().encode(b));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/ping') return new Response('pong');
    if (url.pathname.startsWith('/api/')) {
      const origin = request.headers.get('Origin');
      if (origin && origin !== url.origin) return new Response('Forbidden', { status: 403 });
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket required', { status: 426 });
      if (url.pathname === '/api/lobby') return env.LOBBIES.getByName('public-ja-en').fetch(request);
      const id = roomId(url.pathname.slice('/api/rooms/'.length));
      if (url.pathname.startsWith('/api/rooms/') && id) return env.ROOMS.getByName(id).fetch(request);
      return new Response('Not found', { status: 404 });
    }
    if (url.pathname === '/robots.txt') return new Response(`User-agent: *\nAllow: /\nSitemap: ${url.origin}/sitemap.xml\n`);
    if (url.pathname === '/sitemap.xml') return new Response(`<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url.origin}/</loc></url><url><loc>${url.origin}/rules.html</loc></url></urlset>`, { headers: { 'Content-Type': 'application/xml' } });
    const response = await env.ASSETS.fetch(request);
    if (response.headers.get('Content-Type')?.includes('text/html')) {
      const html = (await response.text()).replaceAll('__ORIGIN__', url.origin);
      return new Response(html, { status: response.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' } });
    }
    return response;
  }
};

/** One independent, persisted state machine per game room. No shared game state. */
export class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL)');
    this.room = JSON.parse([...ctx.storage.sql.exec('SELECT json FROM state WHERE id=1')][0]?.json || 'null');
  }
  persist() {
    this.ctx.storage.sql.exec('INSERT OR REPLACE INTO state(id,json) VALUES(1,?)', JSON.stringify(this.room));
  }
  publicSummary() {
    const r=this.room;
    if(!r?.matchTicket || !r.game || r.game.phase==='ended')return null;
    return {id:r.id,players:r.players.map(p=>p.name),turn:r.game.turn,spectators:this.sockets().filter(s=>s.deserializeAttachment()?.spectator).length};
  }
  async initialize(id, matchTicket = null) {
    if (this.room) return false;
    this.room = { id, players: [], sessions: {}, game: null, revision: 0, votes: [], seen: {}, disconnected: {}, aiAt: null, touched: Date.now(), matchTicket };
    this.persist();
    await this.schedule();
    return true;
  }
  sockets() { return this.ctx.getWebSockets(); }
  playerSocket(pid) { return this.sockets().find(ws => ws.deserializeAttachment()?.pid === pid && ws.deserializeAttachment()?.joined); }
  broadcast(message) { for (const ws of this.sockets()) if (ws.deserializeAttachment()?.joined) send(ws, message); }
  to(pid, message) { const ws = this.playerSocket(pid); if (ws) send(ws, message); }
  snapshot(pid, spectator = false) {
    const state = spectator ? CORE.stateForSpectator(this.room.game) : CORE.stateFor(this.room.game, pid);
    return { ...state, revision: this.room.revision };
  }
  update(type = 'state_update') {
    for (const ws of this.sockets()) {
      const a = ws.deserializeAttachment();
      if (a?.joined) send(ws, { type, roomId: this.room.id, state: this.snapshot(a.pid, a.spectator) });
    }
  }
  waiting() { this.broadcast({ type: 'room_update', players: this.room.players }); }
  commit(events = []) {
    this.room.revision++;
    this.room.touched = Date.now();
    const game = this.room.game;
    const effects = game ? CORE.drainEvents(game) : [];
    this.room.aiAt = game && game.phase !== 'ended' && CORE.cp(game)?.isAI ? Date.now() + 1100 : null;
    this.persist(); // Persist before publishing state or private information.
    for (const [pid, event] of events) this.to(pid, event);
    for (const event of effects) this.broadcast(event);
    if (game) this.update(); else this.waiting();
  }
  start() {
    this.room.game = CORE.createGame(this.room.players);
    this.room.votes = [];
    CORE.addLog(this.room.game, 'game_start', { name: CORE.cp(this.room.game).name });
    this.commit();
    this.update('game_started');
  }
  async schedule() {
    if (!this.room) return;
    const deadlines = [this.room.touched + IDLE, ...Object.values(this.room.disconnected)];
    if (this.room.aiAt) deadlines.push(this.room.aiAt);
    await this.ctx.storage.setAlarm(Math.max(Date.now() + 50, Math.min(...deadlines)));
  }
  async fetch(request) {
    if (!this.room) return new Response('Room not found', { status: 404 });
    if (this.sockets().length >= 24) return new Response('Room full', { status: 429 });
    const pair = new WebSocketPair();
    const ws = pair[1];
    this.ctx.acceptWebSocket(ws);
    const pid = token(), secret = token();
    ws.serializeAttachment({ pid, token: secret, joined: false, spectator: false, window: Date.now(), count: 0 });
    send(ws, { type: 'connected', playerId: pid, token: secret });
    return new Response(null, { status: 101, webSocket: pair[0] });
  }
  async webSocketMessage(ws, raw) {
    const m = parse(ws, raw);
    if (!m || !this.room) return;
    if (m.type === 'ping') { send(ws, { type: 'pong' }); return; }
    let a = ws.deserializeAttachment();
    const r = this.room;
    const fail = code => send(ws, { type: 'error', code });
    if (m.type === 'rejoin') {
      const seat = r.players.find(p => p.id === m.playerId && !p.isAI);
      if (!seat || !equalSecret(r.sessions[m.playerId], m.token) || m.roomId !== r.id) { send(ws, { type: 'rejoin_failed' }); return; }
      const old = this.playerSocket(m.playerId);
      if (old && old !== ws) { const stale = old.deserializeAttachment(); old.serializeAttachment({ ...stale, joined: false }); old.close(1000, 'Reconnected elsewhere'); }
      a = { ...a, pid: m.playerId, token: m.token, joined: true };
      ws.serializeAttachment(a);
      delete r.disconnected[a.pid];
      r.touched = Date.now(); this.persist();
      send(ws, { type: 'rejoined', playerId: a.pid, token: a.token, roomId: r.id });
      this.broadcast({ type: 'opponent_reconnected', playerId: a.pid, playerName: seat.name });
      if (r.game) {
        send(ws, { type: 'game_started', roomId: r.id, state: this.snapshot(a.pid) });
        if (r.game.phase === 'farmer_select' && CORE.cp(r.game).id === a.pid) send(ws, { type: 'farmer_draw', cards: seatCards(r.game, a.pid) });
      } else { send(ws, { type: r.players[0].id === a.pid ? 'room_created' : 'room_joined', roomId: r.id }); this.waiting(); }
      await this.schedule(); return;
    }
    if (m.type === 'join_room' || m.type === 'create_room') {
      if (a.joined) return;
      if (r.game) return fail('already_started');
      if (r.matchTicket && !equalSecret(r.matchTicket, m.ticket)) return fail('room_not_found');
      if (r.players.length >= 4) return fail('room_full');
      r.players.push({ id: a.pid, name: nameOf(m.name), isAI: false });
      r.sessions[a.pid] = a.token;
      a.joined = true; ws.serializeAttachment(a);
      this.commit();
      send(ws, { type: r.players[0].id === a.pid ? 'room_created' : 'room_joined', roomId: r.id });
      this.waiting();
      if (r.matchTicket && r.players.length === 2) this.start();
      await this.schedule(); return;
    }
    if (m.type === 'spectate') {
      if (!r.game || !r.matchTicket) return fail('no_spectate');
      a.joined = true; a.spectator = true; ws.serializeAttachment(a);
      send(ws, { type: 'spectating', roomId: r.id, state: this.snapshot(a.pid, true) }); return;
    }
    if (!a.joined || a.spectator) return;
    const pid = a.pid, game = r.game;
    const host = r.players[0]?.id === pid;
    if (m.type === 'leave_room') { await this.depart(ws, true); ws.close(1000, 'Left room'); return; }
    const moves = ['draw_card', 'play_card', 'farmer_select', 'target_discard'];
    if (moves.includes(m.type)) {
      if (!game || game.phase === 'ended') return;
      // IDs make retries harmless; revision rejects stale/double-click moves.
      if (typeof m.actionId !== 'string' || m.actionId.length > 64) return fail('invalid_action');
      if ((r.seen[pid] || []).includes(m.actionId)) { send(ws, { type: 'state_update', state: this.snapshot(pid) }); return; }
      if (m.revision !== r.revision) { send(ws, { type: 'state_update', state: this.snapshot(pid) }); return; }
      let result;
      if (m.type === 'draw_card') result = CORE.processDraw(game, pid);
      if (m.type === 'play_card') result = CORE.processPlay(game, pid, m.cardUid, m.targetId, m.guess);
      if (m.type === 'farmer_select') result = CORE.processFarmerSelect(game, pid, m.keepCardUid);
      if (m.type === 'target_discard') result = CORE.processTargetDiscard(game, pid, m.cardUid);
      if (result.error) return fail(result.error);
      if (result.needTarget) { send(ws, { type: 'need_target', ...result }); return; }
      r.seen[pid] = [...(r.seen[pid] || []), m.actionId].slice(-40);
      this.commit(privateEvents(pid, result));
    } else if (m.type === 'add_ai' || m.type === 'remove_ai') {
      if (!host || game) return;
      if (m.type === 'add_ai') {
        if (r.players.length >= 4) return fail('room_full');
        const d = difficulty(m.difficulty);
        r.players.push({ id: 'AI_' + token(), name: `#AI:${d}:${r.players.filter(p => p.isAI).length + 1}`, isAI: true, difficulty: d });
      } else { const i = r.players.findIndex(p => p.isAI); if (i !== -1) r.players.splice(i, 1); }
      this.commit();
    } else if (m.type === 'start_game') {
      if (!host) return fail('host_only');
      if (game) return fail('already_started');
      if (r.players.length < 2) return fail('need_two');
      if (Object.keys(r.disconnected).length) return fail('player_disconnected');
      this.start();
    } else if (m.type === 'rematch') {
      if (game?.phase !== 'ended') return;
      if (!r.votes.includes(pid)) r.votes.push(pid);
      const humans = r.players.filter(p => !p.isAI);
      this.persist();
      this.broadcast({ type: 'rematch_vote', votedCount: r.votes.length, totalHumans: humans.length, votedBy: pid });
      if (humans.every(p => r.votes.includes(p.id) && this.playerSocket(p.id))) this.start();
    }
    await this.schedule();
  }
  async depart(ws, immediate = false) {
    if (!this.room) return;
    const a = ws.deserializeAttachment();
    if (!a?.joined || a.spectator) return;
    ws.serializeAttachment({ ...a, joined: false });
    const r = this.room;
    const seat = r.players.find(p => p.id === a.pid);
    if (!seat) return;
    r.disconnected[a.pid] = Date.now() + (immediate ? 0 : GRACE);
    this.persist();
    this.broadcast({ type: 'opponent_disconnected', playerId: a.pid, playerName: seat.name, graceMs: immediate ? 0 : GRACE });
    await this.schedule();
  }
  async webSocketClose(ws) { await this.depart(ws); }
  async webSocketError(ws) { await this.depart(ws); }
  async alarm() {
    const r = this.room;
    if (!r) return;
    if (Date.now() >= r.touched + IDLE) {
      for (const ws of this.sockets()) ws.close(1000, 'Room expired');
      this.room = null;
      this.ctx.storage.sql.exec('DELETE FROM state');
      await this.ctx.storage.deleteAlarm(); return;
    }
    for (const [pid, deadline] of Object.entries(r.disconnected)) {
      if (deadline > Date.now()) continue;
      delete r.disconnected[pid];
      if (r.game && r.game.phase !== 'ended') CORE.forfeit(r.game, pid);
      if (!r.game) { r.players = r.players.filter(p => p.id !== pid); delete r.sessions[pid]; }
      this.commit();
    }
    if (r.aiAt && r.aiAt <= Date.now()) {
      r.aiAt = null;
      const g = r.game, p = g && CORE.cp(g);
      if (g && g.phase !== 'ended' && p?.isAI) {
        let result = {};
        this.broadcast({ type: 'computer_thinking', playerId: p.id, playerName: p.name });
        if (g.phase === 'draw') result = CORE.processDraw(g, p.id);
        else if (g.phase === 'farmer_select') { const pick = CORE.aiBest(seatCards(g, p.id), p.difficulty); if (pick) result = CORE.processFarmerSelect(g, p.id, pick.uid); }
        else if (g.phase === 'action') { const move = CORE.aiChoose(g, p, p.difficulty); if (move) result = CORE.processPlay(g, p.id, move.cardUid, move.targetId, move.guess); else CORE.nextTurn(g); }
        else if (g.phase === 'waiting_target') { const target = g.players.find(p => p.id === g.pendingAction?.targetId); const pick = target && CORE.aiPickDiscard(g.pendingAction.type, target.hand, p.difficulty); if (pick) result = CORE.processTargetDiscard(g, p.id, pick.uid); }
        this.commit(privateEvents(p.id, result));
      }
    }
    await this.schedule();
  }
}
function seatCards(game, pid) { return game.players.find(p => p.id === pid).hand.filter(c => game.pendingFarmerDrawn?.includes(c.uid)); }
function privateEvents(pid, r) {
  const events = [];
  if (r.farmerDraw) events.push([pid, { type: 'farmer_draw', cards: r.farmerDraw }]);
  if (r.peekedCard) events.push([pid, { type: 'peek_result', card: r.peekedCard }]);
  if (r.myCard && r.theirCard) { events.push([pid, { type: 'kurando_reveal', myCard: r.myCard, theirCard: r.theirCard }]); events.push([r.targetId, { type: 'kurando_reveal', myCard: r.theirCard, theirCard: r.myCard }]); }
  if (r.swapped) events.push([r.targetId, { type: 'spirit_swap', newCard: r.theirNewCard }]);
  return events;
}

/** Entrance/queue only. Live matches run in separate GameRoom instances. */
export class Lobby extends DurableObject {
  async fetch(request) {
    if (this.ctx.getWebSockets().length >= 1000) return new Response('Busy', { status: 503 });
    const pair = new WebSocketPair(), ws = pair[1];
    this.ctx.acceptWebSocket(ws);
    const pid = token();
    ws.serializeAttachment({ pid, window: Date.now(), count: 0, queued: false, created: Date.now() });
    send(ws, { type: 'connected', playerId: pid, token: token() });
    await this.ctx.storage.setAlarm(Date.now() + 60_000);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }
  async allocate(ticket = null) {
    for (let i = 0; i < 5; i++) {
      const id = code();
      if (await this.env.ROOMS.getByName(id).initialize(id, ticket)) return id;
    }
    throw new Error('Room allocation failed');
  }
  async webSocketMessage(ws, raw) {
    const m = parse(ws, raw); if (!m) return;
    const a = ws.deserializeAttachment();
    if (m.type === 'ping') { send(ws, { type: 'pong' }); return; }
    if (m.type === 'create_room') {
      if (a.transferring) return;
      ws.serializeAttachment({ ...a, transferring: true });
      try { const id = await this.allocate(); send(ws, { type: 'transfer', roomId: id, action: { type: 'create_room', name: nameOf(m.name) } }); }
      catch { ws.serializeAttachment(a); send(ws, { type: 'error', code: 'server_busy' }); }
    } else if (m.type === 'join_room' || m.type === 'spectate') {
      const id = roomId(m.roomId);
      if (!id) { send(ws, { type: 'error', code: 'room_not_found' }); return; }
      send(ws, { type: 'transfer', roomId: id, action: { type: m.type, roomId: id, name: nameOf(m.name) } });
    } else if (m.type === 'join_queue') {
      if (a.queued || a.transferring) return;
      // Mark both before awaiting allocation so another arrival cannot match either twice.
      const other = this.ctx.getWebSockets().find(s => s !== ws && s.deserializeAttachment()?.queued);
      if (!other) { ws.serializeAttachment({ ...a, queued: true, name: nameOf(m.name) }); send(ws, { type: 'queue_joined', position: 1 }); return; }
      const b = other.deserializeAttachment();
      ws.serializeAttachment({ ...a, transferring: true }); other.serializeAttachment({ ...b, queued: false, transferring: true });
      try {
        const ticket = token(), id = await this.allocate(ticket);
        for (const [s, name] of [[ws, nameOf(m.name)], [other, b.name]]) send(s, { type: 'transfer', roomId: id, action: { type: 'join_room', name, ticket } });
        const recent = await this.ctx.storage.get('recent') || [];
        await this.ctx.storage.put('recent', [...recent.filter(r => r.until > Date.now()), { id, players: [nameOf(m.name), b.name], until: Date.now() + IDLE }].slice(-30));
      } catch { for (const s of [ws, other]) { const info = s.deserializeAttachment(); s.serializeAttachment({ ...info, transferring: false, queued: false }); send(s, { type: 'error', code: 'server_busy' }); } }
    } else if (m.type === 'leave_queue') {
      ws.serializeAttachment({ ...a, queued: false }); send(ws, { type: 'queue_left' });
    } else if (m.type === 'get_public_rooms') {
      const recent = await this.ctx.storage.get('recent') || [];
      const rooms = await Promise.all(recent.filter(r => r.until > Date.now()).map(r => this.env.ROOMS.getByName(r.id).publicSummary()));
      send(ws, { type: 'public_rooms', rooms: rooms.filter(Boolean) });
    }
  }
  async alarm() {
    const sockets = this.ctx.getWebSockets();
    for (const ws of sockets) if (Date.now() - ws.deserializeAttachment().created > 10 * 60_000) ws.close(1000, 'Lobby idle');
    if (this.ctx.getWebSockets().length) await this.ctx.storage.setAlarm(Date.now() + 60_000);
  }
}
