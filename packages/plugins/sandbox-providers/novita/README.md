---
title: "Novita Agent Sandbox Provider Plugin"
tags: ["novita", "sandbox", "provider", "plugin", "paperclip"]
category: "sandbox-provider"
created: "2024-01-01"
updated: "2026-10-20"
source: "external"
type: "index"
status: "stable"
lifecycle: "active"
---

# `@paperclipai/plugin-novita-sandbox`

---

## 💡 概述

Published Novita Agent Sandbox provider plugin for Paperclip.

This package lives in the Paperclip monorepo, but it is intentionally excluded from the root `pnpm` workspace and shaped to publish and install like a standalone npm package. That means operators can install it from the Plugins page by package name, and the host will fetch its transitive dependencies at install time without adding lockfile churn to the Paperclip repo.

---

## ⚡ 功能

待补充

---

## 📊 指标

待补充

---

## 🏛️ 设计

### Configuration

Configure Novita from `Instance Settings -> Environments`, not from the plugin's plugin page.

- Put the Novita API key on the sandbox environment itself.
- When you save an environment, Paperclip stores pasted API keys as company secrets.
- `NOVITA_API_KEY` remains an optional host-level fallback when an environment omits the key.

### Package layout

- `src/manifest.ts` declares the sandbox-provider driver metadata
- `src/plugin.ts` implements the environment lifecycle hooks
- `src/worker.ts` boots the plugin under the host worker runtime
- `paperclipPlugin.manifest` and `paperclipPlugin.worker` point the host at the built plugin entrypoints in `dist/`

---

## 📁 目录

待补充

---

## 🔗 资源

待补充

---

## 🚀 快速开始

### Install

From a Paperclip instance, install:

```text
@paperclipai/plugin-novita-sandbox
```

The host plugin installer runs `npm install` into the managed plugin directory, so package dependencies such as `novita-sandbox` are pulled in during installation.

### Local development

```bash
cd packages/plugins/sandbox-providers/novita
pnpm install --ignore-workspace --no-lockfile
pnpm build
pnpm test
pnpm typecheck
```

These commands assume the repo root has already been installed once so the local `@paperclipai/plugin-sdk` workspace package is available to the compiler during development.

---

## ⚙️ 技术栈

- Paperclip Plugin SDK
- `novita-sandbox` SDK
- TypeScript
- pnpm (standalone package, excluded from monorepo workspace)