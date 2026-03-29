import { describe, expect, it } from "vitest";

import { normalizePostgresConnectionString } from "./client.js";

describe("normalizePostgresConnectionString", () => {
  it("removes neon-specific query params and keeps ssl enabled", () => {
    const result = normalizePostgresConnectionString(
      "postgresql://user:pass@ep-test.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    );

    expect(result.normalizedConnectionString).toBe(
      "postgresql://user:pass@ep-test.ap-southeast-1.aws.neon.tech/neondb"
    );
    expect(result.ssl).toEqual({ rejectUnauthorized: false });
  });

  it("leaves non-url values unchanged", () => {
    const result = normalizePostgresConnectionString("postgresql://localhost/test");

    expect(result.normalizedConnectionString).toBe("postgresql://localhost/test");
    expect(result.ssl).toBeUndefined();
  });
});
