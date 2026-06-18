# m3u-editor

音楽用 M3U プレイリストを編集するデスクトップアプリです。

Tauri 2 + React + Rust で実装しており、Windows / macOS / Linux で動作します。

## 機能

- M3U / M3U8 ファイルの読み込み・保存・名前を付けて保存
- 拡張 M3U 対応（`#EXTM3U` / `#EXTINF` のパースと書き出し）
- トラックのインライン編集（タイトル、アーティスト、再生時間、パス）
- トラックの追加・削除
- ドラッグ＆ドロップで並び替え
- ウィンドウへの M3U ファイルドロップで読み込み
- トラックの検索・フィルター
- トラック数・合計再生時間の表示
- ダーク / ライト / システム テーマ切替

## 技術構成

- Frontend: React 19 + TypeScript + Vite
- UI: shadcn/ui + Tailwind CSS v4
- State: Zustand
- Backend: Tauri 2 + Rust
- Package manager: pnpm
- Development environment: Nix flake + direnv

## 開発環境

Nix flakes と direnv を使って開発環境を構築します。

```bash
direnv allow
pnpm install
```

`flake.nix` に Rust stable、Node.js 22、pnpm、Tauri の Linux ビルドに必要な依存パッケージを定義しています。

## 開発コマンド

```bash
# アプリを起動（フロントエンド + Tauri）
pnpm tauri dev

# フロントエンドのみビルド
pnpm build

# Rust の型チェック
cargo check --manifest-path src-tauri/Cargo.toml

# Rust テスト
cargo test --manifest-path src-tauri/Cargo.toml
```

## リリース

`v*` タグをプッシュすると GitHub Actions が各プラットフォーム向けのインストーラーをビルドし、ドラフトリリースを作成します。

```bash
git tag v0.1.0
git push origin v0.1.0
```
