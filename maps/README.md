---
title: "Maps"
tags: ["maps", "features", "agent-access", "contract", "verification"]
category: "documentation"
created: "2024-01-01"
updated: "2026-10-20"
source: "external"
type: "index"
status: "stable"
lifecycle: "active"
---

# Paperclip Maps

---

## 💡 概述

The maps describe the same capabilities from two perspectives:

- [Feature map](feature-map/README.md): what a person can do, where to reach it,
  and how to verify the user journey. Preserve its Poteto format.
- [Agent access map](agent-access-map/README.md): the APIs and agent entry points
  for those capabilities, their permission boundaries, and access verification.

These are sibling directories under `maps/`. Each feature file has a same-named
agent access companion. Reuse the product map's sub-feature IDs, so `tasks/create`
identifies the same capability in both maps. Product behavior remains governed by
[the implementation spec](../doc/SPEC-implementation.md); a map cannot grant
authority or redefine a permission denial as success.

---

## ⚡ 功能

### Access contract

Every business operation needs both an API and a usable agent entry point for an
actor authorized to perform it. A dedicated tool is optional when REST, the CLI,
an assigned MCP client, or native `search_api` / `call_api` already provides the
operation. Record which agent surfaces actually have that path; an installed CLI
or optional MCP package cannot be assumed available to every native/remote run.

Track these independently:

| Dimension | Values and meaning |
| --- | --- |
| API | `present`, `missing`, `not-applicable`, or `unreviewed`. Use exact methods/paths; distinguish protocols from REST. |
| Agent access | `available`, `partial`, `missing`, `restricted`, `operator-only`, `not-applicable`, or `unreviewed`. Name the supported surface and actual entry point. |
| Policy | Actor, action/grant, company/resource/ownership scope, responsible-user intersection, run requirements, work modes, and gates relevant to the operation. |
| Evidence | `source-only`, `verified`, `failed`, `blocked`, or `not-run`. Source presence and successful board calls are not agent verification. |
| Review depth | `baseline` records representative operations and known gaps; `operation-reviewed` enumerates the capability's meaningful operations and their individual access contracts. |

Broad capabilities such as task properties must be split into operations before
they count as operation-reviewed: renaming, metadata edits, assignment,
dependencies, and lifecycle changes can use different tools and permission rules.
An available read path cannot certify a write path. List/get/create/update/delete,
execution/control, credential handling, and resolution are separate where their
authority or transport differs. Do not duplicate request schemas from OpenAPI.

### Exceptions and restrictions

Presentation-only state, static developer fixtures, and pre-start/local operator
work may use `not-applicable` for a domain API, with a concrete reason and the
existing local path. When a capability combines shared data with presentation,
split the operations: browser recents do not exempt resource lookup from API
coverage. Promoting local state to a shared feature requires revisiting the entry.

A board-only endpoint is `restricted` for agent identity, not an automatic
exception or a missing API. Cite the enforced policy and record whether the
agent can request the authorized human's action and observe its result. An
unresolved delegation question remains in **Gaps**. Company access, a job title,
a personal assistant's OAuth grant, or an accepted interaction does not grant
board identity. Keep budget, approval, secret and execution authority intact.

Check actual route/service authorization and production tool admission. OpenAPI
actor labels and scenario/evaluation tool declarations are supporting metadata;
record disagreements rather than using them as proof of access. Native API
fallback restrictions, tool field/scope limits, and rollout settings are part of
the agent path, even when a legacy agent can call the REST endpoint directly.

---

## 🏛️ 设计

### Companion file format

Each `agent-access-map/<area>.md` has an H1, a relative link to its product file,
review date and source commit, followed by one H2 backticked ID per product
sub-feature. Each capability contains these fields:

- **Review:** `baseline` or `operation-reviewed`.
- **API:** presence state and exact operation IDs, or a reasoned exception.
- **Agent access:** availability state and concrete entry points by surface.
- **Policy:** relevant permission and runtime boundaries, with source references.
- **Evidence:** evidence state, reviewed commit and sources or executed proof.
- **Verification:** allowed/denied assertions and observable result; record what
  has actually run separately from the proposed recipe.
- **Gaps:** missing APIs/paths, discovery drift, unreviewed operations or policy
  decisions; use `none` only for the enumerated scope that was reviewed.

