---
title: "Paid Runner Full-Stack E2E Campaign"
tags: ["e2e", "runner", "browser", "testing", "paperclip", "daytona", "sandbox", "provider", "qualification"]
category: "testing"
created: "2024-01-01"
updated: "2026-10-20"
source: "external"
type: "index"
status: "stable"
lifecycle: "active"
---

# Paid runner full-stack E2E

---

## 💡 概述

This is the billable browser acceptance campaign system for Paperclip runner
profiles. It is deliberately separate from `tests/e2e`: every independently
scheduled execution gets
a fresh Paperclip home, embedded Postgres database, instance configuration,
port, workspace, company, encrypted secrets, environment, and agent.

The launcher always sets `PAPERCLIP_ANNOUNCEMENTS_ENABLED=false` for its isolated
instances so announcement panels do not obscure screenshot evidence. No shell
or workflow configuration is needed, including for Daytona cells.

The vocabulary is: a **campaign** is one workflow invocation against one SHA; a
**suite** is a durable testing purpose; a **matrix** is that suite's profiles x
environments x cases; an **execution/cell** is one parallel job; and an
**attempt** is one isolated harness run, including an infrastructure retry.

Default `--all` selection is 171 cells (148 local and 23 Daytona) and 371
expected paid agent turns. The full catalog has 239 cells.

---

## ⚡ 功能

### Standard Suites (included in `--all`)

**Core Runner Compatibility** (`core-compatibility`): Seven major runner profiles x local/Daytona x three workflows: 42 cells.
Cases: `message-marker`, `plan-revise-accept`, `ask-question`.

**OpenRouter Model Breadth** (`openrouter-model-breadth`): Four qualified models from the tracked weekly tool-capable ranking snapshot x native OpenCode x local. 10 supported model/workflow cells. Cases: `hello-complete`, `question-resume-complete`, `plan-approve-complete`. Xiaomi MiMo V2.5 excluded (latency), DeepSeek V4 Flash excluded from Plan (ignored required exact final response), Tencent HY3 excluded from Plan (replaced required exact visible terminal marker with prose).

**Local Session Integrity** (`local-session-integrity`): Seven supported local native and direct-adapter profiles x two two-run structured-question workflows: 14 cells. Both prove structured interaction is rendered, answered in the browser, and resumed once on the same task without duplicating the final response. Second workflow restarts the isolated Paperclip server while the interaction is waiting. No Daytona cells.

**Agent Chat** (`agent-chat`): Eight workflows on legacy-codex, legacy-claude, runner-codex, and runner-acpx-claude: **28 local cells**. Covers continuity across server restart, fresh context after `/new`, Stop/reset/resume, draft/revise/approve/plan handoff, clarification with existing project reuse, and a new project with two repository URLs. Each cell opens the production chat surface. Daytona is excluded.

**First Task Onboarding** (`first-task`): 13 cases on legacy-codex, legacy-claude, runner-codex, and runner-acpx-claude, local only: **52 cells**. Uses the production onboarding wizard, creates the first agent, keeps default persona/model/permissions/skill assignments, and answers the seeded opening question in the browser.

Cases matrix:

| First response / control | Complete journey |
| --- | --- |
| `interview-first-response` | `interview-plan-accept` |
| `clear-task-first-response` | `task-card-accept` |
| | `accept-while-running` |
| `ambiguous-task-first-response` | `task-reply-accept` |
| `plain-message-first-response` | `clarify-propose-accept` |
| `plan-first-response` | `revise-accept` |
| `ordinary-task-control` | `reject-no-execution` |

Native profiles complete the same production wizard using their legacy provider, then change only the agent's runtime configuration via the public API before its first task. The wizard does not currently offer native Runner.

**Task Continuation** (`continuation`): Five local cases for Legacy Codex, Legacy Claude, Runner Codex, and Runner ACPX Claude (20 cells): authenticated answers changing scope, clarification without approval, scope revision preserving approval, untrusted handoff text read through a real tool, and completed child-task reuse across a server restart. One additional native-only `question-tool-documentation` case adds two cells (Runner Codex and Runner ACPX Claude), for 23 continuation cells total.

### Explicit-Only Suites (excluded from `--all`)

