/* Accessibility and presentation enhancements, independent of the rule engine. */
(function(){
  'use strict';
  document.body.dataset.screen='lobby';
  document.getElementById('actionBar').after(document.getElementById('cardPop'));
  const help=document.getElementById('rulebotFab');if(help){help.textContent='?';help.setAttribute('aria-label','カードとルールの相談');help.title='カードとルール';}
  function language(){
    document.querySelectorAll('[data-ja][data-en]').forEach(el=>el.textContent=el.dataset[LANG==='en'?'en':'ja']);
    document.documentElement.lang=LANG;
    document.querySelectorAll('.field').forEach(field=>{const input=field.querySelector('input,select');const label=field.querySelector('label');if(input&&label)label.htmlFor=input.id;});
    const motion=document.getElementById('motionToggle');if(motion){motion.title=LANG==='ja'?'動きを控えめにする':'Reduce motion';motion.setAttribute('aria-label',motion.title);}
    const sound=document.getElementById('soundToggle');if(sound){sound.title=LANG==='ja'?'効果音のオン・オフ':'Toggle sound';sound.setAttribute('aria-label',sound.title);}
  }
  window.addEventListener('silva:language',language);
  document.addEventListener('DOMContentLoaded',language);language();
  const tools=document.createElement('div');tools.className='experience-tools';
  tools.innerHTML='<button id="soundToggle" aria-pressed="false">♪</button><button id="motionToggle" aria-pressed="false">◐</button>';
  document.body.appendChild(tools);
  let soundOn=localStorage.getItem('silva_sound')==='1';
  let reduced=localStorage.getItem('silva_motion')==='reduced'||matchMedia('(prefers-reduced-motion:reduce)').matches;
  let audio;
  function settings(){document.body.classList.toggle('reduced-motion',reduced);document.getElementById('motionToggle').setAttribute('aria-pressed',String(reduced));document.getElementById('soundToggle').setAttribute('aria-pressed',String(soundOn));document.getElementById('soundToggle').style.opacity=soundOn?'1':'.45';language();}
  function chime(){if(!soundOn)return;try{audio ||= new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')void audio.resume();const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(660,audio.currentTime);oscillator.frequency.exponentialRampToValueAtTime(440,audio.currentTime+.09);gain.gain.setValueAtTime(.025,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.15);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+.16);}catch{}}
  document.getElementById('soundToggle').onclick=()=>{soundOn=!soundOn;localStorage.setItem('silva_sound',soundOn?'1':'0');settings();chime();};
  document.getElementById('motionToggle').onclick=()=>{reduced=!reduced;localStorage.setItem('silva_motion',reduced?'reduced':'full');settings();};
  settings();
  document.addEventListener('click',e=>{if(e.target.closest('button,.card[role=button]'))chime();});
  document.addEventListener('keydown',e=>{
    if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role=button]:not(button)')){e.preventDefault();e.target.click();}
    if(e.key==='Escape'){
      const overlays=[...document.querySelectorAll('.overlay.show')];
      for(const overlay of overlays){if(['ovGuide','ovRuleBot','ovPeek','ovKurando'].includes(overlay.id))closeOv(overlay.id);}
      if(typeof selectedUid!=='undefined'&&selectedUid){selectedUid=null;pendingCardUid=null;hideCardPop();renderGame();}
    }
    if(e.key==='Tab'){
      const modal=[...document.querySelectorAll('.overlay.show')].at(-1);if(!modal)return;
      const controls=[...modal.querySelectorAll('button,input,select,a[href],[tabindex="0"]')].filter(el=>el.offsetParent!==null&&!el.disabled);
      if(!controls.length)return;
      const first=controls[0],last=controls.at(-1);
      if(e.shiftKey&&(document.activeElement===first||!modal.contains(document.activeElement))){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&(document.activeElement===last||!modal.contains(document.activeElement))){e.preventDefault();first.focus();}
    }
  });
  let previousFocus;
  const observer=new MutationObserver(records=>{
    for(const record of records){const el=record.target;if(!el.matches('.overlay'))continue;if(el.classList.contains('show')){previousFocus=document.activeElement;el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');const title=el.querySelector('.m-title,.rulebot-title,.win-title');if(title){title.id ||= el.id+'Title';el.setAttribute('aria-labelledby',title.id);}else el.setAttribute('aria-label',LANG==='ja'?'カードの効果':'Card effect');el.querySelector('button,input')?.focus({preventScroll:true});}else if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}
  });
  document.querySelectorAll('.overlay').forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['class']}));
  window.addEventListener('silva:screen',e=>{
    if(e.detail.startsWith('panel'))requestAnimationFrame(()=>document.querySelector('#'+e.detail+' input:not([type=hidden]), #'+e.detail+' select')?.focus({preventScroll:true}));
    if(e.detail==='lobby')document.getElementById('netBanner')?.classList.add('hidden');
  });
  // Restore a saved seat only after an explicit online session existed.
  if(loadSession())connect();
})();
function leaveSilva(){
  if(!confirm(LANG==='ja'?'対局を退出しますか？':'Leave this game?'))return;
  if(!isLocalMode())socketSend({type:'leave_room'});
  _onlineWanted=false;_intentionalClose=true;_connectionReady=false;clearTimeout(_reconnectTimer);clearInterval(_heartbeatTimer);_connectCallbacks=[];
  if(ws){ws.onclose=null;ws.onmessage=null;ws.close();ws=null;}
  stopLocalGame();clearSession();myRoomId=null;myToken=null;gameState=null;isSpectator=false;
  document.querySelectorAll('.overlay.show').forEach(el=>el.classList.remove('show'));hideCardPop();goScreen('lobby');
}

