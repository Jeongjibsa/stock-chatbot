import { describe, expect, it } from "vitest";

import { validateFixtureDocument } from "./fixture-utils.mjs";

const suiteContracts = {
  daily_schedule_cases: {
    status: "active",
    requiredExpectedKeys: ["jobStatus", "userStatus"]
  },
  report_render_cases: {
    status: "active",
    requiredExpectedKeys: ["snapshotFile", "renderedText"],
    requiresSnapshot: true
  }
};

describe("validateFixtureDocument", () => {
  it("accepts valid fixture documents", () => {
    expect(
      validateFixtureDocument({
        id: "daily-schedule-success",
        suite: "daily_schedule_cases",
        description: "valid",
        input: {},
        expected: {
          jobStatus: "completed",
          userStatus: "completed"
        }
      }, suiteContracts)
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
      }, suiteContracts)
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

  it("requires suite contract expected keys", () => {
    expect(
      validateFixtureDocument(
        {
          id: "render",
          suite: "report_render_cases",
          description: "valid",
          input: {},
          expected: {}
        },
        suiteContracts
      )
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("expected.snapshotFile is required"),
        expect.stringContaining("expected.renderedText is required")
      ])
    );
  });
});
