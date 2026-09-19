const vm=require('node:vm');const fs=require('node:fs');const assert=require('node:assert/strict');
let now=1000,quiet=false;const nodes=[],timers=[];const listeners={};
const context={window:{addEventListener:(k,fn)=>listeners[k]=fn},document:{hidden:false,body:{classList:{contains:()=>quiet},append:n=>nodes.push(n)},createElement:()=>({dataset:{},style:{},classList:{items:[],add(x){this.items.push(x)}},setAttribute(){},remove(){this.removed=true}}),addEventListener:(k,fn)=>listeners[k]=fn},innerWidth:390,innerHeight:844,performance:{now:()=>now},matchMedia:()=>({matches:false}),setTimeout:fn=>timers.push(fn)};
vm.runInNewContext(fs.readFileSync('public/card-effects.js','utf8'),context);
const fx=context.window.SILVA_CARD_FX,el={dataset:{pid:'p1'},getBoundingClientRect:()=>({left:0,top:100,width:390,height:200,bottom:300})};
const ids=require('../public/game-core.js').CARDS.map(c=>c.id);const shapes=new Set();
for(const id of ids){now+=1000;fx.play(id,el);shapes.add(nodes.at(-1).innerHTML);assert.equal(nodes.at(-1).dataset.effect,id);}
assert.equal(shapes.size,11);assert(nodes.filter(n=>!n.removed).length<=3);
now+=1000;fx.play('scout',el);const count=nodes.length;fx.play('scout',el);assert.equal(nodes.length,count);
now+=1000;fx.play('masu_craftsman',el,{noEffect:true});assert(nodes.at(-1).classList.items.includes('fx-no-effect'));assert(!nodes.at(-1).innerHTML.includes('shield'));
quiet=true;now+=1000;fx.play('farmer',el);assert(nodes.at(-1).classList.items.includes('fx-quiet'));
now+=1500;quiet=false;fx.play('spirit',el,{target:{getBoundingClientRect:()=>({left:0,top:450,width:390,height:180,bottom:630})}});assert(nodes.at(-1).innerHTML.includes('fx-return'));assert(nodes.at(-1).style.cssText.includes('--ty:540px'));
fx.clear();assert(nodes.every(n=>n.removed));
console.log('PASS 11 distinct effects, repeat suppression, effectless state, reduced motion, bounded layers and cleanup');
const core=require('../public/game-core.js');
const game=core.createGame([{id:'a',name:'A'},{id:'b',name:'B'}]);game.phase='action';game.currentPlayerIndex=0;game.players[0].hand=[core.mkCard('scout'),core.mkCard('boy')];
core.drainEvents(game);core.processPlay(game,'a',game.players[0].hand[0].uid,'b');
const played=core.drainEvents(game).find(e=>e.type==='card_played');assert.equal(played.targetId,'b');assert.equal(played.cardId,'scout');assert(!('hand' in played));
console.log('PASS effect event identifies the actual target without exposing hands');
