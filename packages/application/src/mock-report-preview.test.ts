import { describe, expect, it } from "vitest";

import { buildMockTelegramReportPreview } from "./mock-report-preview.js";

describe("buildMockTelegramReportPreview", () => {
  it("builds a reusable mocked telegram report example", () => {
    const preview = buildMockTelegramReportPreview({
      runDate: "2026-03-21",
      userId: "user-1"
    });

    expect(preview.userId).toBe("user-1");
    expect(preview.renderedText).toContain("🗞️ 오늘의 브리핑 (2026-03-21 기준)");
    expect(preview.renderedText).toContain("📍 주요 지표 변동 요약");
    expect(preview.renderedText).toContain("🧭 시장, 매크로, 자금 브리핑");
    expect(preview.renderedText).toContain("🗓️ 주요 일정 및 이벤트 브리핑");
    expect(preview.renderedText).toContain("📰 종목 관련 핵심 기사 및 이벤트 요약");
    expect(preview.renderedText).toContain("🧠 퀀트 기반 시그널 및 매매 아이디어");
    expect(preview.renderedText).toContain("⚠️ 리스크 체크리스트");
    expect(preview.renderedText).toContain("삼성전자 (005930, KR): 184,000 → 182,000  🔵▼ 1.08%");
    expect(preview.renderedText).toContain("SK하이닉스 (000660, KR): 949,000 → 934,000  🔵▼ 1.58%");
    expect(preview.renderedText).toContain("HMM (011200, KR): 21,100 → 20,800  🔵▼ 1.42%");
    expect(preview.renderedText).toContain("Macro: -0.60 / Trend: -0.30 / Event: +0.20 / Flow: -0.10");
    expect(preview.renderedText).toContain("현대차는 환율 수혜 기대가 남아 있어 성급한 추격보다 보유 관점 유지가 적절합니다.");
    expect(preview.renderedText).toContain("중동 이란 전쟁 이슈");
    expect(preview.renderedText).toContain("❗ 이 리포트는 정보 제공용이며, 투자 판단과 책임은 본인에게 있습니다.");
  });
});
