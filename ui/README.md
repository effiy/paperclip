---
title: "@paperclipai/ui"
tags: ["ui", "npm-package", "board-ui", "storybook", "codemirror"]
category: "packages"
created: "2024-01-01"
updated: "2026-10-20"
source: "external"
type: "index"
status: "stable"
lifecycle: "active"
---

# @paperclipai/ui

---

## 💡 概述

Published static assets for the Paperclip board UI.

---

## ⚡ 功能

### What gets published

The npm package contains the production build under `dist/`. It does not ship the UI source tree or workspace-only dependencies.

### Typical use

Install the package, then serve or copy the built files from `node_modules/@paperclipai/ui/dist`.

---

## 🏛️ 设计

### Editor dependency identity

Keep the root and workspace overrides for `@codemirror/state`,
`@codemirror/view`, and `@lezer/common` aligned. CodeMirror requires shared
extension identity, while Lezer parsers and syntax highlighters require shared
`NodeProp` IDs. Multiple Lezer copies can crash code-block highlighting with
`tags is not iterable`. `src/lib/codemirror-single-instance.test.ts` checks the
installed dependency graph and highlights sample code through the editor's real
language dependencies. GitHub Actions owns regeneration of `pnpm-lock.yaml`.

---

## 📁 目录

```
ui/
├── README.md                                 # This file
├── package.json                              # @paperclipai/ui package metadata
├── src/
│   ├── App.tsx                               # Route registration
│   ├── index.css                             # Design token layer
│   ├── components/                           # Shared UI components
│   ├── pages/                                # Page components
│   └── lib/
│       └── codemirror-single-instance.test.ts # CodeMirror dependency check
├── dist/                                     # Published build output
└── storybook/                                # Storybook config and stories
    ├── stories/                              # Story files by feature area
    ├── support/                              # Shared fixture modules and assets
    └── prototypes/                           # Production wrappers
```

---

## 🔗 资源

### Related documentation

- [DESIGN.md](../../DESIGN.md) — Design system governance (token-only rule)
- [Feature map](../maps/feature-map/README.md) — Product user journeys
- [Storybook map](../maps/storybook-map/README.md) — Story-to-feature catalog

---

## 🚀 快速开始

### Development

```sh
pnpm --filter @paperclipai/ui storybook
pnpm --filter @paperclipai/ui build-storybook
```

### Token compliance check

```sh
pnpm check:token-gates
```

This runs `scripts/check-token-gates.mjs` which enforces the token-only rule: every color, spacing, radius, type, shadow, and motion value in `ui/src/components/**` and `ui/src/pages/**` must come from the token layer in `ui/src/index.css`. No hex, raw px, arbitrary Tailwind bracket values, or raw `font-size`/`fontSize` declarations in components (outside the documented allowlist in `ui/src/index.css`).

---

## ⚙️ 技术栈

| Layer | Technology |
|-------|-----------|
| Framework | React |
| Build | Vite |
| Editor | CodeMirror (with resolved dependency identity) |
| Styling | Tailwind CSS (token-only from `index.css`) |
| Component testing | Storybook (CSF format) |
| Design governance | Token-only rule enforced by `check-token-gates.mjs` |