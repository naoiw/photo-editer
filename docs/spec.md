# Photo Editer 仕様書

ブラウザ上でローカル画像を加工する Web アプリケーションの現行仕様です。画像はサーバーへ送信せず、すべてクライアント内で処理します。

## 1. 概要

| 項目 | 内容 |
| --- | --- |
| プロダクト名 | Photo Editer |
| バージョン | 0.1.0 |
| 種別 | シングルページアプリケーション（SPA） |
| ライセンス | MIT |
| 言語 | 日本語 UI |

提供機能は次の 2 つです。

- **トリミング**: 出力ピクセルサイズを指定し、切り抜き位置をドラッグで調整する
- **背景とフレームの合成**: フレームサイズのキャンバスに背景を配置し、位置と大きさを合わせて 1 枚の PNG として書き出す

## 2. 技術スタック

| 分類 | 技術 | 用途 |
| --- | --- | --- |
| UI | React 19 | 画面コンポーネント |
| ルーティング | React Router 7（`BrowserRouter`） | ページ遷移 |
| ビルド | Vite 7 | 開発サーバー・本番バンドル |
| 言語 | TypeScript 5.9（strict） | 型検査 |
| スタイル | Tailwind CSS 4（`@tailwindcss/vite`） | ユーティリティ CSS |
| アイコン | `@tabler/icons-react` | UI アイコン |
| テスト | Vitest 3 | 画像 utility の単体テスト |
| Lint | ESLint 9 + typescript-eslint + react-hooks / react-refresh | 静的解析 |
| パッケージマネージャ | pnpm 10.28.1 | 依存関係 |
| ホスティング想定 | Vercel | SPA 向け rewrite |

画像処理は Canvas API（`createImageBitmap` / `HTMLCanvasElement` / `canvas.toBlob`）のみを使い、外部画像ライブラリは依存しません。

## 3. ディレクトリ構成

```
photo-editer/
├── docs/                      # 本仕様書など
├── src/
│   ├── App.tsx                # ルート定義
│   ├── main.tsx               # エントリ（StrictMode + BrowserRouter）
│   ├── styles.css             # テーマ・共通コンポーネントクラス
│   ├── vite-env.d.ts
│   ├── components/            # 共通 UI
│   │   ├── AppShell.tsx
│   │   ├── Feedback.tsx
│   │   └── ImageFilePicker.tsx
│   ├── features/
│   │   ├── compose/composeImage.ts
│   │   ├── crop/cropImage.ts
│   │   └── image/             # 共通画像 utility とテスト
│   ├── hooks/useObjectUrl.ts
│   └── pages/
│       ├── HomePage.tsx
│       ├── CropPage.tsx
│       └── ComposePage.tsx
├── index.html
├── package.json
├── vercel.json
└── vite.config.ts
```

## 4. 画面とルーティング

未定義パスはホームへリダイレクトします。

| パス | 画面 | 説明 |
| --- | --- | --- |
| `/` | `HomePage` | ツール選択 |
| `/crop` | `CropPage` | トリミング |
| `/compose` | `ComposePage` | 背景とフレームの合成 |
| `*` | — | `/` へ `replace` リダイレクト |

共通レイアウト `AppShell` はヘッダー（ロゴ＋「Photo Editer」でホームへ戻る）と、最大幅 960px のメイン領域を提供します。各ツール画面からホームへ戻るリンクもあります。

## 5. 共通仕様

### 5.1 プライバシー

- 画像ファイルはブラウザ内だけで読み込み・加工・書き出しする
- アップロード先サーバーはなく、加工結果の送信もない
- プレビュー用 URL は `URL.createObjectURL` で生成し、ファイル差し替え・アンマウント時に `revokeObjectURL` する

### 5.2 入力画像

`ImageFilePicker` のデフォルト受け付けは次のとおりです。

- ファイルダイアログ: `image/png,image/jpeg,image/webp`
- ドラッグ＆ドロップ: `file.type` が `image/` で始まるもの
- 1 ファイルのみ選択。選択後に input 値をクリアし、同じファイルの再選択を可能にする

### 5.3 書き出し

| 定数 | 値 | 意味 |
| --- | --- | --- |
| `IMAGE_EXPORT_TYPE` | `image/png` | 既定の書き出し MIME |
| `IMAGE_EXPORT_EXTENSION` | `png` | 既定の保存拡張子 |
| `IMAGE_WEBP_QUALITY` | `0.92` | WebP を指定した場合の品質 |

