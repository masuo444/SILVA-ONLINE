const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const path = require('node:path');
const BASE=process.env.SILVA_TEST_URL||'http://127.0.0.1:8787';
const OUT=process.env.SILVA_SCREENSHOT_DIR||path.resolve('../../outputs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const errors=[];
  const c1=await browser.newContext({locale:'ja-JP',viewport:{width:390,height:844}}),c2=await browser.newContext({locale:'ja-JP',viewport:{width:1440,height:1000}});
  const a=await c1.newPage(),b=await c2.newPage();for(const p of[a,b])p.on('pageerror',e=>errors.push(e.message));
  await Promise.all([a.goto(BASE),b.goto(BASE)]);await a.waitForTimeout(700);
  for(const width of[360,390,768,1440]){await a.setViewportSize({width,height:844});assert(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal scroll '+width);}
  await a.setViewportSize({width:390,height:844});await a.screenshot({path:path.join(OUT,'silva-mobile.png'),fullPage:true});await b.screenshot({path:path.join(OUT,'silva-desktop.png'),fullPage:true});
  await b.getByRole('button',{name:'English',exact:true}).click();await b.waitForTimeout(100);assert(await b.locator('.solo-tile').innerText().then(t=>t.includes('Play solo')));await b.getByRole('button',{name:'日本語',exact:true}).click();await b.waitForTimeout(100);assert(await b.locator('.solo-tile').innerText().then(t=>t.includes('ひとりで遊ぶ')));console.log('PASS language round-trip');
  await a.locator('.friends-tile').click();await a.locator('#waiting.active').waitFor();const id=(await a.locator('#roomIdTxt').textContent()).trim();
  await b.locator('.join-tile').click();await b.locator('#joinId').fill(id);await b.locator('#panelJoin .btn.filled').click();await b.locator('#waiting.active').waitFor();await a.locator('#startBtn:not([disabled])').waitFor();await a.locator('#startBtn').click();await Promise.all([a.locator('#game.active').waitFor(),b.locator('#game.active').waitFor()]);
  await a.locator('.draw-btn').click();await a.locator('.pz-mine .card[role=button]').first().waitFor();await a.screenshot({path:path.join(OUT,'silva-game-mobile.png'),fullPage:true});console.log('PASS real UI create, join, start, draw');
  const saved=await a.evaluate(()=>({id:myId,room:myRoomId,revision:gameState.revision}));await a.reload();await a.waitForFunction(()=>typeof gameState!=='undefined'&&gameState&&gameState.phase==='action');const restored=await a.evaluate(()=>({id:myId,room:myRoomId,revision:gameState.revision}));assert.deepEqual(restored,saved);console.log('PASS browser reload restores game');
  await a.locator('.pz-mine .card[role=button]').first().focus();await a.keyboard.press('Enter');assert(await a.locator('#cardPop').isVisible());console.log('PASS keyboard selection and card rules');
  await a.screenshot({path:path.join(OUT,'silva-card-detail.png'),fullPage:true});
  // Local play never opens an online socket, and works from the installed offline cache.
  const c3=await browser.newContext({locale:'ja-JP',viewport:{width:390,height:844}});const solo=await c3.newPage();solo.on('pageerror',e=>errors.push(e.message));let sockets=0;solo.on('websocket',()=>sockets++);await solo.goto(BASE);await solo.evaluate(()=>navigator.serviceWorker.ready);await solo.waitForTimeout(1500);await c3.setOffline(true);await solo.reload();await solo.locator('.solo-tile').click();await solo.locator('#game.active').waitFor();await solo.locator('.draw-btn').click();await solo.locator('.pz-mine .card[role=button]').first().waitFor();assert.equal(sockets,0);console.log('PASS offline AI play without network');
  assert.deepEqual(errors,[]);console.log('PASS no browser runtime errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
