import { describe, expect, it } from "vitest";

import {
  buildPublicRecoverySessions,
  buildPublicWeekSessions,
  readPublicBriefingRecoveryWindowDays,
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

  it("uses the latest fully completed public coverage date before weekday pre-market opens", () => {
    expect(
      readPublicWeekReferenceDate(
        {},
        {
          timeZone: "Asia/Seoul",
          now: new Date("2026-03-29T15:24:00.000Z")
        }
      )
    ).toBe("2026-03-28");
  });

  it("uses the current weekday once post-market coverage should exist", () => {
    expect(
      readPublicWeekReferenceDate(
        {},
        {
          timeZone: "Asia/Seoul",
          now: new Date("2026-03-30T12:30:00.000Z")
        }
      )
    ).toBe("2026-03-30");
  });

  it("builds a rolling 7-day public recovery window ending at the reference date", () => {
    expect(buildPublicRecoverySessions("2026-03-29")).toEqual([
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
      { reportDate: "2026-03-28", briefingSession: "weekend_briefing" }
    ]);
  });

  it("uses the explicit recovery window override when provided", () => {
    expect(
      readPublicBriefingRecoveryWindowDays({
        PUBLIC_BRIEFING_RECOVERY_WINDOW_DAYS: "5"
      })
    ).toBe(5);
  });
});
