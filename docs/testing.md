# Testing checklist

Use this to smoke-test the app after deploy or before release.

Also run local quality gates before release candidates:

- `bun run lint`
- `bun run typecheck`
- `bun run test:run`
- `bun run test:coverage` for larger changes

## Public pages (no login)

- [ ] **Home** (`/`) – loads, nav works
- [ ] **Effect Patterns** (`/patterns`) – list loads
- [ ] **Pattern detail** (`/patterns/[id]`) – pick one, content renders
- [ ] **Blog** (`/blog`) – list loads
- [ ] **Blog post** (`/blog/[slug]`) – pick one, content renders
- [ ] **Consulting** (`/consulting`) – form loads; submit (optional, sends email/inquiry)
- [ ] **Playground** (`/playground`) – loads
- [ ] **Code Review** (`/code-review`) – waitlist/CTA
- [ ] **CLI** (`/cli`) – page loads
- [ ] **MCP** (`/mcp`) – page loads
- [ ] **Search** (`/search`) – search patterns/rules
- [ ] **Rules** (`/rules`) – list loads
- [ ] **Rule detail** (`/rules/[id]`) – pick one, content renders
- [ ] **Tour** (`/tour`) – overview loads
- [ ] **Feedback** (`/feedback`) – form loads and submits

## Auth

- [ ] **Sign-in** (`/auth/sign-in`) – “Continue with GitHub” redirects to WorkOS then back
- [ ] **Sign-out** – header/profile menu → sign out, then confirm logged out
- [ ] **Protected tour modes** – logged-out access to `/tour?mode=v4` or `/tour/[slug]?mode=compare` redirects to sign-in and returns after login

## Logged-in only

- [ ] **Settings** (`/settings`) – profile card, name/email shown
- [ ] **Profile update** – change display name or email, Save → success
- [ ] **API Keys** (`/settings/api-keys`) – list (empty or existing keys)
- [ ] **Create API key** – create key, copy shown once, appears in list
- [ ] **Revoke API key** – revoke one, it disappears or shows revoked
- [ ] **Tour lesson** (`/tour/[slug]`) – start a lesson, progress saves (check step completion)
- [ ] **API key copy-once dialog** – create a key, confirm plaintext is shown once and can be copied

## API routes (via UI or curl)

- [ ] `POST /api/waitlist` – waitlist signup (e.g. from Code Review)
- [ ] `POST /api/consulting` – consulting form submit
- [ ] `POST /api/events` – analytics event (if used by frontend)
- [ ] `GET/POST /api/tour/progress` – get/update tour progress (logged in)
- [ ] `POST /api/tour/progress/sync` – sync tour progress (logged in)
- [ ] `GET/POST /api/bookmarks`, `POST /api/bookmarks/sync` – bookmark persistence and sync (logged in)
- [ ] `GET/POST /api/profile` – get/update profile (logged in)
- [ ] `POST /api/preferences` – save preferences (logged in)
- [ ] `GET/POST /api/api-keys`, `POST /api/api-keys/[id]` – CRUD API keys (logged in)
- [ ] `POST /api/feedback` – feedback form submit and rate-limit behavior

## Local vs production

- **Local**: `bun dev`, use `.env.local` with WorkOS redirect `http://localhost:3000/auth/callback` and add that URL in WorkOS Dashboard.
- **Production**: All env vars live in Vercel. Verify `DATABASE_URL`, WorkOS config, `API_KEY_PEPPER`, `WORKOS_COOKIE_PASSWORD`, and any telemetry keys before deploying.
