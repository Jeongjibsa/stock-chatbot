import { describe, expect, it } from "vitest";

import { readRedisUrl } from "./index.js";

describe("readRedisUrl", () => {
  it("uses the default redis url", () => {
    expect(readRedisUrl({})).toBe("redis://localhost:6379");
  });

  it("uses the provided redis url", () => {
    expect(readRedisUrl({ REDIS_URL: "redis://example" })).toBe(
      "redis://example"
    );
  });
});
