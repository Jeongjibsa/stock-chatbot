import type { PublicDailyBriefing } from "./public-daily-briefing.js";

export function renderPublicDailyBriefingHtml(briefing: PublicDailyBriefing): string {
  const sections = [
    renderBulletSection("한 줄 요약", [briefing.summaryLine]),
    renderMarketSnapshotSection(briefing),
    renderBulletSection("주요 지표 변동 요약", briefing.keyIndicatorBullets),
    renderBulletSection("시장 브리핑", briefing.marketBullets),
    renderBulletSection("매크로 브리핑", briefing.macroBullets),
    renderBulletSection("자금 브리핑", briefing.fundFlowBullets),
    renderBulletSection("주요 일정 및 이벤트 브리핑", briefing.eventBullets),
    renderBulletSection("리스크 체크리스트", briefing.riskBullets)
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
    "    :root { color-scheme: light; --bg: #f7f4ee; --card: #fffaf1; --ink: #181511; --muted: #5a534a; --line: #ded4c6; --accent: #a33a2b; }",
    "    body { margin: 0; font-family: 'Iowan Old Style', 'Noto Serif KR', serif; background: radial-gradient(circle at top, #fff4d9, var(--bg) 52%); color: var(--ink); }",
    "    main { max-width: 860px; margin: 0 auto; padding: 48px 20px 80px; }",
    "    header { margin-bottom: 24px; }",
    "    h1 { margin: 0 0 8px; font-size: clamp(2rem, 4vw, 3.2rem); line-height: 1.05; }",
    "    .meta { color: var(--muted); font-size: 0.95rem; }",
    "    section { background: color-mix(in srgb, var(--card) 88%, white); border: 1px solid var(--line); border-radius: 20px; padding: 20px 22px; margin-bottom: 16px; box-shadow: 0 14px 40px rgba(0, 0, 0, 0.05); }",
    "    h2 { margin: 0 0 12px; font-size: 1.1rem; }",
    "    ul { margin: 0; padding-left: 1.2rem; }",
    "    li { margin: 0.3rem 0; line-height: 1.6; }",
    "    .snapshot-grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }",
    "    .snapshot-card { padding: 12px 14px; border-radius: 16px; border: 1px solid var(--line); background: rgba(255,255,255,0.7); }",
    "    .snapshot-name { font-weight: 700; }",
    "    .snapshot-meta { color: var(--muted); font-size: 0.9rem; margin-top: 2px; }",
    "    .snapshot-change.up { color: #b42318; }",
    "    .snapshot-change.down { color: #0b67c2; }",
    "    .snapshot-change.flat { color: var(--muted); }",
    "    footer { color: var(--muted); font-size: 0.9rem; margin-top: 24px; }",
    "  </style>",
    "</head>",
    "<body>",
    "  <main>",
    "    <header>",
    `      <h1>${escapeHtml(briefing.title)}</h1>`,
    `      <div class="meta">기준일 ${escapeHtml(briefing.runDate)} · 공개 브리핑</div>`,
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

function renderMarketSnapshotSection(briefing: PublicDailyBriefing): string {
  if (briefing.marketSnapshot.length === 0) {
    return renderBulletSection("거시 시장 스냅샷", ["공개 가능한 시장 지표가 아직 준비되지 않았습니다."]);
  }

  const cards = briefing.marketSnapshot
    .map((item) => {
      const changeClass =
        item.changePercent === undefined
          ? "flat"
          : item.changePercent > 0
            ? "up"
            : item.changePercent < 0
              ? "down"
              : "flat";

      return [
        '      <article class="snapshot-card">',
        `        <div class="snapshot-name">${escapeHtml(item.itemName)}</div>`,
        `        <div class="snapshot-meta">${escapeHtml(item.asOfDate)} 기준</div>`,
        `        <div>${escapeHtml(formatSnapshotValue(item.previousValue, item.value))}</div>`,
        `        <div class="snapshot-change ${changeClass}">${escapeHtml(formatSnapshotChange(item.changePercent))}</div>`,
        "      </article>"
      ].join("\n");
    })
    .join("\n");

  return [
    "    <section>",
    "      <h2>거시 시장 스냅샷</h2>",
    '      <div class="snapshot-grid">',
    cards,
    "      </div>",
    "    </section>"
  ].join("\n");
}

function renderBulletSection(title: string, bullets: string[]): string {
  const lines = bullets.length > 0 ? bullets : ["데이터가 아직 충분하지 않습니다."];
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

function formatSnapshotValue(previousValue: number | undefined, value: number): string {
  if (previousValue === undefined) {
    return `${formatNumber(value)}`;
  }

  return `${formatNumber(previousValue)} → ${formatNumber(value)}`;
}

function formatSnapshotChange(changePercent: number | undefined): string {
  if (changePercent === undefined) {
    return "변동률 데이터 없음";
  }

  if (changePercent > 0) {
    return `▲ ${Math.abs(changePercent).toFixed(2)}%`;
  }

  if (changePercent < 0) {
    return `▼ ${Math.abs(changePercent).toFixed(2)}%`;
  }

  return "■ 0.00%";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 2
  }).format(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
