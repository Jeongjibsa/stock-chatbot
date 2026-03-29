import { describe, expect, it } from "vitest";

import {
  configureIntegrationDatabaseEnv,
  isSafeLocalIntegrationDatabaseUrl
} from "./require-local-integration-db.js";

describe("require-local-integration-db", () => {
  it("accepts localhost-style integration database urls", () => {
    expect(
      isSafeLocalIntegrationDatabaseUrl("postgresql://stockbot:stockbot@127.0.0.1:5432/stockbot")
    ).toBe(true);
    expect(
      isSafeLocalIntegrationDatabaseUrl("postgresql://stockbot:stockbot@localhost:5432/stockbot")
    ).toBe(true);
    expect(
      isSafeLocalIntegrationDatabaseUrl("postgresql://stockbot:stockbot@postgres:5432/stockbot")
    ).toBe(true);
  });

  it("rejects remote hosts such as Neon", () => {
    expect(
      isSafeLocalIntegrationDatabaseUrl(
        "postgresql://user:pass@ep-orange-boat-a1fjwmnb.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
      )
    ).toBe(false);
  });

  it("defaults to the local docker database and enables integration tests", () => {
    const env: NodeJS.ProcessEnv = {};

    const databaseUrl = configureIntegrationDatabaseEnv(env);

    expect(databaseUrl).toBe("postgresql://stockbot:stockbot@127.0.0.1:5432/stockbot");
    expect(env.DATABASE_URL).toBe(databaseUrl);
    expect(env.RUN_INTEGRATION_TESTS).toBe("1");
  });

  it("throws before integration tests can touch a remote database", () => {
    expect(() =>
      configureIntegrationDatabaseEnv({
        DATABASE_URL:
          "postgresql://user:pass@ep-orange-boat-a1fjwmnb.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
      })
    ).toThrow(/Refusing to run integration tests/);
  });
});
