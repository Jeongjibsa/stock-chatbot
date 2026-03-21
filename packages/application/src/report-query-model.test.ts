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
        "오늘의 브리핑 (2026-03-21)\n한 줄 요약: 시장 지표 1개와 보유 종목 1개 기준으로 정리했어.",
      runDate: "2026-03-21",
      scheduleType: "daily-9am",
      skillVersion: "daily-report-orchestrator/v1",
      status: "completed"
    });

    expect(historyItem).toEqual({
      completedAt: "2026-03-21T00:00:00.000Z",
      id: "run-1",
      promptVersion: "daily-report/v1",
      runDate: "2026-03-21",
      scheduleType: "daily-9am",
      skillVersion: "daily-report-orchestrator/v1",
      status: "completed",
      summaryLine: "한 줄 요약: 시장 지표 1개와 보유 종목 1개 기준으로 정리했어."
    });
  });

  it("maps latest report views", () => {
    const latest = toLatestReportView({
      id: "run-1",
      reportText: "report text",
      runDate: "2026-03-21",
      scheduleType: "daily-9am",
      status: "completed"
    });

    expect(latest.renderedText).toBe("report text");
    expect(latest.historyItem.id).toBe("run-1");
  });
});
