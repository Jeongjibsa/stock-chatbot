import { describe, expect, it } from "vitest";

import { mapAdminSummaryRow } from "./admin-dashboard";

describe("admin-dashboard", () => {
  it("maps admin summary row counts to numbers", () => {
    expect(
      mapAdminSummaryRow({
        completed_count: "4",
        failed_count: "1",
        partial_success_count: "2",
        running_count: "0",
        total_count: "7"
      })
    ).toEqual({
      completedCount: 4,
      failedCount: 1,
      partialSuccessCount: 2,
      runningCount: 0,
      totalCount: 7
    });
  });
});
