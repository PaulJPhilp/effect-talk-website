# EffectTalk Website (v1) — Architecture Document

This document describes the technical architecture for the v1 EffectTalk website. It is written to be directly actionable for implementation (and later to guide agents).

## 1) Goals and scope (architecture-relevant)

### Primary product goal
Convert free EffectPatterns users into:
- email captures (waitlist)
- consulting leads (intake form submissions)
- future paid subscriptions (not implemented in v1)

### Hard boundary / non-goals (v1)
- No billing pages or payment flows (Polar.sh planned later).
- No org/team multi-tenancy (later).
- Playground and EffectTalk Code Review are **Coming soon** only.
- Website should not rely on an external marketing domain (no website references/links required).
- Pattern and rule content is sourced from the existing backend HTTP API at runtime.

## 2) Tech stack

### Frontend / framework
- Next.js (App Router) + React
- TailwindCSS + shadcn/ui

### “Effect everywhere”
- Use Effect for server-side logic (route handlers, service composition, API clients, DB, email).
- Use Effect Atom on the client for UI state (theme, preferences, tab selection as needed).

### Auth
- WorkOS for user management + GitHub OAuth.
- Treat GitHub email as verified (no extra verification workflow).

### Email
- Resend for transactional emails (waitlist confirmation; optional internal notifications).

### Hosting
- Vercel

### DB
- Postgres recommended (provider flexible: Neon/Supabase/Railway, etc.)
- Minimal schema described below.

## 3) Information architecture and routing

### Global layout
- Header (persistent)
- Main content with a “tabs” UI in the main body (not header)
- Footer (simple)

### Routing strategy: Hybrid “tabs + real routes”
Each tab corresponds to a real route (deep linkable, SEO-friendly), while the UI looks and behaves like an app shell.

### Public routes (v1)
- `/` — Home/landing
- `/cli` — EffectPatterns CLI docs
- `/mcp` — EffectPatterns MCP server docs
- `/playground` — Coming soon + waitlist capture (tab disabled)
- `/code-review` — Coming soon + waitlist capture (tab disabled)
- `/patterns` — Patterns index/browse
- `/patterns/[id]` — Pattern detail (indexable, ISR)
- `/rules` — Rules catalog (indexable)
- `/rules/[id]` — Rule detail page (indexable)
- `/consulting` — Consulting offers + intake form
- `/search` — Unified search results (grouped)
- `/thanks` — Thank-you page used by forms

### Auth routes
(Exact paths depend on WorkOS integration; keep consistent and explicit)
- `/auth/sign-in`
- `/auth/callback`
- `/auth/sign-out`

### Auth-required routes
- `/settings` (hub)
- `/settings/profile`
- `/settings/preferences`
- `/settings/email`
- `/settings/api-keys`

## 4) UI components (structural)

### Header (v1)
- Brand/logo: “EffectTalk”
- Global search input (submits to `/search?q=...`)
- Consulting CTA → `/consulting`
- Avatar menu:
  - Signed out: “Sign in”, “Sign up”
  - Signed in: Profile, Settings, Sign out

### Main-body tabs component
Rendered on the “apps” pages (`/cli`, `/mcp`, `/playground`, `/code-review`):
- EffectPatterns CLI (active)
- EffectPatterns MCP Server (active)
- EffectPatterns Playground (disabled/locked → “Coming soon”)
- EffectTalk Code Review (disabled/locked → “Coming soon”)

Implementation detail:
- Even though the tabs are “disabled”, they should still be clickable and route to their pages, but the tab UI indicates “Coming soon” (locked state).

### Footer
Minimal: copyright + internal doc links only.

## 5) Content & data sources

### Source of truth (v1)
- Patterns and rules are fetched from the existing backend HTTP API at runtime.
- CLI/MCP pages are static docs content in the Next app (Markdown or TSX).

### Search content sources
- **Patterns**: from backend API search endpoint(s).
- **Rules**: from backend API list/search rule metadata.
- **Pages**: local static list of site pages (title + route + short description).

### SEO requirement
- Pattern pages are public and indexable.
- Rule pages are public and indexable.
- Ensure canonical URLs and metadata.

## 6) Rendering & caching strategy (Vercel)

### Pattern detail pages `/patterns/[id]`
Use ISR.

Recommended approach:
- Implement `generateStaticParams()` to prebuild all known pattern IDs (216 now).
- Use `revalidate` (e.g. 1 hour) to refresh content.

Fallback behavior:
- If a new pattern ID appears in the backend later, support dynamic params and allow ISR to generate on-demand (Next can do this with App Router + revalidation).

### Rule detail pages `/rules/[id]`
Also indexable; can be SSR with caching or ISR. Recommendation:
- Use ISR or cached fetch since rule metadata changes infrequently.
- Prebuild known rule IDs if convenient.

### Search page `/search`
SSR, but cache backend fetches briefly (or rely on backend caching). Avoid aggressive caching for search.

### Settings pages
SSR + auth-protected.

## 7) Backend integration layer (API client)

Create a single internal module for the backend HTTP API, used by:
- patterns pages
- rules pages
- search
- CLI/MCP docs if they need dynamic content

Design:
- `BackendApi` service (Effect Layer)
  - baseUrl (env)
  - optional API key (v1 likely not required for public endpoints)
  - methods: `searchPatterns`, `getPattern`, `listRules`, `getRule`, etc.