- 既定の MIME は `image/png`
- 保存は `<a download>` をクリックしてローカルダウンロードする

### 5.4 レイアウト・見た目

- フォント: Noto Sans JP（Google Fonts）
- `body` の最小幅は 1024px（デスクトップ前提）
- ライトテーマ固定（`color-scheme: light`）
- アクセントカラーは `#2f6f5e`

## 6. ホーム

2 枚のカードで各ツールへ遷移します。

| カード | 遷移先 | 説明文 |
| --- | --- | --- |
| トリミング | `/crop` | 縦横サイズを指定して、ローカル画像を切り抜き・リサイズします。 |
| 背景とフレームの合成 | `/compose` | フレームのサイズに合わせ、背景の位置と大きさを調整して1枚の画像に合成します。 |

## 7. トリミング

### 7.1 画面の役割

指定した幅・高さ（px）の出力画像を作る。切り抜き枠の大きさは出力サイズと一致し、元画像上をドラッグして位置を決める。元画像は拡大縮小でき、拡大すると枠に入る範囲が狭く、縮小すると広くなる。枠は画像外へはみ出せる。

### 7.2 入力

| 項目 | 初期値 | 制約 |
| --- | --- | --- |
| 元画像 | 未選択 | 必須。選択済みならアップロード領域右上の赤いごみ箱ボタンで削除できる |
| 幅 (px) | `828` | 1 以上の整数（未満は 1 に丸める） |
| 高さ (px) | `1154` | 1 以上の整数 |
| 画像の拡大率 | `1`（100%） | `0.25`〜`8`（25%〜800%、5%刻み） |
| はみ出し部分の背景色 | `black`（黒） | 下記パレット |

塗りつぶしパレット（`FILL_COLORS`）:

| ID | ラベル | CSS / Canvas |
| --- | --- | --- |
| `black` | 黒 | `#000000` |
| `red` | 赤 | `#e03131` |
| `blue` | 青 | `#1c7ed6` |
| `green` | 緑 | `#2f9e44` |
| `transparent` | 透明 | Canvas は塗りなし（`clearRect` のみ） |

透明選択時はチェッカーボードでプレビューする。保存ボタンラベルは常に「PNGで保存」。

### 7.3 切り抜き枠の挙動

1. 画像読み込み後、拡大後サイズに対して `getPixelCropRect` で枠を中央に置く。出力サイズが拡大後画像より大きい場合、座標は負になり、枠が画像からはみ出す。
2. 幅・高さ・元画像が変わると枠位置を中央配置に再計算する。
3. ポインタドラッグで枠を平行移動する。リサイズ操作はない。
4. `softClampCropRect` で移動範囲を制限する。枠と画像の重なりが、小さい方の辺の **75%** を下回らない（`CROP_MAX_OVERHANG_RATIO = 0.25`）。対象サイズは拡大後の画像サイズ。
5. プレビューステージは枠のはみ出し分だけ余白を持ち、余白の色は選択中の塗り色（透明時はチェッカーボード）。
6. 右上の切り抜き位置で入力画像そのものを拡大縮小できる（25%〜800%、5%刻み）。枠のピクセルサイズは出力サイズのまま。操作は − / スライダー / ＋、パーセント表示のクリックで 100%、ホイール。拡大縮小しても枠の中心が同じ元画像上の点を指すよう `rescaleCropRect` する。画像を選び直すと 100% に戻る。

ステージサイズ:

- `scaledWidth = 元画像幅 * 拡大率`
- `scaledHeight = 元画像高さ * 拡大率`
- `padX = cropRect.width * 0.25`
- `padY = cropRect.height * 0.25`
- `stageWidth = scaledWidth + padX * 2`
- `stageHeight = scaledHeight + padY * 2`

### 7.4 処理（`cropImageToSize`）

1. `createImageBitmap` で元画像を読む。
2. 出力幅・高さを 1 以上の整数に切り捨てる。拡大率を `clampImageScale` する。
3. 切り抜き矩形の幅・高さを出力サイズに合わせ、拡大後サイズに対して `softClampCropRect` で位置を制限する。
4. キャンバスを出力サイズで作り、透明以外なら全面を塗りつぶす。
5. 元画像を拡大後サイズでキャンバスに描画し、切り抜き枠の左上をキャンバス原点に合わせる（`drawImage(..., -crop.x, -crop.y, scaledWidth, scaledHeight)`）。枠外や画像外は塗りが残る。拡大率が 1 のときはスムージングしない。
6. PNG で Blob 化する。
7. `ImageBitmap.close()` で解放する。

