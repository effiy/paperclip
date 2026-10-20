---
title: "Plugin Orchestration Smoke Example"
tags: ["plugin", "orchestration", "smoke-test", "paperclip"]
category: "plugin-example"
created: "2024-01-01"
updated: "2026-10-20"
source: "external"
type: "index"
status: "stable"
lifecycle: "active"
---

# Plugin Orchestration Smoke Example

---

## 💡 概述

This first-party example validates the orchestration-grade plugin host surface.
It is intentionally small and exists as an acceptance fixture rather than a
product plugin.

---

## ⚡ 功能

- `apiRoutes` under `/api/plugins/:pluginId/api/*`
- restricted database migrations and runtime `ctx.db`
- plugin-owned rows joined to `public.issues`
- plugin-created child issues with namespaced origin metadata
- billing codes, workspace inheritance, blocker relations, documents, wakeups,
  and orchestration summaries
- issue detail and settings UI slots that surface route, capability, namespace,
  and smoke status

---

## 📊 指标

待补充

---

## 🏛️ 设计

待补充

---

## 📁 目录

待补充

---

## 🔗 资源

待补充

---

## 🚀 快速开始

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

### Install Into Paperclip

Use an absolute local path during development:

```bash
curl -X POST http://127.0.0.1:3100/api/plugins/install \
  -H "Content-Type: application/json" \
  -d '{"packageName":"/absolute/path/to/paperclip/packages/plugins/examples/plugin-orchestration-smoke-example","isLocalPath":true}'
```

### Scoped Route Smoke

After the plugin is ready, run the scoped route against an existing issue:

```bash
curl -X POST http://127.0.0.1:3100/api/plugins/paperclipai.plugin-orchestration-smoke-example/api/issues/<issue-id>/smoke \
  -H "Content-Type: application/json" \
  -d '{"assigneeAgentId":"<agent-id>"}'
```

The route returns the generated child issue, resolved blocker, billing code,
subtree ids, and wakeup result.

---

## ⚙️ 技术栈

- Paperclip Plugin SDK
- TypeScript
- Express-compatible API routes
- Database migrations (Paperclip DB namespace)