---
title: "Cloudflare Sandbox Provider Plugin"
tags: ["cloudflare", "sandbox", "provider", "plugin", "paperclip"]
category: "sandbox-provider"
created: "2024-01-01"
updated: "2026-10-20"
source: "external"
type: "index"
status: "stable"
lifecycle: "active"
---

# `@paperclipai/plugin-cloudflare-sandbox`

---

## 💡 概述

Published Cloudflare sandbox provider plugin for Paperclip.

This package lives in the Paperclip monorepo, but it is intentionally excluded from the root `pnpm` workspace and shaped to publish and install like a standalone npm package. Operators can install it from the Plugins page by package name, and the host will fetch its dependencies at install time without adding lockfile churn to the Paperclip repo.

---

## ⚡ 功能

待补充

---

## 📊 指标

待补充

---

## 🏛️ 设计

### Configuration

The environment uses core `driver: "sandbox"` with `provider: "cloudflare"`.

Required fields:

- `bridgeBaseUrl`
- `bridgeAuthToken`

Important validation rules:

- `reuseLease: true` requires `keepAlive: true`
- non-local `bridgeBaseUrl` values must be `https://`
- `sessionId` is required when `sessionStrategy` is `named`

Pasted auth tokens are stored by Paperclip as company secrets because the manifest marks `bridgeAuthToken` as a `secret-ref` field.

### Bridge template

The package includes an operator-facing Cloudflare Worker scaffold under [bridge-template](./bridge-template). That template uses `@cloudflare/sandbox`, a `Sandbox` Durable Object binding, and a small JSON HTTP surface under `/api/paperclip-sandbox/v1`.

---

## 📁 目录

待补充

---

## 🔗 资源

- [Bridge template](./bridge-template)

---

## 🚀 快速开始

### Install

From a Paperclip instance, install:

```text
@paperclipai/plugin-cloudflare-sandbox
```

Configure Cloudflare from `Instance Settings -> Environments`, not from the plugin's plugin page.

### Local development

```bash
cd packages/plugins/sandbox-providers/cloudflare
pnpm install --ignore-workspace --no-lockfile
pnpm build
pnpm test
pnpm typecheck
```

These commands assume the repo root has already been installed once so the local `@paperclipai/plugin-sdk` workspace package is available to the compiler during development.

---

## ⚙️ 技术栈

- Paperclip Plugin SDK
- Cloudflare Workers / Sandbox SDK
- TypeScript
- pnpm (standalone package, excluded from monorepo workspace)