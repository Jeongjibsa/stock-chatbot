import type { PublicDailyBriefing } from "./public-daily-briefing.js";

export function renderPublicDailyBriefingMarkdown(
  briefing: PublicDailyBriefing
): string {
  const checkpointSectionTitle = formatCheckpointSectionTitle(
    briefing.briefingSession
  );
  const sections = [
    `# ${briefing.title}`,
    "",
    "## 오늘 한 줄 요약",
    `> ${briefing.summaryLine}`,
    "",
    "## 브리핑 역할",
    `- ${briefing.sessionRole}`,
    "",
    "## 시장 종합 해석",
    `- **브리핑 목적**: ${briefing.marketSummary.purpose}`,
    `- **시장 종합**: ${briefing.marketSummary.overall}`,
    `- **심리/강도**: ${briefing.marketSummary.sentimentStrength}`,
    `- **밸류/펀더멘털**: ${briefing.marketSummary.valuationFundamentals}`,
    `- **구조 리스크**: ${briefing.marketSummary.structureRisk}`,
    `- **한줄 해석**: ${briefing.marketSummary.interpretation}`,
    "",
    "## 글로벌/국내 시장 스냅샷",
    `- **주요 지수**: ${briefing.globalSnapshot.majorIndices}`,
    `- **금리/환율/원자재**: ${briefing.globalSnapshot.ratesFxCommodities}`,
    `- **위험 선호 심리**: ${briefing.globalSnapshot.riskAppetite}`,
    "",
    "## 주요 지표 변화 요약",
    ...renderBullets(briefing.keyIndicatorBullets),
    "",
    "## 오늘 강한 섹터 / 약한 섹터",
    `- **강한 섹터**: ${briefing.sectorSummary.strong}`,
    `- **약한 섹터**: ${briefing.sectorSummary.weak}`,
    "",
    "## 시장 해석",
    `- **1. 거시 관점**: ${briefing.marketInterpretation.macro}`,
    `- **2. 자금 흐름 관점**: ${briefing.marketInterpretation.fundFlow}`,
    `- **3. 스타일/테마 관점**: ${briefing.marketInterpretation.styleTheme}`,
    "",
    "## 핵심 뉴스 이벤트",
    ...renderHeadlineEvents(briefing.headlineEvents),
    "",
    "## 거시 트렌드 뉴스",
    ...renderBullets(briefing.trendNewsBullets),
    "",
    `## ${checkpointSectionTitle}`,
    ...renderBullets(briefing.scheduleBullets),
    "",
    "## 오늘의 리스크 포인트",
    ...renderBullets(briefing.riskBullets),
    "",
    "## 오늘 시장에서 읽어야 할 포인트",
    briefing.closingParagraph,
    ...(briefing.newsReferences.length > 0
      ? [
          "",
          "## 참고한 뉴스 출처",
          ...briefing.newsReferences.map(
            (reference) =>
              `- [${reference.sourceLabel} | ${reference.title}](${reference.url})`
          )
        ]
      : []),
    "",
    "---",
    "",
    `> ❗ ${briefing.disclaimer}`
  ];

  return `${sections.join("\n")}\n`;
}

function renderBullets(lines: string[]): string[] {
  const safeLines = lines.length > 0 ? lines : ["추가 확인이 필요한 구간입니다."];

  return safeLines.map((line) => `- ${line}`);
}

function renderHeadlineEvents(
  events: PublicDailyBriefing["headlineEvents"]
): string[] {
  if (events.length === 0) {
    return ["- 수집된 핵심 뉴스 헤드라인은 추가 확인이 필요한 구간입니다."];
  }

  return events.flatMap((event) => [
    `- **[${event.sourceLabel}]** ${event.headline}`,
    `  - ${event.summary}`
  ]);
}

function formatCheckpointSectionTitle(
  session: PublicDailyBriefing["briefingSession"]
): string {
  if (session === "pre_market") {
    return "오늘 대응 기준";
  }

  if (session === "post_market") {
    return "오늘 밤 체크포인트";
  }

  return "다음 주 주요 일정 요약";
}
