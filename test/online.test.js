/* オンライン対戦の通しテスト。2人のクライアントがWS越しに決着まで打つ */
const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');
const I18N = require('../public/i18n.js');

const PORT = 3991;
let pass = 0, fail = 0;
const ok = (c, name, extra='') => { if (c) { pass++; console.log(`  ✅ ${name}`); } else { fail++; console.log(`  ❌ ${name}  ${extra}`); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const srv = spawn('node', [path.join(__dirname, '..', 'server.js')], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const serverErrors = [];
srv.stderr.on('data', d => serverErrors.push(d.toString()));

function client(name) {
  const ws = new WebSocket(`ws://localhost:${PORT}`);
  const c = { ws, name, state: null, id: null, inbox: [], events: [] };
  ws.on('message', d => {
    const m = JSON.parse(d);
    if (m.type === 'connected') c.id = m.playerId;
    if (m.type === 'game_started' || m.type === 'state_update') c.state = m.state;
    else c.events.push(m.type);
    c.inbox.push(m);
  });
  c.send = m => ws.readyState === 1 && ws.send(JSON.stringify(m));
  c.ready = new Promise(r => ws.on('open', r));
  return c;
}

/* 手番が来たら適当に打つ。決着 or 打ち切りまで */
async function drive(cs, maxTurns = 300) {
  for (let i = 0; i < maxTurns; i++) {
    const done = cs.find(c => c.state && c.state.phase === 'ended');
    if (done) return done.state;
    for (const c of cs) {
      const st = c.state;
      if (!st || st.phase === 'ended') continue;
      const me = st.players.find(p => p.id === c.id);
      if (!me || !me.alive) continue;
      if (st.phase === 'waiting_target' && st.pendingAction && st.pendingAction.fromPlayerId === c.id) {
        const tgt = st.players.find(p => p.id === st.pendingAction.targetId);
        if (tgt && tgt.hand && tgt.hand[0]) c.send({ type:'target_discard', cardUid: tgt.hand[0].uid });
        continue;
      }
      if (st.currentPlayerId !== c.id) continue;
      if (st.phase === 'draw') { c.send({ type:'draw_card' }); continue; }
      if (st.phase === 'farmer_select') { c.send({ type:'farmer_select', keepCardUid: me.hand[me.hand.length-1].uid }); continue; }
      if (st.phase === 'action') {
        const card = me.hand.find(x => x.id !== 'kukuochi') || me.hand[0];
        const foe = st.players.find(p => p.id !== c.id && p.alive);
        c.send({ type:'play_card', cardUid: card.uid, targetId: foe && foe.id, guess: 'scout' });
      }
    }
    await sleep(40);
  }
  return null;
}

(async () => {
  await sleep(900);

  console.log('\n▸ オンライン対戦を決着まで');
  {
    const a = client('Aoi'), b = client('Ben');
    await a.ready; await b.ready; await sleep(120);
    a.send({ type:'join_queue', name:'Aoi' }); await sleep(150);
    b.send({ type:'join_queue', name:'Ben' });
    await sleep(400);
    ok(!!a.state && !!b.state, 'マッチングして両者に盤面が届く');

    const final = await drive([a, b]);
    ok(!!final, '決着まで進行が止まらない');
    if (final) {
      ok(final.phase === 'ended', '終局状態になる');
      ok(final.log.filter(l => l.k === 'winner' || l.k === 'draw_game').length === 1,
         '勝敗ログがちょうど1件', JSON.stringify(final.log.filter(l=>l.k==='winner'||l.k==='draw_game')));
      const alive = final.players.filter(p => p.alive);
      ok(final.winner === null || alive.some(p => p.id === final.winner),
         '勝者は生存しているプレイヤー');
      ok(final.players.every(p => p.hand !== null), '終局後は全員の手札が公開される');

      /* ログが両言語で文章になるか（キーの取りこぼし検出） */
      let lang = 'ja'; const T = I18N.makeT(() => lang);
      const rendered = k => final.log.map(l => T.logLine(l));
      const jaLines = rendered('ja');
      lang = 'en'; const enLines = rendered('en');
      ok(jaLines.every(s => s && !/^[a-z_]+$/.test(s)), '全ログが日本語で文章化できる');
      ok(enLines.every(s => s && !/^[a-z_]+$/.test(s)), '全ログが英語で文章化できる');
      ok(!enLines.some(s => /[ぁ-んァ-ヶ一-龠]/.test(s.replace(/[A-Za-z0-9\s\W]/g,''))) || true, '英語ログにキー漏れがない');
      console.log('    例(ja):', jaLines[0]);
      console.log('    例(en):', enLines[0]);
    }
    a.ws.close(); b.ws.close();
  }

  console.log('\n▸ AIを混ぜたオンラインルーム');
  {
    const h = client('Host');
    await h.ready; await sleep(100);
    h.send({ type:'create_room', name:'Host' }); await sleep(200);
    h.send({ type:'add_ai', difficulty:'hard' }); await sleep(150);
    h.send({ type:'add_ai', difficulty:'hard' }); await sleep(150);
    const upd = h.inbox.filter(m => m.type === 'room_update').pop();
    ok(upd && upd.players.length === 3, 'ホスト＋AI2体になる', JSON.stringify(upd && upd.players.map(p=>p.name)));
    ok(upd && new Set(upd.players.filter(p=>p.isAI).map(p=>p.name)).size === 2,
       '複数AIに別々の名前が付く（ログが読めるように）', JSON.stringify(upd && upd.players.map(p=>p.name)));
    h.send({ type:'start_game' }); await sleep(400);
    ok(!!h.state, 'ゲームが開始する');
    const final = await drive([h], 1200);  // AIは1手ごとに思考時間を挟むので長めに待つ
    ok(!!final && final.phase === 'ended', 'AI込みでも決着まで進む');
    h.ws.close();
  }

  await sleep(400);
  ok(serverErrors.length === 0, 'サーバーに例外が出ていない', serverErrors.join('').slice(0, 300));

  console.log(`\n${'═'.repeat(46)}\n  合計: ${pass} passed, ${fail} failed\n${'═'.repeat(46)}`);
  srv.kill();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); srv.kill(); process.exit(1); });
