import { describe, expect, it, vi } from "vitest";
import {
  recreateStagingTables,
  SWAP_GROUPS,
} from "../../scripts/lib/table-swap";

describe("table-swap helpers", () => {
  it("recreates tour staging tables with full schema cloning", async () => {
    const execute = vi.fn(async () => ({ rows: [] }));
    const db = { execute } as never;

    await recreateStagingTables(db, SWAP_GROUPS.tour);

    expect(execute).toHaveBeenCalledTimes(4);

    const statements = execute.mock.calls.map((args: unknown[]) => {
      const query = args[0] as { queryChunks: { value: string[] }[] };
      return query.queryChunks[0]?.value[0] as string;
    });

    expect(statements).toEqual([
      'DROP TABLE IF EXISTS "tour_lessons_staging" CASCADE',
      'CREATE TABLE "tour_lessons_staging" (LIKE "tour_lessons" INCLUDING ALL)',
      'DROP TABLE IF EXISTS "tour_steps_staging" CASCADE',
      'CREATE TABLE "tour_steps_staging" (LIKE "tour_steps" INCLUDING ALL)',
    ]);
  });
});
