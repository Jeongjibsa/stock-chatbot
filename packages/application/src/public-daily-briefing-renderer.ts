import type { PublicDailyBriefing } from "./public-daily-briefing.js";

export function renderPublicDailyBriefingHtml(briefing: PublicDailyBriefing): string {
  const sections = [
    renderSection("오늘 한 줄 요약", [`<p>${escapeHtml(briefing.summaryLine)}</p>`]),
    renderDefinitionSection("시장 종합 해석", [
      ["시장 종합", briefing.marketSummary.overall],
      ["심리/강도", briefing.marketSummary.sentimentStrength],
      ["밸류/펀더멘털", briefing.marketSummary.valuationFundamentals],
      ["구조 리스크", briefing.marketSummary.structureRisk],
      ["한줄 해석", briefing.marketSummary.interpretation]
    ]),
    renderDefinitionSection("글로벌/국내 시장 스냅샷", [
      ["주요 지수", briefing.globalSnapshot.majorIndices],
      ["금리/환율/원자재", briefing.globalSnapshot.ratesFxCommodities],
      ["위험 선호 심리", briefing.globalSnapshot.riskAppetite]
    ]),
    renderBulletSection("주요 지표 변화 요약", briefing.keyIndicatorBullets),
    renderDefinitionSection("오늘 강한 섹터 / 약한 섹터", [
      ["강한 섹터", briefing.sectorSummary.strong],
      ["약한 섹터", briefing.sectorSummary.weak]
    ]),
    renderDefinitionSection("시장 해석", [
      ["1. 거시 관점", briefing.marketInterpretation.macro],
      ["2. 자금 흐름 관점", briefing.marketInterpretation.fundFlow],
      ["3. 스타일/테마 관점", briefing.marketInterpretation.styleTheme]
    ]),
    renderBulletSection("오늘의 핵심 뉴스/이벤트", briefing.eventBullets),
    renderBulletSection("체크할 주요 일정", briefing.scheduleBullets),
    renderBulletSection("오늘의 리스크 포인트", briefing.riskBullets),
    renderSection("오늘 시장에서 읽어야 할 포인트", [
      `<p>${escapeHtml(briefing.closingParagraph)}</p>`
    ])
  ].join("\n");

  return [
    "<!doctype html>",
    '<html lang="ko">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>${escapeHtml(briefing.title)}</title>`,
    `  <link rel="canonical" href="${escapeHtml(briefing.canonicalPath)}" />`,
    "  <style>",
    "    :root { color-scheme: light; --bg: #f5f2ea; --card: #fffdf9; --ink: #171513; --muted: #5c564d; --line: #ded7ca; --accent: #9f4633; }",
    "    body { margin: 0; font-family: 'Iowan Old Style', 'Noto Serif KR', serif; background: linear-gradient(180deg, #fff8e6 0%, var(--bg) 34%, #f3efe8 100%); color: var(--ink); }",
    "    main { max-width: 920px; margin: 0 auto; padding: 48px 20px 80px; }",
    "    header { margin-bottom: 24px; }",
    "    h1 { margin: 0 0 8px; font-size: clamp(2rem, 4vw, 3.1rem); line-height: 1.05; }",
    "    .meta { color: var(--muted); font-size: 0.95rem; }",
    "    section { background: rgba(255, 253, 249, 0.88); border: 1px solid var(--line); border-radius: 20px; padding: 20px 22px; margin-bottom: 16px; box-shadow: 0 16px 44px rgba(28, 24, 18, 0.06); }",
    "    h2 { margin: 0 0 12px; font-size: 1.08rem; }",
    "    p, li, dd { line-height: 1.7; }",
    "    ul { margin: 0; padding-left: 1.2rem; }",
    "    li { margin: 0.35rem 0; }",
    "    dl { margin: 0; display: grid; grid-template-columns: minmax(140px, 180px) 1fr; gap: 10px 16px; }",
    "    dt { color: var(--muted); font-weight: 700; }",
    "    dd { margin: 0; }",
    "    footer { color: var(--muted); font-size: 0.92rem; margin-top: 24px; }",
    "  </style>",
    "</head>",
    "<body>",
    "  <main>",
    "    <header>",
    `      <h1>${escapeHtml(briefing.title)}</h1>`,
    `      <div class="meta">기준일 ${escapeHtml(briefing.runDate)} · 공개 시장 브리핑</div>`,
    "    </header>",
    sections,
    "    <footer>",
    `      <p>${escapeHtml(briefing.disclaimer)}</p>`,
    "    </footer>",
    "  </main>",
    "</body>",
    "</html>"
  ].join("\n");
}

function renderSection(title: string, blocks: string[]): string {
  return [
    "    <section>",
    `      <h2>${escapeHtml(title)}</h2>`,
    ...blocks.map((block) => `      ${block}`),
    "    </section>"
  ].join("\n");
}

function renderBulletSection(title: string, bullets: string[]): string {
  const lines = bullets.length > 0 ? bullets : ["추가 확인이 필요한 구간입니다."];
  const items = lines.map((line) => `        <li>${escapeHtml(line)}</li>`).join("\n");

  return [
    "    <section>",
    `      <h2>${escapeHtml(title)}</h2>`,
    "      <ul>",
    items,
    "      </ul>",
    "    </section>"
  ].join("\n");
}

function renderDefinitionSection(title: string, rows: Array<[string, string]>): string {
  const items = rows
    .map(
      ([term, description]) =>
        `        <dt>${escapeHtml(term)}</dt>\n        <dd>${escapeHtml(description)}</dd>`
    )
    .join("\n");

  return [
    "    <section>",
    `      <h2>${escapeHtml(title)}</h2>`,
    "      <dl>",
    items,
    "      </dl>",
    "    </section>"
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
