---
title: "Paperclip Page Skill"
tags: ["skill", "publish", "s3", "cloudfront", "static-pages", "paperclip"]
category: "skill"
created: "2024-01-01"
updated: "2026-10-20"
source: "external"
type: "index"
status: "stable"
lifecycle: "active"
---

# Paperclip Page Skill

---

## 💡 概述

`paperclip-page` publishes static page directories to a Paperclip-controlled S3
bucket served through CloudFront. It is the durable Paperclip-owned replacement
for quick `here.now`-style page sharing.

The v1 security posture is:

- CloudFront + ACM + Origin Access Control in front of a private S3 REST origin.
- Public content only.
- Dedicated uploader IAM identity, separate from Paperclip attachment storage.
- No `s3:DeleteObject`, no `aws s3 sync --delete`, and no bucket/IAM/DNS changes
  from the publish helper.
- Symlinks, hidden files, unsafe slugs, and accidental overwrites are rejected.

---

## ⚡ 功能

### Agent Quick Start

Build or prepare a static directory with `index.html` at its root:

```bash
site/
  index.html
  assets/app.css
  assets/app.js
```

Validate without AWS writes:

```bash
.agents/skills/paperclip-page/scripts/publish.sh ./site --slug demo --dry-run
```

Publish:

```bash
.agents/skills/paperclip-page/scripts/publish.sh ./site --slug demo
```

Update an existing page from the same source directory:

```bash
.agents/skills/paperclip-page/scripts/publish.sh ./site --slug demo --update
```

The helper prints:

- public URL
- S3 key prefix
- local ownership state path

### Source Directory Rules

- `index.html` must exist at the directory root.
- Source directory itself must not be a symlink.
- No symlinks anywhere in the tree.
- No hidden files or dot paths in published content.
- `.paperclip-page/state.json` is allowed and excluded from uploads.
- Do not publish secrets, credentials, internal logs, private company material,
  customer data, or regulated data.

### Credential Resolution

Credential resolution order inside `publish.sh`:

1. `PAPERCLIP_PAGE_AWS_ACCESS_KEY_ID` + `PAPERCLIP_PAGE_AWS_SECRET_ACCESS_KEY`
   (scoped to the helper's `aws` calls; the surrounding process identity is
   untouched)
2. `PAPERCLIP_PAGE_AWS_PROFILE`, passed to `aws` as `--profile` (ambient
   `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN` /
   `AWS_PROFILE` are stripped from the helper's `aws` calls so the named
   profile always wins)
3. The ambient AWS credential chain

Setting both the namespaced key pair and `PAPERCLIP_PAGE_AWS_PROFILE` is an
error.

---

## 📊 指标

待补充

---

## 🏛️ 设计

### Environment Variables

Required for live publishes:

```bash
export AWS_REGION=us-east-1
export PAPERCLIP_PAGE_BUCKET=paperclip-pages-prod
export PAPERCLIP_PAGE_BASE_URL=https://pages.paperclip.ing
export PAPERCLIP_PAGE_AWS_ACCESS_KEY_ID=...
export PAPERCLIP_PAGE_AWS_SECRET_ACCESS_KEY=...
```

Optional:

```bash
export PAPERCLIP_PAGE_DEFAULT_PREFIX=""
export PAPERCLIP_PAGE_AWS_PROFILE=paperclip-page-uploader
export PAPERCLIP_PAGE_AWS_SESSION_TOKEN=...  # only with the namespaced key pair
```

### Recommended Paperclip secret names

- `paperclip-page-aws-access-key-id`
- `paperclip-page-aws-secret-access-key`

Bind those secrets into publisher agents as `PAPERCLIP_PAGE_AWS_ACCESS_KEY_ID`
and `PAPERCLIP_PAGE_AWS_SECRET_ACCESS_KEY`. Never bind them as the global
`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` names: static env keys override
`AWS_PROFILE` in the AWS CLI and every SDK, so global names silently switch the
whole agent run -- and every subprocess -- to the page-uploader identity and
break access to anything the uploader cannot reach (Secrets Manager, STS role
use, other buckets). Do not reuse Paperclip's internal S3 attachment/object
storage credentials.

### Public Content Security Notes

Anything published with this skill is public. The tool cannot reliably classify
generated files, so the publishing agent must inspect content before uploading.