**Live Provider Connection Journeys**: See [PROVIDER-CONNECTIONS.md](PROVIDER-CONNECTIONS.md). The [public MCP suite](PUBLIC-MCP.md) adds explicit paid assistant/plugin journeys with authenticated browser consent.

**Native Connection Guidance** (`native-connection-guidance`): Manual-only suite separating connection-policy discovery from fixture instructions. Reuses five Everyday journeys on local native Codex, ACPX Claude and OpenCode. 15 cells, not `--all`.

**Native Procedure Guidance Comparison**: Select `--suite everyday-workflows --environment local --case hire-reuse --case delegate-feedback --profile runner-codex --profile runner-acpx-claude --profile runner-opencode` for six comparison cells. Excluded from `--all`.

**Pi Controls** (`pi-controls`): Four candidate Pi cells: pending-permission Stop and browser same-turn steering, each local and Daytona. Current Pi matrix has 26 explicit cells (13 local and 13 Daytona). Profile remains pending; catalog presence is not live qualification.

**Confirmation Replies** (`confirmation-replies`): Ten local native Claude/Codex cells: conversational single-task approval, saved-plan approval, rejection, card-click acceptance as a control, and ambiguous approval with two independent pending proposals. Excluded from `--all`.

**Completion-Update Probes** (`completion-updates`): Ten local Product E2E cells: native Codex and native Claude, each with onboarding, idle handoff, busy handoff, two-task handoff, and restart recovery. Exercise the production completion-delivery path and agent-authored responses. When `OPENAI_API_KEY` is configured, the suite automatically uses the pinned semantic judge, reserves at most $0.50 per request.

**Instruction Persistence** (`instruction-persistence`): Explicit-only three-cell workflow (legacy and native Codex locally, plus native Codex on Daytona). Each creates six browser tasks for the same agent. Covers instruction editing, restart persistence, and personal file limits (256 MiB). Deadline: twenty minutes per cell, six expected provider runs.

**Daytona Warm Continuity** (`daytona-warm-continuity`): Exactly two paid cells: legacy Codex and Runner Codex against one reusable warm Daytona configuration. Three browser-driven turns per cell on one issue. Runner Codex additionally proves stable native session, provider session, runner instance, PID, and process-start identity.

**Daytona Journal Continuity** (`daytona-journal-continuity`): One explicit-only native Codex cell with 240 separate ordinary execution-tool calls, each printing a bounded 65 KB synthetic sample. Journal must exceed two MiB. `--all` excludes.

**Daytona Git Streaming** (`daytona-git-streaming`): One explicit-only native Codex Daytona cell. Seeds 60,000 small untracked files through the real provider, then performs three browser-driven review turns. Generated NUL-delimited filename list must exceed 32 MiB. `--all` excludes.

**Agent Chat Hardening** (`agent-chat-hardening`): Explicit-only native Codex/Claude suite with **18 cells: 12 local and six warm Daytona**. Adds startup Stop/reset, hire/delegate/reuse, grounded blocker reporting with source-document review, committed-send retry, active Stop/reset, and restart continuity.

**Agent Chat Stories** (`agent-chat-stories`): Six explicit-only local cells across native Codex and Claude. Includes enable-disable-resume, followup-while-running, revise-while-running.

**Agent Chat Qualification** (`agent-chat-qualification`): Six explicit-only local cells: active-reassignment, worker-crash-retry, and grounded-answer-quality, each on native Codex and native Claude.

**Native Completion** (`native-completion`): Independent, explicit-only suite qualifying native finish/block descriptions on unchanged master defaults.

**Native Instruction Consolidation** (`native-instruction-consolidation`): Explicit-only, six local cells: document completion and whole-task blocking on native Codex, ACPX Claude, and OpenCode. Compares completion constraints on the production defaults at a pinned SHA.

**Context Integrity** (`context-integrity`): Explicit-only local suite with two bounded cases across ten listed legacy/native profiles (20 cells). `ordered-comment-continuation` and `assigned-skill-explicit-invocation`. Excluded from `--all`, no Daytona cells.

**Stock Harness** (`stock-harness`): Reuses ordered continuation, assigned-skill invocation, and chat restart journeys with production-default hires. 24 explicit local cells covering eight legacy/native profiles. Excluded from `--all`.

