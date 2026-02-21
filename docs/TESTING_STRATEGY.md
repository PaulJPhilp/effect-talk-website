<!-- AI agents: see also .ai/shared/conventions.md -->
# Testing Strategy

Comprehensive testing process that avoids mocks, leveraging our tech stack (TypeScript, Effect, Next.js, Vercel AI SDK) with real dependencies and state verification.

## Core Philosophy: Test Real Behavior, Not Fake Interactions

| Instead of... | We use... |
|---------------|-----------|
| Mocking fetch | Real HTTP calls to test server |
| Mocking database | Test database with transactions |
| Mocking AI SDK | Controlled prompt fixtures + real SDK calls |
| Mocking file system | Temp directories with real I/O |
| Spying/stubbing | Observable side effects or state queries |

## Testing Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Test runner | Vitest | Fast, native ESM, Effect integration |
| E2E | Playwright | Real browser + server interactions |
| Database | PostgreSQL (test container) | Actual queries, transactions roll back |
| HTTP | MSW (minimal) or real server | Request interception only, not behavior mocking |
| AI calls | Vercel AI SDK test helpers | Stream fixtures, not SDK mocks |
| State | Effect `TestClock`/`TestContext` | Controlled time and layers |

## Pattern 1: Database-Backed Tests with Transactions

### Setup: Test Database with Rollback

```typescript
// test/setup/database.ts
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import * as schema from '../../src/db/schema';

let container: StartedPostgreSqlContainer;
let pool: pg.Pool;

export async function setupTestDatabase() {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('test_db')
    .start();

  pool = new pg.Pool({
    host: container.getHost(),
    port: container.getPort(),
    database: container.getDatabase(),
    user: container.getUsername(),
    password: container.getPassword(),
  });

  const db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });

  return { pool, db, connectionString: container.getConnectionUri() };
}

export async function teardownTestDatabase() {
  await pool?.end();
  await container?.stop();
}

// Per-test transaction wrapper
export async function withTransaction<T>(
  pool: pg.Pool,
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  await client.query('BEGIN');

  try {
    const result = await fn(client);
    await client.query('ROLLBACK'); // Always rollback
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Test: Real Database, No Mocks

```typescript
// test/user-repository.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { setupTestDatabase, teardownTestDatabase, withTransaction } from './setup/database';
import * as schema from '../src/db/schema';
import type { Pool } from 'pg';

describe('UserRepository', () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    pool = setup.pool;
    db = setup.db;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('creates a user with hashed password', async () => {
    await withTransaction(pool, async (client) => {
      const txDb = drizzle(client, { schema });

      // Act: Real insert with real hashing
      const user = await createUser(txDb, {
        email: 'test@example.com',
        password: 'plaintext-password',
      });

      // Assert: Query actual state
      const [saved] = await txDb
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id));

      expect(saved.email).toBe('test@example.com');
      expect(saved.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/); // bcrypt pattern
      expect(saved.passwordHash).not.toContain('plaintext');
    });
  });

  it('enforces unique email constraint', async () => {
    await withTransaction(pool, async (client) => {
      const txDb = drizzle(client, { schema });

      await createUser(txDb, { email: 'dup@example.com', password: 'pw' });

      // Assert: Real database throws real error
      await expect(
        createUser(txDb, { email: 'dup@example.com', password: 'pw2' })
      ).rejects.toThrow(/unique constraint/i);
    });
  });
});
```

## Pattern 2: Effect Tests with Test Layers

### Real Implementations, Controlled Environment

```typescript
// test/layers/test-config.ts
import { Config, ConfigProvider, Layer } from 'effect';
import { DatabaseLive } from '../../src/lib/effect/database-live';
import { LoggerLive } from '../../src/lib/effect/logger-live';

// Real implementations, test configuration
export const TestLayer = Layer.mergeAll(
  DatabaseLive,           // Real database, test container
  LoggerLive,             // Real logger, maybe file or console
  Layer.succeed(
    Config.layer({
      openaiApiKey: Config.redacted('sk-test-fake-key'),
      databaseUrl: Config.redacted(process.env.TEST_DATABASE_URL!),
    })
  )
);

// For AI tests: use real SDK with fixture responses
export const TestLayerWithAI = TestLayer.pipe(
  Layer.merge(AISdkLive)  // Real Vercel AI SDK
);
```

### Test: Effect Program with Real Dependencies

```typescript
// test/generate-summary.test.ts
import { describe, it, expect } from 'vitest';
import { Effect, Exit, TestContext } from 'effect';
import { generateSummary } from '../src/lib/ai/generate-summary';
import { TestLayerWithAI } from './layers/test-config';

