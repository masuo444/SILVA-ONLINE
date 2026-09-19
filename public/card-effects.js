/* Small SVG effects, anchored to the acting player and never intercepting input. */
(function(){
  'use strict';
  const art={
    kukuochi_young:'<path class="grow" d="M100 155V90M100 115C58 119 49 79 58 66C86 65 102 83 100 115ZM100 98C111 64 140 62 150 67C147 94 125 108 100 98Z"/>',
    boy:'<path class="bolt" d="M110 24L61 107H96L82 177L145 87H108Z"/><circle class="wave" cx="100" cy="100" r="57"/>',
    trainee:'<g class="aim"><circle cx="100" cy="100" r="46"/><circle cx="100" cy="100" r="22"/><path d="M100 27V65M100 135V173M27 100H65M135 100H173"/></g><circle class="impact" cx="100" cy="100" r="8"/>',
    scout:'<path class="eye" d="M25 100Q100 24 175 100Q100 176 25 100Z"/><circle class="eye" cx="100" cy="100" r="26"/><path class="scan" d="M30 100H170"/>',
    warrior:'<path class="blade blade-a" d="M42 38L142 138M120 151L155 116M136 142L157 164"/><path class="blade blade-b" d="M158 38L58 138M45 116L80 151M64 142L43 164"/><circle class="wave" cx="100" cy="105" r="48"/>',
    kurando:'<g class="duel-left"><rect x="33" y="62" width="50" height="76" rx="6"/><path d="M43 100H73"/></g><g class="duel-right"><rect x="117" y="62" width="50" height="76" rx="6"/><path d="M127 100H157"/></g><path class="impact" d="M100 48V152"/>',
    masu_craftsman:'<path class="shield" d="M100 30L154 52V100Q149 145 100 173Q51 145 46 100V52Z"/><path class="shield" d="M75 98L93 116L129 77"/><circle class="wave" cx="100" cy="100" r="74"/>',
    farmer:'<g class="grow"><path d="M100 172V45M99 81Q58 78 63 48Q91 47 99 81ZM101 103Q139 94 139 65Q108 66 101 103ZM99 127Q57 121 58 94Q87 92 99 127ZM101 149Q141 138 140 114Q111 113 101 149Z"/></g>',
    spirit:'<path class="exchange exchange-a" d="M36 84Q100 23 161 84L139 80M161 84L158 61"/><path class="exchange exchange-b" d="M164 116Q100 177 39 116L61 120M39 116L42 139"/><g class="orbit"><rect x="50" y="77" width="29" height="45" rx="4"/><rect x="121" y="77" width="29" height="45" rx="4"/></g>',
    sword_girl:'<path class="slash slash-a" d="M28 174L176 26"/><path class="slash slash-b" d="M54 184L184 54"/>',
    kukuochi:'<g class="grow"><path d="M100 180V56M100 115L61 82M100 96L136 60M100 148L145 117M100 153L55 126M100 172L75 187M100 172L125 187"/><circle cx="100" cy="62" r="38"/><circle cx="63" cy="93" r="28"/><circle cx="136" cy="94" r="28"/></g><circle class="wave" cx="100" cy="105" r="78"/>'
  };
  const colors={boy:'#e8d78b',trainee:'#edbc85',scout:'#9edbd5',warrior:'#e5be9d',kurando:'#d4b8e3',masu_craftsman:'#dfd29b',farmer:'#c2d98e',spirit:'#a3d9ea',sword_girl:'#f1ead5',kukuochi:'#a9d6a0',kukuochi_young:'#b1dda1'};
  const recent=new Map();const active=new Set();
  function clear(){for(const node of active)node.remove();active.clear();recent.clear();}
  window.SILVA_CARD_FX={play(id,el,options={}){
    if(!art[id]||!el||document.hidden)return;
    const key=id+':'+(el.dataset.pid||'')+':'+String(options.hit)+':'+!!options.noEffect;
    const now=performance.now();if(now-(recent.get(key)||-10000)<850)return;recent.set(key,now);
    const rect=el.getBoundingClientRect();if(rect.bottom<0||rect.top>innerHeight)return;
    if(active.size>=3){const oldest=active.values().next().value;oldest.remove();active.delete(oldest);}
    const size=Math.min(innerWidth<600?148:190,innerWidth-24);
    const node=document.createElement('div');node.className='card-effect';node.dataset.effect=id;node.setAttribute('aria-hidden','true');
    node.style.cssText=`--fx-color:${colors[id]};width:${size}px;height:${size}px;left:${Math.max(12,Math.min(innerWidth-size-12,rect.left+rect.width/2-size/2))}px;top:${Math.max(12,Math.min(innerHeight-size-12,rect.top+rect.height/2-size/2))}px`;
    const quiet=document.body.classList.contains('reduced-motion')||matchMedia('(prefers-reduced-motion:reduce)').matches;
    if(quiet)node.classList.add('fx-quiet');
    if(options.hit===false)node.classList.add('fx-miss');
    if(options.noEffect)node.classList.add('fx-no-effect');
    const body=options.noEffect?'<circle cx="100" cy="100" r="48"/><path d="M76 100H124"/>':art[id];
    node.innerHTML='<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'+body+'</svg>';
    document.body.append(node);active.add(node);setTimeout(()=>{node.remove();active.delete(node);},quiet?400:900);
  },clear};
  window.addEventListener('silva:screen',e=>{if(e.detail!=='game')clear();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
})();
