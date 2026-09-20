/* Presentation callbacks belong to the current match, not the next one. */
(function(root){
  function create(clock){
    const pending=new Map();let epoch=0,serial=0;
    return {
      schedule(fn,delay,key){
        key=key||'task-'+(++serial);
        if(pending.has(key))return;
        const generation=epoch;
        const timer=clock.setTimeout(()=>{if(generation!==epoch)return;pending.delete(key);fn();},delay);
        pending.set(key,timer);
      },
      cancel(key){if(pending.has(key)){clock.clearTimeout(pending.get(key));pending.delete(key);}},
      clear(){epoch++;for(const timer of pending.values())clock.clearTimeout(timer);pending.clear();},
      get size(){return pending.size;}
    };
  }
  if(typeof module==='object'&&module.exports)module.exports=create;
  else root.SILVA_UI_TIMING=create(root);
})(typeof window==='undefined'?globalThis:window);