Do not publish:

- API keys, OAuth tokens, cookies, or `.env` files
- internal customer data
- private company docs
- unpublished security reports
- raw transcripts that may contain secrets

Recovery after accidental overwrite uses S3 versioning. Because v1 uploader
credentials cannot delete objects, rollback should be performed by an operator
with admin credentials.

---

## 📁 目录

待补充

---

## 🔗 资源

待补充

---

## 🚀 快速开始

### Agent Quick Start

Build or prepare a static directory with `index.html` at its root:

```bash
site/
  index.html
  assets/app.css
  assets/app.js
```

Validate without AWS writes:

```bash
.agents/skills/paperclip-page/scripts/publish.sh ./site --slug demo --dry-run
```

Publish:

```bash
.agents/skills/paperclip-page/scripts/publish.sh ./site --slug demo
```

Update an existing page from the same source directory:

```bash
.agents/skills/paperclip-page/scripts/publish.sh ./site --slug demo --update
```

### Install And Attach

Create or update the company skill from this package:

```bash
npx paperclipai skills create \
  --company-id <company-id> \
  --name "Paperclip Page" \
  --slug paperclip-page \
  --description "Publish static pages to the Paperclip pages host" \
  --body-file .agents/skills/paperclip-page/SKILL.md
```

Attach it to an agent:

```bash
npx paperclipai skills agent sync <agent-id-or-shortname> \
  --company-id <company-id> \
  --skill paperclip-page
```

### AWS Setup

Run setup with an operator/admin AWS profile. Agents using this skill should not
create buckets, mutate IAM, change DNS, or manage CloudFront.

```bash
export AWS_PROFILE=paperclip-admin
export AWS_REGION=us-east-1
export BUCKET=paperclip-pages-prod
export DOMAIN=pages.paperclip.ing
export UPLOADER_USER=paperclip-page-uploader
export CLOUDFRONT_COMMENT="Paperclip pages"

aws sts get-caller-identity --profile "$AWS_PROFILE"
```

Create the bucket, disable ACLs, block public access, enable versioning, enable default encryption, upload an operator-managed root `404.html`, create an ACM certificate, create a CloudFront OAC, create and publish a CloudFront Function for clean page URLs, create the distribution, grant CloudFront read access, and create the uploader IAM user. See the commands in the original source for full details.

### Cloudflare DNS

Use DNS-only or proxied CNAME to CloudFront. Do not point v1 at the S3 website endpoint.

### Credential Rotation

1. Create a second access key
2. Store new secret versions in Paperclip Secrets
3. Update agent env bindings to the new versions or `latest`
4. Run a dry-run and a small publish smoke
5. Disable the old key
6. Delete the old key after the next successful publish

### Troubleshooting

`AccessDenied` on upload:
- Confirm agent env contains the uploader key, not the admin key.
- Confirm the uploader policy allows `s3:ListBucket`, `s3:GetObject`, and `s3:PutObject`.
- Confirm uploads target `<slug>/...` so the `arn:aws:s3:::<bucket>/*/*` object ARN matches.

`Slug already exists`:
- Use a different slug, or run `--update` from the original source directory that has `.paperclip-page/state.json`.

Generated slug collides:
- The helper appends a short suffix for generated slugs when AWS reports a collision. Explicit slugs fail instead of silently changing the URL.

URL 404s after upload:
- Check `curl -I https://<domain>/<slug>/`.
- Check CloudFront distribution deployment status.
- Check DNS CNAME target.
- Check the object exists at `s3://<bucket>/<slug>/index.html`.

Stale browser cache:
- The helper uses `Cache-Control: public,max-age=60`. Wait a minute or issue a CloudFront invalidation.

CloudFront returns 403:
- Confirm the bucket policy references the correct distribution ARN.
- Confirm OAC is attached to the S3 origin.
- Confirm the bucket is private and public access block is enabled.

---

## ⚙️ 技术栈

- AWS S3 (private bucket, versioning enabled)
- AWS CloudFront (+ ACM certificate, OAC)
- CloudFront Functions (index router)
- Route 53 / Cloudflare DNS
- IAM (dedicated uploader user)
- Bash (`publish.sh` script)
- AWS CLI
- Paperclip Secrets