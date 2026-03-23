import { describe, expect, it } from "vitest";

import {
  toLatestReportView,
  toReportHistoryItem
} from "./report-query-model.js";

describe("report query model", () => {
  it("maps report runs to history items", () => {
    const historyItem = toReportHistoryItem({
      completedAt: "2026-03-21T00:00:00.000Z",
      id: "run-1",
      promptVersion: "daily-report/v1",
      reportText:
        "1. 🗞️ 오늘의 포트폴리오 리밸런싱 브리핑 (2026-03-21)\n\n2. 📌 오늘 한 줄 결론\n- 시장 해석이 방어적으로 기울어 있어, 오늘은 신규 확대보다 유지와 선별 조정에 무게를 두는 편이 적절합니다.",
      runDate: "2026-03-21",
      scheduleType: "daily-8am",
      skillVersion: "daily-report-orchestrator/v1",
      status: "completed"
    });

    expect(historyItem).toEqual({
      completedAt: "2026-03-21T00:00:00.000Z",
      id: "run-1",
      promptVersion: "daily-report/v1",
      runDate: "2026-03-21",
      scheduleType: "daily-8am",
      skillVersion: "daily-report-orchestrator/v1",
      status: "completed",
      summaryLine: "시장 해석이 방어적으로 기울어 있어, 오늘은 신규 확대보다 유지와 선별 조정에 무게를 두는 편이 적절합니다."
    });
  });

  it("maps latest report views", () => {
    const latest = toLatestReportView({
      id: "run-1",
      reportText: "report text",
      runDate: "2026-03-21",
      scheduleType: "daily-8am",
      status: "completed"
    });

    expect(latest.renderedText).toBe("report text");
    expect(latest.historyItem.id).toBe("run-1");
  });
});