交差の写像:

- 作業空間: 元画像を拡大率で伸縮した座標系。切り抜き枠の幅・高さは出力ピクセルと一致
- 出力側: 枠内の拡大後画像を出力キャンバス全面に配置（拡大率が 1 なら従来どおり 1:1）

### 7.5 操作と出力

| 操作 | 条件 | 結果 |
| --- | --- | --- |
| プレビュー | 画像選択済み、処理中でない | 結果をプレビュー表示。保存はしない |
| PNGで保存 | 同上 | `{元ファイル名（拡張子除く）}-cropped.png` をダウンロードし、同じ結果をプレビューにも出す |

エラーメッセージ:

- 画像読み込み失敗: 「画像を読み込めませんでした。」
- トリミング失敗: 「トリミングに失敗しました。」
- ダウンロード失敗: 「ダウンロード用の画像を作成できませんでした。」

処理中は両ボタンを無効化する。

## 8. 背景とフレームの合成

### 8.1 画面の役割

フレーム画像のピクセルサイズを出力サイズとし、その上に背景を配置して 1 枚画像にする。プレビュー上で背景をドラッグ移動・拡大縮小できる。フレームは透過 PNG / WebP を推奨する。

### 8.2 入力

| 項目 | 初期値 | 制約 |
| --- | --- | --- |
| 背景画像 | 未選択 | 必須 |
| フレーム画像 | 未選択 | 必須。ヒントは「透過PNG / WebP 推奨」 |
| 背景の拡大率 | フレームを覆う cover 拡大率 | `0.25`〜`8`（25%〜800%、5%刻み） |
| はみ出し部分の背景色 | `black`（黒） | トリミングと同じ `FILL_COLORS` パレット |

出力幅・高さの入力はない。出力サイズは常にフレーム画像の幅・高さ。背景またはフレームを選び直す、または削除するとプレビュー URL を破棄し、拡大率と位置を初期化する。選択済みの各画像は、アップロード領域右上の赤いごみ箱ボタンで削除できる。

### 8.3 プレビュー表示

プレビュー領域のアスペクト比はフレーム画像と一致する（最大高さ 28rem）。

| 状態 | 表示 |
| --- | --- |
| 未選択 | 破線プレースホルダ |
| 両方選択 | フレームサイズのステージ。背景をドラッグで移動、スライダー / ± / ホイールで拡大縮小。フレームは全面に固定。はみ出し部分は選択中の塗り色（透明時はチェッカーボード） |
| プレビュー / 保存後 | 上記に加え、書き出し結果画像 |

初期配置:

1. `getCoverScale` で背景がフレーム全体を覆う拡大率にする
2. 拡大後サイズに対して `getPixelCropRect` でフレーム矩形を中央に置く
3. ポインタドラッグは背景を動かす（切り抜き枠は固定なので、移動方向はトリミングと逆）
4. 位置制限は `softClampCropRect`。フレームと背景の重なりが、小さい方の辺の **75%** を下回らない範囲で移動できる（はみ出し上限 25%）
5. 拡大縮小してもフレーム中心が同じ背景上の点を指すよう `rescaleCropRect` する

### 8.4 処理（`composeBackgroundAndFrame`）

1. 背景・フレームを並列で `createImageBitmap` する。
2. 出力幅・高さはフレーム画像のサイズ。
3. 拡大率を `clampImageScale` し、拡大後サイズに対して `softClampCropRect` で位置を制限する。未指定時は中央配置。
4. キャンバスをフレームサイズで作り、透明でクリアする。透明以外なら全面を塗りつぶす。
5. 背景を拡大後サイズで描画し、フレーム矩形の左上をキャンバス原点に合わせる（`drawImage(..., -crop.x, -crop.y, scaledWidth, scaledHeight)`）。フレーム外や画像外は塗りが残る。拡大率が 1 のときはスムージングしない。
6. その上にフレームを 1:1（伸縮なし）で描画する。
7. PNG で Blob 化する。
8. 両方の `ImageBitmap` を閉じる。

### 8.5 操作と出力

| 操作 | 条件 | 結果 |
| --- | --- | --- |
| プレビュー | 背景・フレーム選択済み、処理中でない | 合成結果を表示 |
| PNGで保存 | 同上 | プレビュー更新に加え `{背景ファイル名（拡張子除く）}-composed.png` をダウンロード |

エラーメッセージ:

- 背景読み込み失敗: 「背景画像を読み込めませんでした。」
- フレーム読み込み失敗: 「フレーム画像を読み込めませんでした。」
- 合成失敗: 「合成に失敗しました。」
- ダウンロード失敗: 「ダウンロード用の画像を作成できませんでした。」

処理中は両ボタンを無効化する。

## 9. 共通画像 utility

`src/features/image/imageUtils.ts` の公開関数です。

| 関数 | 仕様 |
| --- | --- |
| `getPixelCropRect(sw, sh, cw, ch)` | 切り抜き枠をソース中央に置く。枠がソースより大きければ `x` / `y` は負 |
| `softClampCropRect(crop, sw, sh, ratio=0.25)` | 枠とソースの重なりが、小さい方の辺の `(1-ratio)` 以上になるよう位置を制限する。ソースが枠より大きくても小さくても範囲が逆転しない |
| `clampImageScale(value)` | 拡大率を 0.25〜8、5%刻みに丸める。非数は `1` |
| `getScaledSourceSize(sw, sh, scale)` | 拡大後の画像幅・高さ |
| `getCoverScale(sw, sh, dw, dh)` | 出力矩形を覆う最小の拡大率。`clampImageScale` 済み。入力が 0 以下なら `1` |
| `rescaleCropRect(crop, from, to, sw, sh)` | 拡大率変更後も枠中心が同じ元画像点を指すよう位置を付け替える |
| `getSourceIntersection(crop, sw, sh)` | 枠とソースの交差をソース座標と枠ローカル座標で返す。交差なしなら `null` |
| `filenameWithoutExtension` | 末尾の拡張子（最後の `.` 以降）だけを除く。例: `photo.final.png` → `photo.final` |
| `canvasToBlob(canvas, type='image/png', quality=0.92)` | `toBlob` の Promise 化。失敗時は例外。既定は PNG |
| `loadImageBitmap` | `createImageBitmap` の薄いラッパ |
| `downloadBlob` | Object URL を作り、ダウンロード後に即 revoke |
| `revokeObjectUrl` | `null` / `undefined` は無視 |

`useObjectUrl(file)` は `File` から Object URL を作り、依存が変わったら revoke する。

## 10. 共通 UI コンポーネント

| コンポーネント | 役割 |
| --- | --- |
| `AppShell` | ヘッダーとメイン幅の枠 |
| `ImageFilePicker` | クリック選択と D&D。任意の hint / accept / サムネイル。`onClear` 指定時は選択済みなら右上に赤い削除ボタン |
| `Notice` | エラー（`role="alert"`）または成功（`role="status"`）の帯 |
| `LoadingState` | スピナー付きプレースホルダ（現状ページからは未使用） |

## 11. 開発・ビルド・デプロイ

### 11.1 コマンド

```bash
pnpm install
pnpm dev      # Vite 開発サーバー
pnpm build    # tsc -b && vite build
pnpm lint     # ESLint
pnpm test     # vitest run
```

### 11.2 TypeScript

- ターゲット ES2022、`jsx: react-jsx`、`strict: true`
- `noUnusedLocals` / `noUnusedParameters` 有効
- プロジェクト参照: `tsconfig.app.json`（`src`）と `tsconfig.node.json`

### 11.3 テスト

- 対象: `src/**/*.test.ts`
- 現行は `imageUtils.test.ts` のみ（中央配置、はみ出し clamp、交差写像、拡大率、cover 拡大率、ファイル名）
- Canvas を使う `cropImageToSize` / `composeBackgroundAndFrame` のテストは未実装

### 11.4 Vercel

`vercel.json` ですべてのパスを `/index.html` へ rewrite し、クライアントルーティングを有効にする。

### 11.5 ブラウザ前提

- `createImageBitmap`、Canvas 2D、`canvas.toBlob`（WebP / PNG）が使える環境
- 最小幅 1024px のデスクトップ UI
- HTML `lang="ja"`、viewport は設定済みだがレイアウトはモバイル非対応

## 12. 現状の非機能・制約

- サーバーサイド処理・ユーザーアカウント・永続保存はない
- 画像はセッション内のメモリと Object URL のみ
- トリミング枠のサイズ変更は数値入力のみ（枠のコーナー操作はない）
- 合成の初期配置は cover だが、5%刻みの拡大率のため完全な cover にならない場合がある
- 対応を明示している入力は PNG / JPEG / WebP。ブラウザが `image/` として扱う他形式は D&D では通る場合がある
- 大容量画像のメモリ上限や進捗表示はない
