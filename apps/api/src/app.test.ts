import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "./app.js";

describe("buildApp", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns ok health when all checks pass", async () => {
    const app = buildApp({
      checkDatabase: async () => true,
      checkRedis: async () => true,
      environment: "test"
    });

    const response = await app.inject({
      method: "GET",
      url: "/healthz"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      checks: {
        database: true,
        redis: true
      },
      environment: "test"
    });

    await app.close();
  });

  it("returns degraded health when one check fails", async () => {
    const app = buildApp({
      checkDatabase: async () => true,
      checkRedis: async () => false,
      environment: "test"
    });

    const response = await app.inject({
      method: "GET",
      url: "/healthz"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "degraded",
      checks: {
        database: true,
        redis: false
      }
    });

    await app.close();
  });
});