**Blocker Guidance** (`blocker-guidance`): Three local cases on legacy Codex and legacy Claude (six cells). Behavior coverage for PR #14188. Cases: `human-authority`, `hiring-permission`, `requester-scope`.

**Extended ACP Harnesses** (`extended-harnesses`): 30 Product E2E cells: Cursor, Copilot, and Pi on local and Daytona. Candidate definitions, not a claim of provider qualification. Excluded from `--all`.

**Pi Native Product Fixtures** (`pi-native`): Ten explicit Pi cells: native questions, agent-file persistence, browser permission denial, controller restart with unanswered native question, local-only `restrictive-denial`, and Daytona-only `native-pending-provider-death`. Excluded from `--all`.

**Copilot Protection** (`copilot-protection`): Four cells (local and Daytona). Denial and active-turn Stop cases.

**Cursor Native Interactions** (`cursor-native`): Eight local/Daytona cells exercising native Cursor question callback, plan rejection/revision/acceptance, plan cancellation, and permission denial across browser reload.

**Native Active Stop** (`native-active-stop`): Cursor and Copilot on local or Daytona (four cells). Stop during an unanswered native permission. Excluded from `--all`.

**Rich ACP Warm Continuity** (`rich-acp-warm-continuity`): Six explicit cells: Cursor, Copilot, and Pi on local and Daytona. Three browser-driven turns must preserve native session, provider session, runner instance, PID/start identity and project workspace.

**Everyday User-Story Evals**: See [EVERYDAY-WORKFLOWS.md](EVERYDAY-WORKFLOWS.md).

**Hiring Templates** (`hiring-templates`): Two explicit-only local cells: hire-coder-template-reuse on native Codex and native ACPX Claude. Exercises production hiring templates, managed accounts, and delegated task execution.

**Task Workspaces** (`task-workspaces`): Three cells: legacy OpenCode locally and native OpenCode locally and on Daytona. Tasks without a project or configured adapter cwd. Excluded from `--all`.

**Repository Skills** (`repository-skills`): Explicit-only: imports private `paperclipai/poteto-stack` repository through production GitHub Sources UI, selects skills in repository mode, assigns to a production-default Codex agent. Two cells (local and Daytona).

**Task Titles** (`task-titles`): Explicit-only six local cells. Creates tasks in Chromium with empty title field. Requires `set_task_title` native tool.

**Planning Comparison**: See [PLAN-TASK-GUIDANCE.md](PLAN-TASK-GUIDANCE.md). Twelve single-attempt cells on native Codex.

**Native Continuation Accounting Baseline**: See [CONTINUATION-ACCOUNTING.md](CONTINUATION-ACCOUNTING.md). Eight cells.

**API Response Reading** (`api-response-reading`): Two-cell native Codex suite (local and Daytona). Synthetic diagnostic evidence over 24 KiB.

**Grok Build Qualification** (`grok-qualification`): Native ACPX with Grok Build 1.0.13 and `grok-4.7`. Core and restart workflows on local and Daytona.

**Grok Subscription Qualification** (`grok-subscription-qualification`): Uses `runner-acpx-grok-subscription` and explicit `GROK_AUTH_JSON`.

**Question Resume** (`question-resume`): Two cells on native Codex and ACPX Claude. Qualifies user journey through provider-built-in or Paperclip's semantic question tool. Excluded from `--all`.

---

## 📊 指标

### Billing interpretation

Each result contains raw sanitized `usage`, normalized `billing`, and `runtimeUsage`:

- LLM token and dollar values come from the persisted heartbeat-run usage. A multi-turn case aggregates every selected run and records how many runs supplied tokens and provider-reported cost.
- Local execution records agent run time but is `not_metered` because there is no external environment provider charge to attribute.
- Daytona records every public-API lease window and its pinned 4 vCPU, 4 GiB RAM, and 10 GiB disk allocation. Its runtime dollar value is an estimate at the versioned public list rates in `billing.ts`, not an invoice amount. Credits, discounts, the storage allowance, and delayed billing adjustments can make the eventual Daytona charge lower.

