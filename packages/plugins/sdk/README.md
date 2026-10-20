---
title: "Paperclip Plugin SDK"
tags: ["plugin", "sdk", "paperclip", "typescript", "react"]
category: "plugin"
created: "2024-01-01"
updated: "2026-10-20"
source: "external"
type: "index"
status: "stable"
lifecycle: "active"
---

# @paperclipai/plugin-sdk

## 💡 概述

Official TypeScript SDK for Paperclip plugin authors.

- **Worker SDK:** `@paperclipai/plugin-sdk` -- `definePlugin`, context, lifecycle
- **UI SDK:** `@paperclipai/plugin-sdk/ui` -- React hooks and slot props
- **Testing:** `@paperclipai/plugin-sdk/testing` -- in-memory host harness
- **Bundlers:** `@paperclipai/plugin-sdk/bundlers` -- esbuild/rollup presets
- **Dev server:** `@paperclipai/plugin-sdk/dev-server` -- static UI server + SSE reload

Reference: `doc/plugins/PLUGIN_SPEC.md`

---

## ⚡ 功能

### Package surface

| Import | Purpose |
|--------|--------|
| `@paperclipai/plugin-sdk` | Worker entry: `definePlugin`, `runWorker`, context types, protocol helpers |
| `@paperclipai/plugin-sdk/ui` | UI entry: hooks, host navigation, HTTP-safe clipboard copy, shared components, and slot prop types |
| `@paperclipai/plugin-sdk/ui/hooks` | Hooks only |
| `@paperclipai/plugin-sdk/ui/types` | UI types and slot prop interfaces |
| `@paperclipai/plugin-sdk/testing` | `createTestHarness` for unit/integration tests |
| `@paperclipai/plugin-sdk/bundlers` | `createPluginBundlerPresets` for worker/manifest/ui builds |
| `@paperclipai/plugin-sdk/dev-server` | `startPluginDevServer`, `getUiBuildSnapshot` |
| `@paperclipai/plugin-sdk/protocol` | JSON-RPC protocol types and helpers (advanced) |
| `@paperclipai/plugin-sdk/types` | Worker context and API types (advanced) |

### Manifest entrypoints

In your plugin manifest you declare:

- **`entrypoints.worker`** (required) -- Path to the worker bundle (e.g. `dist/worker.js`). The host loads this and calls `setup(ctx)`.
- **`entrypoints.ui`** (required if you use UI) -- Path to the UI bundle directory. The host loads components from here for slots and launchers.

### Worker lifecycle and context

**Lifecycle (definePlugin):**

| Hook | Purpose |
|------|--------|
| `setup(ctx)` | **Required.** Called once at startup. Register event handlers, jobs, data/actions/tools, etc. |
| `onHealth?()` | Optional. Return `{ status, message?, details? }` for health dashboard. |
| `onConfigChanged?(newConfig)` | Optional. Apply new config without restart; if omitted, host restarts worker. |
| `onShutdown?()` | Optional. Clean up before process exit (limited time window). |
| `onValidateConfig?(config)` | Optional. Return `{ ok, warnings?, errors? }` for settings UI / Test Connection. |
| `onWebhook?(input)` | Optional. Handle `POST /api/plugins/:pluginId/webhooks/:endpointKey`; required if webhooks declared. |

**Context (`ctx`) in setup:** `config`, `localFolders`, `events`, `jobs`, `launchers`, `http`, `secrets`, `activity`, `state`, `entities`, `projects`, `companies`, `issues`, `agents`, `goals`, `access`, `authorization`, `data`, `actions`, `streams`, `tools`, `metrics`, `logger`, `manifest`. Worker-side host APIs are capability-gated; declare capabilities in the manifest.

### Events

Subscribe in `setup` with `ctx.events.on(name, handler)` or `ctx.events.on(name, filter, handler)`. Emit plugin-scoped events with `ctx.events.emit(name, companyId, payload)` (requires `events.emit`).

**Core domain events (subscribe with `events.subscribe`):**

| Event | Typical entity |
|-------|-----------------|
| `company.created`, `company.updated` | company |
| `project.created`, `project.updated` | project |
| `project.workspace_created`, `project.workspace_updated`, `project.workspace_deleted` | project_workspace |
| `issue.created`, `issue.updated`, `issue.comment.created` | issue |
| `issue.document.created`, `issue.document.updated`, `issue.document.deleted` | issue |
| `issue.relations.updated`, `issue.checked_out`, `issue.released`, `issue.assignment_wakeup_requested` | issue |
| `agent.created`, `agent.updated`, `agent.status_changed` | agent |
| `agent.run.started`, `agent.run.finished`, `agent.run.failed`, `agent.run.cancelled` | run |
| `goal.created`, `goal.updated` | goal |
| `approval.created`, `approval.decided` | approval |
| `budget.incident.opened`, `budget.incident.resolved` | budget_incident |
| `cost_event.created` | cost |
| `activity.logged` | activity |

