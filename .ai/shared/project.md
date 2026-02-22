## Project overview

**effect-talk-website** — Interactive learning platform for Effect-TS patterns, built as a Next.js application.

### Tech stack

- **Framework**: Next.js 15 (App Router) + React 19
- **Language**: TypeScript 5.8+ (strict mode)
- **Backend**: Effect-TS services, PostgreSQL + Drizzle ORM
- **Styling**: Tailwind CSS v4
- **Auth**: WorkOS AuthKit
- **Package manager**: Bun
- **Testing**: Vitest (happy-dom)
- **Hosting**: Vercel

### Commands

| Command | Description |
|---|---|
| `bun run dev` | Start dev server |
| `bun run build` | Production build |
| `bun run test` | Run tests (watch mode) |
| `bun run test:run` | Run tests once |
| `bun run lint` | ESLint |
| `bun run env:check` | Verify env vars for deploy |
| `bun run db:check` | Verify DB connection + tables |
