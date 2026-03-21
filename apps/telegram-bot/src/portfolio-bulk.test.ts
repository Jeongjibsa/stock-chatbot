import { describe, expect, it } from "vitest";

import { parsePortfolioBulkArgument } from "./portfolio-bulk.js";

describe("parsePortfolioBulkArgument", () => {
  it("splits comma and newline separated inputs", () => {
    expect(
      parsePortfolioBulkArgument("삼성전자, SK하이닉스\n현대차; 에코프로")
    ).toEqual(["삼성전자", "SK하이닉스", "현대차", "에코프로"]);
  });

  it("returns an empty array for blank input", () => {
    expect(parsePortfolioBulkArgument("   ")).toEqual([]);
  });
});

