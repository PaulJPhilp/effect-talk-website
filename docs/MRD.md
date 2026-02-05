MRD — EffectTalk Website (v1)

1. Purpose


Build the EffectTalk website to:


- Promote and distribute free EffectPatterns tools (CLI, MCP docs) and content (patterns + rule catalog)

- Tease paid EffectTalk tools (Code Review) and upcoming free Playground via “Coming soon”

- Drive conversion to:
	1. email captures (waitlist)

	2. consulting leads (intake form)

	3. future paid subscriptions (not implemented in v1)


2. Target users / personas (ranked)

1. Solo dev learning Effect

2. Staff/Principal engineer evaluating tooling

3. CTO/VP Eng

4. Engineering manager

5. Consultants/agency

3. Product principles

- Clear naming boundary:
	- EffectPatterns = free tools

	- EffectTalk = paid tools


- “Everything is an Effect” philosophy should be reflected in tone and information architecture, but v1 focuses on usability over gimmicks.

- Keep v1 focused: documentation + discovery + lead capture.

4. In-scope (v1)

IA / sections (tabs in main body)

- EffectPatterns CLI (active)

- EffectPatterns MCP Server (active)

- EffectPatterns Playground (disabled, Coming soon + waitlist capture)

- EffectTalk Code Review (disabled, Coming soon + waitlist capture)

Global layout

- Header:
	- EffectTalk brand/logo

	- Global search input

	- Consulting CTA link/button

	- Avatar entry:
		- signed-out: Sign in / Sign up

		- signed-in: profile entry point / settings



- Main body:
	- “tabs” UI (not in header)

	- content for the selected section


- Footer:
	- simple, minimal; repo-local links only as desired


Search (v1)

- Dedicated route: /search?q=...

- Grouped results: Patterns, Rules, Pages

- Tracks search usage events

Patterns (v1)

- 216 patterns currently

- Public, indexable pages: /patterns/<id>

- Served via ISR

Rules catalog (v1)

- Public, indexable

- Read-only listing + per-rule detail page or expandable detail

- Sourced from existing HTTP API at runtime

Auth / settings (v1)

- GitHub OAuth via WorkOS

- Settings requires login

- Settings features:
	- theme (light/dark/system)

	- profile (name, email)

	- email preferences

	- preferences (default tab, default search filters)

	- API keys: user can create/revoke keys issued by EffectTalk system


Consulting (v1)

- Internal page /consulting

- Offers: Effect Assessment, Migration Strategy, Developer Training

- Intake form fields:
	- name, email

	- role (optional), company (optional)

	- free-text problem description


- On submit: redirect to /thanks

Waitlist (v1)

- Global waitlist (single list)

- Forms appear only on Coming Soon pages

- Fields: email + role/company

- On submit: redirect to /thanks

- Confirmation email sent via Resend

- Storage: DB + sync to email provider list (v1 can store in DB and send email; sync can be a job or later)

5. Out of scope (v1)

- Billing UI and payments integration (Polar planned, but no billing in v1)

- Teams/orgs and roles (explicitly later)

- Interactive Playground

- EffectTalk Code Review functionality (tease only)

- Any website references to external marketing domain if you want to keep it repo-local (you removed external links)

6. Success metrics (v1)

- Waitlist signups

- Consulting form submissions

- Search usage and tab clicks (engagement)

7. Non-functional requirements

- Fast, SEO-friendly pages for patterns and docs

- Secure auth, secure API key issuance + display (show key only once)

- Basic analytics/events

- Hosted on Vercel


---

Architecture Document — EffectTalk Website (v1)

1. Stack

- Next.js (App Router) + React

- TailwindCSS + shadcn/ui

- Effect for server-side logic (route handlers, services)

- Effect Atom for client state where helpful (preferences, UI state)

- Auth: WorkOS (GitHub OAuth)

- Email: Resend

- Hosting: Vercel

2. Routing map


Public:


- / — landing/home (explains tabs + search, highlights free tools)

- /cli — EffectPatterns CLI docs

- /mcp — EffectPatterns MCP server docs

- /playground — Coming soon + waitlist (disabled tab points here)

- /code-review — Coming soon + waitlist (disabled tab points here)

- /patterns — patterns index/browse

- /patterns/[id] — pattern detail (ISR, indexable)

- /rules — rules catalog

- /rules/[id] — rule detail (optional but recommended for SEO + share)

- /consulting — offers + intake form

- /search — grouped search results

- /thanks — generic thank-you page for waitlist + consulting

Auth-required:


- /settings — settings hub

- /settings/profile

- /settings/preferences

- /settings/email

- /settings/api-keys

Auth routes (WorkOS-managed or your wrappers):


- /auth/sign-in

- /auth/callback

- /auth/sign-out

3. “Tabs in main body” UX approach (Hybrid)

- Each tab maps to a route (/cli, /mcp, etc.)

- The tab UI is a component rendered on those pages to maintain consistent shell.

- Disabled tabs still render in the tab bar but navigate to their pages which are “Coming soon”.

4. Data sources


Patterns + rules come from your existing HTTP API at runtime.


- For pattern detail pages, use ISR:
	- generateStaticParams for known pattern IDs OR

	- dynamic ISR with caching (recommended on Vercel)


- The site should have an internal API client module to call the backend.

Waitlist, consulting submissions, user preferences, API keys:


- stored in the website DB

5. Database (minimal schema)


You can use Postgres (Neon/Supabase) or equivalent; architecture is DB-agnostic.

Tables (suggested):


- users
	- id (internal UUID)

	- workosUserId

	- email

	- name

	- createdAt, updatedAt


- sessions (if not fully handled by WorkOS SDK)

