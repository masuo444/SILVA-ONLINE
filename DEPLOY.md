# SILVA デプロイ手順

## 構成の考え方

AI対戦がブラウザ内で完結するようになったため、**大多数のプレイはサーバーに一切触れない**。
サーバーが要るのはオンライン対戦（WebSocket）だけ。

| 層 | 置き場所 | 費用 |
|---|---|---|
| 静的（HTML・画像・PWA・ルールエンジン） | Cloudflare Pages | 無料・帯域無制限・世界300拠点 |
| AI対戦 | **ブラウザ内**（`local-game.js`） | $0・オフライン可 |
| オンライン対戦（WS） | Railway / Fly.io | $0〜5/月 |

同一ホストで全部動かす構成（現状のRailway単体）もそのまま動く。分離は任意。

---

## A. 現状のまま（Railway単体）

追加設定は不要。`git push` → Railway が自動デプロイ。

```bash
npm test          # ルール判定・多言語の回帰テスト（必ず通してから push）
npm start         # ローカル起動 http://localhost:3000
```

---

## B. 静的を Cloudflare Pages に分離する（推奨・帯域が無料になる）

### 1. Pages 側

- Cloudflare Pages で新規プロジェクトを作成し、このリポジトリを接続
- ビルドコマンド: なし（空欄）
- 出力ディレクトリ: `public`

### 2. WSサーバーの場所を教える

`public/index.html` の先頭にあるメタタグに、Railway 側のURLを書く：

```html
<meta name="silva-ws" content="wss://silva-online-production.up.railway.app">
```

空のままなら「HTMLを配信しているのと同じホスト」に繋ぐので、A構成では触らなくてよい。
一時的に試すだけなら `?ws=wss://...` をURLに付けても切り替わる。

### 3. Railway 側で接続元を制限する

環境変数に Pages のドメインを設定する。設定しなければ全オリジン許可のまま。

```
ALLOWED_ORIGINS=https://silva.pages.dev,https://silva.example.com
```

### 4. OGP の絶対URL

サーバーは配信時に `__ORIGIN__` を実際のホスト名へ置換している。
Cloudflare Pages は静的配信なのでこの置換が走らない。分離する場合は、
`public/index.html` と `public/rules.html` の `__ORIGIN__` を
**Pages側の本番URLに一括置換**してからデプロイすること。

```bash
# 例
sed -i '' 's|__ORIGIN__|https://silva.example.com|g' public/index.html public/rules.html
```

---

## リリース前チェックリスト

1. `npm test` が全て通ること（ルール判定・翻訳漏れを検出する）
2. **`public/sw.js` の `CACHE_NAME` を上げる** — 上げないと古いHTMLが端末に残る
3. **`index.html` の `?v=` を上げる**（`game-core.js` / `i18n.js` / `local-game.js` を変更した場合）
   — 上げないと古いルールで対局する端末が出る
4. 実機（スマホ）で以下を通す：
   - AI戦を1局（機内モードでも遊べることを確認）
   - オンライン対戦を1局
   - 対局中にタブを閉じて開き直し、盤面が復帰すること
   - 言語を English に切り替えて日本語が残らないこと

## 注意点

- サーバーの対局状態はメモリ上にあるため、**デプロイすると進行中のオンライン対局は失われる**。
  プレイヤーが少ない時間帯にデプロイすること。（恒久対応はDurable Objects移行）
- AI対戦はサーバーを使わないので、デプロイの影響を受けない。