Error handling:
- Map backend errors into typed errors
- Surface user-friendly UI messages for 404/500

## 8) Auth & session architecture (WorkOS)

### Requirements
- GitHub OAuth login
- Settings requires login
- API key issuance requires login
- Email is treated as verified

### Implementation approach (high-level)
- WorkOS handles OAuth.
- Your app maintains a `users` table keyed by `workosUserId` (or equivalent).
- On successful callback:
  - upsert user record (email, name)
  - set session cookie

Session options:
- WorkOS session helpers if available
- Or Next middleware + signed cookies + session table (keep minimal)

Authorization:
- v1 is user-scoped only (no orgs/teams yet)
- enforce ownership for API key endpoints and settings.

## 9) Database design (v1)

Provider: Postgres (recommended)

### Tables (suggested)

#### `users`
- `id` uuid pk
- `workos_user_id` text unique
- `email` text
- `name` text nullable
- `created_at`, `updated_at`

#### `preferences`
- `user_id` uuid pk fk(users.id)
- `theme` enum(`light`,`dark`,`system`)
- `default_tab` enum(`cli`,`mcp`) (others later)
- `default_search_filters` jsonb nullable
- `updated_at`

#### `email_preferences`
- `user_id` uuid pk fk(users.id)
- `product_updates` boolean default true
- `updated_at`

#### `api_keys`
- `id` uuid pk
- `user_id` uuid fk(users.id)
- `name` text (label)
- `key_prefix` text (e.g. first 8–10 chars)
- `key_hash` text (hash only)
- `created_at`
- `revoked_at` timestamp nullable
- `last_used_at` timestamp nullable

#### `waitlist_signups`
- `id` uuid pk
- `email` text
- `role_or_company` text nullable
- `source` enum(`playground`,`code_review`,`unknown`)
- `created_at`

#### `consulting_inquiries`
- `id` uuid pk
- `name` text
- `email` text
- `role` text nullable
- `company` text nullable
- `description` text
- `created_at`

### Notes
- Add unique constraint on waitlist email if you want idempotency; or allow duplicates but de-dupe logically.
- Store only key hashes, never plaintext tokens.

## 10) API key issuance and verification (v1)

### Issuance flow
- User (logged in) goes to Settings → API Keys.
- Create key with a label (e.g. “local dev”, “CI”).
- System generates an **opaque random token**:
  - `etk_live_...` prefix optional (naming can be decided later)
- Show token **once**; user must copy it.
- Persist:
  - `key_prefix` (for display)
  - `key_hash` (e.g. SHA-256 of the token + server-side pepper; or bcrypt/argon2)
- List keys by label + prefix + createdAt + revokedAt.
- Revoke sets `revoked_at`.

### Verification flow (future)
- Paid HTTP tools can accept `x-api-key`.
- Backend validates hash and checks not revoked.
- v1 website only needs issuance and management UI + storage.

## 11) Forms and email flows

### Coming soon pages
`/playground` and `/code-review`
- Waitlist form fields: email + role/company
- No login required
- On submit:
  - write `waitlist_signups`
  - send confirmation email via Resend
  - redirect to `/thanks`

### Consulting page
`/consulting`
- Offers list (3 named offers)
- Form fields:
  - name, email
  - role optional, company optional
  - free-text description
- On submit:
  - write `consulting_inquiries`
  - redirect to `/thanks`
- Optional: send internal notification email to you (can be added later)

### Abuse controls
- Rate limit these endpoints by IP.
- Optionally add CAPTCHA later if needed.

## 12) Unified search architecture

### UX
- Search box in header submits to `/search?q=...`
- Results grouped in this order:
  1) Patterns
  2) Rules
  3) Pages

### Implementation
- `/search` route handler:
  - Validate query
  - Call backend API for patterns and rules search/list + filter locally
  - Match pages list locally (simple substring search)
- Instrument events: `search_performed`

Privacy note:
- Consider logging only query length / hashed query for analytics if desired. v1 can log raw query if you’re okay with it.

## 13) Analytics/events (v1)

Track:
- `waitlist_submitted` with `source`
- `consulting_submitted`
- `tab_clicked` with tab ID
- `search_performed` with grouped counts

Implementation options:
- Minimal internal endpoint `/api/events` that logs to DB or server logs
- Or third-party analytics (allowed)

Since you plan to build a separate marketing site later, keep analytics minimal and portable.

## 14) Observability & error handling

- Provide consistent error boundaries in UI.
- Server-side:
  - typed errors via Effect
  - structured logs (JSON) in Vercel logs
- For user-facing pages:
  - 404 for missing patterns/rules
  - friendly fallback for backend outage (“Try again later”)

## 15) Deployment and environment variables

Vercel env vars (suggested):
- `BACKEND_API_BASE_URL` (your existing HTTP API)
- `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `WORKOS_REDIRECT_URI`
- `RESEND_API_KEY`
- `DATABASE_URL`
- `APP_ENV` or similar
- `COOKIE_SECRET` (if needed)

## 16) Future-proofing (explicitly later)
- Polar.sh subscription integration + billing pages
- Org/team model:
  - org-scoped API keys
  - members/roles
- Enable Playground + Code Review functionality
- Advanced search (ranking, filters, saved searches)
- Admin dashboard for leads/waitlist