# Environments

The app runs in three environments: **dev** (local), **staging**, and **production**. Each has its own URL, env source, and auth configuration.

## Overview

| Environment | URL(s) | Env source | WorkOS | Deploy |
|-------------|--------|------------|--------|--------|
| **Dev** | `http://localhost:3000` | `.env` + `.env.local` | Same client as prod; redirect `localhost:3000` | `bun run dev` |
| **Staging** | `https://staging-effecttalk.vercel.app` | Vercel **Preview** env vars | WorkOS **Production** client; redirect staging URL | `bun run deploy:staging` |
| **Production** | `https://effecttalk.dev` | Vercel **Production** env vars | WorkOS **Production** client | `bun run deploy:prod` |

---

## Dev (local)

- **URL:** `http://localhost:3000`
- **Run:** `bun run dev`
- **Env:** Next.js loads `.env` then `.env.local` (see [env.md](env.md)).

### Setup

1. `cp .env.example .env.local` and fill in real values.
2. WorkOS Dashboard → **Production** → Redirects: add `http://localhost:3000/auth/callback`.
3. `WORKOS_COOKIE_PASSWORD` must be 32+ characters (`openssl rand -base64 24`).
4. Point `DATABASE_URL` at a local or shared dev Postgres (e.g. Neon dev branch).

### Notes

- Uses the same WorkOS **Production** client ID as production; only the redirect URI differs.
- No separate “WorkOS Staging” env is required for local dev.

---

## Staging

- **URL:** `https://staging-effecttalk.vercel.app` (stable alias; does not change per deploy).
- **Deploy:** `bun run deploy:staging` (see [Deploy script](#staging-deploy-script) below).
- **Env:** Vercel project → Settings → Environment Variables, scoped to **Preview**.

### WorkOS

Staging uses the **Production** environment in WorkOS (same client as effecttalk.dev). In WorkOS Dashboard → **Production** → Redirects, ensure this URI is listed:

- `https://staging-effecttalk.vercel.app/auth/callback`

### Vercel Preview env vars (staging)

| Variable | Value |
|----------|--------|
| `APP_BASE_URL` | `https://staging-effecttalk.vercel.app` |
| `WORKOS_REDIRECT_URI` | `https://staging-effecttalk.vercel.app/auth/callback` |
| `DATABASE_URL` | Staging DB (e.g. Neon branch); same schema as prod |
| Other | Same as [deployment.md](deployment.md#required-environment-variables) for Preview |

`NEXT_PUBLIC_WORKOS_REDIRECT_URI` is **not** set in Vercel for Preview; it is baked in at build time by the deploy script (see below).

### Staging deploy script

`bun run deploy:staging` runs [scripts/deploy-staging.sh](../scripts/deploy-staging.sh), which:

1. Cleans `.next` and `.vercel/output`.
2. Builds with `NEXT_PUBLIC_WORKOS_REDIRECT_URI=https://staging-effecttalk.vercel.app/auth/callback`.
3. Runs `vercel deploy --prebuilt`.
4. Aliases the new preview deployment to `staging-effecttalk.vercel.app`.

So every staging deploy updates the same stable URL. The script requires the Vercel CLI and that the project is linked (`vercel link` or `vercel` from the repo).

### Database

Preview `DATABASE_URL` should point to a database with the same schema as production (e.g. a Neon branch). If it points elsewhere or is missing, sign-in may succeed in WorkOS but the callback will fail on user upsert.

---

## Production

- **URL:** `https://effecttalk.dev`
- **Deploy:** `bun run deploy:prod` (or Vercel Git integration for `main`).
- **Env:** Vercel project → Settings → Environment Variables, scoped to **Production**.

### WorkOS

WorkOS Dashboard → **Production** → Redirects must include:

- `https://effecttalk.dev/auth/callback` (typically set as default).

### Vercel Production env vars

| Variable | Value |
|----------|--------|
| `APP_BASE_URL` | `https://effecttalk.dev` |
| `WORKOS_REDIRECT_URI` | `https://effecttalk.dev/auth/callback` |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | `https://effecttalk.dev/auth/callback` |
| Plus all others in [deployment.md](deployment.md#required-environment-variables). |

---

## Quick reference

| Task | Command / action |
|------|-------------------|
| Run locally | `bun run dev` |
| Deploy staging | `bun run deploy:staging` |
| Deploy production | `bun run deploy:prod` |
| Check env before deploy | `bun run env:check` |
| Check DB connectivity | `bun run db:check` |