`normalized-results.json` uses the v2 campaign schema and includes per-test, per-suite, and overall billing. The compact `history.json` index retains the same metrics per campaign/suite/execution, source SHA/ref, definition fingerprints, completeness, retries, and cleanup. `summary.md` carries the current totals into the GitHub Actions job summary.

### Default `--all` selection

171 cells (148 local and 23 Daytona) and 371 expected paid agent turns. The full catalog has 239 cells. Explicit-only everyday suite adds 38 catalog cells, chat hardening adds 18, and chat stories adds six.

---

## 🏛️ 设计

### Selector Semantics

`--suite`, `--group`, `--profile`, `--environment`, and `--case` are repeatable. Repeated values in one dimension use OR semantics; dimensions and repeated groups use AND semantics. `--id` is exclusive with dimension selectors and `--all`. `--headed`, `--ui`, and `--debug` are forwarded to Playwright. `--max-parallel <n>` controls isolated harness overlap (default 1). `--max-automatic-retries <0|1>` controls launcher retry budget (default 1). Narrow selectors are strongly recommended while developing fixtures.

### Credentials

Copy `.env.runner-e2e.example` to `.env.runner-e2e.local` and fill only the credentials needed by the selected cells:

```bash
cp .env.runner-e2e.example .env.runner-e2e.local
chmod 600 .env.runner-e2e.local
```