describe('generateSummary', () => {
  it('produces valid summary from real AI response', async () => {
    const program = generateSummary({
      content: 'The quick brown fox jumps over the lazy dog.',
      maxLength: 50,
    });

    // Run with real implementations, test configuration
    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(TestLayerWithAI)
      )
    );

    // Assert on actual output structure, not mock calls
    expect(result.summary).toBeTruthy();
    expect(result.summary.length).toBeLessThanOrEqual(50);
    expect(result.tokensUsed).toBeGreaterThan(0);
    expect(result.finishReason).toBeOneOf(['stop', 'length']);
  });

  it('handles rate limits with real retry policy', async () => {
    const program = generateSummary({ content: 'x'.repeat(10000) });

    const result = await Effect.runPromiseExit(
      program.pipe(
        Effect.provide(TestLayerWithAI),
        Effect.timeout('30 seconds') // Real timeout behavior
      )
    );

    // Assert: Either success or specific error type
    if (Exit.isFailure(result)) {
      expect(result.cause._tag).toBe('Fail');
      // Real error from real SDK, not mocked
    }
  });
});
```

## Pattern 3: HTTP/API Tests with Real Server

### Setup: Next.js Test Server

```typescript
// test/setup/server.ts
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import type { Server } from 'http';

const app = next({ dev: false, dir: './apps/web' });
const handle = app.getRequestHandler();

export async function startTestServer(port: number = 3001): Promise<Server> {
  await app.prepare();

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

export async function stopTestServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
```

### Test: Real HTTP Calls

```typescript
// test/api/chat.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, stopTestServer } from '../setup/server';
import type { Server } from 'http';

describe('POST /api/chat', () => {
  let server: Server;
  const baseUrl = 'http://localhost:3001';

  beforeAll(async () => {
    server = await startTestServer(3001);
  });

  afterAll(async () => {
    await stopTestServer(server);
  });

  it('streams real AI responses', async () => {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    // Read actual stream chunks
    const reader = response.body!.getReader();
    const chunks: string[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(new TextDecoder().decode(value));
    }

    // Assert on real streamed content
    const fullResponse = chunks.join('');
    expect(fullResponse).toContain('data:');
    expect(fullResponse).not.toContain('error');
  });

  it('persists conversation to real database', async () => {
    // Pre-condition: query DB state
    const beforeCount = await getConversationCount();

    await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Save this' }],
        conversationId: 'test-conv-123',
      }),
    });

    // Post-condition: verify real persistence
    const afterCount = await getConversationCount();
    expect(afterCount).toBe(beforeCount + 1);

    const saved = await getConversation('test-conv-123');
    expect(saved.messages).toHaveLength(2); // user + assistant
  });
});
```

## Pattern 4: File System Tests with Real I/O

```typescript
// test/file-processor.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { processMarkdownFiles } from '../src/lib/files/process-markdown';

describe('processMarkdownFiles', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('processes real files and produces real output', async () => {
    // Arrange: Create actual files
    await writeFile(
      join(tempDir, 'input.md'),
      '# Hello\n\nThis is **bold**.'
    );

    // Act: Real file processing
    const result = await processMarkdownFiles({
      inputDir: tempDir,
      outputDir: join(tempDir, 'out'),
    });

    // Assert: Real file system state
    const output = await readFile(join(tempDir, 'out', 'input.html'), 'utf-8');
    expect(output).toContain('<h1>Hello</h1>');
    expect(output).toContain('<strong>bold</strong>');
    expect(result.processedCount).toBe(1);
  });
});
```

## Pattern 5: AI SDK Tests with Stream Fixtures

### Controlled but Real SDK Usage

```typescript
// test/ai/stream-fixtures.ts
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { ReadableStream } from 'stream/web';

// Create a real-looking stream without mocking the SDK
export function createFixtureStream(chunks: string[]): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

// Test server route that returns fixtures
export function createTestHandler(fixtureChunks: string[]) {
  return async (req: Request) => {
    const stream = createFixtureStream(fixtureChunks);
    return new StreamingTextResponse(stream);
  };
}
```

### Test: Real SDK, Controlled Responses

```typescript
// test/ai/generate-text.test.ts
import { describe, it, expect } from 'vitest';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createServer } from 'http';
import getPort from 'get-port';

