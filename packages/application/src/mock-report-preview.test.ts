import { describe, expect, it } from "vitest";

import { buildMockTelegramReportPreview } from "./mock-report-preview.js";

describe("buildMockTelegramReportPreview", () => {
  it("builds a reusable mocked telegram report example", () => {
    const preview = buildMockTelegramReportPreview({
      runDate: "2026-03-21",
      userId: "user-1"
    });

    expect(preview.userId).toBe("user-1");
    expect(preview.renderedText).toContain("📊 시장 브리핑");
    expect(preview.renderedText).toContain("🏦 매크로 브리핑");
    expect(preview.renderedText).toContain("💸 자금 브리핑");
    expect(preview.renderedText).toContain("🗓️ 주요 일정 및 이벤트 브리핑");
    expect(preview.renderedText).toContain("📰 종목 관련 핵심 기사 요약");
    expect(preview.renderedText).toContain("🧠 퀀트 기반 시그널 및 매매 아이디어");
    expect(preview.renderedText).toContain("⚠️ 리스크 체크포인트");
    expect(preview.renderedText).toContain("Apple Inc. (AAPL, US): 248.96 → 247.99  🔵▼ 0.39%");
    expect(preview.renderedText).toContain("중동 이란 전쟁 이슈");
    expect(preview.renderedText).toContain("❗ 이 리포트는 정보 제공용이며, 투자 판단과 책임은 본인에게 있습니다.");
  });
});