/* One public action at a time; never reveal information outside the server log. */
(function(){
  const strip=document.createElement('div');strip.id='lastMove';strip.hidden=true;
  strip.setAttribute('role','status');strip.setAttribute('aria-live','polite');
  document.getElementById('actionBar').after(strip);
  let lastSignature='';
  function updateBoard(){
    const log=gameState?.log||[];
    const ignored=new Set(['reveal_hand','winner','draw_game','deck_empty']);
    const event=log.find(l=>!ignored.has(l.k));
    const signature=JSON.stringify(event);
    if(!event){strip.hidden=true;lastSignature='';return;}
    strip.hidden=false;
    const sentence=I18.logLine(event);
    if(strip.textContent!==sentence)strip.textContent=sentence;
    if(signature!==lastSignature){
      lastSignature=signature;
      if(!document.body.classList.contains('reduced-motion')&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
        strip.animate([{opacity:.3,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:220});
        document.querySelectorAll('.pzone').forEach(zone=>{
          const player=gameState.players.find(p=>p.id===zone.dataset.pid);
          if(player&&(player.name===event.name||player.name===event.target))zone.animate([{boxShadow:'0 0 0 2px #d8ce94'},{boxShadow:'0 0 0 2px transparent'}],{duration:650});
        });
      }
    }
  }
  window.addEventListener('silva:board',updateBoard);
  window.addEventListener('silva:language',()=>{if(gameState)updateBoard();});
  // Secondary result information stays available without crowding out rematch.
  const recap=document.querySelector('.win-recap');
  const details=document.createElement('details');details.id='resultDetails';
  const summary=document.createElement('summary');summary.dataset.ja='対局を振り返る';summary.dataset.en='Review this match';summary.textContent=LANG==='ja'?summary.dataset.ja:summary.dataset.en;
  details.append(summary);recap.before(details);details.append(recap);
  const actions=document.querySelector('.win-actions');details.before(actions);
  details.append(document.getElementById('shareResultBtn'));
  const targetObserver=new MutationObserver(()=>{
    const choosing=!!document.querySelector('.zone-tgt-wrap');
    document.querySelectorAll('.pzone').forEach(zone=>{
      const player=gameState?.players.find(p=>p.id===zone.dataset.pid);
      zone.classList.toggle('available-target',choosing&&!!player?.alive&&player.id!==myId);
    });
  });
  targetObserver.observe(document.getElementById('playersCol'),{childList:true,subtree:true});
})();
