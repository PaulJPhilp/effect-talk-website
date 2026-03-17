import { beforeEach, describe, expect, it, vi } from "vitest";

describe("db client", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.DATABASE_URL;
    delete process.env.APP_ENV;
    delete process.env.VERCEL_ENV;
  });

  it("throws on first use when DATABASE_URL is missing", async () => {
    const { db } = await import("@/db/client");

    expect(() => Reflect.get(db, "query")).toThrow(/DATABASE_URL is not set/i);
  });

  it("uses the node-postgres drizzle client in local env", async () => {
    const drizzlePgMock = vi.fn(() => ({ driver: "pg" }));
    const drizzleNeonMock = vi.fn(() => ({ driver: "neon" }));
    const neonMock = vi.fn(() => "neon-client");

    vi.doMock("@neondatabase/serverless", () => ({ neon: neonMock }));
    vi.doMock("drizzle-orm/neon-http", () => ({ drizzle: drizzleNeonMock }));
    vi.doMock("drizzle-orm/node-postgres", () => ({ drizzle: drizzlePgMock }));

    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    process.env.APP_ENV = "local";

    const { db } = await import("@/db/client");
    expect(Reflect.get(db, "driver")).toBe("pg");
    expect(drizzlePgMock).toHaveBeenCalled();
    expect(drizzleNeonMock).not.toHaveBeenCalled();
  });

  it("uses the neon drizzle client in production env", async () => {
    const drizzlePgMock = vi.fn(() => ({ driver: "pg" }));
    const drizzleNeonMock = vi.fn(() => ({ driver: "neon" }));
    const neonMock = vi.fn(() => "neon-client");

    vi.doMock("@neondatabase/serverless", () => ({ neon: neonMock }));
    vi.doMock("drizzle-orm/neon-http", () => ({ drizzle: drizzleNeonMock }));
    vi.doMock("drizzle-orm/node-postgres", () => ({ drizzle: drizzlePgMock }));

    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    process.env.APP_ENV = "production";

    const { db } = await import("@/db/client");
    expect(Reflect.get(db, "driver")).toBe("neon");
    expect(neonMock).toHaveBeenCalledWith(
      "postgresql://test:test@localhost:5432/test"
    );
    expect(drizzleNeonMock).toHaveBeenCalled();
    expect(drizzlePgMock).not.toHaveBeenCalled();
  });
});
