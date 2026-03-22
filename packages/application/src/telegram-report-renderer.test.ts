import { describe, expect, it } from "vitest";

import { renderTelegramDailyReport } from "./telegram-report-renderer.js";

describe("renderTelegramDailyReport", () => {
  it("renders successful market items and holdings", () => {
    const report = renderTelegramDailyReport({
      displayName: "Jisung",
      runDate: "2026-03-20",
      summaryLine: "오늘은 시장 지표와 보유 종목 기준으로 핵심 흐름만 간단히 정리했습니다.",
      holdings: [
        {
          companyName: "Apple Inc.",
          currentPrice: 247.99,
          changePercent: -0.39,
          symbol: "AAPL",
          exchange: "US",
          previousClose: 248.96
        }
      ],
      marketResults: [
        {
          status: "ok",
          data: {
            itemCode: "NASDAQ",
            itemName: "나스닥 종합",
            source: "fred",
            sourceKey: "index:NASDAQ:IXIC",
            asOfDate: "2026-03-20",
            previousValue: 17777.78,
            value: 18000,
            changePercent: 1.25
          }
        }
      ]
    });

    expect(report).toContain("🗞️ 오늘의 브리핑 (2026-03-20 기준)");
    expect(report).toContain("📌 한 줄 요약");
    expect(report).toContain("━━━━━━━━━━━━━━━");
    expect(report).toContain("📍 주요 지표 변동 요약");
    expect(report).toContain("🧭 시장, 매크로, 자금 브리핑");
    expect(report).toContain("🗓️ 주요 일정 및 이벤트 브리핑");
    expect(report).toContain("→ 오늘은 시장 지표와 보유 종목 기준으로 핵심 흐름만 간단히 정리했습니다.");
    expect(report).toContain("나스닥 종합: 17,777.78 → 18,000  🔴▲ 1.25%");
    expect(report).toContain("• Apple Inc.: 248.96 → 247.99  🔵▼ 0.39%");
    expect(report).toContain("❗ 이 리포트는 정보 제공용이며, 투자 판단과 책임은 본인에게 있습니다.");
  });

  it("places market snapshot items in grouped order and adds the fx insight after fx lines", () => {
    const report = renderTelegramDailyReport({
      displayName: "Jisung",
      runDate: "2026-03-20",
      holdings: [],
      marketResults: [
        {
          status: "ok",
          data: {
            itemCode: "HENRY_HUB_NATURAL_GAS",
            itemName: "천연가스 (Henry Hub)",
            source: "fred",
            sourceKey: "commodity:HENRY_HUB_NATURAL_GAS",
            asOfDate: "2026-03-20",
            previousValue: 3.2,
            value: 3.03,
            changePercent: -5.31
          }
        },
        {
          status: "ok",
          data: {
            itemCode: "WTI",
            itemName: "국제 유가(WTI)",
            source: "fred",
            sourceKey: "commodity:WTI",
            asOfDate: "2026-03-20",
            previousValue: 98.48,
            value: 93.39,
            changePercent: -5.17
          }
        },
        {
          status: "ok",
          data: {
            itemCode: "USD_KRW",
            itemName: "USD/KRW 환율",
            source: "fred",
            sourceKey: "fx:USDKRW",
            asOfDate: "2026-03-20",
            previousValue: 1470.2,
            value: 1480.85,
            changePercent: 0.7244
          }
        },
        {
          status: "ok",
          data: {
            itemCode: "NASDAQ",
            itemName: "NASDAQ",
            source: "fred",
            sourceKey: "index:NASDAQ:IXIC",
            asOfDate: "2026-03-20",
            previousValue: 17777.78,
            value: 18000,
            changePercent: 1.25
          }
        },
        {
          status: "ok",
          data: {
            itemCode: "SP500",
            itemName: "S&P 500",
            source: "fred",
            sourceKey: "index:SP:SPX",
            asOfDate: "2026-03-20",
            previousValue: 5711.2,
            value: 5662.4,
            changePercent: -0.8544
          }
        },
        {
          status: "ok",
          data: {
            itemCode: "DXY",
            itemName: "달러인덱스",
            source: "fred",
            sourceKey: "index:DXY",
            asOfDate: "2026-03-20",
            previousValue: 120.1,
            value: 121.5,
            changePercent: 1.1657
          }
        }
      ]
    });

    const nasdaqIndex = report.indexOf("• NASDAQ:");
    const sp500Index = report.indexOf("• S&P 500:");
    const wtiIndex = report.indexOf("• 국제 유가(WTI):");
    const naturalGasIndex = report.indexOf("• 천연가스 (Henry Hub):");
    const usdKrwIndex = report.indexOf("• USD/KRW 환율:");
    const dxyIndex = report.indexOf("• 달러인덱스:");
    const insightIndex = report.indexOf(
      "↳ 달러인덱스와 USD/KRW가 함께 올라 전반적인 달러 강세 영향이 같이 반영된 흐름으로 보입니다."
    );

    expect(nasdaqIndex).toBeGreaterThan(-1);
    expect(sp500Index).toBeGreaterThan(nasdaqIndex);
    expect(wtiIndex).toBeGreaterThan(sp500Index);
    expect(naturalGasIndex).toBeGreaterThan(wtiIndex);
    expect(usdKrwIndex).toBeGreaterThan(nasdaqIndex);
    expect(usdKrwIndex).toBeGreaterThan(naturalGasIndex);
    expect(dxyIndex).toBeGreaterThan(usdKrwIndex);
    expect(insightIndex).toBeGreaterThan(dxyIndex);
  });

  it("renders missing source section when failures exist", () => {
    const report = renderTelegramDailyReport({
      displayName: "Jisung",
      runDate: "2026-03-20",
      holdings: [],
      marketResults: [
        {
          status: "error",
          errorCode: "unsupported_source",
          sourceKey: "index:KRX:KOSPI",
          message: "unsupported"
        }
      ]
    });

    expect(report).toContain("🧩 누락 또는 지연 항목");
    expect(report).toContain("index:KRX:KOSPI: unsupported");
    expect(report).toContain("(보유 종목 없음)");
    expect(report).toContain("시장, 매크로, 자금 브리핑 데이터가 아직 충분하지 않습니다.");
    expect(report).toContain("(보유 종목 입력 시 자동 생성)");
    expect(report).toContain("규칙 기반 점수 산출 전입니다.");
    expect(report).toContain("❗ 이 리포트는 정보 제공용이며");
  });

  it("omits lower-detail briefing sections in compact mode", () => {
    const report = renderTelegramDailyReport({
      displayName: "Jisung",
      runDate: "2026-03-20",
      reportDetailLevel: "compact",
      holdings: [],
      marketResults: []
    });

    expect(report).not.toContain("🧭 시장, 매크로, 자금 브리핑");
    expect(report).not.toContain("🗓️ 주요 일정 및 이벤트 브리핑");
    expect(report).toContain("⚠️ 리스크 체크리스트");
  });

  it("renders news, strategy and risk sections when enrichment exists", () => {
    const report = renderTelegramDailyReport({
      displayName: "Jisung",
      runDate: "2026-03-20",
      summaryLine: "오늘은 변동성이 큰 항목과 보유 종목 핵심 흐름만 추려서 정리했습니다.",
      holdings: [
        {
          companyName: "Apple Inc.",
          currentPrice: 247.99,
          changePercent: -0.39,
          symbol: "AAPL",
          exchange: "US",
          previousClose: 248.96,
          trendSummary: "대형 기술주 약세 영향으로 하루 조정을 받았습니다."
        }
      ],
      holdingTrendBullets: [
        "Apple은 시장 조정 영향으로 단기 변동성이 커졌습니다."
      ],
      marketBullets: [
        "미국 지수와 변동성 지표를 함께 보면 위험 선호가 약해졌습니다."
      ],
      macroBullets: [
        "중동 이란 전쟁 이슈로 원유 공급 차질 우려가 커지며 유가와 달러 강세 압력이 같이 반영되고 있습니다."
      ],
      fundFlowBullets: [
        "외국인·기관 수급과 ETF flow는 아직 별도 데이터 소스 연결 전입니다."
      ],
      eventBullets: [
        "주요 뉴스는 지정학 리스크와 AI 반도체 수요 기대를 중심으로 움직이고 있습니다.",
        "예정 실적 발표 일정 데이터는 아직 연결되지 않았습니다."
      ],
      marketResults: [
        {
          status: "ok",
          data: {
            itemCode: "USD_KRW",
            itemName: "USD/KRW 환율",
            source: "fred",
            sourceKey: "fx:USDKRW",
            asOfDate: "2026-03-20",
            previousValue: 1470.2,
            value: 1480.85,
            changePercent: 0.7244
          }
        },
        {
          status: "ok",
          data: {
            itemCode: "DXY",
            itemName: "달러인덱스",
            source: "fred",
            sourceKey: "index:DXY",
            asOfDate: "2026-03-20",
            previousValue: 120.1,
            value: 121.5,
            changePercent: 1.1657
          }
        }
      ],
      portfolioNewsBriefs: [
        {
          holding: {
            companyName: "Apple Inc.",
            exchange: "US",
            symbol: "AAPL"
          },
          articles: [],
          events: [
            {
              confidence: "high",
              eventType: "product",
              headline: "신제품 공개",
              sentiment: "positive",
              summary: "수요 기대가 커지고 있습니다.",
              supportingArticleIds: ["a1"]
            }
          ],
          status: "ok"
        }
      ],
      articleSummaryBullets: [
        "Apple 관련 핵심 기사는 제품 기대감 유지에 초점을 두고 있습니다."
      ],
      quantScorecards: [
        {
          companyName: "Apple Inc.",
          symbol: "AAPL",
          macroScore: -0.4,
          trendScore: -0.4,
          eventScore: 0.2,
          flowScore: -0.1,
          totalScore: -0.23,
          action: "REDUCE",
          actionSummary:
            "Apple Inc.는 반등 시 비중 축소 또는 손절 기준 재점검이 우선입니다."
        }
      ],
      quantScenarios: ["추세 유지 시 분할 매수를 관찰하는 전략이 유효합니다."],
      riskCheckpoints: ["변동성 급등 시 비중 확대를 보류하는 편이 안전합니다."]
    });

    expect(report).toContain("📰 종목 관련 핵심 기사 및 이벤트 요약");
    expect(report).toContain("🧠 퀀트 기반 시그널 및 매매 아이디어");
    expect(report).toContain("⚠️ 리스크 체크리스트");
    expect(report).toContain("📍 주요 지표 변동 요약");
    expect(report).toContain("🧭 시장, 매크로, 자금 브리핑");
    expect(report).toContain("🗓️ 주요 일정 및 이벤트 브리핑");
    expect(report).toContain("• [시장] 미국 지수와 변동성 지표를 함께 보면 위험 선호가 약해졌습니다.");
    expect(report).toContain("• [매크로] 중동 이란 전쟁 이슈로 원유 공급 차질 우려가 커지며 유가와 달러 강세 압력이 같이 반영되고 있습니다.");
    expect(report).toContain("• [자금] 외국인·기관 수급과 ETF flow는 아직 별도 데이터 소스 연결 전입니다.");
    expect(report).toContain("→ 오늘은 변동성이 큰 항목과 보유 종목 핵심 흐름만 추려서 정리했습니다.");
    expect(report).toContain("• Apple은 시장 조정 영향으로 단기 변동성이 커졌습니다.");
    expect(report).toContain("• Apple 관련 핵심 기사는 제품 기대감 유지에 초점을 두고 있습니다.");
    expect(report).toContain("• 오늘의 리밸런싱 제안");
    expect(report).toContain("  • 비중 조절 필요: Apple Inc.");
    expect(report).toContain("Macro: -0.40 / Trend: -0.40 / Event: +0.20 / Flow: -0.10");
    expect(report).toContain("→ Total: -0.23 → 비중 조절 필요");
    expect(report).toContain("• 전략");
    expect(report).toContain("  • 추세 유지 시 분할 매수를 관찰하는 전략이 유효합니다.");
    expect(report).toContain("예정 실적 발표 일정 데이터는 아직 연결되지 않았습니다.");
    expect(report).toContain(
      "달러인덱스와 USD/KRW가 함께 올라 전반적인 달러 강세 영향이 같이 반영된 흐름으로 보입니다."
    );
    expect(report).toContain("❗ 이 리포트는 정보 제공용이며, 투자 판단과 책임은 본인에게 있습니다.");
  });

  it("renders a public briefing link before the disclaimer when provided", () => {
    const report = renderTelegramDailyReport({
      displayName: "Jisung",
      runDate: "2026-03-20",
      holdings: [],
      publicBriefingUrl:
        "https://jeongjibsa.github.io/stock-chatbot/briefings/2026-03-20/",
      marketResults: []
    });

    const linkIndex = report.indexOf(
      "🔎 상세 브리핑: https://jeongjibsa.github.io/stock-chatbot/briefings/2026-03-20/"
    );
    const disclaimerIndex = report.indexOf(
      "❗ 이 리포트는 정보 제공용이며, 투자 판단과 책임은 본인에게 있습니다."
    );

    expect(linkIndex).toBeGreaterThan(-1);
    expect(disclaimerIndex).toBeGreaterThan(linkIndex);
  });
});
