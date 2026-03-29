import { describe, expect, it } from "vitest";

import {
  buildPublicWeekSessions,
  readPublicWeekReferenceDate
} from "./public-week.js";

describe("public week helpers", () => {
  it("builds all expected public sessions for a Saturday reference date", () => {
    expect(buildPublicWeekSessions("2026-03-28")).toEqual([
      { reportDate: "2026-03-23", briefingSession: "pre_market" },
      { reportDate: "2026-03-23", briefingSession: "post_market" },
      { reportDate: "2026-03-24", briefingSession: "pre_market" },
      { reportDate: "2026-03-24", briefingSession: "post_market" },
      { reportDate: "2026-03-25", briefingSession: "pre_market" },
      { reportDate: "2026-03-25", briefingSession: "post_market" },
      { reportDate: "2026-03-26", briefingSession: "pre_market" },
      { reportDate: "2026-03-26", briefingSession: "post_market" },
      { reportDate: "2026-03-27", briefingSession: "pre_market" },
      { reportDate: "2026-03-27", briefingSession: "post_market" },
      { reportDate: "2026-03-28", briefingSession: "pre_market" },
      { reportDate: "2026-03-28", briefingSession: "weekend_briefing" }
    ]);
  });

  it("prefers explicit env reference dates", () => {
    expect(
      readPublicWeekReferenceDate({
        PUBLIC_WEEK_REFERENCE_DATE: "2026-03-28"
      })
    ).toBe("2026-03-28");
  });
});
