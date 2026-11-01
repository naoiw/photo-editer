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
pnpm test    # 画像の座標計算・Canvas 描画ヘルパーの単体テスト
pnpm lint    # TypeScript / React Hooks
pnpm build   # tsc -b + Vite
```

プレビュー用のローカルビルドを検証する場合:

```bash
pnpm exec tsc -b
pnpm exec vite build --base=/photo-editor/develop/
```

## ファイル配置

- `src/main.tsx`: React ルートと HashRouter
- `src/App.tsx`: 3つの画面のルート
- `src/components/AppShell.tsx`: 共通ヘッダー、コンテンツ、フッター
- `src/components/ToolPageHeader.tsx`: ツールページの見出しと戻るリンク
- `src/components/FillColorPicker.tsx`: 共通の背景色選択
- `src/components/ImageScaleControls.tsx`: 共通の拡大率操作
- `src/styles.css`: 他の naoiw サイトと共通のクローム寸法・カラートークン
- `src/pages/`: UI・画像プレビューの操作
- `src/features/image/canvas.ts`: 2D Canvas の作成・背景色塗り・スケーリング描画
- `src/features/image/imageUtils.ts`: 拡大率・矩形・ダウンロードなどの計算と補助関数
- `src/features/crop/`・`src/features/compose/`: 画像加工のエントリ
- `src/hooks/useImageMetadata.ts`: 画像の非同期デコードと寸法取得（古い結果を無視）
- `src/hooks/useObjectUrl.ts`: 入力ファイル用 Object URL の生成・解放
- `src/hooks/useBlobPreview.ts`: 出力プレビューの Object URL の差し替え・解放

## 開発時の注意

- ユーザーの画像はネットワークにアップロードしません。ブラウザの Canvas API で処理します。
- 画像プレビューの Object URL は差し替え時やアンマウント時に解放します。プレビュー更新は `useBlobPreview` 経由に統一します。
- 画像寸法の読み込みは `useImageMetadata` 経由に統一します。画像ファイルが切り替わった後に完了した古いデコード結果は使いません。
- 画像処理の Canvas 作成とソース描画は `createImageCanvas`・`drawImageAtCrop` を利用します。
- UI はモバイルを含む幅 320px 以上を前提とし、狭い画面では左右カラムを縦並びにします。
- CSS は `src/styles.css` に集約し、画面固有の配置は Tailwind クラスで扱います。
- 画像加工処理の変更時は、`pnpm test` と手動の書き出し確認を実施してください。

## ブランチと PR

変更は `develop` に反映してプレビューで確認し、`develop` → `main` の PR で本番に反映します。main への直接 push は原則避けます（初回の公開ワークフロー配置を除く）。
