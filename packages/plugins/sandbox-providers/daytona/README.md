---
title: "Daytona Sandbox Provider Plugin"
tags: ["daytona", "sandbox", "provider", "plugin", "paperclip"]
category: "sandbox-provider"
created: "2024-01-01"
updated: "2026-10-20"
source: "external"
type: "index"
status: "stable"
lifecycle: "active"
---

# `@paperclipai/plugin-daytona`

---

## 💡 概述

Published Daytona sandbox provider plugin for Paperclip.

This package lives in the Paperclip monorepo, but it is intentionally excluded from the root `pnpm` workspace and shaped to publish and install like a standalone npm package. That lets operators install it from the Plugins page by package name without introducing root lockfile churn for Daytona's SDK dependencies.

---

## ⚡ 功能

### Reusable and non-reusable leases

- Reusable leases map to Daytona stop/start semantics. Non-reusable leases are deleted on release. A provider-resolved `target` does not change the identity of an existing sandbox. Release closes the same scoped lease that a later sentinel-verified resume reopens.

### Session log recovery

- A session log socket can close while its command still runs. The driver requires a recorded command exit before returning a completed execution. It reconnects the log stream once, then polls status and log snapshots at most once per second. Replayed output is removed by byte offset, new output continues to reach the host, and the command is never dispatched again.
- A socket that delivers no output for 15 seconds switches directly to polling, even if the socket stays open or its initial connection never completes.
- Late callbacks from that socket are ignored. This recovers pending permission requests and cancellation results from saved output without replaying the command.

### Sandbox lifecycle

- Each cold create uses a unique provider name and ownership labels. If creation fails after Daytona has allocated a sandbox, the driver looks up that exact name, checks every ownership label, and waits for deletion.
- Failed, missing, or timed-out lookups and failed deletions report unconfirmed cleanup with the provider name; they never return a usable lease.
- A missing name lookup after an uncertain create is not proof that a delayed provider request cannot create a resource.
- For plugin-backed sandbox lease acquisition, unresolved creation cleanup crosses the worker RPC as a validated ownership envelope.
- A sandbox record can survive the loss of its underlying container. Resume treats it as expired only when a fresh provider read confirms the exact missing-container error for that sandbox and marks it unrecoverable.

### SDK behavior

- The SDK returns full log snapshots, so fallback bandwidth grows with retained output; it has no paged snapshot or stream cancellation API.
- A recovery-read timeout keeps partial output and explicitly reports whether command exit remains unconfirmed; it does not prove the remote command stopped.
- A final snapshot reconciles bytes missed by the stream before returning a recorded exit.
- The current published Daytona SDK package is `@daytonaio/sdk`.

---

## 📊 指标

待补充

---

## 🏛️ 设计

### Configuration

Configure Daytona from `Instance Settings -> Environments`, not from the plugin's plugin page.

- Put the Daytona API key on the sandbox environment itself.
- When you save an environment, Paperclip stores pasted API keys as company secrets.
- `DAYTONA_API_KEY` remains an optional host-level fallback when an environment omits the key.
- Optional `apiUrl` and `target` settings map directly to the Daytona SDK/client configuration. If `apiUrl` is omitted, the Daytona SDK uses its default endpoint.
- The driver supports both `snapshot`-based and `image`-based sandbox creation. If both are set, validation rejects the config as ambiguous.

### Package layout

- `src/manifest.ts` declares the sandbox-provider driver metadata
- `src/plugin.ts` implements the environment lifecycle hooks
- `paperclipPlugin.manifest` and `paperclipPlugin.worker` point the host at the built plugin entrypoints in `dist/`

---

## 📁 目录

待补充

---

## 🔗 资源

- [Daytona SDK](https://www.npmjs.com/package/@daytonaio/sdk)

---

## 🚀 快速开始

### Install

From a Paperclip instance, install:

```text
@paperclipai/plugin-daytona
```

The host plugin installer runs `npm install` into the managed plugin directory, so transitive dependencies such as `@daytonaio/sdk` are pulled in during installation.

### Local development

```bash
cd packages/plugins/sandbox-providers/daytona
pnpm install --ignore-workspace --no-lockfile
pnpm build
pnpm test
pnpm typecheck
```

These commands assume the repo root has already been installed once so the local `@paperclipai/plugin-sdk` workspace package is available to the compiler during development.

---

## ⚙️ 技术栈

- Paperclip Plugin SDK
- `@daytonaio/sdk`
- TypeScript
- pnpm (standalone package, excluded from monorepo workspace)