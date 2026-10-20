---
title: "Feature Map"
tags: ["maps", "features", "user-journeys", "verification", "testing"]
category: "documentation"
created: "2024-01-01"
updated: "2026-10-20"
source: "external"
type: "index"
status: "stable"
lifecycle: "active"
---

# Paperclip Feature Map

---

## 💡 概述

Start here when reproducing a user-facing bug, verifying a change, or deciding
which surfaces a fix must cover. Each recipe describes what a person can do,
where they can do it, the expected result, and the evidence needed to verify it.
Product behavior is still governed by [the implementation spec](../../doc/SPEC-implementation.md).

The sibling [agent access map](../agent-access-map/README.md) records APIs,
agent entry points and permission boundaries for the same capability IDs.
Follow the [shared map contract](../README.md) when maintaining either map.

The map is organized by user capability, not by source file. It covers **35 feature
families** across the product, CLI, and operator workflows, checked against source
on 2026-10-12. Experimental and developer-only surfaces are labeled explicitly.
Each recipe includes sub-features, current entry points, automated evidence,
manual verification steps, and gotchas.

---

## ⚡ 功能

### Getting started and access

| Feature | What it covers |
| --- | --- |
| [Onboarding and first work](./onboarding.md) | Instance setup, company wizard, first agent and task. |
| [Login, invitations, and access](./access.md) | Sessions, bootstrap, membership, roles, and CLI authorization. |
| [Companies and portability](./companies.md) | Company switching/settings, archival, package import/export. |

### Tasks and conversations

| Feature | What it covers |
| --- | --- |
| [Task creation and lifecycle](./tasks.md) | Creation, assignment, lists, properties, comments, and completion. |
| [Delegation, dependencies, and signoff](./task-coordination.md) | Child work, prerequisites, reviewers, and task-tree controls. |
| [Inbox, decisions, and search](./inbox-search.md) | Personal triage, decision queues, unread/blocked views, and search. |
| [Agent conversations and project handoff](./agent-chat.md) | Persistent conversations, discovery, handoff, and gated board chat. |
| [Questions and approvals](./questions-and-approvals.md) | Question/plan responses, formal approvals, and app-tool review. |
| [Steering and queued messages](./steering.md) | Follow-ups, queue edits, interruption, and pause/resume. |
| [Documents, attachments, and work products](./documents-artifacts.md) | Versioned documents, annotations, files, outputs, and artifact library. |

### Agents and reusable capabilities

| Feature | What it covers |
| --- | --- |
| [Hiring, configuration, and organization](./agents.md) | Agent identity, instructions, reporting lines, lifecycle, and built-ins. |
| [Runs, harnesses, and model accounts](./runs-adapters.md) | Adapter/model setup, account validation, transcripts, and run history. |
| [Skills and Skill Studio](./skills.md) | Discovery, sources, authoring, revisions, tests, and agent policies. |
| [Team packages and installation](./teams.md) | Catalog preview/install via CLI/API; catalog UI availability called out. |

### Projects and execution

| Feature | What it covers |
| --- | --- |
| [Projects and repositories](./projects.md) | Project lifecycle, task context, repository configuration, and defaults. |
| [Goals and work alignment](./goals.md) | Goal hierarchy, ownership, status, and project/task context. |
| [Workspaces, services, and files](./workspaces.md) | Provisioning, task bindings, services/logs, Git/files, and closure. |
| [Execution environments](./execution-environments.md) | Local, SSH, sandbox providers, target probes, and custom images. |
| [Recovery](./recovery.md) | Stopped work, workspace repair, bounded continuation, and reconnect. |

### Apps, channels, and extensions

| Feature | What it covers |
| --- | --- |
| [Connection setup](./connection-setup.md) | Catalog, MCP links, task requests, authentication, and setup resumption. |
| [App access and action permissions](./app-permissions.md) | Agent grants, off/ask/allowed actions, discovery, tests, and revocation. |
| [External chat and email](./chat-channels.md) | Provider-specific identity, threads, files, delivery, and endpoint upkeep. |
| [Tool gateways and access profiles](./gateways-profiles.md) | Tool exposure, client configuration, tokens, profiles, and activity. |
| [Secrets and proposals](./secrets.md) | Company/user credentials, grants, proposals, and vault import. |
| [Plugins](./plugins.md) | Installation/configuration, contributed pages/tools, and lifecycle. |

