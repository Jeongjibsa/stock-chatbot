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

    expect(report).toContain("🗞️ 오늘의 브리핑");
    expect(report).not.toContain("🗞️ 오늘의 브리핑 | 2026-03-20");
    expect(report).toContain("📌 한 줄 요약");
    expect(report).toContain("📊 시장 브리핑");
    expect(report).toContain("🏦 매크로 브리핑");
    expect(report).toContain("💸 자금 브리핑");
    expect(report).toContain("🗓️ 주요 일정 및 이벤트 브리핑");
    expect(report).toContain("오늘은 시장 지표와 보유 종목 기준으로 핵심 흐름만 간단히 정리했습니다.");
    expect(report).toContain("나스닥 종합: 17,777.78 → 18,000  🔴▲ 1.25%");
    expect(report).toContain("• Apple Inc. (AAPL, US): 248.96 → 247.99  🔵▼ 0.39%");
    expect(report).toContain("❗ 이 리포트는 정보 제공용이며, 투자 판단과 책임은 본인에게 있습니다.");
  });

  it("places fx items at the bottom of the market snapshot and adds the fx insight after them", () => {
    const report = renderTelegramDailyReport({
      displayName: "Jisung",
      runDate: "2026-03-20",
      holdings: [],
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
            itemCode: "NASDAQ",
            itemName: "나스닥 종합",
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

    const nasdaqIndex = report.indexOf("• 나스닥 종합:");
    const usdKrwIndex = report.indexOf("• USD/KRW 환율:");
    const dxyIndex = report.indexOf("• 달러인덱스:");
    const insightIndex = report.indexOf(
      "↳ 달러인덱스와 USD/KRW가 함께 올라 전반적인 달러 강세 영향이 같이 반영된 흐름으로 보입니다."
    );

    expect(nasdaqIndex).toBeGreaterThan(-1);
    expect(usdKrwIndex).toBeGreaterThan(nasdaqIndex);
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
    expect(report).toContain("등록된 보유 종목이 없습니다.");
    expect(report).toContain("외국인·기관 수급과 ETF flow 데이터가 아직 연결되지 않았습니다.");
    expect(report).toContain("관련 기사 요약이 아직 없습니다.");
    expect(report).toContain("규칙 기반 시그널이 아직 없습니다.");
    expect(report).toContain("❗ 이 리포트는 정보 제공용이며");
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
      quantScenarios: ["추세 유지 시 분할 매수를 관찰하는 전략이 유효합니다."],
      riskCheckpoints: ["변동성 급등 시 비중 확대를 보류하는 편이 안전합니다."]
    });

    expect(report).toContain("📰 종목 관련 핵심 기사 요약");
    expect(report).toContain("🧠 퀀트 기반 시그널 및 매매 아이디어");
    expect(report).toContain("⚠️ 리스크 체크포인트");
    expect(report).toContain("📊 시장 브리핑");
    expect(report).toContain("🏦 매크로 브리핑");
    expect(report).toContain("💸 자금 브리핑");
    expect(report).toContain("🗓️ 주요 일정 및 이벤트 브리핑");
    expect(report).toContain("• 미국 지수와 변동성 지표를 함께 보면 위험 선호가 약해졌습니다.");
    expect(report).toContain("오늘은 변동성이 큰 항목과 보유 종목 핵심 흐름만 추려서 정리했습니다.");
    expect(report).toContain("• Apple은 시장 조정 영향으로 단기 변동성이 커졌습니다.");
    expect(report).toContain("• Apple 관련 핵심 기사는 제품 기대감 유지에 초점을 두고 있습니다.");
    expect(report).toContain("중동 이란 전쟁 이슈로 원유 공급 차질 우려가 커지며");
    expect(report).toContain("외국인·기관 수급과 ETF flow는 아직 별도 데이터 소스 연결 전입니다.");
    expect(report).toContain("예정 실적 발표 일정 데이터는 아직 연결되지 않았습니다.");
    expect(report).toContain(
      "달러인덱스와 USD/KRW가 함께 올라 전반적인 달러 강세 영향이 같이 반영된 흐름으로 보입니다."
    );
    expect(report).toContain("❗ 이 리포트는 정보 제공용이며, 투자 판단과 책임은 본인에게 있습니다.");
  });
});
