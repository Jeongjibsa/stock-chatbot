import { describe, expect, it } from "vitest";

import { buildMockTelegramReportPreview } from "./mock-report-preview.js";

describe("buildMockTelegramReportPreview", () => {
  it("builds a reusable mocked telegram report example", () => {
    const preview = buildMockTelegramReportPreview({
      runDate: "2026-03-21",
      userId: "user-1"
    });

    expect(preview.userId).toBe("user-1");
    expect(preview.renderedText).toContain("[보유 종목 뉴스]");
    expect(preview.renderedText).toContain("[전략 시나리오]");
    expect(preview.renderedText).toContain("[리스크 체크포인트]");
  });
});
