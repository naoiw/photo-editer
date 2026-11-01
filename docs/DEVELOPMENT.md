# 開発手順

## 開発環境

- Node.js 22（`.nvmrc`）
- pnpm 10.28.1（`package.json` の `packageManager`）
- React 19 / TypeScript / Vite 7 / Tailwind CSS 4

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

ブラウザで開発サーバーにアクセスし、`#/`、`#/crop`、`#/compose` を操作します。

## 品質確認

```bash
pnpm test    # src/features/image/imageUtils.test.ts
pnpm lint    # TypeScript / React Hooks
pnpm build   # tsc -b + Vite
```

プレビュー用のローカルビルドを検証する場合:

```bash
pnpm exec tsc -b
pnpm exec vite build --base=/photo-editer/develop/
```

## ファイル配置

- `src/main.tsx`: React ルートと HashRouter
- `src/App.tsx`: 3つの画面のルート
- `src/components/AppShell.tsx`: 共通ヘッダー、コンテンツ、フッター
- `src/styles.css`: 他の naoiw サイトと共通のクローム寸法・カラートークン
- `src/pages/`: UI・画像プレビューの操作
- `src/features/`: Canvas を使った加工と画像 utility
- `src/hooks/`: オブジェクト URL 管理

## 開発時の注意

- ユーザーの画像はネットワークにアップロードしません。ブラウザの Canvas API で処理します。
- 画像プレビューの Object URL は差し替え時やアンマウント時に解放します。
- UI はモバイルを含む幅 320px 以上を前提とし、狭い画面では左右カラムを縦並びにします。
- CSS は `src/styles.css` に集約し、画面固有の配置は Tailwind クラスで扱います。
- 画像加工処理の変更時は、`pnpm test` と手動の書き出し確認を実施してください。

## ブランチと PR

変更は `develop` に反映してプレビューで確認し、`develop` → `main` の PR で本番に反映します。main への直接 push は原則避けます（初回の公開ワークフロー配置を除く）。
