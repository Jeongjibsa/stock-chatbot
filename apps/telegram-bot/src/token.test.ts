import { describe, expect, it } from "vitest";

import { readToken } from "./token.js";

describe("readToken", () => {
  it("returns null when token is missing", () => {
    expect(readToken({})).toBeNull();
  });

  it("returns null when token is placeholder", () => {
    expect(readToken({ TELEGRAM_BOT_TOKEN: "replace-me" })).toBeNull();
  });

  it("returns the configured token", () => {
    expect(readToken({ TELEGRAM_BOT_TOKEN: "telegram-token" })).toBe(
      "telegram-token"
    );
  });
});