### Scheduled (recurring) jobs

Plugins can declare **scheduled jobs** that the host runs on a cron schedule. Use this for recurring tasks like syncs, digest reports, or cleanup.

1. **Capability:** Add `jobs.schedule` to `manifest.capabilities`.
2. **Declare jobs** in `manifest.jobs`: each entry has `jobKey`, `displayName`, optional `description`, and `schedule` (a 5-field cron expression).
3. **Register a handler** in `setup()` with `ctx.jobs.register(jobKey, async (job) => { ... })`.

Cron format: minute(0-59), hour(0-23), day-of-month(1-31), month(1-12), day-of-week(0-6, Sun=0).

### UI slots and launchers

Slots are mount points for plugin React components. Launchers are host-rendered entry points (buttons, menu items) that open plugin UI. Declare slots in `manifest.ui.slots` with `type`, `id`, `displayName`, `exportName`; for context-sensitive slots add `entityTypes`. Declare launchers in `manifest.ui.launchers` (or legacy `manifest.launchers`).

**Slot types / launcher placement zones:**

| Slot type / placement zone | Scope | Entity types (when context-sensitive) |
|----------------------------|-------|---------------------------------------|
| `page` | Global | -- |
| `sidebar` | Global | -- |
| `routeSidebar` | Global | -- |
| `sidebarPanel` | Global | -- |
| `settingsPage` | Global | -- |
| `dashboardWidget` | Global | -- |
| `globalToolbarButton` | Global | -- |
| `appShellOverlay` (slot only) | Signed-in application shell | -- |
| `detailTab` | Entity | `project`, `issue`, `agent`, `goal`, `run` |
| `taskDetailView` | Entity | (task/issue context) |
| `commentAnnotation` | Entity | `comment` |
| `commentContextMenuItem` | Entity | `comment` |
| `projectSidebarItem` | Entity | `project` |
| `toolbarButton` | Entity | varies by host surface |
| `contextMenuItem` | Entity | varies by host surface |

### Capabilities

Declare in `manifest.capabilities`. Grouped by scope: Company, Instance, Runtime, Agent, UI. Full list in code: import `PLUGIN_CAPABILITIES` from `@paperclipai/plugin-sdk`.

### Shared Components

Use the shared components when the plugin needs to look and behave like a native Paperclip surface:

| Component | Use when |
|---|---|
| `MarkdownBlock` | Rendering markdown from plugin or host data |
| `MarkdownEditor` | Editing markdown with the host editor treatment |
| `FileTree` | Showing serializable workspace/wiki/import paths |
| `IssuesList` | Embedding a company-scoped native issue list |
| `AssigneePicker` | Selecting an agent or board user with the same picker as the new issue pane |
| `ProjectPicker` | Selecting a project with the same picker as the new issue pane |
| `ManagedRoutinesList` | Showing plugin-managed routines in settings UI |

### External Object Reference Providers

Trusted connector plugins can declare generic external object providers in the manifest. The host owns URL scanning, sanitized canonical URLs, core storage, normalized status rendering, and issue/comment/document write durability. The plugin only identifies provider-owned objects and resolves board-safe status metadata.

### Restricted Database Namespace

Trusted orchestration plugins can declare a host-owned PostgreSQL namespace with migrations, core read tables, and runtime query/execute.

### Trusted Local Folders

Trusted local plugins can request operator-configured folders per company with validation, auto-configuration, and host-enforced access controls.

### Scoped API Routes

Manifest-declared `apiRoutes` expose JSON routes under `/api/plugins/:pluginId/api/*` without letting a plugin claim core paths.

### Issue Orchestration APIs

Workflow plugins can use `ctx.issues` for orchestration-grade issue operations without importing host server internals. Supports create/update with blockers, billing code, assignees, labels, origins; blocker relationship helpers; subtree reads with relations/documents/runs/assignees; checkout ownership assertions; assignment wakeups; orchestration summaries; and human-attributed comments.

### Real-time streaming (`ctx.streams`)