describe('generateText with real SDK', () => {
  it('processes streaming response correctly', async () => {
    // Start minimal server that returns fixture stream
    const port = await getPort();
    const server = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });

      // Real SSE format that OpenAI SDK expects
      res.write(`data: {"id":"1","object":"chat.completion.chunk","choices":[{"delta":{"content":"Hello"}}]}\n\n`);
      res.write(`data: {"id":"2","object":"chat.completion.chunk","choices":[{"delta":{"content":" world"}}]}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    });

    await new Promise<void>(resolve => server.listen(port, resolve));

    try {
      // Point SDK to our test server
      const openai = createOpenAI({
        apiKey: 'test-key',
        baseURL: `http://localhost:${port}/v1`,
      });

      // Real SDK call, controlled response
      const result = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: 'Say hello',
      });

      expect(result.text).toBe('Hello world');
      expect(result.usage.totalTokens).toBeGreaterThan(0);
    } finally {
      server.close();
    }
  });
});
```

## Pattern 6: E2E with Playwright (No Mocks)

```typescript
// e2e/chat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chat Application', () => {
  test('full conversation flow with real AI', async ({ page }) => {
    // Navigate to real running app
    await page.goto('http://localhost:3000/chat');

    // User interacts with real UI
    await page.fill('[data-testid="message-input"]', 'What is Effect-TS?');
    await page.click('[data-testid="send-button"]');

    // Wait for real streaming response
    const response = page.locator('[data-testid="assistant-message"]').last();
    await response.waitFor({ timeout: 30000 });

    // Assert on real content
    const text = await response.textContent();
    expect(text).toContain('Effect');
    expect(text?.length).toBeGreaterThan(50);

    // Verify persistence: reload and check
    await page.reload();
    await expect(page.locator('[data-testid="assistant-message"]').last()).toContainText('Effect');
  });

  test('error handling with real failure modes', async ({ page, context }) => {
    // Block AI requests to test real error UI
    await context.route('**/api/chat', route => route.abort('failed'));

    await page.goto('http://localhost:3000/chat');
    await page.fill('[data-testid="message-input"]', 'Test');
    await page.click('[data-testid="send-button"]');

    // Assert real error state appears
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });
});
```

## Test Configuration

### `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup/global.ts'],
    pool: 'forks', // Isolate tests with real resources
    testTimeout: 60000, // Real operations take time
    hookTimeout: 60000,
    fileParallelism: false, // Database tests need serialization
  },
});
```

### `test/setup/global.ts`

```typescript
import { beforeAll, afterAll } from 'vitest';
import { setupTestDatabase, teardownTestDatabase } from './database';

beforeAll(async () => {
  // One-time setup: start test containers
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});
```

## Decision Tree: When to Use What

| Scenario | Approach | Why |
|----------|----------|-----|
| Database queries | Test container + transactions | Real SQL execution, constraint checking |
| Effect programs | TestLayer with real impls | Verify composition, error handling, retries |
| HTTP endpoints | Real test server | Full request/response cycle, middleware, headers |
| File operations | Temp directories | Real I/O, permission, encoding issues |
| AI generation | Fixture server + real SDK | SDK behavior, parsing, streaming logic |
| Browser flows | Playwright E2E | Real DOM, accessibility, network |

## Structural Exceptions (Allowed Mocks)

Some modules cannot be resolved in Vitest's happy-dom environment
(e.g. Next.js internals, WorkOS AuthKit). In those cases a
**structural mock** is allowed — a `vi.mock()` that returns the
minimal typed shape so the module loads, with **no behavioral
logic**.

### What is allowed

- `vi.mock("next/headers", ...)` — returns a stub `cookies()`
- `vi.mock("next/navigation", ...)` — returns a stub `useRouter()`
- `vi.mock("@workos-inc/authkit-nextjs", ...)` — returns a stub
  `withAuth()`
- `vi.fn()` **only** inside these structural mock factories to
  produce valid return shapes (e.g. `push: vi.fn()`)

### What is forbidden

| Pattern | Why |
|---------|-----|
| `vi.spyOn(obj, "method")` | Behavioral spy |
| `.toHaveBeenCalled()` / `.toHaveBeenCalledWith()` | Call verification |
| `.mockImplementation()` | Behavioral stub |
| `.mockReturnValue()` / `.mockResolvedValue()` | Behavioral stub |
| `jest.mock()` / `jest.spyOn()` | Wrong framework |
| `vi.fn()` in service tests | Use NoOp/custom layers instead |

### Required comment template

Every file that uses a structural mock **must** include this
comment block immediately above the `vi.mock()` call:

```typescript
// Exception: <module> mock required — <reason>.
// These stubs return valid shapes only; no call-verification
// assertions.
```

### Examples

```typescript
// Exception: next/navigation mock required — Next.js provides
// no test router.
// These stubs return valid shapes only; no call-verification
// assertions.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(), replace: vi.fn(), refresh: vi.fn(),
    back: vi.fn(), forward: vi.fn(), prefetch: vi.fn(),
  }),
}))
```

```typescript
// Exception: next/headers mock required — cookies() is not
// available outside a Next.js request context.
// These stubs return valid shapes only; no call-verification
// assertions.
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({
    get: () => undefined, set: () => {}, delete: () => {},
  }),
}))
```

### Automated enforcement

Run `bun run test:policy` to scan for forbidden patterns. The
script exits non-zero if any violations are found. See
`scripts/check-test-policy.ts` for the full rule set.

## Key Principles

1. **Test observable outcomes, not internal calls** — Assert on database state, HTTP responses, file contents, not function invocations

2. **Use real implementations with test configuration** — Real database with test URL, real AI SDK with test server

3. **Control time, not behavior** — Effect's `TestClock`, not mocked `setTimeout`

4. **Isolate with containers/transactions, not mocks** — Fresh database per test, rolled back

5. **Speed comes from parallelism and selectivity, not fakes** — Run unit tests in parallel, E2E selectively
