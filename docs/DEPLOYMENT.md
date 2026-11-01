# GitHub Pages デプロイ

## 公開先

| ソース | URL |
| --- | --- |
| `main` | https://naoiw.github.io/photo-editor/ |
| `develop` | https://naoiw.github.io/photo-editor/develop/ |

公開先はどちらも同じ `github-pages` 環境です。1つの配布物の `/` と `/develop/` に成果物をまとめます。

## ワークフロー

1. `.github/workflows/validate-develop.yml` は develop push / main・develop 宛 PR でテスト・Lint・ビルドを行います。
2. 検証が成功した **develop push** だけを、main 上の `.github/workflows/deploy-pages.yml` が `workflow_run` で検知します。
3. main push、または main からの手動実行でも公開できます。
4. 公開ジョブは main と、成功した develop の SHA を別々に checkout して再ビルドします。
5. 本番ビルドは `--base=/photo-editor/`、プレビュービルドは `--base=/photo-editor/develop/` を使います。
6. 両方の `dist/` を1つのアーティファクトにまとめ、`actions/deploy-pages` から公開します。

ワークフローの実行権限は必要最小限にし、GitHub Pages の環境へのデプロイは main 上のワークフローだけが行います。

## GitHub 側の初期設定

1. リポジトリの **Settings → Pages → Build and deployment** で Source を **GitHub Actions** にします。
2. Actions と Pages の実行が許可されていることを確認します。
3. `main` 上に公開用ワークフローがあることを確認します（workflow_run を受け取るには必須）。
4. `develop` を push し、**Validate develop** → **Deploy to GitHub Pages** が成功することを確認します。

GitHub Pages の環境保護ルールで main だけを許可していても、上記構成なら develop を直接デプロイしないため動作します。

## SPA の画面遷移

GitHub Pages に SPA のルーティング rewrite はありません。React Router の `HashRouter` を使い、`/photo-editor/develop/#/crop` のような URL にします。ハッシュ以下はサーバーに送信されないため、直接リンクや再読み込みでも同じ画面が開けます。

## 注意

- develop の検証が失敗した場合、成功済みプレビューは維持されます。
- PR の検証ではデプロイしません。
- プレビューもインターネットに公開されます。秘密情報や私的な画像をコード・静的ファイルとしてコミットしないでください。
