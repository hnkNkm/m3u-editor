# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

M3U playlist editor built as a Tauri v2 desktop app. React + TypeScript frontend, Rust backend.

## Development Environment

Uses Nix flakes via direnv (`use flake` in `.envrc`). The flake provides Rust (stable + clippy + rustfmt), Node.js 22, pnpm, and all Tauri Linux system dependencies (GTK3, WebKitGTK, etc.).

## Commands

### Development
- `pnpm tauri dev` — run the full app (starts Vite dev server on port 1420, then launches the Tauri window)
- `pnpm dev` — run only the Vite frontend dev server (no Tauri window)

### Build
- `pnpm tauri build` — production build (runs `tsc && vite build` for frontend, then compiles the Rust binary)
- `pnpm build` — build only the frontend (`tsc && vite build`)

### Rust
- `cargo build` — from `src-tauri/`
- `cargo clippy` — lint Rust code from `src-tauri/`
- `cargo test` — run Rust tests from `src-tauri/`
- `cargo fmt` — format Rust code from `src-tauri/`

### TypeScript
- `tsc --noEmit` — type-check the frontend (strict mode, no unused locals/params)

## Architecture

**Frontend** (`src/`): React 19 app bundled by Vite. Entry point is `src/main.tsx` → `src/App.tsx`. Calls Rust backend via `invoke()` from `@tauri-apps/api/core`.

**Backend** (`src-tauri/src/`): Rust. `main.rs` calls `m3u_editor_lib::run()`. `lib.rs` sets up the Tauri builder, registers plugins and commands. Tauri commands (annotated with `#[tauri::command]`) are the IPC boundary — the frontend calls them by name via `invoke("command_name", { args })`.

**Tauri config** (`src-tauri/tauri.conf.json`): App window config, build commands, bundle settings. Capabilities in `src-tauri/capabilities/default.json` control which Tauri APIs the frontend window can access.
