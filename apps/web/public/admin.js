const healthSummary = document.querySelector("#health-summary");
const adminOverview = document.querySelector("#admin-overview");
const mockPreview = document.querySelector("#mock-preview");

void load();

async function load() {
  const response = await fetch("./data/latest-briefing.json");

  if (!response.ok) {
    healthSummary.textContent = "데이터를 불러오지 못했습니다.";
    return;
  }

  const briefing = await response.json();
  const publicSections = [
    ...briefing.marketBullets.map((bullet) => `[시장] ${bullet}`),
    ...briefing.macroBullets.map((bullet) => `[매크로] ${bullet}`),
    ...briefing.fundFlowBullets.map((bullet) => `[자금] ${bullet}`),
    ...briefing.eventBullets.map((bullet) => `[이벤트] ${bullet}`),
    ...briefing.riskBullets.map((bullet) => `[리스크] ${bullet}`)
  ];

  healthSummary.textContent = `latestRun=${briefing.runDate} · sections=${publicSections.length}`;
  adminOverview.innerHTML = [
    `<a class="button secondary-link" href="../briefings/${briefing.runDate}/">최신 공개 브리핑</a>`,
    '<a class="button secondary-link" href="../briefings/">아카이브</a>'
  ].join(" ");
  mockPreview.textContent = [
    briefing.title,
    "",
    briefing.summaryLine,
    "",
    ...publicSections
  ].join("\n");
}
