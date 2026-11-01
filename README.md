# Photo Editor

React / TypeScript で作ったブラウザ画像加工ツールです。トリミングと背景・フレーム合成を行います。画像ファイルはブラウザ内で処理し、サーバーへ送信しません。

## 主な機能

- 出力サイズ（px）を指定したトリミングと、画像位置・拡大率の調整
- 背景画像と透過フレーム画像の合成
- ドラッグ＆ドロップによる画像選択と PNG 書き出し
- スマートフォン・PC に対応した画面構成

## 公開先

| 環境 | ブランチ | URL |
| --- | --- | --- |
| 本番 | `main` | https://naoiw.github.io/photo-editor/ |
| 開発プレビュー | `develop` | https://naoiw.github.io/photo-editor/develop/ |

本番とプレビューは、1つの GitHub Pages サイト内の別パスで公開します。画面遷移は静的ホスティング向けに `#/crop`, `#/compose` のハッシュルートを使用します。

## 技術スタック

- **React 19 / TypeScript** — 画面・画像処理
- **React Router 7** — 画面遷移
- **Tailwind CSS 4 / Vite 7** — スタイル・ビルド
- **Vitest / ESLint** — テスト・静的解析
- **Node.js 22 / pnpm 10** — 開発環境
- **GitHub Actions / GitHub Pages** — 検証・公開

## ローカル開発

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm lint
pnpm build
```

`pnpm dev` は Vite の開発サーバーを起動します。ビルド結果 `dist/` は Git 管理対象外です。

## ブランチ運用

1. 通常の開発は `develop`、公開版は `main` で管理します。
2. `develop` への push と Pull Request ではテスト・Lint・ビルドを実行します。
3. `develop` への push が検証に成功した場合、`main` 側の公開ワークフローがプレビューを更新します。Pull Request の検証だけでは公開しません。
4. `develop` → `main` の Pull Request で本番反映します。マージ後も `develop` は維持します。

## ディレクトリ構成

- `src/pages/` — トリミング・合成・トップ画面
- `src/components/` — 共通 UI
- `src/features/` — Canvas 画像処理とテスト
- `.github/workflows/` — 検証・Pages 公開
- `docs/` — 仕様・開発・デプロイの説明

## ドキュメント

- [仕様書](docs/SPEC.md)
- [開発手順](docs/DEVELOPMENT.md)
- [デプロイ構成](docs/DEPLOYMENT.md)

## ライセンス

[MIT License](LICENSE)
