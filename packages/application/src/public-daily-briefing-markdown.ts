import type { PublicDailyBriefing } from "./public-daily-briefing.js";

export function renderPublicDailyBriefingMarkdown(
  briefing: PublicDailyBriefing
): string {
  const sections = [
    `# ${briefing.title}`,
    "",
    "## 한 줄 요약",
    briefing.summaryLine,
    "",
    "## 거시 시장 스냅샷",
    ...renderMarketSnapshot(briefing),
    "",
    "## 주요 지표 변동 요약",
    ...renderBullets(briefing.keyIndicatorBullets),
    "",
    "## 시장 브리핑",
    ...renderBullets(briefing.marketBullets),
    "",
    "## 매크로 브리핑",
    ...renderBullets(briefing.macroBullets),
    "",
    "## 자금 브리핑",
    ...renderBullets(briefing.fundFlowBullets),
    "",
    "## 주요 일정 및 이벤트 브리핑",
    ...renderBullets(briefing.eventBullets),
    "",
    "## 리스크 체크리스트",
    ...renderBullets(briefing.riskBullets),
    "",
    `> ${briefing.disclaimer}`
  ];

  return `${sections.join("\n")}\n`;
}

function renderMarketSnapshot(briefing: PublicDailyBriefing): string[] {
  if (briefing.marketSnapshot.length === 0) {
    return ["- 공개 가능한 시장 지표가 아직 준비되지 않았습니다."];
  }

  return briefing.marketSnapshot.map((item) => {
    const previous = item.previousValue;
    const change = item.changePercent;
    const valueText =
      previous === undefined
        ? formatNumber(item.value)
        : `${formatNumber(previous)} → ${formatNumber(item.value)}`;
    const changeText =
      change === undefined
        ? "변동률 데이터 없음"
        : `${change > 0 ? "▲" : change < 0 ? "▼" : "■"} ${Math.abs(change).toFixed(2)}%`;

    return `- ${item.itemName}: ${valueText} (${changeText}, ${item.asOfDate} 기준)`;
  });
}

function renderBullets(lines: string[]): string[] {
  const safeLines = lines.length > 0 ? lines : ["데이터가 아직 충분하지 않습니다."];

  return safeLines.map((line) => `- ${line}`);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 2
  }).format(value);
}
