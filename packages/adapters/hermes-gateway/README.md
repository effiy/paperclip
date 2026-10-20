---
title: "Hermes Gateway Adapter Compatibility Shim"
tags: ["adapters", "hermes-gateway", "deprecated", "shim"]
category: "packages"
created: "2024-01-01"
updated: "2026-10-20"
source: "external"
type: "index"
status: "deprecated"
lifecycle: "sunsetting"
---

# Hermes Gateway Adapter Compatibility Shim

---

## 💡 概述

`@paperclipai/adapter-hermes-gateway` is a deprecated compatibility shim.

Use `@paperclipai/hermes-paperclip-adapter` for new installs and import gateway
entrypoints from `@paperclipai/hermes-paperclip-adapter/gateway`. The adapter
type remains `hermes_gateway`; only package ownership changed.

`hermes_gateway` is for an already-running Hermes API server. It does not start
the local Hermes CLI. If Paperclip should launch local `hermes chat` as a child
process, use `hermes_local` from `@paperclipai/hermes-paperclip-adapter`
instead.

---

## ⚡ 功能

The shim preserves the legacy exports for one release:

- `.`
- `./server`
- `./ui`
- `./cli`
- `./ui-parser`

These exports forward to the unified Hermes package. Existing
`@paperclipai/adapter-hermes-gateway` plugin installs should continue to load
during the compatibility window, but should migrate to
`@paperclipai/hermes-paperclip-adapter` before the shim is removed.

---

## 📊 指标

「待补充」

---

## 🏛️ 设计

### Migration path

| Old package | New package | Notes |
|------------|-------------|-------|
| `@paperclipai/adapter-hermes-gateway` | `@paperclipai/hermes-paperclip-adapter` | Import gateway entrypoints from `@paperclipai/hermes-paperclip-adapter/gateway` |
| Adapter type `hermes_gateway` | Adapter type `hermes_gateway` | Unchanged — only package ownership changed |

---

## 📁 目录

```
packages/adapters/hermes-gateway/
├── README.md              # This file
├── package.json           # Shim package metadata
├── src/
│   └── index.ts           # Re-exports from hermes-paperclip-adapter
└── dist/                  # Compiled output
```

---

## 🔗 资源

### Related packages

- [@paperclipai/hermes-paperclip-adapter](../hermes/README.md) — The unified replacement package supporting both `hermes_local` and `hermes_gateway` adapter types
- [Hermes Agent](https://github.com/NousResearch/hermes-agent) — The AI agent

---

## 🚀 快速开始

### Migration

Existing `@paperclipai/adapter-hermes-gateway` plugin installs should load during the compatibility window. Migrate by:

1. Replace `@paperclipai/adapter-hermes-gateway` with `@paperclipai/hermes-paperclip-adapter` in your adapter plugin configuration
2. Update gateway imports to use `@paperclipai/hermes-paperclip-adapter/gateway`
3. The adapter type `hermes_gateway` remains unchanged

---

## ⚙️ 技术栈

| Layer | Technology |
|-------|-----------|
| Package type | Compatibility shim |
| Forwarding target | `@paperclipai/hermes-paperclip-adapter` |
| Exports | `.`, `./server`, `./ui`, `./cli`, `./ui-parser` |
| Status | Deprecated — will be removed after one release |