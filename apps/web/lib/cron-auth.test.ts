import { describe, expect, it } from "vitest";

import { isAuthorizedCronRequest } from "./cron-auth";

describe("isAuthorizedCronRequest", () => {
  it("allows requests when CRON_SECRET is unset", () => {
    expect(isAuthorizedCronRequest(new Request("https://example.com"), {})).toBe(true);
  });

  it("validates bearer token when CRON_SECRET is set", () => {
    const request = new Request("https://example.com", {
      headers: {
        authorization: "Bearer secret-value"
      }
    });

    expect(
      isAuthorizedCronRequest(request, {
        CRON_SECRET: "secret-value"
      })
    ).toBe(true);
    expect(
      isAuthorizedCronRequest(request, {
        CRON_SECRET: "other-secret"
      })
    ).toBe(false);
  });
});
