You are a senior full-stack engineer building the v1 EffectTalk website.

You must follow this spec exactly. If anything is ambiguous, choose the simplest
implementation that satisfies the requirements and note the assumption in code
comments.

===============================================================================
HIGH-LEVEL GOAL
Build a production-ready Next.js (App Router) site hosted on Vercel with:
- Public, indexable EffectPatterns content (patterns + rules) fetched from an
  existing backend HTTP API at runtime.
- Docs pages for EffectPatterns CLI and MCP server.
- “Coming soon” teaser pages for EffectPatterns Playground (free) and EffectTalk
  Code Review (paid) with a global waitlist email capture form.
- Consulting page with offers + intake form.
- GitHub OAuth login via WorkOS.
- User settings (login required) including API key issuance (site issues keys).
- Global search UI that returns grouped results (Patterns, Rules, Pages).
- ISR for pattern pages /patterns/[id] and rule pages /rules/[id].
- Tailwind + shadcn/ui.
- “Effect everywhere”: use Effect for server logic and Effect Atom for client UI
  state where helpful.

===============================================================================
NON-GOALS / HARD CONSTRAINTS
- No billing pages. No Stripe. Polar.sh payments are later.
- No org/team functionality in v1.
- No actual Playground. No actual Code Review tooling. Only “Coming soon” + waitlist.
- No external marketing website references/links are required.
- Forms must redirect to /thanks after successful submission.
- Waitlist is global (one list) and must work without login.
- Settings requires login.
- Pattern and rule pages must be indexable and use ISR (revalidate).

===============================================================================
ROUTES TO IMPLEMENT (v1)
Public:
- /                       (home/landing)
- /cli                    (EffectPatterns CLI docs)
- /mcp                    (EffectPatterns MCP server docs)
- /playground             (Coming soon + waitlist)
- /code-review            (Coming soon + waitlist)
- /patterns               (patterns index)
- /patterns/[id]          (pattern detail, ISR)
- /rules                  (rules index)
- /rules/[id]             (rule detail, ISR)
- /search                 (grouped results)
- /consulting             (offers + intake form)
- /thanks                 (thank-you page)

Auth:
- /auth/sign-in
- /auth/callback
- /auth/sign-out

Settings (login required):
- /settings
- /settings/profile
- /settings/preferences
- /settings/email
- /settings/api-keys

===============================================================================
UI / LAYOUT REQUIREMENTS
Header (global, on every page):
- Brand/logo: “EffectTalk” (links to /)
- Global search input:
  - submitting navigates to /search?q=...
- Consulting CTA button/link -> /consulting
- Avatar menu at right:
  - Logged out: Sign in, Sign up (both go to /auth/sign-in)
  - Logged in: Profile, Settings, Sign out
Main body:
- On /cli, /mcp, /playground, /code-review render a "tabs" bar in the BODY (not header):
  Tabs (in this order):
  - EffectPatterns CLI (active)
  - EffectPatterns MCP Server (active)
  - EffectPatterns Playground (disabled/locked, “Coming soon”)
  - EffectTalk Code Review (disabled/locked, “Coming soon”)
  Even if “disabled”, clicking should still navigate to that route; but UI
  shows locked state and page is “Coming soon”.
Footer:
- Simple minimal footer (no external links required).

Global search grouping:
- Groups: Patterns, Rules, Pages
- Order: Patterns first, Rules second, Pages third

===============================================================================
DATA SOURCES
Patterns + Rules come from an existing backend HTTP API at runtime.
Define BACKEND_API_BASE_URL env var and create a typed API client.

You must not hardcode pattern/rule content into the site.

Patterns:
- patterns count ~216 currently
- /patterns and /patterns/[id] must be public and indexable
- /patterns/[id] must use ISR

Rules:
- /rules and /rules/[id] must be public and indexable
- /rules/[id] should use ISR or cached fetch

Pages group for search:
- A local static list of site pages: title, href, description

===============================================================================
FORMS
1) Waitlist form (on /playground and /code-review):
- Fields: email (required), roleOrCompany (optional)
- No login required
- Store in DB table waitlist_signups with source:
  - "playground" for /playground
  - "code_review" for /code-review
- Send confirmation email via Resend
- Redirect to /thanks

2) Consulting intake form (on /consulting):
- Offers list visible:
  - Effect Assessment
  - Migration Strategy
  - Developer Training
- Form fields:
  - name (required)
  - email (required)
  - role (optional)
  - company (optional)
  - description (required, free-text problem description)
- Store in DB table consulting_inquiries
- Redirect to /thanks

Add basic abuse protection:
- Rate limit form POST endpoints by IP (simple in-memory is OK for v1, but
  note that serverless memory is per-instance; still acceptable initially).
- Validate all inputs with Zod.

===============================================================================
AUTH (WorkOS)
- Implement GitHub OAuth via WorkOS.
- Treat returned GitHub email as verified; do not build extra verification flow.
- Settings pages require login.
- After login, upsert user in DB by workosUserId.

===============================================================================
API KEYS (Settings -> API Keys)
- User can create and revoke API keys (user-scoped only).
- Key format: opaque random token (recommended).
- Show plaintext key only once at creation time.
- Store only:
  - keyPrefix (first 8–10 chars)
  - keyHash (never store plaintext)
  - name/label
  - timestamps + revokedAt
