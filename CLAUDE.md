# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

M3U playlist editor for music, built as a Tauri v2 desktop app. React + TypeScript frontend, Rust backend. Supports extended M3U (#EXTM3U / #EXTINF).

## Development Environment

Uses Nix flakes via direnv (`use flake` in `.envrc`). The flake provides Rust (stable + clippy + rustfmt), Node.js 22, pnpm, and all Tauri Linux system dependencies (GTK3, WebKitGTK, etc.). WSL2 requires Mesa software rendering workarounds (set in `.envrc`).

## Commands

### Development
- `pnpm tauri dev` — run the full app (starts Vite dev server on port 1420, then launches the Tauri window)
- `pnpm dev` — run only the Vite frontend dev server (no Tauri window)

### Build
- `pnpm tauri build` — production build (runs `tsc && vite build` for frontend, then compiles the Rust binary)
- `pnpm build` — build only the frontend (`tsc && vite build`)

### Rust
- `cargo check --manifest-path src-tauri/Cargo.toml` — type-check Rust code
- `cargo test --manifest-path src-tauri/Cargo.toml` — run Rust tests (M3U parser unit tests)
- `cargo clippy --manifest-path src-tauri/Cargo.toml` — lint Rust code
- `cargo fmt --manifest-path src-tauri/Cargo.toml` — format Rust code

### TypeScript
- `tsc --noEmit` — type-check the frontend (strict mode, no unused locals/params)

### Release
- Push a `v*` tag to trigger GitHub Actions cross-platform builds (Windows, macOS Intel/ARM, Linux)

## Architecture

**Frontend** (`src/`): React 19 app bundled by Vite. Entry point is `src/main.tsx` → `src/App.tsx`. Uses `@/` path alias resolving to `src/`. UI built with shadcn/ui (base-nova style, Base UI primitives — NOT Radix). State managed by Zustand store in `src/stores/playlist.ts`. Calls Rust backend via `invoke()` from `@tauri-apps/api/core`.

**Backend** (`src-tauri/src/`): `main.rs` calls `m3u_editor_lib::run()`. `lib.rs` registers Tauri plugins (fs, dialog, store, opener) and commands. `m3u.rs` handles M3U parsing/serialization. `commands.rs` exposes `open_playlist` and `save_playlist` as Tauri commands.

**Tauri config** (`src-tauri/tauri.conf.json`): App window config, build commands, bundle settings. Capabilities in `src-tauri/capabilities/default.json` grant fs, dialog, store, and opener permissions.

## Key Conventions

- shadcn/ui uses **base-nova** style (Base UI, not Radix). Use `render` prop instead of `asChild` for trigger composition.
- Git commits use noreply email (`109411672+hnkNkm@users.noreply.github.com`). Repo-local git config is set.
- CSS uses oklch color space (works in modern browsers and current WebKitGTK).
