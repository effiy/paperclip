---
title: "Plugin Authoring Smoke Example"
tags: ["plugin", "example", "smoke", "paperclip"]
category: "example"
created: "2024-01-01"
updated: "2026-10-20"
source: "external"
type: "index"
status: "stable"
lifecycle: "active"
---

# Plugin Authoring Smoke Example

## 💡 概述

A Paperclip plugin.

---

## ⚡ 功能

「待补充」

---

## 📊 指标

「待补充」

---

## 🏛️ 设计

「待补充」

---

## 📁 目录

「待补充」

---

## 🔗 资源

「待补充」

---

## 🚀 快速开始

### Development

```bash
pnpm install
pnpm dev            # watch builds
pnpm dev:ui         # local dev server with hot-reload events
pnpm test
```

### Install Into Paperclip

```bash
npx paperclipai plugin install ./
```

### Build Options

- `pnpm build` uses esbuild presets from `@paperclipai/plugin-sdk/bundlers`.
- `pnpm build:rollup` uses rollup presets from the same SDK.

---

## ⚙️ 技术栈

- Runtime: Node.js
- Plugin SDK: `@paperclipai/plugin-sdk`
- Bundlers: esbuild, rollup