# Tour V4 QA Fix Prompt

Use this prompt with a coding agent working in both:

- `/Users/paul/Projects/In-Progress/effect-talk-website`
- `/Users/paul/Projects/In-Progress/effect-refactoring-tool`

## Prompt

Investigate and fix the tour v4beta snippet failures reported by the website QA gate.

Context:

- The QA command is `bun run qa:tour:v4` in `effect-talk-website`.
- The latest report is at `/tmp/effect-talk-tour-v4-qa.json`.
- The QA gate validates:
  - generated v4 compare snippets compile as valid TypeScript against this repo’s current `effect` version
  - changed v4 snippets execute with the same observable behavior as the v3 compare snippet under the deterministic harness
  - v4 compare snippets do not contain migration placeholders or obvious stale APIs
- Current result: `34/56` steps pass, `22` fail.

Your job:

1. Fix the broken generated v4 snippets and, where the root cause is the migration generator, fix it in `effect-refactoring-tool`.
2. If a failure is actually caused by invalid/outdated v3 lesson code rather than the v4 migration, fix the lesson source in `effect-talk-website/scripts/seed-tour.ts` so both v3 and v4 examples are valid and pedagogically correct.
3. Preserve lesson intent. Do not “game” the QA harness by weakening checks or bypassing execution.
4. Prefer fixing the source of truth over patching derived output.
5. Re-run `bun run qa:tour:v4 -- --report /tmp/effect-talk-tour-v4-qa.json` until it passes.

Constraints:

- Do not change the QA gate to ignore current failures unless the check is demonstrably wrong.
- Do not remove compare-mode coverage.
- Keep examples idiomatic for current `effect` and `@effect/schema` usage.
- If a snippet was migrated to a non-existent API, fix the migration logic instead of hardcoding website-only exceptions unless the lesson intentionally differs from generated output.
- If a lesson’s original v3 snippet is invalid against the currently installed library version, update the lesson so the teaching example is valid and still demonstrates the same concept.

Acceptance criteria:

- `bun run typecheck` passes in `effect-talk-website`
- `bun run qa:tour:v4 -- --report /tmp/effect-talk-tour-v4-qa.json` passes with `56/56` steps passing
- If generator changes are required, relevant tests pass in `effect-refactoring-tool`
- No v4 compare snippet contains `TODO: EFFECT-MIGRATION-MANUAL` or the runtime-throw wrapper
- Compare-mode snippets remain functionally aligned with their v3 counterparts

## Failing Steps And Errors

Use `/tmp/effect-talk-tour-v4-qa.json` as the source of truth. The current failing steps are:

### `effect-channels:4` — `The Requirements Channel: Dependency Injection`

- v4 typecheck: merged declaration `Database` mixes exported and local declarations

### `retries:1` — `Effect.retry for retrying failures`

- v4 typecheck: `Effect<unknown, unknown, unknown>` not assignable where `R` must be `never`
- v4 execution failed
- v3 execution failed
- v4 still contains `TODO: EFFECT-MIGRATION-MANUAL`

### `retries:2` — `Effect.timeout for time limits`

- v4 typecheck: `_tag` does not exist on `string`
- v4 typecheck: `value` does not exist on `string`

### `retries:3` — `Schedule for composable retry policies`

- v4 typecheck: `Effect<unknown, unknown, unknown>` not assignable where `R` must be `never`
- v4 execution failed
- v3 execution failed
- v4 still contains `TODO: EFFECT-MIGRATION-MANUAL`

### `fibers:1` — `Effect.fork for background work`

- v3 typecheck: `RuntimeFiber` has no `.join`
- v3 typecheck: effect has non-`never` requirements
- v4 typecheck: `Effect.forkChild` does not exist
- v4 typecheck: effect has non-`never` requirements
- v3 execution failed
- v4 execution failed

### `fibers:2` — `Fiber.join to wait for results`

- v3 typecheck: `RuntimeFiber` has no `.join`
- v3 typecheck: effect has non-`never` requirements
- v4 typecheck: `Effect.forkChild` does not exist
- v4 typecheck: effect has non-`never` requirements
- v3 execution failed
- v4 execution failed

### `fibers:3` — `Fiber.interrupt to cancel`

- v3 typecheck: `RuntimeFiber` has no `.interrupt`
- v3 typecheck: effect has non-`never` requirements
- v4 typecheck: `Effect.forkChild` does not exist
- v4 typecheck: effect has non-`never` requirements
- v3 execution failed
- v4 execution failed

### `testing-layers:1` — `Provide test implementations`

