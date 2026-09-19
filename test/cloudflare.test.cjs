const assert = require('node:assert/strict');
const WebSocket = require('ws');
const { randomUUID } = require('node:crypto');
const BASE = process.env.SILVA_TEST_URL || 'http://127.0.0.1:8787';
const WS = BASE.replace(/^http/, 'ws');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const all = [];
let passed = 0;
function ok(value, label) { assert(value, label); console.log('PASS', label); passed++; }
async function client(route = '/api/lobby') {
  const c = { ws: new WebSocket(WS + route, { origin: BASE }), messages: [], state: null };
  all.push(c);
  c.ws.on('message', raw => { const m = JSON.parse(raw); c.messages.push(m); if (m.type === 'connected' || m.type === 'rejoined') { c.id = m.playerId; c.token = m.token; } if (m.state) c.state = m.state; });
  c.wait = async (type, after = 0) => { for(let i=0;i<150;i++){const m=c.messages.slice(after).find(m=>m.type===type);if(m)return m;await sleep(40);}throw new Error('Timeout '+type+' '+JSON.stringify(c.messages.slice(-3))); };
  c.send = m => c.ws.send(JSON.stringify(m));
  c.move = m => c.send({ ...m, actionId: randomUUID(), revision: c.state.revision });
  await c.wait('connected');
  return c;
}
async function enter(action) {
  const lobby = await client();lobby.send(action);const transfer=await lobby.wait('transfer');lobby.ws.close();
  const c=await client('/api/rooms/'+transfer.roomId);c.room=transfer.roomId;c.send(transfer.action);await c.wait(action.type==='create_room'?'room_created':'room_joined');return c;
}
async function drive(clients, timeout = 60_000) {
  const start=Date.now();
  while(Date.now()-start<timeout){
    const final=clients.find(c=>c.state?.phase==='ended');if(final)return final.state;
    for(const c of clients){const s=c.state;if(!s||s.phase==='ended')continue;const me=s.players.find(p=>p.id===c.id);if(!me?.alive)continue;
      if(s.phase==='waiting_target'&&s.pendingAction?.fromPlayerId===c.id){const target=s.players.find(p=>p.id===s.pendingAction.targetId);c.move({type:'target_discard',cardUid:target.hand[0].uid});}
      else if(s.currentPlayerId===c.id){
        if(s.phase==='draw')c.move({type:'draw_card'});
        else if(s.phase==='farmer_select'){const msg=[...c.messages].reverse().find(m=>m.type==='farmer_draw');assert(msg);c.move({type:'farmer_select',keepCardUid:msg.cards[0].uid});}
        else if(s.phase==='action'){const card=me.hand.find(x=>x.id!=='kukuochi');const target=s.players.find(p=>p.id!==c.id&&p.alive);c.move({type:'play_card',cardUid:card.uid,targetId:target?.id,guess:'scout'});}
      }
    }
    await sleep(100);
  }
  throw new Error('Game did not finish');
}
(async()=>{
  const response=await fetch(BASE);ok(response.ok,'static lobby served');const html=await response.text();ok(!html.includes('__ORIGIN__'),'origin replaced');ok(html.includes('experience.css'),'new interface served');
  const a=await enter({type:'create_room',name:'Aoi'}),b=await enter({type:'join_room',name:'Ben',roomId:a.room});
  ok(a.room===b.room,'invite code connects two clients');
  let before=b.messages.length;b.send({type:'start_game'});ok((await b.wait('error',before)).code==='host_only','guest cannot start');
  a.send({type:'start_game'});await a.wait('game_started');await b.wait('game_started');
  ok(a.state.players.find(p=>p.id===b.id).hand===null,'opponent hand stays private');
  const initial=a.state.revision;const act={type:'draw_card',actionId:randomUUID(),revision:initial};a.send(act);a.send(act);await sleep(150);
  ok(a.state.revision===initial+1,'duplicate action changes state once');
  before=a.messages.length;a.send({type:'rematch'});await sleep(100);ok(a.state.revision===initial+1,'rematch cannot reset active game');
  const fake=await client('/api/rooms/'+a.room);fake.send({type:'rejoin',roomId:a.room,playerId:a.id,token:'wrong'});await fake.wait('rejoin_failed');ok(!fake.state,'rejoin token prevents impersonation');fake.ws.close();
  const previousId=b.id,secret=b.token,previousRevision=b.state.revision;b.ws.close();await a.wait('opponent_disconnected');
  const restored=await client('/api/rooms/'+a.room);restored.room=a.room;restored.send({type:'rejoin',roomId:a.room,playerId:previousId,token:secret});await restored.wait('rejoined');await restored.wait('game_started');
  ok(restored.id===previousId&&restored.state.revision===previousRevision,'reconnection restores seat and exact board');
  const final=await drive([a,restored]);ok(final.phase==='ended','online match reaches a result');ok(final.players.every(p=>p.hand!==null),'hands revealed at end');
  const endRevision=a.state.revision;a.send({type:'rematch'});await sleep(100);ok(a.state.phase==='ended','rematch waits for all players');restored.send({type:'rematch'});await sleep(180);ok(a.state.phase!=='ended'&&a.state.revision>endRevision,'unanimous rematch starts a new game');
  a.send({type:'leave_room'});restored.send({type:'leave_room'});a.ws.close();restored.ws.close();
  const ai=await enter({type:'create_room',name:'Human'});ai.send({type:'add_ai',difficulty:'normal'});await sleep(100);ai.send({type:'start_game'});await ai.wait('game_started');await drive([ai]);ok(ai.state.phase==='ended','Durable Object alarm advances AI turns to completion');ai.send({type:'leave_room'});ai.ws.close();
  const q1=await client(),q2=await client();q1.send({type:'join_queue',name:'Queue A'});await q1.wait('queue_joined');q2.send({type:'join_queue',name:'Queue B'});const t1=await q1.wait('transfer'),t2=await q2.wait('transfer');ok(t1.roomId===t2.roomId,'matchmaking allocates a shared room');
  const m1=await client('/api/rooms/'+t1.roomId),m2=await client('/api/rooms/'+t2.roomId);m1.send(t1.action);m2.send(t2.action);await m1.wait('game_started');await m2.wait('game_started');
  const watcher=await client('/api/rooms/'+t1.roomId);watcher.send({type:'spectate'});await watcher.wait('spectating');ok(watcher.state.players.every(p=>p.hand===null),'spectator cannot see secret cards');
  const watchRevision=watcher.state.revision;watcher.move({type:'draw_card'});await sleep(80);ok(watcher.state.revision===watchRevision,'spectator cannot play');
  await drive([m1,m2]);ok(m1.state.phase==='ended'||m2.state.phase==='ended','matched game completes');
  const four=[await enter({type:'create_room',name:'Four A'})];
  for(const name of ['Four B','Four C','Four D'])four.push(await enter({type:'join_room',roomId:four[0].room,name}));
  four[0].send({type:'start_game'});for(const c of four)await c.wait('game_started');
  ok(four.every(c=>c.state.players.length===4),'four player room starts on every client');
  const fourResult=await drive(four);ok(fourResult.phase==='ended','four player game finishes with shared rules');
  console.log(`\n${passed} checks passed`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{for(const c of all)c.ws.terminate();});
