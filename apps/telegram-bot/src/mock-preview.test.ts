import { describe, expect, it } from "vitest";

import { buildMockReportReply } from "./mock-preview.js";

describe("buildMockReportReply", () => {
  it("returns a telegram preview template", () => {
    const preview = buildMockReportReply();

    expect(preview).toContain("오늘의 브리핑");
    expect(preview).toContain("📰 종목 관련 핵심 기사 요약");
    expect(preview).toContain("📈 보유 종목별 최근 동향");
  });
});
