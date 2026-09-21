const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),CORE=require('../public/game-core.js');
const html=fs.readFileSync('public/index.html','utf8');
function section(start,end){return html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start)));}
const functions=section('function renderTgtBtns(','function selectCard(')+section('function playCardWithFX(','/* ═══════════════════════════════════\n   OVERLAYS');
for(const asyncReply of [false,true]){
 const nodes={};function element(){return{children:[],appendChild(e){this.children.push(e)},set innerHTML(v){this.children=[]},set textContent(v){this.text=v}};}
 nodes.aHint=element();nodes.aBtns=element();const mine=element();
 const game=CORE.createGame([{id:'p',name:'Player'},{id:'q',name:'Opponent'}]);game.phase='action';game.currentPlayerIndex=0;game.deck=[CORE.mkCard('scout'),CORE.mkCard('warrior')];game.players[0].hand=[CORE.mkCard('trainee'),CORE.mkCard('boy')];game.players[1].hand=[CORE.mkCard('farmer')];
 let sent=[],reply=[];
 const ctx={gameState:game,myId:'p',selectedUid:game.players[0].hand[0].uid,pendingCardUid:null,pendingEffect:null,pendingGuess:false,_guessTarget:null,ALL_CARDS:CORE.CARDS,document:{getElementById:id=>nodes[id],querySelectorAll:()=>[],querySelector:()=>mine,createElement:element},esc:s=>s,dn:s=>s,N:n=>n,cardName:s=>s,cardImg:n=>n,t:s=>s,hideCardPop(){},renderGame(){},send(m){sent.push(m);const result=CORE.processPlay(game,'p',m.cardUid,m.targetId,m.guess);assert(!result.error);const apply=()=>{if(result.needTarget){ctx.pendingCardUid=result.cardUid;ctx.pendingGuess=result.requiresGuess;ctx.renderGuessFlow();}};if(asyncReply)reply.push(apply);else apply();}};
 vm.createContext(ctx);vm.runInContext(functions,ctx);
 ctx.renderTgtBtns(false);mine.children.at(-1).children[1].children[0].onclick();
 assert.equal(sent.length,0,'Do not submit incomplete trainee action');assert(ctx.pendingCardUid);assert.equal(ctx._guessTarget,'q');assert.equal(nodes.aBtns.children.length,11);
 nodes.aBtns.children[0].onclick();reply.forEach(fn=>fn());
 assert.equal(sent.length,1);assert.equal(sent[0].guess,'boy');assert.equal(sent[0].targetId,'q');assert.equal(game.currentPlayerIndex,1);assert.equal(game.phase,'draw');assert.equal(ctx.pendingCardUid,null);
 console.log('PASS target → prediction → play → next turn ('+(asyncReply?'async online':'synchronous AI')+')');
}
