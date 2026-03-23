import type { PublicDailyBriefing } from "./public-daily-briefing.js";

export function renderPublicDailyBriefingMarkdown(
  briefing: PublicDailyBriefing
): string {
  const sections = [
    `1. # 🗞️ ${briefing.sessionLabel} 시장 브리핑 (${briefing.runDate})`,
    "",
    "2. 오늘 한 줄 요약",
    `- ${briefing.summaryLine}`,
    "",
    "3. 브리핑 역할",
    `- ${briefing.sessionRole}`,
    "",
    "4. 시장 종합 해석",
    `- 시장 종합: ${briefing.marketSummary.overall}`,
    `- 심리/강도: ${briefing.marketSummary.sentimentStrength}`,
    `- 밸류/펀더멘털: ${briefing.marketSummary.valuationFundamentals}`,
    `- 구조 리스크: ${briefing.marketSummary.structureRisk}`,
    `- 한줄 해석: ${briefing.marketSummary.interpretation}`,
    "",
    "5. 글로벌/국내 시장 스냅샷",
    `- 주요 지수: ${briefing.globalSnapshot.majorIndices}`,
    `- 금리/환율/원자재: ${briefing.globalSnapshot.ratesFxCommodities}`,
    `- 위험 선호 심리: ${briefing.globalSnapshot.riskAppetite}`,
    "",
    "6. 주요 지표 변화 요약",
    ...renderBullets(briefing.keyIndicatorBullets),
    "",
    "7. 오늘 강한 섹터 / 약한 섹터",
    `- 강한 섹터: ${briefing.sectorSummary.strong}`,
    `- 약한 섹터: ${briefing.sectorSummary.weak}`,
    "",
    "8. 시장 해석",
    `- 1. 거시 관점: ${briefing.marketInterpretation.macro}`,
    `- 2. 자금 흐름 관점: ${briefing.marketInterpretation.fundFlow}`,
    `- 3. 스타일/테마 관점: ${briefing.marketInterpretation.styleTheme}`,
    "",
    "9. 오늘의 핵심 뉴스/이벤트",
    ...renderBullets(briefing.eventBullets),
    "",
    "10. 체크할 주요 일정",
    ...renderBullets(briefing.scheduleBullets),
    "",
    "11. 오늘의 리스크 포인트",
    ...renderBullets(briefing.riskBullets),
    "",
    "12. 오늘 시장에서 읽어야 할 포인트",
    briefing.closingParagraph,
    "",
    `13. ❗ ${briefing.disclaimer}`
  ];

  return `${sections.join("\n")}\n`;
}

function renderBullets(lines: string[]): string[] {
  const safeLines = lines.length > 0 ? lines : ["추가 확인이 필요한 구간입니다."];

  return safeLines.map((line) => `- ${line}`);
}
