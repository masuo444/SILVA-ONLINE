# SILVA — 心理戦カードゲーム

手札はたった1枚。相手の手札を読み、生き残れ。
FOMUS × KUKU PROJECT

Public: https://silva-online.fomus.jp
Preview: https://silva-online-next.pages.dev

## Run

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:8787. See [DEPLOY.md](DEPLOY.md) for release, tests and rollback.

## Structure

- `public/game-core.js`: shared rules; browser AI and server use the same engine.
- `public/index.html`: lobby, table, effects and protocol client.
- `public/experience.css`, `public/experience.js`: responsive forest identity and accessibility.
- `public/local-game.js`: offline solo AI.
- `public/i18n.js`: Japanese/English text.
- `worker/index.js`: persisted rooms, WebSockets, reconnects and matchmaking.
- `wrangler.jsonc`: Worker + Durable Object bindings.
- `pages/`: same-origin Pages Functions gateway and service binding.
- `scripts/build-pages.mjs`: builds `dist/` (generated, not tracked).
- `test/`: rule, protocol, Cloudflare and browser tests.
- `server.js`: retained legacy Node server for compatibility/regression testing.

Card rule changes must update the shared engine, Japanese/English rule explanations and rule tests together. Client releases must bump the service worker cache and shared asset versions together.
