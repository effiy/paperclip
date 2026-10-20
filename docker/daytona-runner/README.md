---
title: "Paperclip Daytona Runner Image"
tags: ["docker", "daytona", "runner", "sandbox", "provider-pack"]
category: "infrastructure"
created: "2024-01-01"
updated: "2026-10-20"
source: "external"
type: "index"
status: "stable"
lifecycle: "active"
---

# Paperclip Daytona Runner Image

---

## 💡 概述

Paperclip Cloud fleet sandbox image plus a source-built `paperclip-runnerd` and immutable provider pack. The pack contains Node 24.11, OpenCode 1.18.34, the compiled OpenCode proxy, ACPX 0.13.1 sidecar, qualified ACP agents, and the production lockfile. Its manifest digests each executable bridge and binds the pack to the runner source revision, avoiding artifact upload and npm installation on every fresh lease.

Ordinary provider packs now include pinned Cursor assets for Linux x64; no `--candidate-providers=cursor` flag is needed. Cursor admission is enabled after the [production readiness gates](../../doc/plans/2026-10-03-cursor-production-readiness.md) passed. The public CLI installation command is `paperclipai runtime setup cursor`; it runs explicitly on the execution host and is never an npm installation hook.

The fleet pins are intentionally copied from [`paperclip-cloud/fleet-sandbox-image/Dockerfile`](https://github.com/paperclipai/paperclip-cloud/blob/master/fleet-sandbox-image/Dockerfile). Update both definitions together until the fleet base is published as a stable image that this Dockerfile can extend directly.

---

## ⚡ 功能

### Harness versions

The October 2026 refreshes pin:

| Harness | Version |
|---------|---------|
| Codex | 0.160.0 |
| Claude Agent SDK / Claude Code | 0.3.286 / 2.1.286 |
| OpenCode | 1.18.34 |
| Grok CLI | 1.0.46 |
| Gemini CLI | 0.62.0 |
| Kimi Code | 2.1.1 |
| Cursor CLI | 2026.10.01-e373342 |
| GitHub CLI | 2.102.0 |
| Hermes | 0.19.0 (PyPI) |

Claude Code 2.1.280 is the minimum for [Opus 5.5](https://code.claude.com/docs/en/model-config) and 2.1.284 is the minimum for Sonnet 5.5; the pinned runtime also supports Fable 5.1. Codex 0.160.0 ships bundled metadata for the current [GPT-6.1 Sol, GPT-6 Sol, and GPT-6 Luna model IDs](https://learn.chatgpt.com/docs/models). Grok CLI 1.0.46 supports the current [Grok 4.7](https://docs.x.ai/developers/grok-4-7) model family.

The native Cursor provider uses its separately verified distribution, pinned to 2026.09.26-dd393fe; it does not use the sandbox layer's global Cursor executable.

---

## 🏛️ 设计

### Use in Paperclip

Publish the image to a registry Daytona can pull, or use the environment editor's **Configure image** flow to produce a Daytona snapshot. Set the environment image to that immutable tag or snapshot. Paperclip probes the sandbox user's `PATH` for `paperclip-runnerd` and `codex` and checks `/opt/paperclip-runner/provider-pack` for OpenCode and ACPX. It uses the pack only when its complete manifest matches the controller's build-owned pack; otherwise it stages the pack configured by `PAPERCLIP_RUNNER_REMOTE_PROVIDER_PACK_PATH`.

Do not promote `paperclip-runner-e2e-20260826-v2` for OpenCode or ACPX. Build a new immutable image or snapshot from a clean committed revision and pass that full Git SHA as `PAPERCLIP_RUNNER_SOURCE_REVISION`.

Do not bake provider credentials, Paperclip bootstrap tickets, or Daytona preview tokens into this image. They remain per-run secret material.

### Provider pack and lockfile integrity

The provider-pack build pins the official Linux x64 Node 24.21.0 image by manifest digest. Its bundled Undici is 7.29.1, which fixes [GHSA-3wwx-pv8p-q78v](https://github.com/advisories/GHSA-3wwx-pv8p-q78v). Pi separately verifies its private Node executable and nested npm dependency; changing the outer interpreter does not replace either provider-owned pin.

Provider CLI updates are manifest-only changes: repository CI owns the root lockfile. Resolve the complete workspace manifest graph in the build context before invoking Docker, matching CI when a source commit precedes the lockfile bot. The complete resolved lockfile must match `PAPERCLIP_RUNNER_LOCK_SHA256` before package installation or lifecycle execution. Review and refresh that digest with source dependency changes; registry-time resolution drift fails closed.

### Candidate ACP qualification assets

Provider branches can build their pinned assets with:
```bash
node packages/paperclip-runner/scripts/build-provider-pack.mjs /absolute/pack --candidate-providers=cursor
```
For an isolated Linux x64 Daytona qualification image:
```bash
docker buildx build ... --build-arg PAPERCLIP_RUNNER_CANDIDATE_PROVIDERS=cursor ...
```
Compute its content ID with the same selection:
```bash
pnpm --silent test:e2e:runner:image-id --candidate-providers=cursor
```

Native Grok is an image prerequisite at `/opt/paperclip/providers/grok/1.0.13/grok`. Its checksum-verified provisioning is separate from the provider pack, which ships only the built-in launcher.

---

## 📁 目录

```
docker/daytona-runner/
├── README.md              # This file
├── Dockerfile             # Runner image definition
└── [supporting files]     # Build context artifacts
```

---

## 🔗 资源

### Related documentation

- [Cursor production readiness gates](../../doc/plans/2026-10-03-cursor-production-readiness.md)
- [Fleet sandbox image (paperclip-cloud)](https://github.com/paperclipai/paperclip-cloud/blob/master/fleet-sandbox-image/Dockerfile)

### ACP bridge notes

Keep the patched ACP bridge versions separate from their CLI runtime pins. Their executable digests do not change when only the runtime dependency changes. Refresh the runtime executable digests from integrity-verified npm release archives for every supported platform, and keep the native runner, provider manifest, and remote controller version checks aligned.

---

## 🚀 快速开始

### Build and verify

Run `pnpm --filter @paperclipai/paperclip-runner test:opencode:qualification` after installing dependencies to exercise the actual pinned OpenCode executable.

```bash
content_id="$(pnpm --silent test:e2e:runner:image-id)"
docker buildx build \
  --platform linux/amd64 \
  --build-arg PAPERCLIP_RUNNER_CONTENT_ID="${content_id}" \
  --build-arg PAPERCLIP_RUNNER_SOURCE_REVISION="$(git rev-parse HEAD)" \
  --tag "paperclip-daytona-runner:e2e-content-${content_id}" \
  --load \
  --file docker/daytona-runner/Dockerfile \
  .

docker run --rm --platform linux/amd64 \
  --entrypoint paperclip-runnerd \
  "paperclip-daytona-runner:e2e-content-${content_id}" \
  --build-metadata
```

The metadata must advertise `dial_ws_loopback`, `dial_wss`, and `listen_ws`.

`test:e2e:runner:image-id` hashes the audited Docker build dependency closure, target platform, the immutable Dockerfile syntax-frontend digest, and every immutable `FROM` reference. It fails before the paid workflow can build when the frontend or a base is not pinned to a sha256 digest. When updating the syntax version, resolve and review its registry digest and update both values in the first Dockerfile line.

`PAPERCLIP_RUNNER_SOURCE_REVISION` remains the full Git SHA that built the first published copy and is retained as provenance rather than cache identity.

---

## ⚙️ 技术栈

| Layer | Technology |
|-------|-----------|
| Base image | Daytona fleet sandbox |
| Platform | linux/amd64 only |
| Node.js | 24.21.0 (pinned by manifest digest) |
| Runner daemon | `paperclip-runnerd` (source-built) |
| Provider pack | OpenCode 1.18.34, ACPX 0.13.1, Node 24.11 |
| Build system | Docker Buildx |
| Provenance | Git SHA via `PAPERCLIP_RUNNER_SOURCE_REVISION` |
| Security | No baked credentials; content-ID hashing; lockfile SHA-256 verification |