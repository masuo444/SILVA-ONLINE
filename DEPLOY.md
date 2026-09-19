# SILVA — Cloudflare deployment

## Production architecture

- Public URL: https://silva-online.fomus.jp
- Static client: Cloudflare Pages project `silva-online-next`
- Same-origin `/api/*` WebSocket requests: Pages Function → `GAME` service binding → Worker `silva-online-next`
- Worker: one SQLite-backed `GameRoom` Durable Object per room. `Lobby` only coordinates entrances/matchmaking, never ongoing games.
- AI solo play: browser-local, with service-worker offline caching. No Render dependency.
- DNS stays at Xserver. Only `silva-online.fomus.jp` CNAME points to `silva-online-next.pages.dev` (TTL 3600). Other domains/mail are unaffected.

## Development and validation

```sh
npm ci
npm run dev
# http://127.0.0.1:8787
npm test                 # existing rule and legacy protocol regression tests
npm run test:cloudflare   # run while the local Worker is listening
npm run test:browser     # Chrome installed; SILVA_SCREENSHOT_DIR can override output path
npm run check:worker
npm run types
```

`npm start` is the retained legacy Node server; use `npm run dev` for the new Cloudflare architecture.

The browser test defaults to `../../outputs`, relative to the checkout. Set `SILVA_SCREENSHOT_DIR` to an existing directory for other checkouts.

## Release

1. Run regression and Cloudflare tests. Validate phone/desktop layouts and both languages.
2. If client code changes, bump shared `?v=` in index/rules, `ASSET_VER`, experience asset versions and `CACHE_NAME` in `public/sw.js` together.
3. Deploy the Worker first:
   ```sh
   npm run deploy
   ```
4. Build Pages assets with the production canonical URL:
   ```sh
   ORIGIN=https://silva-online.fomus.jp npm run build:pages
   ```
5. Deploy the same-origin frontend gateway:
   ```sh
   npm run deploy:pages
   ```
6. Validate https://silva-online-next.pages.dev and the production URL. The custom domain is registered on the Pages project. Pages' `GAME` binding must point to the Worker.

Wrangler 4.135 delegates *new* `pages project create` commands to Workers unless `--force` is specified. This Pages project already exists; ordinary `pages deploy` now targets it directly. Pages is intentional here because the custom subdomain uses externally managed DNS.

## State, recovery and privacy

- State is stored before messages are broadcast. SQL persists room state, player secrets, revisions, retry IDs, AI deadlines and disconnect deadlines.
- Hibernation-compatible WebSockets; durable alarms advance online AI and enforce disconnect grace.
- A disconnected player has 120 seconds to rejoin with the original per-seat secret. Reload uses sessionStorage; closing the browser tab can discard this browser-managed session.
- Inactive rooms expire after 30 minutes. This is recovery storage, not a permanent match archive.
- A completed game can restart only after all human seats agree. Mid-game rematch requests are ignored.
- Opponents/spectators receive filtered state; full hands are revealed only after completion. Private friend rooms do not allow spectators.
- Action ID + state revision prevents retry/double-click moves from advancing the game twice.
- Reduced-motion and optional synthesized sound are local preferences. The default is sound off.

## Rollback

The previous service has not been deleted. Xserver's previous CNAME value was `silva-online.onrender.com` (TTL 3600). Restoring that value rolls the domain back to the previous service after DNS propagation. Do not delete the Render service until the Cloudflare version is accepted.

For a Cloudflare-only code rollback, use Worker deployment rollback and the Pages deployment history together. Preserve Durable Object binding/class names and migration tags; renaming them creates separate state.

## Verified 2026-09-19

- 70 rule/translation/version checks, 11 server checks, 14 legacy full-game checks passed.
- 21 Cloudflare checks passed locally; the initial 19 also passed through the real Pages service binding: private rooms, full matches, state secrecy, duplicate moves, rejoin authentication, reconnection, rematch voting, online AI, matchmaking and spectators.
- Full local process stop/start restored the exact saved board, hand, revision and seat.
- Real Chrome: 360/390/768/1440px overflow checks, language round-trip, create/join/start/draw UI, reload recovery, keyboard card selection and offline AI play. No runtime errors in that run.
- Load testing at large concurrency and physical iOS/Android device testing are not included.
