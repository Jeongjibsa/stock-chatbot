import { describe, expect, it } from "vitest";

import { resolveEffectiveReportDate } from "./effective-report-date.js";

describe("resolveEffectiveReportDate", () => {
  it("uses the common close date across KR and US market sessions", () => {
    expect(
      resolveEffectiveReportDate({
        requestedSeoulDate: "2026-03-22",
        marketResults: [
          {
            status: "ok",
            data: {
              itemCode: "KOSPI",
              itemName: "코스피",
              source: "yahoo_finance",
              sourceKey: "index:KRX:KOSPI",
              asOfDate: "2026-03-20",
              value: 2600
            }
          },
          {
            status: "ok",
            data: {
              itemCode: "NASDAQ",
              itemName: "나스닥 종합",
              source: "yahoo_finance",
              sourceKey: "index:NASDAQ:IXIC",
              asOfDate: "2026-03-21",
              value: 18000
            }
          }
        ]
      }).effectiveReportDate
    ).toBe("2026-03-20");
  });

  it("falls back to the available market session when only one side exists", () => {
    expect(
      resolveEffectiveReportDate({
        requestedSeoulDate: "2026-03-22",
        marketResults: [
          {
            status: "ok",
            data: {
              itemCode: "NASDAQ",
              itemName: "나스닥 종합",
              source: "yahoo_finance",
              sourceKey: "index:NASDAQ:IXIC",
              asOfDate: "2026-03-21",
              value: 18000
            }
          }
        ]
      }).effectiveReportDate
    ).toBe("2026-03-21");
  });
});