### Automation and structured work

| Feature | What it covers |
| --- | --- |
| [Routines, schedules, and triggers](./routines.md) | Definitions, variables, scheduled/webhook/manual runs, and history. |
| [Pipelines, review queues, and learnings](./pipelines.md) | Experimental stages, automation, items, review, and learning records. |
| [Cases](./cases.md) | Experimental structured fields, relationships, revisions, and task links. |
| [Status cards](./status-cards.md) | Experimental summaries, watched work, refresh history, and settings. |

### Oversight and operation

| Feature | What it covers |
| --- | --- |
| [Costs and budgets](./budgets-costs.md) | Spend reports, scoped limits, incidents, hard stops, and resumption. |
| [Dashboards and audit trails](./activity.md) | Company health, live work, activity, runs, routines, and timeline. |
| [Navigation, profile, and announcements](./navigation-preferences.md) | Sidebar state, favorites/recents, personal identity, and dismissals. |
| [Instance operations](./instance-operations.md) | Installation, updates, service health, configuration, and backups. |
| [CLI/API and local worktrees](./cli-operations.md) | Explicit context, resource commands, outputs, runs, and isolated instances. |

### Contributor surfaces

| Feature | What it covers |
| --- | --- |
| [Developer previews and diagnostic labs](./developer-labs.md) | Design examples, interaction fixtures, performance checks; not production acceptance. |

These are verification instructions, not a claim that every journey passed a live
test. A component test proves its component; a scripted provider proves that
fixture integration. Record executed results separately from the map.

---

## 🏛️ 设计

### Before driving a journey

1. Use this checkout's [isolated test drive](../../doc/DEVELOPING.md#one-command-isolated-manual-test-drive)
   for manual product checks. It creates a temporary instance and prints its URL
   and data directory.
2. Record the commit, URL, company, login role, relevant experimental settings,
   adapter, runtime mode, and live versus simulated dependencies.
3. Use the current navigation and company prefix. Paths in recipes omit that
   prefix.
4. Run the smallest relevant test first. Vitest commands run from the
   repository root after installing dependencies. Playwright recipes use their
   named configuration and its isolated environment.
5. Exercise the actual user action, inspect its result, reload, and verify the
   persisted state or continuation.

For agent-driven acceptance work, start with the
[Paperclip verification skill](../../.agents/skills/verify-paperclip/SKILL.md) for an
isolated launch, ownership/readiness checks, browser driving, evidence, and cleanup.

### Evidence contract

Report each entry point as **passed**, **failed**, **blocked** (with its missing
prerequisite), or **not run**. Include the feature filename and entry-point ID,
commit/environment, user action, expected and observed result, command/exit code,
and evidence links. Screenshots or traces should show both the action and the
discriminating result. Include task/run/request IDs when relevant, without secrets.

A fix is verified across its affected surfaces only when each has evidence or
an explicit reason it does not apply. Shared code alone does not prove parity.
Keep product regressions visible; do not change the recipe to bless a failure.
For Paperclip-assigned work, attach evidence through the
[artifact workflow](../../doc/AGENT-ARTIFACTS.md).

### Recipe format

Each recipe starts with an H1 and a user-visible description, then exactly:

1. **Sub-features** — stable backticked IDs and observable behavior/states.
2. **How to get to it (user POV)** — one H3 backticked entry-point ID per surface.
3. **Driving it with <harness>** — starts with `Preconditions:`; repeat each entry-point H3,
   with `Automated:` and `Manual:` paragraphs. Name test scope and gaps honestly.
4. **Gotchas** — misleading look-alikes, feature gates, and invalid evidence.

