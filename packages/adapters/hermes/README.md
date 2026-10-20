---
title: "Hermes Agent Adapter"
tags: ["adapters", "hermes", "agent", "nous-research", "cli", "gateway"]
category: "packages"
created: "2024-01-01"
updated: "2026-10-20"
source: "external"
type: "index"
status: "stable"
lifecycle: "active"
---

# Paperclip Adapters for Hermes Agent

---

## 💡 概述

A [Paperclip](https://paperclip.ing) adapter package that lets you run [Hermes Agent](https://github.com/NousResearch/hermes-agent) as a managed employee in a Paperclip company.

Hermes Agent is a full-featured AI agent by [Nous Research](https://nousresearch.com) with 30+ native tools, persistent memory, session persistence, 80+ skills, MCP support, and multi-provider model access.

This package owns both built-in Hermes adapter types:

- `hermes_local` runs the local Hermes CLI as a child process. The package root exports remain compatible with the original local adapter.
- `hermes_gateway` calls an already-running Hermes API server over HTTP/SSE. Gateway entrypoints live under the `./gateway` export namespace.

Choose `hermes_local` when Paperclip and Hermes run on the same trusted host
and Paperclip should start `hermes chat` for each heartbeat. Choose
`hermes_gateway` when Hermes is already running as an API server, often on
another host, in Docker, or behind a private-network/TLS endpoint. The adapter
type keys did not change during package consolidation.

---

## ⚡ 功能

### Key Features

- **8 inference providers** — Anthropic, OpenRouter, OpenAI, Nous, OpenAI Codex, ZAI, Kimi Coding, MiniMax
- **Skills integration** — Scans both Paperclip-managed and Hermes-native skills (`~/.hermes/skills/`), with sync/list/resolve APIs
- **Structured transcript parsing** — Raw Hermes stdout is parsed into typed `TranscriptEntry` objects so Paperclip renders proper tool cards with status icons and expand/collapse
- **Rich post-processing** — Converts Hermes ASCII banners, setext headings, and `+--+` table borders into clean GFM markdown
- **Comment-driven wakes** — Agents wake to respond to issue comments, not just task assignments
- **Auto model detection** — Reads `~/.hermes/config.yaml` to pre-populate the UI with the user's configured model
- **Session codec** — Structured validation and migration of session state across heartbeats
- **Benign stderr reclassification** — MCP init messages and structured logs are reclassified so they don't appear as errors in the UI
- **Session source tagging** — Sessions are tagged as `tool` source so they don't clutter the user's interactive history
- **Filesystem checkpoints** — Optional `--checkpoints` for rollback safety
- **Thinking effort control** — Passes `--reasoning-effort` for thinking/reasoning models

### Hermes Agent Capabilities

| Feature | Claude Code | Codex | Hermes Agent |
|---------|------------|-------|-------------|
| Persistent memory | ❌ | ❌ | ✅ Remembers across sessions |
| Native tools | ~5 | ~5 | 30+ (terminal, file, web, browser, vision, git, etc.) |
| Skills system | ❌ | ❌ | ✅ 80+ loadable skills |
| Session search | ❌ | ❌ | ✅ FTS5 search over past conversations |
| Sub-agent delegation | ❌ | ❌ | ✅ Parallel sub-tasks |
| Context compression | ❌ | ❌ | ✅ Auto-compresses long conversations |
| MCP client | ❌ | ❌ | ✅ Connect to any MCP server |
| Multi-provider | Anthropic only | OpenAI only | ✅ 8 providers out of the box |

---

## 🏛️ 设计

### Architecture

```
Paperclip                          Hermes Agent
┌──────────────────┐               ┌──────────────────┐
│  Heartbeat       │               │                  │
│  Scheduler       │───execute()──▶│  hermes chat -q  │
│                  │               │                  │
│  Issue System    │               │  30+ Tools       │
│  Comment Wakes   │◀──results─────│  Memory System   │
│                  │               │  Session DB      │
│  Cost Tracking   │               │  Skills          │
│                  │               │  MCP Client      │
│  Skill Sync      │◀──snapshot────│  ~/.hermes/skills│
│  Org Chart       │               │                  │
└──────────────────┘               └──────────────────┘
```

The adapter spawns Hermes Agent's CLI in single-query mode (`-q`). Hermes
processes the task using its full tool suite, then exits. The adapter:

1. **Captures** stdout/stderr and parses token usage, session IDs, and cost
2. **Parses** raw output into structured `TranscriptEntry` objects (tool cards with status icons)
3. **Post-processes** Hermes ASCII formatting (banners, setext headings, table borders) into clean GFM markdown
4. **Reclassifies** benign stderr (MCP init, structured logs) so they don't show as errors
5. **Tags** sessions as `tool` source to keep them separate from interactive usage
6. **Reports** results back to Paperclip with cost, usage, and session state

Session persistence works via Hermes's `--resume` flag — each run picks
up where the last one left off, maintaining conversation context,
memories, and tool state across heartbeats. The `sessionCodec` validates
and migrates session state between runs.

### Managed instructions and resumed turns

The local adapter reads `instructionsFilePath` on every run. It sends that
bundle, its relative-reference base directory, and the standard Paperclip API
guidance through Hermes's native `HERMES_EPHEMERAL_SYSTEM_PROMPT` overlay.
Hermes applies this overlay at each model request, including after context
compression. It does not append the overlay to saved user turns. This requires
a Hermes CLI that supports the [documented environment hook](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/reference/environment-variables.md).

Fresh sessions, resumed sessions, and session resets all receive the current
bundle. Edits take effect on the next run; removing the bundle removes it from
the next overlay. The server's session compatibility and conversation generation
checks still control session reuse. A missing or failed resume remains a failed
run and requires an explicit session reset; it does not automatically restart
work. The next fresh run receives the complete current instruction overlay.

The `-q` user turn contains current runtime identity, task/wake context, handoff
content, and the rendered custom `promptTemplate`, if configured. Custom templates
run on every normal wake. `quiet` changes CLI display only. Disabling persistence
uses full fresh-session context even if old session parameters are supplied.

An explicit `HERMES_EPHEMERAL_SYSTEM_PROMPT` in `env` is preserved before the
Paperclip overlay. Hermes gives this environment hook precedence over its profile's
configured personality/system prompt.

### Skills Integration

The adapter scans two skill sources and merges them:

- **Paperclip-managed skills** — bundled with the adapter, togglable from the UI
- **Hermes-native skills** — from `~/.hermes/skills/`, read-only, always loaded

The `listSkills` / `syncSkills` APIs expose a unified snapshot so the
Paperclip UI can display both managed and native skills in one view.

---

## 📊 指标

### Configuration Reference

#### Core

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `model` | string | `anthropic/claude-sonnet-4` | Model in `provider/model` format |
| `provider` | string | *(auto-detected)* | API provider: `auto`, `openrouter`, `nous`, `openai-codex`, `zai`, `kimi-coding`, `minimax`, `minimax-cn` |
| `timeoutSec` | number | `300` | Execution timeout in seconds |
| `graceSec` | number | `10` | Grace period before SIGKILL |

#### Tools

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `toolsets` | string | *(all)* | Comma-separated toolsets to enable (e.g. `"terminal,file,web"`) |

Available toolsets: `terminal`, `file`, `web`, `browser`, `code_execution`, `vision`, `mcp`, `creative`, `productivity`

#### Session & Workspace

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `cwd` | string | *(assigned task workspace)* | Absolute working directory override |
| `persistSession` | boolean | `true` | Resume sessions across heartbeats |
| `worktreeMode` | boolean | `false` | Git worktree isolation |
| `checkpoints` | boolean | `false` | Enable filesystem checkpoints for rollback |

#### Advanced

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `hermesCommand` | string | `hermes` | Custom CLI binary path |
| `verbose` | boolean | `false` | Enable verbose output |
| `quiet` | boolean | `true` | Quiet mode (clean output, no banner/spinner) |
| `extraArgs` | string[] | `[]` | Additional CLI arguments |
| `env` | object | `{}` | Extra environment variables |
| `promptTemplate` | string | *(built-in)* | Custom prompt template |
| `paperclipApiUrl` | string | `http://127.0.0.1:3100/api` | Paperclip API base URL |

#### Prompt Template Variables

Use `{{variable}}` syntax in `promptTemplate`:

| Variable | Description |
|----------|-------------|
| `{{agentId}}` | Paperclip agent ID |
| `{{agentName}}` | Agent display name |
| `{{companyId}}` | Company ID |
| `{{companyName}}` | Company name |
| `{{runId}}` | Current heartbeat run ID |
| `{{taskId}}` | Assigned task/issue ID |
| `{{taskTitle}}` | Task title |
| `{{taskBody}}` | Task instructions |
| `{{projectName}}` | Project name |
| `{{paperclipApiUrl}}` | Paperclip API base URL |
| `{{commentId}}` | Comment ID (when woken by a comment) |
| `{{wakeReason}}` | Reason this run was triggered |

Conditional sections:

- `{{#taskId}}...{{/taskId}}` — included only when a task is assigned
- `{{#noTask}}...{{/noTask}}` — included only when no task (heartbeat check)
- `{{#commentId}}...{{/commentId}}` — included only when woken by a comment

---

## 📁 目录

```
packages/adapters/hermes/
├── README.md                              # This file
├── package.json                           # Package metadata
├── LICENSE                                # MIT license
├── src/
│   ├── server/
│   │   ├── execute.instructions.test.ts   # Credential-free capture-process tests
│   │   └── index.ts                       # Server adapter implementation
│   ├── gateway/                           # Gateway adapter entrypoints
│   ├── cli/                               # CLI entrypoints
│   ├── ui/                                # UI entrypoints
│   └── ui-parser/                         # Transcript parser
└── dist/                                  # Compiled output
```

---

## 🔗 资源

- [Hermes Agent](https://github.com/NousResearch/hermes-agent) — The AI agent this adapter runs
- [Paperclip](https://github.com/paperclipai/paperclip) — The orchestration platform
- [Nous Research](https://nousresearch.com) — The team behind Hermes
- [Paperclip Docs](https://docs.paperclip.ing) — Paperclip documentation
- [Hermes Gateway Compatibility Shim](../hermes-gateway/README.md) — Deprecated gateway package
- [Hermes environment variables](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/reference/environment-variables.md)

---

## 🚀 快速开始

### Prerequisites

- [Hermes Agent](https://github.com/NousResearch/hermes-agent) installed (`pip install hermes-agent`)
- Python 3.10+
- At least one LLM API key (Anthropic, OpenRouter, or OpenAI)

### 1. Optional: override the built-in for adapter development

For local adapter development, install the package from a local path in Adapter
manager, or add an entry to `~/.paperclip/adapter-plugins.json` and restart
Paperclip:

```json
[
  {
    "packageName": "@paperclipai/hermes-paperclip-adapter",
    "localPath": "/absolute/path/to/paperclip/packages/adapters/hermes",
    "type": "hermes_local",
    "installedAt": "2026-06-23T00:00:00.000Z"
  }
]
```

Use `"type": "hermes_gateway"` with the same package when testing a gateway override.

### 2. Create a local Hermes agent in Paperclip

In the Paperclip UI or via API, create an agent with adapter type `hermes_local`:

```json
{
  "name": "Hermes Engineer",
  "adapterType": "hermes_local",
  "adapterConfig": {
    "model": "anthropic/claude-sonnet-4",
    "maxIterations": 50,
    "timeoutSec": 300,
    "persistSession": true,
    "enabledToolsets": ["terminal", "file", "web"]
  }
}
```

This mode shells out to the local `hermes` CLI. Paperclip injects runtime
environment variables and captures stdout/stderr from the child process.

### 3. Create a Hermes gateway agent in Paperclip

Start Hermes with its API server enabled first:

```bash
API_SERVER_ENABLED=true \
API_SERVER_KEY=<generated-secret> \
hermes gateway run --replace --accept-hooks
```

Then create an agent with adapter type `hermes_gateway`:

```json
{
  "name": "Hermes Gateway Engineer",
  "adapterType": "hermes_gateway",
  "adapterConfig": {
    "apiBaseUrl": "http://127.0.0.1:8642",
    "apiKey": "<same-value-as-API_SERVER_KEY>",
    "paperclipApiUrl": "http://127.0.0.1:3100",
    "sessionKeyStrategy": "issue",
    "timeoutSec": 600
  }
}
```

If the URL you have is the default Hermes dashboard at `http://127.0.0.1:9119` or the default chat URL at `http://127.0.0.1:9119/chat`, Paperclip maps it to `http://127.0.0.1:9119/api` before calling Hermes API routes.

### 4. Assign work

Create issues in Paperclip and assign them to your Hermes agent. On each heartbeat, Hermes will:

1. Receive the task instructions
2. Use its full tool suite to complete the work
3. Report results back to Paperclip
4. Persist session state for continuity

### Runtime API guidance

Hermes receives Paperclip runtime identity through environment variables:

- `PAPERCLIP_API_URL`
- `PAPERCLIP_API_KEY`
- `PAPERCLIP_RUN_ID`

Prompts should reference those variables directly. Use `Authorization: Bearer $PAPERCLIP_API_KEY` on Paperclip API requests and `X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID` on mutating issue requests.

### Hermes-originated Paperclip tasks

The package includes a Hermes skill/helper for the reverse direction: a user starts in Hermes and asks Hermes to create or update Paperclip work.

Configure Paperclip access in Hermes env/profile secrets:

```bash
PAPERCLIP_API_URL=http://127.0.0.1:3100/api
PAPERCLIP_BRIDGE_API_KEY=<task-bridge-scoped-agent-api-key>
```

Optional env values: `PAPERCLIP_COMPANY_ID`, `PAPERCLIP_AGENT_ID`, `PAPERCLIP_RUN_ID`.

The bundled `paperclip-task-bridge` skill provides deterministic helper commands:

```bash
node ./paperclip-task.mjs list-assigned
node ./paperclip-task.mjs create-task --parent-id "<approved-parent-issue-id>" --title "Investigate checkout failures"
node ./paperclip-task.mjs comment --issue PAP-123 --body "Found the failing request path."
node ./paperclip-task.mjs update-status --issue PAP-123 --status in_review --comment "Ready for review."
```

Create the bridge key with `scope.kind = "task_bridge"` plus a `parentIssueId` or `projectId` boundary. Do not use a normal claimed agent API key for internet-facing Hermes chat/webhook task-bridge operations.

### Development

```bash
git clone https://github.com/paperclipai/paperclip
cd paperclip/packages/adapters/hermes
pnpm install
pnpm build
```

Run the credential-free capture-process regression tests with:

```sh
pnpm --filter @paperclipai/hermes-paperclip-adapter test -- src/server/execute.instructions.test.ts
```

---

## ⚙️ 技术栈

| Layer | Technology |
|-------|-----------|
| Package name | `@paperclipai/hermes-paperclip-adapter` |
| Language | TypeScript |
| Runtime | Node.js |
| Agent CLI | Hermes Agent (Python, `pip install hermes-agent`) |
| Adapter types | `hermes_local` (child process), `hermes_gateway` (HTTP/SSE) |
| Models | Anthropic, OpenRouter, OpenAI, Nous, Codex, ZAI, Kimi Coding, MiniMax |
| Session persistence | Hermes `--resume` flag + session codec |
| Skills | Paperclip-managed + Hermes-native (`~/.hermes/skills/`) |

### License

MIT — see [LICENSE](LICENSE)