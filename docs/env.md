# Environment files

**The env files are set up correctly. Do not modify `.env`, `.env.example`, or `.env.local` unless you are explicitly adding a new variable or rotating a secret.**

How they work and how to manage them.

## How env files work

- **Load order:** Next.js loads `.env`, then `.env.local`, then env vars from the shell. Later sources override earlier ones for the same key.
- **Build and runtime:** Values are read at **build time** (e.g. `next build`, `vercel`) and at **runtime**. Middleware and server code use whatever was available when the app was built (and, on Vercel, runtime env can override for serverless/Edge where the platform injects vars).
- **CLI deploy:** When you run `vercel` or `vercel --prod`, the build runs on your machine. So the build sees `.env` and `.env.local` from your repo. The deployed app uses those inlined values; sign-in and API keys only work if `.env.local` had real values when you built.

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
4. **Leave env files alone** — They are set up correctly. Do not edit `.env`, `.env.example`, or `.env.local` unless you are adding a new variable or rotating a secret.
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
| `WORKOS_API_KEY` | Staging environment key | From WorkOS Dashboard → Staging environment |
| `WORKOS_CLIENT_ID` | Staging client ID | From WorkOS Dashboard → Staging environment |
| `WORKOS_REDIRECT_URI` | `https://*-effect-talk-website.vercel.app/auth/callback` | Must match WorkOS redirect config |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | Same as `WORKOS_REDIRECT_URI` | Public for client redirect |
| `WORKOS_COOKIE_PASSWORD` | Separate 32+ char secret | Generate: `openssl rand -base64 24` |

The `getAppEnv()` utility in `src/lib/env.ts` automatically derives `"staging"` from `VERCEL_ENV=preview` when `APP_ENV` is not set, but explicitly setting `APP_ENV=staging` is recommended.

After deploying a preview build, verify the configuration at `https://<preview-url>/api/health-check`.
