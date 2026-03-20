import { describe, expect, it } from "vitest";

import { readConfig } from "./config.js";

describe("readConfig", () => {
  it("uses defaults when env is missing", () => {
    expect(readConfig({})).toEqual({
      apiHost: "0.0.0.0",
      databaseUrl: "postgresql://stockbot:stockbot@localhost:5432/stockbot",
      nodeEnv: "development",
      port: 3000,
      redisUrl: "redis://localhost:6379"
    });
  });

  it("uses provided env values", () => {
    expect(
      readConfig({
        API_HOST: "127.0.0.1",
        DATABASE_URL: "postgresql://custom",
        NODE_ENV: "test",
        PORT: "4010",
        REDIS_URL: "redis://custom"
      })
    ).toEqual({
      apiHost: "127.0.0.1",
      databaseUrl: "postgresql://custom",
      nodeEnv: "test",
      port: 4010,
      redisUrl: "redis://custom"
    });
  });
});

