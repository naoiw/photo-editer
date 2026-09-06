# Photo Editer

React 19、React Router、Tailwind CSS、Vite で構成したローカル画像加工ツールです。

画像はブラウザ内だけで処理され、サーバーへ送信されません。

## 機能

- **トリミング**: 縦横サイズを指定して切り抜き・リサイズ。切り抜き位置はドラッグで調整可能
- **背景とフレームの合成**: 背景画像の上にフレーム画像を重ねて PNG で書き出し

## セットアップ

```bash
pnpm install
pnpm dev
```

## コマンド

- `pnpm dev`: 開発サーバー
- `pnpm build`: 型検査と本番ビルド
- `pnpm lint`: ESLint
- `pnpm test`: 画像処理 utility のテスト
