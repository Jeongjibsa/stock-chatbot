import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MarkdownReport, normalizeBriefingMarkdown } from "./markdown-report";

describe("MarkdownReport", () => {
  it("renders markdown headings and lists", () => {
    const markup = renderToStaticMarkup(
      <MarkdownReport content={"# 제목\n\n- 항목 1\n- 항목 2"} />
    );

    expect(markup).toContain("제목");
    expect(markup).toContain("항목 1");
    expect(markup).toContain("<ul>");
  });

  it("keeps link labels readable without exposing raw url text", () => {
    const markup = renderToStaticMarkup(
      <MarkdownReport content={"## 참고한 뉴스 출처\n- [Reuters | Dollar strength persists](https://example.com/reuters-dollar)"} />
    );

    expect(markup).toContain("Reuters | Dollar strength persists");
    expect(markup).toContain('href="https://example.com/reuters-dollar"');
    expect(markup).not.toContain(">https://example.com/reuters-dollar<");
  });

  it("upgrades legacy numbered briefing sections into headings", () => {
    const normalized = normalizeBriefingMarkdown(
      "1. # 제목\n\n2. 오늘 한 줄 요약\n- 요약\n\n13. ❗ 면책 문구"
    );

    expect(normalized).toContain("# 제목");
    expect(normalized).toContain("## 오늘 한 줄 요약");
    expect(normalized).toContain("> ❗ 면책 문구");
  });
});
