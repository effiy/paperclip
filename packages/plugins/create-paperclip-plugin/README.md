---
title: "create-paperclip-plugin"
tags: ["plugin", "scaffolding", "paperclip", "cli"]
category: "plugin"
created: "2024-01-01"
updated: "2026-10-20"
source: "external"
type: "index"
status: "stable"
lifecycle: "active"
---

# @paperclipai/create-paperclip-plugin

## 💡 概述

Scaffolding tool for creating new Paperclip plugins.

---

## ⚡ 功能

Supported templates: `default`, `connector`, `workspace`
Supported categories: `connector`, `workspace`, `automation`, `ui`

Generates:
- typed manifest + worker entrypoint
- example UI widget using the supported `@paperclipai/plugin-sdk/ui` hooks
- test file using `@paperclipai/plugin-sdk/testing`
- `esbuild` and `rollup` config files using SDK bundler presets
- dev server script for hot-reload (`paperclip-plugin-dev-server`)

The scaffold starts with plain React elements so the generated plugin stays minimal. For Paperclip-native controls, import shared host components such as `MarkdownEditor`, `FileTree`, `AssigneePicker`, and `ProjectPicker` from `@paperclipai/plugin-sdk/ui`.

Inside this repo, the generated package uses `@paperclipai/plugin-sdk` via `workspace:*`.

Outside this repo, the scaffold snapshots `@paperclipai/plugin-sdk` from your local Paperclip checkout into a `.paperclip-sdk/` tarball and points the generated package at that local file by default.

---

## 📊 指标

「待补充」

---

## 🏛️ 设计

You can override the SDK source explicitly:

```bash
node packages/plugins/create-paperclip-plugin/dist/bin.js @acme/my-plugin \
  --output /absolute/path/to/plugins \
  --sdk-path /absolute/path/to/paperclip/packages/plugins/sdk
```

That gives you an outside-repo local development path before the SDK is published to npm.

---

## 📁 目录

「待补充」

---

## 🔗 资源

「待补充」

---

## 🚀 快速开始

```bash
npx @paperclipai/create-paperclip-plugin my-plugin
```

Or with options:

```bash
npx @paperclipai/create-paperclip-plugin @acme/my-plugin \
  --template connector \
  --category connector \
  --display-name "Acme Connector" \
  --description "Syncs Acme data into Paperclip" \
  --author "Acme Inc"
```

### Workflow after scaffolding

```bash
cd my-plugin
pnpm install
pnpm dev       # watch worker + manifest + ui bundles
pnpm dev:ui    # local UI preview server with hot-reload events
pnpm test
```

---

## ⚙️ 技术栈

- Runtime: Node.js
- Package manager: pnpm
- Bundlers: esbuild, rollup (via `@paperclipai/plugin-sdk/bundlers`)
- Dev server: `paperclip-plugin-dev-server`