- List keys showing: name, prefix, createdAt, revokedAt.
- Revoke sets revokedAt (soft revoke).
- Hashing: use SHA-256(token + serverPepper) for v1 (pepper from env), or a
  stronger KDF if available. Document in code.

===============================================================================
ANALYTICS (v1)
Track events:
- waitlist_submitted (source)
- consulting_submitted
- tab_clicked (cli|mcp|playground|code-review)
- search_performed (q length + group result counts; avoid storing raw q if easy)
Implement as a minimal internal endpoint /api/events that stores to DB or logs.

===============================================================================
TECH REQUIREMENTS
- Next.js App Router
- Tailwind + shadcn/ui components
- Use Effect for server-side modules (BackendApi, Db, Email, Auth, Analytics)
- Use Effect Atom on client for theme/preferences if convenient
- Use TypeScript everywhere
- Ensure pages have SEO metadata (title/description) and are indexable where required.

===============================================================================
ENV VARS (minimum)
- BACKEND_API_BASE_URL
- DATABASE_URL
- WORKOS_API_KEY
- WORKOS_CLIENT_ID
- WORKOS_REDIRECT_URI
- RESEND_API_KEY
- API_KEY_PEPPER (server-side pepper for hashing)
- APP_BASE_URL (for callback URLs)
- APP_ENV (local|staging|production)

===============================================================================
CONCRETE FILE/FOLDER LAYOUT (must follow)
Use this structure:

/app
  /layout.tsx                     (global layout: Header + main + Footer)
  /page.tsx                       (home)
  /cli/page.tsx                   (CLI docs page)
  /mcp/page.tsx                   (MCP docs page)
  /playground/page.tsx            (Coming soon + waitlist form)
  /code-review/page.tsx           (Coming soon + waitlist form)
  /patterns/page.tsx              (patterns index)
  /patterns/[id]/page.tsx         (pattern detail, ISR)
  /rules/page.tsx                 (rules index)
  /rules/[id]/page.tsx            (rule detail, ISR)
  /search/page.tsx                (grouped search results)
  /consulting/page.tsx            (offers + consulting form)
  /thanks/page.tsx                (thank you)
  /settings/layout.tsx            (settings layout + nav; auth-protected)
  /settings/page.tsx              (settings overview)
  /settings/profile/page.tsx
  /settings/preferences/page.tsx
  /settings/email/page.tsx
  /settings/api-keys/page.tsx
  /auth/sign-in/page.tsx
  /auth/callback/route.ts         (WorkOS callback handler)
  /auth/sign-out/route.ts

/app/api
  /waitlist/route.ts              (POST waitlist)
  /consulting/route.ts            (POST consulting)
  /api-keys/route.ts              (GET list + POST create)
  /api-keys/[id]/route.ts         (POST revoke)
  /events/route.ts                (POST analytics events)

/components
  /Header.tsx
  /Footer.tsx
  /TabsBar.tsx                    (body tabs for cli/mcp/playground/code-review)
  /SearchInput.tsx
  /AvatarMenu.tsx
  /ComingSoon.tsx
  /WaitlistForm.tsx
  /ConsultingForm.tsx
  /PatternsList.tsx
  /RulesList.tsx
  /GroupedSearchResults.tsx
  /SettingsNav.tsx

/lib
  /env.ts                         (typed env parsing)
  /pagesIndex.ts                  (static list of site pages for search grouping)
  /seo.ts                         (helpers for metadata)
  /rateLimit.ts                   (simple rate limiter)

/services                         (Effect services; no React here)
  /BackendApi.ts                  (Effect service to call backend HTTP API)
  /Db.ts                          (Effect service for DB access)
  /Auth.ts                        (WorkOS helpers + session utilities)
  /Email.ts                       (Resend)
  /ApiKeys.ts                     (issue/hash/verify/list/revoke keys)
  /Analytics.ts                   (track events)
  /index.ts                       (Layer composition helpers)

/db
  /schema.sql                     (or drizzle/prisma schema; choose one)
  /migrations/...                 (if using a migration tool)
  /client.ts                      (db client wrapper)

/styles
  /globals.css

===============================================================================
IMPLEMENTATION NOTES (important)
- Use server actions OR route handlers for forms; route handlers are fine and
  explicit (preferred).
- Use Zod schemas for all input validation (forms, query params).
- Ensure /patterns/[id] and /rules/[id] implement ISR:
  - export const revalidate = <seconds>;
  - optionally generateStaticParams by fetching IDs from backend API.
- For Settings auth:
  - Put auth guard in /app/settings/layout.tsx or middleware.
- For search:
  - /search reads q from searchParams; calls backend API for patterns and rules;
    and local pages list for pages results; then renders grouped results.

===============================================================================
DELIVERABLE
Produce a working Next.js app matching the above with:
- All routes implemented
- Auth working with WorkOS (sign-in/callback/sign-out)
- DB persistence for waitlist, consulting, user profile/preferences, api keys
- Resend confirmation email for waitlist submit
- Pattern/rule fetching and pages rendering (ISR)
- Global search grouped results
- Clean UI with Tailwind + shadcn

Start by scaffolding the project structure, then implement services, then routes,
then UI, then polish/metadata.