import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MarkdownReport } from "./markdown-report";

describe("MarkdownReport", () => {
  it("renders markdown headings and lists", () => {
    const markup = renderToStaticMarkup(
      <MarkdownReport content={"# 제목\n\n- 항목 1\n- 항목 2"} />
    );

    expect(markup).toContain("제목");
    expect(markup).toContain("항목 1");
    expect(markup).toContain("<ul>");
  });
});
