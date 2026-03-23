import { describe, expect, it } from "vitest";

import { buildMockReportReply } from "./mock-preview.js";

describe("buildMockReportReply", () => {
  it("returns a telegram preview template", () => {
    const preview = buildMockReportReply();

    expect(preview).toContain("오늘의 포트폴리오 프리마켓 브리핑");
    expect(preview).toContain("🧭 오늘의 판단 프레임");
    expect(preview).toContain("🎯 포트폴리오 리밸런싱 제안");
  });
});
