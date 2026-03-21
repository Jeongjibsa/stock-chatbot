import { describe, expect, it } from "vitest";

import { validateFixtureDocument } from "./fixture-utils.mjs";

describe("validateFixtureDocument", () => {
  it("accepts valid fixture documents", () => {
    expect(
      validateFixtureDocument({
        id: "daily-schedule-success",
        suite: "daily_schedule_cases",
        description: "valid",
        input: {},
        expected: {}
      })
    ).toEqual([]);
  });

  it("rejects invalid fixture documents", () => {
    expect(
      validateFixtureDocument({
        id: "",
        suite: "unknown",
        description: "",
        input: [],
        expected: []
      })
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("id must be a non-empty string"),
        expect.stringContaining("suite must be one of"),
        expect.stringContaining("description must be a non-empty string"),
        expect.stringContaining("input must be a JSON object"),
        expect.stringContaining("expected must be a JSON object")
      ])
    );
  });
});
