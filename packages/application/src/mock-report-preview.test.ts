import { describe, expect, it } from "vitest";

import { buildMockTelegramReportPreview } from "./mock-report-preview.js";

describe("buildMockTelegramReportPreview", () => {
  it("builds a reusable mocked telegram report example", () => {
    const preview = buildMockTelegramReportPreview({
      runDate: "2026-03-21",
      userId: "user-1"
    });

    expect(preview.userId).toBe("user-1");
    expect(preview.renderedText).toContain("1. 🗞️ 오늘의 포트폴리오 프리마켓 브리핑 (2026-03-21)");
    expect(preview.renderedText).toContain("5. 🎯 포트폴리오 리밸런싱 제안");
    expect(preview.renderedText).toContain("- 비중 확대 검토: 삼성전자");
    expect(preview.renderedText).toContain("- 유지 우세: SK하이닉스, 현대차, 현대글로비스");
    expect(preview.renderedText).toContain("3. 🧭 오늘의 판단 프레임");
    expect(preview.renderedText).toContain("4. 🧩 성향별 대응");
    expect(preview.renderedText).toContain("7. 🔎 참고용 공개 프리마켓 브리핑");
    expect(preview.renderedText).toContain("❗ 이 리포트는 정보 제공용이며, 투자 판단과 책임은 본인에게 있습니다.");
  });
});
