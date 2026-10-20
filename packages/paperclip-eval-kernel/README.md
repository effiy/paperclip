---
title: "Paperclip Eval Kernel"
tags: ["eval", "kernel", "paperclip", "testing"]
category: "testing"
created: "2024-01-01"
updated: "2026-10-20"
source: "external"
type: "index"
status: "stable"
lifecycle: "active"
---

# Paperclip Eval Kernel

## 💡 概述

`@paperclipai/paperclip-eval-kernel` is the workspace-private, provider-neutral matrix orchestrator owned by Paperclip Evals. It contains no Paperclip scenario corpus, provider configuration, product fixture, scorer, or report template.

---

## ⚡ 功能

Consumers pass scenario and candidate values plus execution and scoring callbacks. Candidate `preflight` hooks should call the runner package's `assertPaperclipRunnerCompatibility` before any provider work starts. This keeps catalog, protocol, runner-client, control-plane-adapter, testkit, corpus, and provider-operation incompatibilities explicit.

---

## 📊 指标

「待补充」

---

## 🏛️ 设计

Paperclip App may consume this package only as a development dependency for CI or parity tests. `@paperclipai/paperclip-runner` has no runtime dependency on it.

---

## 📁 目录

「待补充」

---

## 🔗 资源

「待补充」

---

## 🚀 快速开始

「待补充」

---

## ⚙️ 技术栈

- Runtime: Node.js (+ TypeScript)
- Role: Workspace-private development dependency