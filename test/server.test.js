/* SILVA ルール判定の回帰テスト。server.js を子プロセスで起動し WS 経由で検証する */
const { spawn } = require('child_process');
const WebSocket = require('ws');

const PORT = 3987;
let pass = 0, fail = 0;
const ok = (cond, name, extra='') => { if (cond) { pass++; console.log(`  ✅ ${name}`); } else { fail++; console.log(`  ❌ ${name} ${extra}`); } };

const srv = spawn('node', [require('path').join(__dirname,'..','server.js')], {
  cwd: require('path').join(__dirname, '..'),
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
srv.stderr.on('data', d => console.error('[server]', d.toString().trim()));

const sleep = ms => new Promise(r => setTimeout(r, ms));

function client() {
  const ws = new WebSocket(`ws://localhost:${PORT}`);
  const inbox = [];
  ws.on('message', d => inbox.push(JSON.parse(d)));
  ws.inbox = inbox;
  ws.send2 = m => ws.send(JSON.stringify(m));
  ws.waitFor = async (type, ms = 3000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const i = inbox.findIndex(m => m.type === type);
      if (i !== -1) return inbox.splice(i, 1)[0];
      await sleep(20);
    }
    return null;
  };
  ws.ready = new Promise(r => ws.on('open', r));
  return ws;
}

(async () => {
  await sleep(900);

  // ══════════════════════════════════════════
  console.log('\n▸ XSS: 表示名のサニタイズ');
  {
    const a = client(); await a.ready;
    a.send2({ type:'start_vs_ai', name:'<img src=x onerror=alert(1)>', aiCount:1, difficulty:'normal' });
    const g = await a.waitFor('game_started');
    const me = g.state.players.find(p => !p.isAI);
    ok(!/[<>]/.test(me.name), '名前からHTML特殊文字が除去される', `→ "${me.name}"`);
    ok(me.name.length <= 16, '名前が16文字に制限される', `→ ${me.name.length}文字`);
    a.close();
  }

  // ══════════════════════════════════════════
  console.log('\n▸ 自分自身をターゲットにできない');
  {
    const a = client(); await a.ready;
    const conn = await a.waitFor('connected');
    a.send2({ type:'start_vs_ai', name:'T', aiCount:1, difficulty:'easy' });
    const g = await a.waitFor('game_started');
    const myId = conn.playerId;
    const me = g.state.players.find(p => p.id === myId);
    if (g.state.currentPlayerId === myId) {
      a.send2({ type:'draw_card' });
      const st = await a.waitFor('state_update');
      const hand = st.state.players.find(p => p.id === myId).hand;
      const targeting = hand.find(c => ['scout','warrior','kurando','spirit','sword_girl','trainee'].includes(c.id));
      if (targeting) {
        a.send2({ type:'play_card', cardUid:targeting.uid, targetId:myId, guess:'scout' });
        const err = await a.waitFor('error', 1200);
        ok(err && err.code === 'no_self_target', '自己ターゲットが拒否される', `→ ${JSON.stringify(err)}`);
      } else { console.log('  ⏭  対象カードを引かず（スキップ）'); }
    } else { console.log('  ⏭  後攻（スキップ）'); }
    a.close();
  }

  // ══════════════════════════════════════════
  console.log('\n▸ 観戦者に手札が見えない');
  {
    const a = client(), b = client(); await a.ready; await b.ready;
    a.send2({ type:'join_queue', name:'A' }); await sleep(120);
    b.send2({ type:'join_queue', name:'B' });
    await a.waitFor('game_started'); await b.waitFor('game_started');
    const roomId = (await (async()=>{ const m = a.inbox.find(x=>x.type==='matched'); return m?.roomId; })()) || null;
    const s = client(); await s.ready;
    s.send2({ type:'get_public_rooms' });
    const pr = await s.waitFor('public_rooms');
    const rid = roomId || pr.rooms[0]?.id;
    s.send2({ type:'spectate', roomId: rid, name:'S' });
    const spec = await s.waitFor('spectating');
    ok(spec && spec.state.players.every(p => p.hand === null), '観戦中は全員の手札が非公開');
    ok(spec && spec.state.players.every(p => p.handCount >= 1), '手札枚数だけは見える');
    a.close(); b.close(); s.close();
  }

  // ══════════════════════════════════════════
  console.log('\n▸ 切断時に相手へ通知が飛ぶ');
  {
    const a = client(), b = client(); await a.ready; await b.ready;
    a.send2({ type:'join_queue', name:'A' }); await sleep(120);
    b.send2({ type:'join_queue', name:'B' });
    await a.waitFor('game_started'); await b.waitFor('game_started');
    b.close();
    const notice = await a.waitFor('opponent_disconnected', 2500);
    ok(!!notice, '相手の切断が通知される', `→ ${JSON.stringify(notice)}`);
    ok(notice?.graceMs > 0, '再接続の猶予時間が通知される');
    a.close();
  }

  // ══════════════════════════════════════════
  console.log('\n▸ 再接続（token 必須）');
  {
    const a = client(), b = client(); await a.ready; await b.ready;
    const ca = await a.waitFor('connected');
    a.send2({ type:'join_queue', name:'A' }); await sleep(120);
    b.send2({ type:'join_queue', name:'B' });
    const ga = await a.waitFor('game_started'); await b.waitFor('game_started');
    const matched = a.inbox.find(x=>x.type==='matched') || { roomId:null };
    const rid = matched.roomId;
    a.close(); await sleep(200);

    // 正しくない token では復帰できない
    const imposter = client(); await imposter.ready;
    await imposter.waitFor('connected');
    imposter.send2({ type:'rejoin', playerId: ca.playerId, roomId: rid, token: 'wrong-token' });
    const rf = await imposter.waitFor('rejoin_failed', 1500);
    ok(!!rf, 'token が違うと再接続を拒否（なりすまし防止）');
    imposter.close();

    // 正しい token なら盤面が戻る
    const back = client(); await back.ready;
    await back.waitFor('connected');
    back.send2({ type:'rejoin', playerId: ca.playerId, roomId: rid, token: ca.token });
    const restored = await back.waitFor('game_started', 2000);
    ok(!!restored, '正しい token で盤面が復元される');
    ok(restored?.state.players.some(p => p.id === ca.playerId && p.hand), '自分の手札が戻っている');
    back.close(); b.close();
  }

  // ══════════════════════════════════════════
  console.log('\n▸ ゲーム中の start_game 再送でリセットされない');
  {
    const a = client(); await a.ready;
    a.send2({ type:'create_room', name:'H' });
    await a.waitFor('room_created');
    a.send2({ type:'add_ai', difficulty:'easy' });
    await a.waitFor('room_update');
    a.send2({ type:'start_game' });
    const g1 = await a.waitFor('game_started');
    a.send2({ type:'start_game' });
    const err = await a.waitFor('error', 1200);
    ok(err && err.code === 'already_started', '2回目の start_game が拒否される', `→ ${JSON.stringify(err)}`);
    a.close();
  }

  await sleep(300);
  console.log(`\n${'═'.repeat(46)}\n  合計: ${pass} passed, ${fail} failed\n${'═'.repeat(46)}`);
  srv.kill();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); srv.kill(); process.exit(1); });
