const assert=require('node:assert/strict');const create=require('../public/ui-timing.js');
let next=0;const jobs=new Map(),clock={setTimeout(fn){jobs.set(++next,fn);return next},clearTimeout(id){jobs.delete(id)}};
const ui=create(clock);let fired=0;
ui.schedule(()=>fired++,1200,'result');ui.schedule(()=>fired++,1200,'result');assert.equal(ui.size,1);const stale=[...jobs.values()][0];ui.clear();ui.schedule(()=>fired++,0,'result');stale();assert.equal(fired,0);assert.equal(ui.size,1);ui.clear();assert.equal(ui.size,0);
for(let round=0;round<1000;round++){ui.schedule(()=>fired++,780);ui.schedule(()=>fired++,2800);ui.schedule(()=>fired++,1200,'result');ui.clear();assert.equal(ui.size,0);assert.equal(jobs.size,0);}
ui.schedule(()=>fired++,0,'result');[...jobs.values()][0]();assert.equal(fired,1);assert.equal(ui.size,0);
console.log('PASS duplicate result suppression, stale callback rejection, 1000 match cleanups, normal execution');
