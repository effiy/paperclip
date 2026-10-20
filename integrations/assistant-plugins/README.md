---
title: "Paperclip Assistant Plugins"
tags: ["plugins", "openai", "claude", "assistant-plugins", "mcp"]
category: "integrations"
created: "2024-01-01"
updated: "2026-10-20"
source: "external"
type: "index"
status: "stable"
lifecycle: "active"
---

# Paperclip Assistant Plugins

---

## 💡 概述

One shared set of workflows, with packages for OpenAI (ChatGPT/Codex) and Claude.
The packages use only individually exposed first-party Paperclip tools. Agent
impersonation and generic connected-tool execution are not included.

---

## ⚡ 功能

- **Shared workflows** across OpenAI and Claude packages
- **First-party Paperclip tools only** — no agent impersonation
- **MCP endpoint** is the same for both packages
- **No lifecycle hooks, embedded UI, or client-side executors** required
- OAuth connection flow with `paperclip:read paperclip:write offline_access` scopes

---

## 🏛️ 设计

### Package structure

| Package | Output | Format |
|---------|--------|--------|
| OpenAI (ChatGPT/Codex) | `openai/paperclip/` | `plugin.json` + `mcp.json` + Codex compatibility manifest |
| Claude | `claude/paperclip/` | `.claude-plugin/plugin.json` + `.mcp.json` |

Edit workflows in `shared/skills/`, then rebuild both packages.

### Distribution

Package `openai/paperclip/` and `claude/paperclip/` separately. Before publishing,
build against the stable Paperclip-owned public endpoint and complete the
provider's review metadata, branding, privacy/support links and live tests.
Submit the Claude remote connector and workflow plugin separately, paired by
server URL. OpenAI currently supports one connected MCP server per public
plugin.

Authoritative packaging references (checked 2026-09-30):

- [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins)
- [OpenAI submission](https://developers.openai.com/plugins/deploy/submission)
- [Claude plugin structure](https://claude.com/docs/plugins/build)
- [Claude publication](https://claude.com/docs/directory/publish)

---

## 📁 目录

```
integrations/assistant-plugins/
├── README.md              # This file
├── build.mjs              # Package builder
├── shared/                # Shared workflow definitions
│   └── skills/            # Skill definitions
├── openai/                # OpenAI package output
│   └── paperclip/
│       ├── plugin.json
│       └── mcp.json
└── claude/                # Claude package output
    └── paperclip/
        ├── .claude-plugin/
        │   └── plugin.json
        └── .mcp.json
```

---

## 🔗 资源

- [Server setup and release gates](../../doc/public-mcp.md)
- [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins)
- [OpenAI submission](https://developers.openai.com/plugins/deploy/submission)
- [Claude plugin structure](https://claude.com/docs/plugins/build)
- [Claude publication](https://claude.com/docs/directory/publish)

---

## 🚀 快速开始

### Build

```sh
# Development package outputs checked into this repository:
node integrations/assistant-plugins/build.mjs

# Replace with the operator's actual deployed endpoint before testing remotely:
node integrations/assistant-plugins/build.mjs https://YOUR-PAPERCLIP-HOST/mcp/paperclip
```

The builder accepts a fixed HTTPS endpoint (HTTP loopback is allowed for local
work). It never adds credentials to packages. It does not install plugins,
register a store listing or create a team. The checked-in localhost outputs are
**development packages**, not public-store submissions.

### Configuration

Configure the client to request `paperclip:read paperclip:write offline_access` for delegation and refresh, or just `paperclip:read` for a read-only connection. The person may decline write access during consent. Use each client's normal OAuth connection flow; do not put agent keys or browser cookies into plugin manifests.

---

## ⚙️ 技术栈

| Layer | Technology |
|-------|-----------|
| Builder | Node.js (`build.mjs`) |
| Output format | JSON (plugin.json, mcp.json) |
| Protocol | MCP (Model Context Protocol) |
| Auth | OAuth 2.0 (paperclip:read, paperclip:write, offline_access) |
| Target platforms | OpenAI (ChatGPT/Codex), Claude |