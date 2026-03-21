import { describe, expect, it } from "vitest";

import {
  formatHourMinute,
  formatReportSettings,
  parseReportTimeArgument
} from "./report-settings.js";

describe("report-settings helpers", () => {
  it("parses valid HH:MM inputs", () => {
    expect(parseReportTimeArgument("09:00")).toEqual({
      hour: 9,
      minute: 0
    });
    expect(parseReportTimeArgument("21:15")).toEqual({
      hour: 21,
      minute: 15
    });
  });

  it("rejects invalid HH:MM inputs", () => {
    expect(parseReportTimeArgument(undefined)).toBeNull();
    expect(parseReportTimeArgument("9")).toBeNull();
    expect(parseReportTimeArgument("25:00")).toBeNull();
    expect(parseReportTimeArgument("09:60")).toBeNull();
  });

  it("formats report settings for telegram replies", () => {
    expect(
      formatReportSettings({
        dailyReportEnabled: false,
        dailyReportHour: 21,
        dailyReportMinute: 15,
        reportDetailLevel: "compact",
        includePublicBriefingLink: false,
        timezone: "Asia/Seoul"
      })
    ).toContain("21:15");
    expect(
      formatReportSettings({
        reportDetailLevel: "compact",
        includePublicBriefingLink: false
      })
    ).toContain("compact");
    expect(formatHourMinute(9, 0)).toBe("09:00");
  });
});