Shell variables take precedence over the local file. The recognized names are:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPENROUTER_API_KEY`
- `KIMI_MODEL_API_KEY` (local-only pending Kimi CLI/ACP profiles)
- `XAI_API_KEY` (local Grok API-key profile)
- `GROK_AUTH_JSON` (local native Grok subscription profile)
- `DAYTONA_API_KEY`
- `CURSOR_AUTH_TOKEN` (extended Cursor candidate)
- `COPILOT_GITHUB_TOKEN` (extended Copilot candidate)
- `PAPERCLIP_E2E_DAYTONA_IMAGE` (Daytona only)
- `PAPERCLIP_E2E_DAYTONA_NODE_SHA256` and `PAPERCLIP_E2E_DAYTONA_RUNNERD_SHA256` (native Cursor/Pi/Copilot Daytona fixtures)

Provider keys, Daytona keys, `DATABASE_URL`, and `DATABASE_MIGRATION_URL` are removed from the Paperclip child process. Never put credentials in `catalog.ts`, screenshots, fixture metadata, workflow inputs, or a tracked env file.

### Daytona Image

The image must be an immutable `image@sha256:...` reference. The content ID hashes the audited image inputs (Dockerfile, platform, root package/lock/build configuration, dependency patches, `paperclip-eval-kernel`, and `paperclip-runner`). Changes elsewhere in the repository keep the same tag and reuse the already signed image. The Git SHA is stored separately as image provenance.

For local development, use the immutable digest printed by the `Publish verified Daytona image` job, or publish the current source locally. The repository workflow signs the digest with Cosign/OIDC and verifies it is publicly pullable.

When the controller runs on macOS, set `PAPERCLIP_RUNNER_REMOTE_BINARY_PATH` to a verified Linux amd64 `paperclip-runnerd`. A local macOS runner cannot substitute for the Linux binary. Native ACPX and OpenCode Daytona cells also require `PAPERCLIP_RUNNER_REMOTE_PROVIDER_PACK_PATH` on the controller.

### Evidence and Cleanup

Packaged, access-controlled evidence is written beneath `tests/runner-e2e/results/<campaign>/...`. Passing attempts include `final-state.png`, Plan draft/revision screenshots, matcher outcomes, sanitized fixture/API metadata, a result record, JUnit, HTML, and a blob report. Failures additionally retain the Playwright trace/video, browser diagnostics, failure screenshot, and sanitized Paperclip/run logs.

Every completed local campaign also writes `tests/runner-e2e/results/<campaign>/dashboard.html`. The self-contained page shows the complete profile/environment grid with screenshot thumbnails, case details with matchers, pass/fail details, provider/model/runtime, timings, token and cost accounting, and evidence links.

Permanent publication uses two explicit bundles. Both retain only normalized result PNG files with the explicit `public-runner-fixture` publication marker. Both public bundles exclude video, archives, raw/unallowlisted logs, SVG, active content, generated Playwright/blob/HTML report trees, and undeclared PNG files.

Before an access-controlled evidence artifact is uploaded, the launcher copies only allowlisted file types, scans raw API snapshots, scans the closed Paperclip home/database and workspace as streams, redacts loaded exact values and known provider-key shapes from text, expands ZIP reports for secret scanning, rejects SVG and other unsafe files, and verifies that a passing attempt has its final-state screenshot.

The temporary Paperclip home, embedded database, raw workspace, master key, and unredacted logs are removed after confirmed cleanup. Daytona teardown destroys the environment and any reusable leases through the public API; provider-side auto-stop/archive/delete values remain as cancellation backstops.

### Conversation Presentation

Case details show the overall failure reason separately from behavioral matcher results. **Read full conversation** starts collapsed and displays retained comments, question and approval cards, card answers, and document revisions in time order, using Paperclip chat styling. The shared static card renderer covers `ask_user_questions`, `request_confirmation`, `request_checkbox_confirmation`, `request_item_verdicts`, `suggest_tasks`, and `connection_intent`. Repeated checkpoints are deduplicated.

### Completion-Update Grading

Mechanical passage is not answer-quality qualification. Inspect `completion-update.json`, its `latestResponse`, and all retained replies against the included semantic rubric: correct completion claim, useful result explanation, accessible output, and no invented verification or follow-up work.

Grader v14 inventories the completed tasks referenced by each reply, including implicit acknowledgements, plus the tasks whose results each reply links to or substantively presents, with a rationale. A later reply may recap a task if it adds another newly reported task, supplies the first access to an already announced result, or corrects an earlier claim.

### Injected Interruption Diagnostics

The restart supervisor starts Paperclip with the TypeScript loader in the same Node process it owns. A forced stop cannot leave an old controller alive. On Unix, the server has its own process group. Signal handling, restart cleanup, and final cleanup share one stop operation per server: one graceful signal, a 30-second wait, then SIGKILL to revalidated owned groups and a 5-second exit wait if needed. The wrapper retains observed descendants across an early server exit and checks PID/start identity before group signals.

### Optional Quality Post-Processing (first-task)

Quality is informational. It cannot turn a behavioral failure into a pass. The five anchored 1-5 dimensions are question relevance, use of facts, proposal usefulness, clarity, and low friction. The judge uses pinned `gpt-4.1-2025-04-14` snapshot, temperature zero, at most 1,800 output tokens.

### First-Task Onboarding Design

The production onboarding model default is retained, even when it differs from the profile's normal harness model. Evidence labels native setup `post-onboarding-runtime-switch`; it does not claim a native wizard path exists. Legacy setup is labeled `production-wizard`.

Behavioral checks inspect persisted comments, interactions, tasks, documents, agent counts, creation timestamps, and terminal runs. `snapshots/first-task.json` contains full managed instruction/skill snapshots and SHA-256 source hashes. Each case has a fifteen-minute attempt budget; individual response/outcome waits stop after five minutes. More than twelve company runs fails the case.

`question-choice-options` fails any recorded question with fewer than two distinct, nonempty options. An obsolete queued wake with `issue_terminal_status` is not a provider failure when `startedAt` is explicitly null and its issue is durably Done or Cancelled.

### Native Provider Continuity

The first-task `task-reply-accept` and `task-card-accept` journeys also verify that ordinary native follow-ups retain the parent task's workspace, native session, and provider session identities. For ordinary native comment and child-completion wakes, a verified provider resume receives only new attributed messages, the current authenticated interaction result, actual task edits, child results, and completion-report identifiers.

The ACPX Claude-only `provider-question-bridge` case exercises the provider's built-in question tool and verifies the card appears in Paperclip and the same paused run finishes with the selected fact.

### Agent Chat Qualification Details

Active reassignment waits for a real worker to save a draft and enter a bounded file wait. The lead transfers the same task through Agent Chat. Worker recovery requires Linux with Python pidfd support. It kills only the exact running native worker PID from the public run record.

Answer quality uses two read-only turns over public fixture tasks and conflicting historical comments. Exact structured propositions grade current blockers, backlog versus active work, stale claims, and unknown facts.

### Pi and Candidate Provider Design

The launcher binds only the selected candidate and exact discovered model in `PAPERCLIP_RUNNER_ACPX_QUALIFICATION`, a JSON array of `{agent,model}` pairs. Cursor and Copilot models are the explicit authenticated discovery choices; Pi imports its production profile's fixed OpenRouter model.

### Remote Native Evidence and Warm Continuation

All three native suites use an operator-published instruction file to withhold actual work until independent observers are armed inside the exact owned Daytona sandbox. Bootstrap admission uses the existing authored case deadline, including cold snapshot provisioning, with a 64-second minimum setup reserve subtracted before admission: 10 seconds for lease revalidation, 12 for the runtime-ready RPC, 27 for installation, and 15 for teardown.

The observer watches registered targets, user workspace changes and the exact runner process plus descendants. The single controller-owned `.paperclip-runtime/paperclip-runner` subtree is excluded from user-file inventory and mutation counts.

### Hiring Templates Design

The v3 hiring grader uses turn-accounting v2 in both executable guards. `loadDefaultAgentInstructionsBundle("ceo")` determines the expected files and bytes on each evaluated revision. Five required work turns per cell (three CEO turns + two actual worker executions), plus at most two strictly attributed automatic task-completion turns (seven total maximum), with a 15-minute deadline and 1,000-cent company/CEO budget hard stops.

Read receipt support recognizes direct `cat`, positive-count `head`/`tail`, printing-only `sed -n` argument forms, and canonical file-read events with a preserved relative skill path and completed output.

### Blank-Page Investigation

Private `browser-diagnostics.json` includes final document readiness, whether `#root` mounted content, whether a service worker controls the page, outstanding script/style paths, and recent module 304/error statuses. The HTML entry also supplies recovery before React mounts: a failed module shows `Reload page`; a startup with no rendered root for 30 seconds offers the same manual retry. Late successful startup removes the notice.

