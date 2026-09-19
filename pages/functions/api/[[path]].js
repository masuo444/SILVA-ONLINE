// Same-origin WebSocket gateway. The live game state is in the bound Worker.
export function onRequest(context) {
  return context.env.GAME.fetch(context.request);
}
