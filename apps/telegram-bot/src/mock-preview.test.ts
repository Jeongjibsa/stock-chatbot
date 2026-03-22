import { describe, expect, it } from "vitest";

import { buildMockReportReply } from "./mock-preview.js";

describe("buildMockReportReply", () => {
  it("returns a telegram preview template", () => {
    const preview = buildMockReportReply();

    expect(preview).toContain("오늘의 포트폴리오 리밸런싱 브리핑");
    expect(preview).toContain("🎯 오늘의 리밸런싱 제안");
    expect(preview).toContain("📈 종목별 리밸런싱 가이드");
  });
});