### Task Workspaces Design

Each cell creates a task through the browser without a project or configured adapter cwd. Low-trust chat tasks cannot use `prepare_repository` to initiate controller clones. Trusted acquisition does not yet impose repository byte or cumulative storage quotas.

---

## 📁 目录

- `tests/runner-e2e/results/<campaign>/...` - evidence directory
- [FIXTURES.md](./FIXTURES.md) - profile, environment, task, matcher, fixture contracts
- [SECURITY.md](./SECURITY.md) - security boundaries for paid dispatch and public history
- [PROVIDER-CONNECTIONS.md](PROVIDER-CONNECTIONS.md) - live provider connection journeys
- [PUBLIC-MCP.md](PUBLIC-MCP.md) - public MCP suite
- [EVERYDAY-WORKFLOWS.md](EVERYDAY-WORKFLOWS.md) - everyday user-story evals
- [STOCK-HARNESS.md](STOCK-HARNESS.md) - stock harness suite contract
- [LIFECYCLE-BASELINE.md](LIFECYCLE-BASELINE.md) - lifecycle baseline suite
- [NATIVE-COMPLETION.md](NATIVE-COMPLETION.md) - native completion suite
- [PLAN-TASK-GUIDANCE.md](PLAN-TASK-GUIDANCE.md) - planning comparison
- [CONTINUATION-ACCOUNTING.md](CONTINUATION-ACCOUNTING.md) - continuation accounting baseline
- [QUALIFICATION-2026-09-21.md](QUALIFICATION-2026-09-21.md) - September 21 qualification report
- [Paperclip evaluation guide](../../doc/evals.md)
- [Runner Protocol Live Evals](../../packages/paperclip-runner/docs/runner-protocol-live-evals.md)

---

## 🔗 资源

- [connection audit](../../doc/plans/2026-10-06-native-connection-guidance.md)
- [baseline failures and repair](../../doc/plans/2026-10-07-native-connection-baseline-repair.md)
- [comparison plan](../../doc/plans/2026-10-03-native-completion-consolidation.md)
- [answer correction](../../doc/plans/2026-10-04-native-completion-answer-fix.md)
- [waiting/resume ownership audit](../../doc/plans/2026-10-08-wait-resume-ownership.md)
- [runner API tools doc](../../doc/runner-api-tools.md)
- [grok native runner doc](../../doc/grok-native-runner.md)
- [Daytona runner image](../../docker/daytona-runner/README.md)