For an operation-reviewed capability, use H3 backticked operation IDs and repeat
API, Agent access, Policy, Evidence, Verification and Gaps for each operation.
Use small operation names such as `create`, `update`, `read`, or `run-now`.
The enclosing capability has `Review: operation-reviewed` only after its
meaningful operations have been enumerated.

### Example excerpt

```markdown
## `definition`

Review: `operation-reviewed`.

### `create`

API: `present` — POST /api/companies/{companyId}/routines.
Agent access: `partial` — agent REST and CLI routine create; default native
mutation binding missing, and call_api blocks routine mutations.
Policy: same company; assigneeAgentId must be the calling agent; cite the
routine authorization and native API policy sources.
Evidence: `source-only` — reviewed commit and source links; no live proof.
Verification: `not-run` — create an owned routine; reject assignment to another
agent; inspect saved configuration, attribution and retry behavior.
Gaps: default native create path; verify using the real permitted agent context.
```

---

## 📁 目录

```
maps/
├── README.md                        # This file (map contract)
├── feature-map/
│   ├── README.md                    # Feature map index (35 feature families)
│   ├── coverage.json                # UI coverage inventory
│   ├── onboarding.md
│   ├── access.md
│   ├── companies.md
│   ├── tasks.md
│   ├── ...                          # Remaining area recipes
│   └── developer-labs.md
├── agent-access-map/
│   ├── README.md                    # Agent access map index (171 sub-features)
│   ├── access.md
│   ├── activity.md
│   ├── ...                          # Remaining area files
│   └── workspaces.md
└── storybook-map/
    ├── README.md
    ├── INDEX.md
    ├── REVIEW.md
    └── catalog.json
```

---

## 🔗 资源

### Keeping the maps synchronized

When a change adds/removes a capability or changes its behavior, API, permission,
tool binding, CLI support, or work mode, update the affected companion and product
recipe as appropriate in the same change. Preserve IDs across renames where the
capability is unchanged; update both indexes and cross-links together. An API-only
change may update the companion without rewriting unchanged user instructions.

[maintain-verification-skill](../.agents/skills/maintain-verification-skill/SKILL.md)
owns reconciliation of both maps. It follows changed source and authorization,
checks real agent reachability, and records product gaps without implementing
them during a maintenance pass. The creation skill uses this structure.
[verify-paperclip](../.agents/skills/verify-paperclip/SKILL.md) consumes the relevant
recipes and reports evidence/drift; map editing belongs to maintenance.

### Structural check

Run the structural check after map changes:

```sh
node scripts/check-maps.mjs
```

It checks paired areas/IDs, indexes, required fields, and local references. It
does not certify endpoint authorization, production bindings, operation
completeness, or live behavior. Source audits must check those against the
existing API and tool contracts; avoid a second schema catalog or runtime.

For live access proof, use Paperclip's existing API/runner/MCP fixtures or an owned
isolated instance. Use the actual agent identity, target and work mode. Assert the
allowed result and relevant denial (another company/private resource, wrong
owner, missing grant, invalid run, restricted mode or resolver). Mutations also
need persisted state/attribution and retry behavior. Capture evidence using the
[existing artifact workflow](../doc/AGENT-ARTIFACTS.md); keep executed run results
separate from product-map `coverage.json`, which records documentation scope.

---

## 🚀 快速开始

### When you add or change a capability

1. Update the product map recipe (`feature-map/<area>.md`)
2. Update the agent access companion (`agent-access-map/<area>.md`) with API and permission changes
3. Preserve IDs across renames where the capability is unchanged
4. Update both indexes and cross-links together
5. Run `node scripts/check-maps.mjs` to validate structure
6. Keep `coverage.json` in sync with page inventory changes

### When reviewing access

1. Open the agent access companion for the capability
2. Read Policy and Gaps before selecting a path
3. Use actual agent identity, target and work mode
4. Record evidence per the evidence contract

---

## ⚙️ 技术栈

| Layer | Technology |
|-------|-----------|
| Format | Markdown with structured YAML-like fields |
| Validation | `node scripts/check-maps.mjs` |
| Evidence tracking | source-only / verified / failed / blocked / not-run |
| Review depth | baseline / operation-reviewed |
| Agent access states | available / partial / missing / restricted / operator-only / not-applicable / unreviewed |
| API states | present / missing / not-applicable / unreviewed |