Plugins can push real-time events from the worker to the UI using server-sent events (SSE).

### Agent sessions (two-way chat)

Plugins can hold multi-turn conversational sessions with agents through `ctx.agents.sessions`.

---

## 📊 指标

「待补充」

---

## 🏛️ 设计

### Current deployment caveats

The SDK is stable enough for local development and first-party examples, but the runtime deployment model is still early.

- Plugin workers and plugin UI should both be treated as trusted code today.
- Plugin UI bundles run as same-origin JavaScript inside the main Paperclip app. They can call ordinary Paperclip HTTP APIs with the board session, so manifest capabilities are not a frontend sandbox.
- Local-path installs and the repo example plugins are development workflows. They assume the plugin source checkout exists on disk.
- For deployed plugins, publish an npm package and install that package into the Paperclip instance at runtime.
- The current host runtime expects a writable filesystem, `npm` available at runtime, and network access to the package registry used for plugin installation.
- Dynamic plugin install is currently best suited to single-node persistent deployments. Multi-instance cloud deployments still need a shared artifact/distribution model before runtime installs are reliable across nodes.
- The host ships a small shared React component kit through `@paperclipai/plugin-sdk/ui`. Use it for native Paperclip controls; custom React and CSS are still supported.
- `ctx.assets` is not part of the supported runtime in this build. Do not depend on asset upload/read APIs yet.

If you are authoring a plugin for others to deploy, treat npm-packaged installation as the supported path and treat repo-local example installs as a development convenience.

---

## 📁 目录

「待补充」

---

## 🔗 资源

- [Plugin Spec](../../doc/plugins/PLUGIN_SPEC.md)
- [Plugin Authoring Guide](../../doc/plugins/PLUGIN_AUTHORING_GUIDE.md)
- [Distribution Plugins](../../../doc/plugins/DISTRIBUTION-PLUGINS.md)

---

## 🚀 快速开始

### Install

```bash
pnpm add @paperclipai/plugin-sdk
```

### Worker quick start

```ts
import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";

const plugin = definePlugin({
  async setup(ctx) {
    ctx.events.on("issue.created", async (event) => {
      ctx.logger.info("Issue created", { issueId: event.entityId });
    });

    ctx.data.register("health", async () => ({ status: "ok" }));
    ctx.actions.register("ping", async () => ({ pong: true }));

    ctx.tools.register("calculator", {
      displayName: "Calculator",
      description: "Basic math",
      parametersSchema: {
        type: "object",
        properties: { a: { type: "number" }, b: { type: "number" } },
        required: ["a", "b"]
      }
    }, async (params) => {
      const { a, b } = params as { a: number; b: number };
      return { content: `Result: ${a + b}`, data: { result: a + b } };
    });
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
```

**Note:** `runWorker(plugin, import.meta.url)` must be called so that when the host runs your worker (e.g. `node dist/worker.js`), the RPC host starts and the process stays alive. When the file is imported (e.g. for tests), the main-module check prevents the host from starting.

### UI quick start

```tsx
import { usePluginData, usePluginAction } from "@paperclipai/plugin-sdk/ui";

export function DashboardWidget() {
  const { data } = usePluginData<{ status: string }>("health");
  const ping = usePluginAction("ping");
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <strong>Health</strong>
      <div>{data?.status ?? "unknown"}</div>
      <button onClick={() => void ping()}>Ping</button>
    </div>
  );
}
```

### Testing

```ts
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import plugin from "../src/worker.js";
import manifest from "../src/manifest.js";

const harness = createTestHarness({ manifest });
await plugin.definition.setup(harness.ctx);
await harness.emit("issue.created", { issueId: "iss_1" }, { entityId: "iss_1", entityType: "issue" });
```

### Bundler presets

```ts
import { createPluginBundlerPresets } from "@paperclipai/plugin-sdk/bundlers";

const presets = createPluginBundlerPresets({ uiEntry: "src/ui/index.tsx" });
// presets.esbuild.worker / presets.esbuild.manifest / presets.esbuild.ui
// presets.rollup.worker / presets.rollup.manifest / presets.rollup.ui
```

### Local dev server

```bash
paperclip-plugin-dev-server --root . --ui-dir dist/ui --port 4177
```

---

## ⚙️ 技术栈

- Runtime: Node.js (TypeScript)
- UI: React
- Bundlers: esbuild, rollup
- Protocol: JSON-RPC over stdio
- Real-time: SSE (Server-Sent Events)
- Testing: Vitest with in-memory harness