---

## 🚀 快速开始

### Local Commands

Install dependencies and Chromium once. Native local cells also need the local runner binaries:

```bash
pnpm install
pnpm exec playwright install chromium
pnpm --filter @paperclipai/paperclip-runner build:runner-binaries
```

List cells without loading credentials or starting Paperclip:

```bash
pnpm test:e2e:runner -- --list
```

### Credential-free checks

```bash
pnpm test:e2e:runner:unit
pnpm test:e2e:runner:typecheck
```

### The OpenRouter ranking snapshot

Tracked in `openrouter-models.json`. Refresh deliberately after reviewing the source/capture/hash diff:

```bash
pnpm test:e2e:runner:models:update
```

### Example billable runs

```bash
pnpm test:e2e:runner -- --id core-compatibility.legacy-codex.local.message-marker --headed
pnpm test:e2e:runner -- --suite openrouter-model-breadth --case hello-complete
pnpm test:e2e:runner -- --group native --environment local
pnpm test:e2e:runner -- --profile runner-codex --case message-marker
pnpm test:e2e:runner -- --case plan-revise-accept --group local
pnpm test:e2e:runner -- --case ask-question --group native
pnpm test:e2e:runner -- --suite daytona-warm-continuity
pnpm test:e2e:runner -- --all
```

### Match the local controller package to the Daytona image

When the controller runs on macOS or another platform different from the sandbox, set `PAPERCLIP_RUNNER_REMOTE_BINARY_PATH` to a verified Linux amd64 `paperclip-runnerd`. Native ACPX Daytona cells also require `PAPERCLIP_RUNNER_REMOTE_PROVIDER_PACK_PATH`.

Prefer the hosted workflow. For a local run, use the immutable image and copy its exact package:

```sh
docker pull --platform linux/amd64 "$PAPERCLIP_E2E_DAYTONA_IMAGE"
pack_dir="$(mktemp -d "${TMPDIR:-/tmp}/paperclip-e2e-provider-pack.XXXXXX")"
container_id="$(docker create --platform linux/amd64 --network none \
  --entrypoint /bin/true "$PAPERCLIP_E2E_DAYTONA_IMAGE")"
docker cp "$container_id:/opt/paperclip-runner/provider-pack/." "$pack_dir/"
test -f "$pack_dir/provider-pack.json"
```

### Iterate on a published dashboard without rerunning paid tests

```bash
gh run download <run-id> --repo paperclipai/paperclip --name github-pages --dir /tmp/runner-e2e-pages
mkdir /tmp/runner-e2e-site
tar -xf /tmp/runner-e2e-pages/artifact.tar -C /tmp/runner-e2e-site
pnpm test:e2e:runner:dashboard -- /tmp/runner-e2e-site
```

### Browser-support regression

```bash
pnpm test:e2e:runner:browser-support
# To use an installed Chrome instead of Playwright's Chromium:
PAPERCLIP_PLAYWRIGHT_CHANNEL=chrome pnpm test:e2e:runner:browser-support
```

### Judge a retained completion probe separately

```bash
node cli/node_modules/tsx/dist/cli.mjs tests/runner-e2e/completion-judge.ts --evidence /path/to/completion-update.json --max-dollars 0.50 --approve-external-judge yes
```

### Judge first-task quality

```bash
pnpm test:e2e:runner:judge-first-task -- --result tests/runner-e2e/results/CAMPAIGN/EXECUTION/attempt-1/result.json --max-dollars 0.50
```

### Installed-Product Acceptance

Set `PAPERCLIP_RUNNER_E2E_INSTALLED_CLI` to the absolute public consumer's `paperclipai/dist/index.js`. Install the public `@paperclipai/plugin-daytona` package separately for Daytona smoke.

### Published-Install Pi Lane

Supply all four reviewed pins: `PAPERCLIP_RUNNER_E2E_INSTALLED_CLI`, `PAPERCLIP_RUNNER_E2E_INSTALLED_CLI_SHA256`, `PAPERCLIP_RUNNER_E2E_INSTALLED_SERVER_ROOT`, `PAPERCLIP_RUNNER_E2E_INSTALLED_SERVER_SHA256`. Installed Pi Daytona cells also require the published plugin fixture inputs.

