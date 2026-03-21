const briefingSummary = document.querySelector("#briefing-summary");
const publicBullets = document.querySelector("#public-bullets");
const latestBriefingLink = document.querySelector("#latest-briefing-link");
const latestReport = document.querySelector("#latest-report");
const archiveItems = document.querySelector("#archive-items");

void loadPublicSite();

async function loadPublicSite() {
  const response = await fetch("./data/latest-briefing.json");

  if (!response.ok) {
    briefingSummary.textContent = "공개 브리핑 데이터를 불러오지 못했습니다.";
    return;
  }

  const briefing = await response.json();
  const publicSections = [
    ...briefing.marketBullets.map((bullet) => ({
      title: "시장",
      bullet
    })),
    ...briefing.macroBullets.map((bullet) => ({
      title: "매크로",
      bullet
    })),
    ...briefing.fundFlowBullets.map((bullet) => ({
      title: "자금",
      bullet
    })),
    ...briefing.eventBullets.map((bullet) => ({
      title: "이벤트",
      bullet
    })),
    ...briefing.riskBullets.map((bullet) => ({
      title: "리스크",
      bullet
    }))
  ];

  briefingSummary.textContent = `${briefing.runDate} 기준 최신 공개 브리핑입니다.`;
  latestBriefingLink.href = `../briefings/${briefing.runDate}/`;
  latestReport.textContent = [
    briefing.title,
    "",
    briefing.summaryLine,
    "",
    ...publicSections.map((item) => `[${item.title}] ${item.bullet}`),
    "",
    briefing.disclaimer
  ].join("\n");
  renderList(publicBullets, publicSections, (item) => {
    return `${item.title} · ${item.bullet}`;
  });
  renderList(archiveItems, [briefing.runDate], (runDate) => {
    return `<a href="../briefings/${runDate}/">${runDate} 공개 브리핑</a>`;
  });
}

function renderList(target, items, formatter) {
  if (!target) {
    return;
  }

  if (!items || items.length === 0) {
    target.classList.add("empty");
    target.innerHTML = "<li>데이터가 없습니다.</li>";
    return;
  }

  target.classList.remove("empty");
  target.innerHTML = items.map((item) => `<li>${formatter(item)}</li>`).join("");
}
