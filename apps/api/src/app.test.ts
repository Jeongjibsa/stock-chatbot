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

  it("returns report contract draft endpoints and mock telegram preview", async () => {
    const app = buildApp({
      checkDatabase: async () => true,
      checkRedis: async () => true,
      environment: "test"
    });

    const latestResponse = await app.inject({
      method: "GET",
      url: "/v1/reports/user-1/latest"
    });
    const historyResponse = await app.inject({
      method: "GET",
      url: "/v1/reports/user-1/history"
    });
    const mockTelegramResponse = await app.inject({
      method: "GET",
      url: "/v1/mock/telegram/daily-report"
    });

    expect(latestResponse.statusCode).toBe(200);
    expect(latestResponse.json()).toMatchObject({
      historyItem: {
        id: "mock-run-latest"
      }
    });
    expect(historyResponse.statusCode).toBe(200);
    expect(historyResponse.json()).toHaveLength(2);
    expect(mockTelegramResponse.statusCode).toBe(200);
    expect(mockTelegramResponse.json()).toMatchObject({
      deliveryId: "mock-telegram-preview",
      status: "mocked",
      transport: "mock"
    });

    await app.close();
  });
});
