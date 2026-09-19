#!/usr/bin/env node
/* ============================================================
   Cloudflare Pages 用の静的ビルド
   ------------------------------------------------------------
   Render 単体構成ではサーバーが配信時に __ORIGIN__ を解決するが、
   Pages は静的配信なのでビルド時に焼き込む。

   使い方:
     ORIGIN=https://silva.pages.dev WS=wss://silva-online.onrender.com \
       node scripts/build-pages.mjs
   出力: dist/
   ============================================================ */
import { cpSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = (process.env.ORIGIN || '').replace(/\/$/, '');
const WS = process.env.WS || ''; // Same-origin Pages Functions → Worker service binding.
if (!ORIGIN) { console.error('ORIGIN 環境変数が必要です（例: https://silva.pages.dev）'); process.exit(1); }

const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);
cpSync(join(root, 'public'), dist, { recursive: true });

/* HTML: __ORIGIN__ を焼き込み、WS接続先を設定 */
for (const f of ['index.html', 'rules.html']) {
  const p = join(dist, f);
  let html = readFileSync(p, 'utf8');
  html = html.split('__ORIGIN__').join(ORIGIN);
  html = html.replace('<meta name="silva-ws" content="">', `<meta name="silva-ws" content="${WS}">`);
  writeFileSync(p, html);
}

/* robots.txt / sitemap.xml（Render では server.js が動的生成している分） */
writeFileSync(join(dist, '_routes.json'), JSON.stringify({version:1,include:['/api/*'],exclude:[]}));
writeFileSync(join(dist, 'ping'), 'pong');
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`);
writeFileSync(join(dist, 'sitemap.xml'),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url><loc>${ORIGIN}/</loc>
    <xhtml:link rel="alternate" hreflang="ja" href="${ORIGIN}/?lang=ja"/>
    <xhtml:link rel="alternate" hreflang="en" href="${ORIGIN}/?lang=en"/>
  </url>
  <url><loc>${ORIGIN}/rules.html</loc>
    <xhtml:link rel="alternate" hreflang="ja" href="${ORIGIN}/rules.html?lang=ja"/>
    <xhtml:link rel="alternate" hreflang="en" href="${ORIGIN}/rules.html?lang=en"/>
  </url>
</urlset>
`);

/* Pages のキャッシュ方針: 画像は長期、HTML/JSは再検証（Render側と同じ思想） */
writeFileSync(join(dist, '_headers'),
`/*.webp
  Cache-Control: public, max-age=604800
/*.jpg
  Cache-Control: public, max-age=604800
/icons/*
  Cache-Control: public, max-age=604800
/*.js
  Cache-Control: no-cache
/*.html
  Cache-Control: no-cache
`);

console.log(`dist/ を生成しました（ORIGIN=${ORIGIN}, WS=${WS}）`);