- api_keys
	- id

	- userId

	- name (label)

	- keyPrefix (e.g. first 8 chars)

	- keyHash (hash only; never store plaintext)

	- createdAt

	- revokedAt nullable

	- lastUsedAt nullable


- preferences
	- userId

	- theme

	- defaultTab

	- defaultSearchFilters (json)


- email_preferences
	- userId

	- productUpdates boolean


- waitlist_signups
	- id

	- email

	- roleOrCompany (string)

	- source (enum: playground|code-review|unknown)

	- createdAt


- consulting_inquiries
	- id

	- name

	- email

	- role nullable

	- company nullable

	- description text

	- createdAt


6. API key issuance design

- User creates a key in Settings → API Keys

- System generates an opaque token (random) and shows it once

- Store only hash + prefix

- Allow revoke (soft revoke via revokedAt)

- Later: keys can authenticate calls to paid HTTP API

7. Email flows (Resend)

- On waitlist signup: send “Thanks — you’re on the list”

- On consulting inquiry: optional (v1 can just store + show confirmation; you can also email yourself via Resend)

8. Analytics/events (v1)


Track events:


- waitlist_submitted (source, route)

- consulting_submitted (offerSelected? in v1 it’s not selected; could infer from page)

- tab_clicked (cli/mcp/playground/code-review)

- search_performed (query length, filters, result counts; avoid sending full query if privacy-sensitive)

Implementation can be a simple internal event endpoint + server log initially, or a third-party analytics provider (allowed).

9. Security / privacy

- Rate limit waitlist and consulting forms (basic IP-based)

- Consider CAPTCHA if abuse appears (optional)

- Do not store plaintext API keys; hash them

- Sanitize and validate inputs (zod)

10. Rendering strategy

- Pattern pages: ISR

- Rules/pages/search: SSR or cached fetch, depending on performance

- Settings: auth-protected SSR


---

Build Prompt for an Agent (Site Implementation)

	You are implementing the v1 EffectTalk website.
	
	CONTEXT / PRODUCT RULES
	- EffectTalk is the business/site brand.
	- EffectPatterns sections are free.
	- EffectTalk sections are paid, but in v1 they are “Coming soon” only (no paid
	  functionality).
	- Tabs are in the main body (not in header).
	- The site must NOT include billing yet. Payments via Polar.sh will be later.
	- Auth uses WorkOS (GitHub OAuth).
	- Email uses Resend.
	- Patterns/rules are fetched from the existing backend HTTP API at runtime.
	- Pattern pages must be indexable and use ISR.
	
	STACK
	- Next.js App Router + React
	- Tailwind + shadcn/ui
	- Effect for server-side logic and service layering
	- Effect Atom for client state where appropriate
	
	ROUTES TO IMPLEMENT (v1)
	Public:
	- / (home)
	- /cli
	- /mcp
	- /playground (coming soon + waitlist form)
	- /code-review (coming soon + waitlist form)
	- /patterns (index)
	- /patterns/[id] (detail, ISR)
	- /rules (catalog)
	- /search (grouped results)
	- /consulting (offers + intake form)
	- /thanks (generic thank you page)
	
	Auth:
	- /settings (and subpages: profile, preferences, email, api-keys)
	- /auth/sign-in, /auth/callback, /auth/sign-out (WorkOS)
	
	GLOBAL LAYOUT
	Header (always):
	- EffectTalk logo
	- Global search input (submits to /search?q=)
	- Consulting CTA -> /consulting
	- Avatar menu:
	  - logged out: Sign in / Sign up
	  - logged in: Profile, Settings, Sign out
	Main body:
	- Tabs component shown on app pages:
	  - EffectPatterns CLI (active)
	  - EffectPatterns MCP Server (active)
	  - EffectPatterns Playground (disabled; route exists; shows coming soon)
	  - EffectTalk Code Review (disabled; route exists; shows coming soon)
	Footer:
	- simple text + local doc links only (no external marketing site links)
	
	SEARCH
	- Implement /search with grouped results:
	  Groups: Patterns, Rules, Pages
	- Patterns/rules fetched from backend API; Pages are local static list.
	- Track events: search usage and tab clicks (implement a minimal event logger).
	
	FORMS
	Waitlist (on /playground and /code-review):
	- Fields: email + role/company
	- Store in DB
	- Send confirmation email via Resend
	- Redirect to /thanks
	
	Consulting form (/consulting):
	- Offers list: Effect Assessment, Migration Strategy, Developer Training
	- Form fields: name, email, role optional, company optional, description
	- Store in DB
	- Redirect to /thanks
	
	SETTINGS (requires login)
	- Theme selection
	- Profile view (name/email)
	- Email preferences toggle
	- Preferences: default tab, default search filters
	- API keys management:
	  - Create key (label) -> generate opaque token, show once
	  - List keys (prefix, createdAt, revokedAt)
	  - Revoke key
	  - Store only hash + prefix in DB
	
	DATA + DB
	- Use a Postgres DB (or provider-agnostic adapter) and define tables:
	  users, api_keys, preferences, email_preferences, waitlist_signups,
	  consulting_inquiries
	- API keys: hash with a strong algorithm; never store plaintext.
	
	PATTERNS
	- /patterns and /patterns/[id]
	- /patterns/[id] must use ISR.
	- Pattern content fetched from backend API.
	
	DELIVERABLES
	- Working Next.js app with the routes above
	- Clean component structure (layout, header, tabs, footer)
	- Effect-based server modules for DB, email, backend API client
	- Zod validation on inputs
	- Tests optional, but ensure TypeScript passes and routes work.
	
	DO NOT
	- Add billing pages or Stripe integration
	- Add org/team functionality in v1
	- Add any “code review” functionality beyond coming soon teasers
	- Add external marketing website references