### Suite-specific run examples

```bash
pnpm test:e2e:runner -- --list --suite agent-chat-hardening
pnpm test:e2e:runner -- --id agent-chat-hardening.runner-codex.local.stop-startup-new-resume
pnpm test:e2e:runner -- --suite agent-chat
pnpm test:e2e:runner -- --list --suite context-integrity
pnpm test:e2e:runner -- --id context-integrity.runner-codex.local.ordered-comment-continuation
pnpm test:e2e:runner -- --list --suite task-titles
pnpm test:e2e:runner -- --id task-titles.runner-codex-mini.local.prompt-title-standard --max-automatic-retries 0
pnpm test:e2e:runner -- --list --suite blocker-guidance
pnpm test:e2e:runner -- --suite blocker-guidance --max-parallel 2
pnpm test:e2e:runner -- --suite continuation --profile runner-acpx-claude
pnpm test:e2e:runner -- --suite first-task --profile legacy-codex --case clear-task-first-response
pnpm test:e2e:runner -- --list --suite extended-harnesses
pnpm test:e2e:runner -- --list --suite pi-native
pnpm test:e2e:runner -- --list --suite cursor-native
pnpm test:e2e:runner -- --list --suite hiring-templates
pnpm test:e2e:runner -- --list --suite task-workspaces
pnpm test:e2e:runner -- --id repository-skills.runner-codex.local.poteto-package
```

---

## ⚙️ 技术栈

- Playwright (Chromium, browser test automation)
- Vitest (unit tests only)
- TypeScript
- Paperclip server (isolated instances per campaign)
- Embedded Postgres (PGlite)
- GitHub Actions (scheduled + workflow_dispatch triggers)
- Daytona SDK (remote sandbox provider)
- Modal SDK (remote sandbox provider)
- AWS S3 + CloudFront (permanent public history)
- GitHub Pages (latest dashboard)
- Cosign/OIDC (Daytona image signing)
- Docker (local image building)
- OpenAI API (semantic judging, gpt-4.1)
- Various runner profiles: legacy-codex, legacy-claude, runner-codex, runner-acpx-claude, runner-acpx-pi, runner-acpx-grok, runner-opencode, runner-codex-mini, legacy-opencode

### GitHub Actions

`Runner Full-Stack E2E` has only `schedule` and `workflow_dispatch` triggers; it never runs for a pull request or ordinary push. Start the trusted workflow from the default branch. A CODEOWNER can set the optional `target_branch` input. A separate credential-free job checks out the resolved commit and regenerates `pnpm-lock.yaml`. Catalog, image, shared-build, provider-pack, and paid test jobs download the lockfile artifact by ID, verify its digest, and restore it before setup.

Because this repository is public, manual campaigns fail before checkout unless the trusted workflow runs from the default branch and both actors have numeric GitHub user IDs in `RUNNER_E2E_ALLOWED_ACTOR_IDS`. The nightly cron is `08:47 UTC`, gated by `RUNNER_FULL_STACK_E2E_NIGHTLY_ENABLED=true`. Set `RUNNER_E2E_AWS_ENABLED=true` to route paid cells to the repository-scoped ephemeral AWS RunsOn fleet.

GitHub Actions artifacts are access-controlled 30-day operational copies, not the permanent public history. The `runner-e2e-history` environment exchanges GitHub OIDC for short-lived AWS credentials. Immutable campaign bundles live under `campaigns/<run-id>-<attempt>/`; mutable `history.json`, `latest.json`, and `latest-green.json` are updated by a globally serialized publisher. An existing campaign key with a different bundle digest fails closed.

GitHub Pages remains the stable latest dashboard. Enable Pages with GitHub Actions as its source and set `RUNNER_FULL_STACK_E2E_PUBLISH_PAGES=true`. The publisher creates an S3 stage with the trusted synthetic summary PNG and a separate Pages stage. Neither surface publishes video, archives, SVG/active content, databases, Paperclip homes, workspaces, raw/unallowlisted logs, or credentials.