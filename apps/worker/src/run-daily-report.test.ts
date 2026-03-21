import { describe, expect, it } from "vitest";

import {
  formatDailyReportJobSummary,
  readReportTriggerType
} from "./run-daily-report.js";

describe("run-daily-report", () => {
  it("reads trigger type from env with a safe default", () => {
    expect(readReportTriggerType({})).toBe("manual");
    expect(readReportTriggerType({ REPORT_TRIGGER_TYPE: "schedule" })).toBe(
      "schedule"
    );
    expect(
      readReportTriggerType({ REPORT_TRIGGER_TYPE: "workflow_dispatch" })
    ).toBe("workflow_dispatch");
    expect(readReportTriggerType({ REPORT_TRIGGER_TYPE: "unexpected" })).toBe(
      "manual"
    );
  });

  it("formats a concise job summary for workflow logs", () => {
    expect(
      formatDailyReportJobSummary({
        triggerType: "schedule",
        runDate: "2026-03-21",
        summary: {
          userCount: 3,
          completedCount: 1,
          deliveredCount: 1,
          deliverySkippedCount: 1,
          deliveryFailedCount: 0,
          partialSuccessCount: 1,
          failedCount: 0,
          skippedDuplicateCount: 1
        }
      })
    ).toBe(
      "[daily-report] trigger=schedule runDate=2026-03-21 users=3 completed=1 delivered=1 deliverySkipped=1 deliveryFailed=0 partialSuccess=1 failed=0 skippedDuplicate=1"
    );
  });
});
