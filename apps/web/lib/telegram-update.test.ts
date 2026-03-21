import { describe, expect, it } from "vitest";

import { extractTelegramUpdateId } from "./telegram-update";

describe("extractTelegramUpdateId", () => {
  it("returns the update id when the payload is valid", () => {
    expect(extractTelegramUpdateId('{"update_id":12345}')).toBe("12345");
  });

  it("returns null when the payload is invalid json", () => {
    expect(extractTelegramUpdateId("{")).toBeNull();
  });

  it("returns null when update_id is missing", () => {
    expect(extractTelegramUpdateId('{"message":{"text":"hi"}}')).toBeNull();
  });
});