- v4 typecheck: plain object passed where `Api` service/tagged service type is expected

### `testing-layers:2` — `Testable services`

- v4 typecheck: plain object passed where `Config` service/tagged service type is expected

### `testing-layers:3` — `Composing test layers`

- v4 typecheck: plain object passed where `Db` service/tagged service type is expected

### `schema:1` — `Schema.decode for validation`

- v4 typecheck: `Schema.decodeUnknownEffect` does not exist; likely should be `Schema.decodeUnknown`
- v3 execution failed
- v4 execution failed

### `schema:2` — `Schema with refinements`

- v4 typecheck: `Schema.decodeUnknownEffect` does not exist
- v3 execution failed
- v4 execution failed
- v4 still contains `TODO: EFFECT-MIGRATION-MANUAL`

### `schema:3` — `Schema.decodeEither for sync validation`

- v4 typecheck: `Schema.decodeUnknownEffect` does not exist
- v3 execution failed
- v4 execution failed

### `queues-pubsub:2` — `PubSub.bounded for broadcasting`

- v4 typecheck: yielded value inferred as `never`
- v4 typecheck: effect has non-`never` requirements
- v3 execution failed
- v4 execution failed
- v4 still contains `TODO: EFFECT-MIGRATION-MANUAL`

### `queues-pubsub:3` — `Fork a consumer with Queue.take`

- v4 typecheck: `Effect.forkChild` does not exist
- v4 typecheck: effect has non-`never` requirements
- v3 execution failed
- v4 execution failed

### `metrics:1` — `Metric.counter for counting events`

- v4 typecheck: expression is not callable; likely wrong metric combinator shape
- v4 typecheck: effect has non-`never` requirements

### `metrics:2` — `Metric.timer for measuring duration`

- v4 typecheck: passed `{ description: string }` where `string` is expected

### `runtimes:3` — `Runtime.runFork for long-running effects`

- v4 typecheck: `RuntimeFiber` has no `.interrupt`

### `effect-schema:1` — `Schema.Class for class-based schemas`

- v4 typecheck: `Schema.decodeUnknownEffect` does not exist
- v4 typecheck: decoded `user` remains `unknown`
- v3 execution failed
- v4 execution failed

### `effect-schema:2` — `Schema.Union and Schema.Literal`

- v4 typecheck: `Schema.decodeUnknownEffect` does not exist
- v3 execution failed
- v4 execution failed

### `effect-schema:3` — `Schema.transform for encode/decode`

- v3 typecheck: invalid `Schema.transform` usage and implicit `any`
- v3 typecheck: effect has non-`never` requirements
- v4 typecheck: same transform typing issues
- v4 typecheck: `Schema.decodeUnknownEffect` does not exist
- v4 typecheck: caught error `e` is `unknown`
- v3 execution failed
- v4 execution failed

### `effect-schema:4` — `Schema.Array and optional fields`

- v3 typecheck: `Schema.default` does not exist
- v3 typecheck: effect has non-`never` requirements
- v4 typecheck: `Schema.default` does not exist
- v4 typecheck: `Schema.decodeUnknownEffect` does not exist
- v4 typecheck: decoded `q` remains `unknown`
- v3 execution failed
- v4 execution failed

## Suggested Work Plan

Tackle the failures by root-cause cluster instead of by step order:

1. Fix outdated lesson APIs in `scripts/seed-tour.ts`
   - fibers examples using instance `.join()` / `.interrupt()`
   - schema/effect-schema examples using `Schema.decodeUnknownEffect`, `Schema.default`, and invalid `Schema.transform` shapes
   - any lesson examples whose current v3 code no longer compiles against installed libraries

2. Fix generator bugs in `effect-refactoring-tool`
   - incorrect migrations to `Effect.forkChild`
   - generator output that leaves manual TODO placeholders for cases that should be handled automatically
   - generator output that breaks service provisioning examples in testing-layers or metric APIs in metrics lessons

3. Re-run the website QA gate after each cluster
   - use `/tmp/effect-talk-tour-v4-qa.json` to confirm the failure count drops
   - inspect compare snippets, not just type errors, to ensure behavior still matches lesson intent

4. Add or update regression tests
   - in `effect-talk-website` for any fixed lesson source patterns
   - in `effect-refactoring-tool` for any migration transform that was corrected

## Deliverable

Return:

- the code changes
- the final `bun run qa:tour:v4` result
- a concise list of the root causes fixed
- any remaining risks if some examples required judgment calls rather than direct API substitutions