New or updated entries follow
[Poteto's feature-map examples](../../.agents/skills/create-verification-skill/references/feature-map-example).
Existing entries with a `Driving it` heading can adopt the named harness when
their recipes are updated. The original format was inspired by
[Omnigent's feature map](https://github.com/omnigent-ai/omnigent/tree/91acfbbb59f6fc210ff95a9e9428aadd62e06582/feature-map).

---

## 📊 指标

### Inventory and remaining depth

[The UI coverage inventory](./coverage.json) accounts for every non-test TSX
module under `ui/src/pages`, including supporting panels, legacy variants, and
labs. Every product area now links to concrete recipes. **Partial** means the
area still has the named variant or workflow gaps; **unmapped** is reserved for
an area with no recipe. These statuses describe documentation, not runtime health.

The page inventory is a source snapshot dated 2026-10-05. The map also
includes entry points hosted inside other modules (pipeline Review Queue and
Learnings, task documents, onboarding), CLI-only operations, and operator work.

Remaining depth includes complete provider/auth/attachment matrices, every
harness/model/environment capability combination, third-party plugin features,
and every role/error/mobile/legacy-shell permutation.

---

## 📁 目录

```
maps/feature-map/
├── README.md                   # This file
├── coverage.json               # UI coverage inventory
├── onboarding.md               # Onboarding and first work
├── access.md                   # Login, invitations, and access
├── companies.md                # Companies and portability
├── tasks.md                    # Task creation and lifecycle
├── task-coordination.md        # Delegation, dependencies, and signoff
├── inbox-search.md             # Inbox, decisions, and search
├── agent-chat.md               # Agent conversations and project handoff
├── questions-and-approvals.md  # Questions and approvals
├── steering.md                 # Steering and queued messages
├── documents-artifacts.md      # Documents, attachments, and work products
├── agents.md                   # Hiring, configuration, and organization
├── runs-adapters.md            # Runs, harnesses, and model accounts
├── skills.md                   # Skills and Skill Studio
├── teams.md                    # Team packages and installation
├── projects.md                 # Projects and repositories
├── goals.md                    # Goals and work alignment
├── workspaces.md               # Workspaces, services, and files
├── execution-environments.md   # Execution environments
├── recovery.md                 # Recovery
├── connection-setup.md         # Connection setup
├── app-permissions.md          # App access and action permissions
├── chat-channels.md            # External chat and email
├── gateways-profiles.md        # Tool gateways and access profiles
├── secrets.md                  # Secrets and proposals
├── plugins.md                  # Plugins
├── routines.md                 # Routines, schedules, and triggers
├── pipelines.md                # Pipelines, review queues, and learnings
├── cases.md                    # Cases
├── status-cards.md             # Status cards
├── budgets-costs.md            # Costs and budgets
├── activity.md                 # Dashboards and audit trails
├── navigation-preferences.md   # Navigation, profile, and announcements
├── instance-operations.md      # Instance operations
├── cli-operations.md           # CLI/API and local worktrees
└── developer-labs.md           # Developer previews and diagnostic labs
```

---

## 🔗 资源

### Maintaining the reference

When maintaining a recipe, compare its entry points and expected results with
the current source. Check that linked tests still exercise the stated behavior
and that local references still exist. Refresh the inventory snapshot when it
helps explain the current product. Keep the same-named agent access companion
and stable sub-feature IDs aligned when behavior or access changes. Source-only
access inventory remains distinct from live verification. Run
`node scripts/check-maps.mjs` after map edits for structural/reference checks;
follow the shared contract for the source and behavioral checks it cannot perform.

### Related resources

- [Agent access map](../agent-access-map/README.md) — APIs, agent entry points, permission boundaries
- [Map contract](../README.md) — Format and maintenance rules
- [Verification skill](../../.agents/skills/verify-paperclip/SKILL.md) — Isolated launch and evidence collection
- [Route registration](../../ui/src/App.tsx) — Surface reachability
- [CLI registry](../../cli/src/index.ts) — CLI command definitions

---

## 🚀 快速开始

### Verify a feature

1. Choose the relevant recipe from this map
2. Follow the "Before driving a journey" checklist:
   - Use an isolated test drive instance
   - Record commit, URL, company, login role, experimental settings, adapter, runtime mode
3. Run the smallest relevant test first
4. Exercise the actual user action, inspect its result, reload, and verify persisted state
5. Report evidence per the evidence contract (passed/failed/blocked/not run)

For agent-driven work, use the [Paperclip verification skill](../../.agents/skills/verify-paperclip/SKILL.md).

---

## ⚙️ 技术栈

| Layer | Technology |
|-------|-----------|
| Format | Markdown (Poteto feature-map style) |
| Coverage tracking | `coverage.json` |
| Validation | `node scripts/check-maps.mjs` |
| Testing | Vitest, Playwright |
| Evidence | Artifact workflow (`doc/AGENT-ARTIFACTS.md`) |
| Supporting skills | verify-paperclip, maintain-verification-skill, paperclip-dev-workspace-run-verify-fix |