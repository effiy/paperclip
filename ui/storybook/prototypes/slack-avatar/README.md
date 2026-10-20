---
title: Slack Avatar Settings Preview
tags: storybook, prototypes, slack, avatar, settings, ui
category: storybook-prototype
created: "2024-01-01"
updated: "2026-10-20"
source: external
type: index
status: stable
lifecycle: active
---

# 💡 Slack avatar settings preview

The current management journey is **Connections / Chat management**, including **Slack avatar**. It renders the production Settings page in the app shell.

Automatic setup uploads the selected agent's icon during app creation. It does not include a separate avatar step. Settings retains the download and manual re-upload instructions for existing apps and recovery.

Slack exports use the persisted agent palette, `rest` pose, 512 x 512 pixels, and `background=paperclip-dark`. The background matches Paperclip's dark-mode app surface. Normal Paperclip avatars stay transparent. Storybook generates its preset files with the same production worker as the API.

The older component fixture remains for communication-instruction variants; use Chat management for reviewing the complete shipped page.

Provider icon API: https://docs.slack.dev/reference/methods/apps.icon.set/