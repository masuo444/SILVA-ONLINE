/* ============================================================
   SILVA — ブラウザ内ローカル対戦（AI戦）
   ------------------------------------------------------------
   game-core.js をブラウザで直接動かし、WSサーバーと
   「まったく同じメッセージ」を返す偽サーバーとして振る舞う。

   → AI対戦はサーバー不要（＝運用コストが増えない・オフラインでも遊べる）
   → ルールはサーバーと同じ game-core.js なので判定がズレない

   UI側は send() の宛先が WS かこれかを意識しなくてよい。
   ============================================================ */
(function (root) {
'use strict';
const CORE = root.SILVA_CORE;

function makeLocalGame(onMessage) {
  let game = null;
  let meId = null;
  const timers = new Set();

  const post = msg => onMessage(msg);
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
  const clearAll = () => { timers.forEach(clearTimeout); timers.clear(); };

  /* エンジンが溜めた演出イベント＋最新の盤面を送る（サーバーの flush と同じ役割） */
  function flush() {
    if (!game) return;
    for (const ev of CORE.drainEvents(game)) post(ev);
    post({ type: 'state_update', state: CORE.stateFor(game, meId) });
  }

  function aiStep() {
    if (!game || game.phase === 'ended') return;
    const cur = CORE.cp(game);
    if (!cur || !cur.isAI) return;

    if (game.phase === 'draw') {
      const r = CORE.processDraw(game, cur.id);
      flush();
      if (game.phase === 'farmer_select') {
        later(() => {
          const kept = CORE.aiBest(r.farmerDraw, cur.difficulty);
          CORE.processFarmerSelect(game, cur.id, kept.uid);
          flush();
          if (game.phase !== 'ended' && CORE.cp(game).isAI) later(aiStep, 1400);
        }, 1100);
        return;
      }
      if (game.phase === 'ended') return;
      later(aiStep, 1300);
      return;
    }

    if (game.phase === 'action') {
      const action = CORE.aiChoose(game, cur, cur.difficulty);
      if (!action) { CORE.nextTurn(game); flush(); return; }
      const r = CORE.processPlay(game, cur.id, action.cardUid, action.targetId, action.guess);

      /* 自分が対象になったときだけ、当事者向けの演出を出す */
      if (r.myCard && r.theirCard && action.targetId === meId)
        post({ type: 'kurando_reveal', myCard: r.theirCard, theirCard: r.myCard });
      if (r.swapped && action.targetId === meId)
        post({ type: 'spirit_swap', newCard: r.theirNewCard });
      flush();

      if (r.waitingTarget) {
        const pending = game.pendingAction;
        const tgt = game.players.find(p => p.id === action.targetId);
        later(() => {
          const pick = CORE.aiPickDiscard(pending.type, tgt.hand, cur.difficulty);
          if (pick) CORE.processTargetDiscard(game, cur.id, pick.uid);
          flush();
          if (game.phase !== 'ended' && CORE.cp(game).isAI) later(aiStep, 1400);
        }, 1400);
        return;
      }
      if (game.phase !== 'ended' && CORE.cp(game).isAI) later(aiStep, 1500);
      return;
    }

    if (game.phase === 'waiting_target') {
      const pending = game.pendingAction;
      if (pending && pending.fromPlayerId === cur.id) {
        const tgt = game.players.find(p => p.id === pending.targetId);
        later(() => {
          const pick = CORE.aiPickDiscard(pending.type, tgt.hand, cur.difficulty);
          if (pick) CORE.processTargetDiscard(game, cur.id, pick.uid);
          flush();
          if (game.phase !== 'ended' && CORE.cp(game).isAI) later(aiStep, 1400);
        }, 1400);
      }
    }
  }

  /* AIの手番なら進める */
  function pumpAI(delay) {
    if (game && game.phase !== 'ended' && CORE.cp(game) && CORE.cp(game).isAI) later(aiStep, delay || 1200);
  }

  return {
    isLocal: true,
    get active() { return !!game; },
    stop() { clearAll(); game = null; },

    /* WSと同じメッセージ形式を受ける */
    send(msg) {
      const fail = code => post({ type: 'error', code });

      if (msg.type === 'start_vs_ai') {
        clearAll();
        meId = 'me';
        const diff = ['easy','normal','hard'].indexOf(msg.difficulty) !== -1 ? msg.difficulty : 'normal';
        const count = Math.min(Math.max(Number(msg.aiCount) || 1, 1), 3);
        const players = [{ id: meId, name: msg.name, isAI: false }];
        for (let i = 0; i < count; i++)
          /* 複数AIが同名だとログが読めなくなるので、2体以上のときだけ番号を振る */
          players.push({ id: 'ai' + i, name: '#AI:' + diff + (count > 1 ? ':' + (i + 1) : ''), isAI: true, difficulty: diff });
        game = CORE.createGame(players);
        CORE.addLog(game, 'game_start', { name: CORE.cp(game).name });
        CORE.drainEvents(game);
        post({ type: 'game_started', local: true, state: CORE.stateFor(game, meId) });
        pumpAI(1400);
        return;
      }

      if (msg.type === 'rematch') {
        if (!game) return;
        clearAll();
        const players = game.players.map(p => ({ id: p.id, name: p.name, isAI: p.isAI, difficulty: p.difficulty }));
        game = CORE.createGame(players);
        CORE.addLog(game, 'rematch_start', { name: CORE.cp(game).name });
        CORE.drainEvents(game);
        post({ type: 'game_started', local: true, state: CORE.stateFor(game, meId) });
        pumpAI(1400);
        return;
      }

      if (!game) return;

      switch (msg.type) {
        case 'draw_card': {
          const r = CORE.processDraw(game, meId);
          if (r.error) return fail(r.error);
          if (r.farmerDraw) post({ type: 'farmer_draw', cards: r.farmerDraw });
          flush();
          return;
        }
        case 'farmer_select': {
          const r = CORE.processFarmerSelect(game, meId, msg.keepCardUid);
          if (r.error) return fail(r.error);
          flush(); pumpAI();
          return;
        }
        case 'play_card': {
          const r = CORE.processPlay(game, meId, msg.cardUid, msg.targetId, msg.guess);
          if (r.error) return fail(r.error);
          if (r.needTarget) { post({ type: 'need_target', cardUid: r.cardUid, effect: r.effect, requiresGuess: r.requiresGuess }); return; }
          if (r.peekedCard) post({ type: 'peek_result', card: r.peekedCard });
          if (r.myCard && r.theirCard) post({ type: 'kurando_reveal', myCard: r.myCard, theirCard: r.theirCard });
          flush();
          if (r.waitingTarget) return;   // 捨てる札を選ぶのは自分
          pumpAI();
          return;
        }
        case 'target_discard': {
          const r = CORE.processTargetDiscard(game, meId, msg.cardUid);
          if (r.error) return fail(r.error);
          flush(); pumpAI();
          return;
        }
      }
    },
  };
}

root.SILVA_LOCAL = { makeLocalGame };
})(typeof self !== 'undefined' ? self : this);
