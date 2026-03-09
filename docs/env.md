# Environment files

How env files work in this repo and how to manage them safely.

## How env files work

- **Load order:** Next.js loads `.env`, then `.env.local`, then env vars from the shell. Later sources override earlier ones for the same key.
- **Build and runtime:** Next.js reads env at build time, and Vercel injects runtime env for deployed server code.
- **CLI deploy:** When you run `vercel` locally, the build sees your local env files. The deployed runtime still uses Vercel envs.

## File roles

| File           | Committed? | Purpose |
|----------------|------------|--------|
| `.env`         | Yes        | Safe defaults only (localhost URLs, placeholder secrets). Ensures required keys exist everywhere. **Never put real secrets here.** |
| `.env.example` | Yes        | Template with the same keys as `.env`. Copy to `.env.local` and replace placeholders with real values. |
| `.env.local`   | No (gitignored) | Your real secrets. Overrides `.env` for local dev and for CLI deploy. **Never commit.** |

## Rules to manage env files

1. **Do not put real secrets in `.env`** — It is committed. Use only safe defaults and placeholders (e.g. `WORKOS_COOKIE_PASSWORD=xxx`, `API_KEY_PEPPER=change-me-in-production`).
2. **Do not commit `.env.local`** — It is gitignored. It holds real API keys, cookie passwords, and DB URLs.
3. **Keep `.env` and `.env.example` in sync** — Same keys, same order. When you add a new env var the app needs, add it to both (with a safe default in `.env`, same placeholder or value in `.env.example`).
4. **Edit env files only when needed** — add new keys deliberately, keep `.env` and `.env.example` aligned, and never commit real secrets.
5. **WorkOS:** In `.env.local`, `WORKOS_COOKIE_PASSWORD` must be **at least 32 characters**. Generate with: `openssl rand -base64 24`.
6. **CLI deploy:** Before running `vercel` or `vercel --prod`, ensure `.env.local` has real values for WorkOS and any other features you need in the deployed app; the build reads `.env` and `.env.local` on your machine. Run **`bun run env:check`** to validate required vars (no secrets printed).

## One-time setup

1. `cp .env.example .env.local`
2. Edit `.env.local`: replace every placeholder with real values (WorkOS from dashboard, Resend key, etc.).
3. Set `WORKOS_COOKIE_PASSWORD` to a 32+ character secret (e.g. `openssl rand -base64 24`).
4. In WorkOS Dashboard → Redirects, add your callback URL (e.g. `http://localhost:3000/auth/callback`).
5. Do not commit `.env.local`.

After that, use the rules above when you add or change variables.

## Staging environment (Vercel Preview)

Staging uses Vercel **Preview** deployments. Each external service needs its own staging credentials so preview builds don't pollute production data. Set these in **Vercel → Project → Settings → Environment Variables** scoped to **Preview**.

| Variable | Staging value | Notes |
|----------|--------------|-------|
| `APP_ENV` | `staging` | Tells the app to use Neon serverless driver and tags telemetry spans |
| `DATABASE_URL` | Neon branch connection string | Create a branch from your production Neon database (see docs/deployment.md) |
| `NEXT_PUBLIC_POSTHOG_KEY` | Staging project key | Create a separate PostHog project for staging |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` | Same host, different project key |
| `OTEL_SERVICE_NAME` | `effect-talk-website` | Same service name; spans are distinguished by `deployment.environment` resource attribute |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `https://api.honeycomb.io` | Same endpoint; use a staging API key for dataset isolation |
| `OTEL_EXPORTER_OTLP_HEADERS` | `x-honeycomb-team=<staging-api-key>` | Staging Honeycomb API key |
| `WORKOS_API_KEY` | WorkOS API key used by staging | Must match the WorkOS environment/client your Preview deploy uses |
| `WORKOS_CLIENT_ID` | Matching client ID | |
| `WORKOS_REDIRECT_URI` | `https://staging-effecttalk.vercel.app/auth/callback` | Must match WorkOS redirect config |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | Same callback URL | Public redirect value; the staging deploy script can also inject this at build time |
| `WORKOS_COOKIE_PASSWORD` | Separate 32+ char secret | Generate: `openssl rand -base64 24` |

The `getAppEnv()` utility in `src/lib/env.ts` automatically derives `"staging"` from `VERCEL_ENV=preview` when `APP_ENV` is not set, but explicitly setting `APP_ENV=staging` is recommended.

After deploying a preview build, verify the configuration at `https://<preview-url>/api/health-check`.
