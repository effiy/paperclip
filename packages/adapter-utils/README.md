---
title: "@paperclipai/adapter-utils"
tags: ["adapters", "utilities", "sandbox", "ssh", "workspace-sync"]
category: "packages"
created: "2024-01-01"
updated: "2026-10-20"
source: "external"
type: "index"
status: "stable"
lifecycle: "active"
---

# @paperclipai/adapter-utils

---

## 💡 概述

Shared utilities for Paperclip adapters: process spawning, environment
injection, sandbox/SSH transport, workspace sync, and the round-trip helpers
that move code between the local execution-workspace cwd and wherever the
agent actually runs.

For the adapter-author guide see
[`docs/adapters/creating-an-adapter.md`](../../docs/adapters/creating-an-adapter.md)
and the in-repo notes at [`packages/adapters/AUTHORING.md`](../adapters/AUTHORING.md).

---

## ⚡ 功能

### Core capabilities

- **Process spawning and environment injection** for adapter harnesses
- **Sandbox/SSH transport** helpers
- **Workspace sync** between local cwd and remote execution hosts
- **Round-trip helpers** for per-run remote workspace management
- **Duplex observability** recording
- **ACPX engine startup timing** support

### No-remote-git contract

The local execution-workspace cwd is the only persistence boundary across
runs. No adapter may depend on a git remote for cross-run state.

Adapters that run the agent on a different host should use the SSH round-trip
helpers in [`src/ssh.ts`](./src/ssh.ts):

- `prepareWorkspaceForSshExecution({ spec, localDir, remoteDir })` — bundles
  the local cwd (tracked files, dirty edits, untracked additions, and the git
  history needed to reconstruct it) to `remoteDir` before the run starts. Runs
  with no `git remote` configured.
- `restoreWorkspaceFromSshExecution({ spec, localDir, remoteDir, ... })` —
  syncs the remote cwd back into `localDir` after the run, including any new
  commits the agent created. Also runs with no `git remote` configured.

`prepareRemoteManagedRuntime` in
[`src/remote-managed-runtime.ts`](./src/remote-managed-runtime.ts) wraps both
calls for adapters that want a per-run remote workspace and an automatic
`restoreWorkspace()` finally hook.

---

## 🏛️ 设计

### Sandbox bridge deadlines

Command-managed bridge control operations (queue reads, input delivery, setup,
and cleanup) have a host-enforced deadline of at most 30 seconds per shell
command. A shorter configured timeout still applies. These operations cannot
inherit the agent run's hours-long lifetime or wait forever on a provider that
ignores its timeout. Long-lived agent session commands keep their own limits.

A control timeout reports a transport failure. It does not prove that the
remote command stopped and does not replay an uncertain write. The process
session closes failed input delivery and uses its existing shutdown path;
normal execution settlement must still verify termination.

### No-remote-git invariant test

The invariant is pinned by the `no-remote-git contract` case in
[`src/ssh-fixture.test.ts`](./src/ssh-fixture.test.ts), which asserts that a
remote-only commit propagates to the local worktree through the
prepare -> restore round-trip with no git remote configured at any point. Do
not regress that test.

---

## 📁 目录

```
packages/adapter-utils/
├── README.md                    # This file
├── package.json                 # Package metadata
├── src/
│   ├── ssh.ts                   # SSH round-trip helpers
│   ├── ssh-fixture.test.ts      # No-remote-git contract test
│   ├── remote-managed-runtime.ts # Managed runtime wrapper
│   ├── duplex-observability.ts  # Observability recording
│   └── acpx-engine/
│       └── startup-timing.ts    # ACPX engine startup timing
└── dist/                        # Compiled output
```

---

## 🔗 资源

### Related documentation

- [Creating an adapter](../../docs/adapters/creating-an-adapter.md) — Adapter author guide
- [Adapter authoring notes](../adapters/AUTHORING.md) — In-repo adapter conventions
- [OpenClaw gateway adapter](../adapters/openclaw-gateway/README.md) — Uses the no-remote-git contract

---

## 🚀 快速开始

### Using SSH round-trip helpers

```typescript
import {
  prepareWorkspaceForSshExecution,
  restoreWorkspaceFromSshExecution,
} from '@paperclipai/adapter-utils';

// Before a remote run:
await prepareWorkspaceForSshExecution({
  spec: runSpec,
  localDir: '/path/to/workspace',
  remoteDir: '/remote/path',
});

// After the run completes:
await restoreWorkspaceFromSshExecution({
  spec: runSpec,
  localDir: '/path/to/workspace',
  remoteDir: '/remote/path',
});
```

### Using managed runtime wrapper

```typescript
import { prepareRemoteManagedRuntime } from '@paperclipai/adapter-utils';

await prepareRemoteManagedRuntime(runSpec, async () => {
  // Your adapter's run logic here
  // restoreWorkspace() is called automatically in a finally hook
});
```

---

## ⚙️ 技术栈

| Layer | Technology |
|-------|-----------|
| Language | TypeScript |
| Transport | SSH, sandbox, local process |
| Persistence | Git-based workspace synchronization (no remote dependency) |
| Testing | Vitest (`ssh-fixture.test.ts`) |
| Observability | OpenTelemetry span attributes |
| Package name | `@paperclipai/adapter-utils` |