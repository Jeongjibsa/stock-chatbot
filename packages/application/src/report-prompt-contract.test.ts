import { describe, expect, it } from "vitest";

import {
  buildDailyReportPromptContract,
  parseDailyReportStructuredOutput
} from "./report-prompt-contract.js";

describe("report prompt contract", () => {
  it("builds a telegram personalized JSON-only prompt contract", () => {
    const prompt = buildDailyReportPromptContract({
      audience: "telegram_personalized",
      holdings: [
        {
          companyName: "Apple Inc.",
          exchange: "US",
          symbol: "AAPL"
        }
      ],
      marketResults: [],
      newsBriefs: [],
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
      quantScenarios: ["분할 매수 관찰"],
      riskCheckpoints: ["손절 기준 재점검"],
      runDate: "2026-03-20"
    });

    expect(prompt.instructions).toContain(
      "텔레그램 DM용 개인화 포트폴리오 리밸런싱 브리핑 작성기"
    );
    expect(prompt.instructions).toContain(
      "설명 우선순위는 `제약/하드룰 -> 최종 action 또는 actionSummary -> 점수/시장 레짐 -> 기타 사실`"
    );
    expect(prompt.instructions).toContain(
      "입력에 실제 자금 데이터가 없으면 fundFlowBullets는 반드시 빈 배열"
    );
    expect(prompt.instructions).toContain(
      "입력에 종목별 가격/추세 사실이 없으면 holdingTrendBullets는 반드시 빈 배열로 반환하고 업종 일반론으로 종목 동향을 추정하지 않는다."
    );
    expect(prompt.metadata).toEqual({
      promptAudience: "telegram_personalized",
      promptKind: "telegram-personalized-report-composition",
      runDate: "2026-03-20"
    });
    expect(JSON.parse(prompt.input)).toEqual(
      expect.objectContaining({
        audience: "telegram_personalized",
        dataAvailability: expect.objectContaining({
          eventInputAvailable: false,
          fundFlowInputAvailable: false,
          holdingPriceInputAvailable: false,
          marketAsOfDates: []
        }),
        holdings: [
          expect.objectContaining({
            symbol: "AAPL"
          })
        ],
        quantScorecards: [
          expect.objectContaining({
            action: "REDUCE",
            symbol: "AAPL"
          })
        ],
        quantScenarios: ["분할 매수 관찰"]
      })
    );
  });

  it("builds a public web prompt contract with personal-action guardrails", () => {
    const prompt = buildDailyReportPromptContract({
      audience: "public_web",
      holdings: [],
      marketResults: [],
      newsBriefs: [],
      quantScorecards: [],
      quantScenarios: [],
      riskCheckpoints: [],
      runDate: "2026-03-22"
    });

    expect(prompt.instructions).toContain("공개 웹용 한국어 시장 브리핑 작성기");
    expect(prompt.instructions).toContain(
      "비중 확대, 축소 우선, 교체 검토, 매수 기회, 지금 사야 한다 같은 개인 행동 언어를 쓰지 않는다."
    );
    expect(prompt.instructions).toContain(
      "holdingTrendBullets, articleSummaryBullets, strategyBullets는 공개 웹에서는 사용하지 않으므로 반드시 빈 배열로 반환한다."
    );
    expect(prompt.metadata).toEqual({
      promptAudience: "public_web",
      promptKind: "public-market-briefing-composition",
      runDate: "2026-03-22"
    });
    expect(JSON.parse(prompt.input)).toEqual(
      expect.objectContaining({
        audience: "public_web",
        holdings: []
      })
    );
  });

  it("parses valid structured report output", () => {
    const parsed = parseDailyReportStructuredOutput(
      JSON.stringify({
        oneLineSummary: "시장 지표와 보유 종목 기준으로 핵심 흐름을 정리했습니다.",
        marketBullets: ["미국 지수와 변동성 지표를 함께 보면 위험 선호가 약해졌습니다."],
        macroBullets: ["달러와 환율이 함께 올라 외환 압력이 이어지고 있습니다."],
        fundFlowBullets: ["한국 수급과 ETF flow 데이터는 아직 입력되지 않았습니다."],
        eventBullets: ["중동 리스크와 AI 반도체 이슈가 동시에 시장 변동성을 키우고 있습니다."],
        holdingTrendBullets: ["Apple은 시장 조정 영향으로 단기 변동성이 커졌습니다."],
        articleSummaryBullets: ["Apple 관련 핵심 기사는 아직 제품 기대감이 유지된다는 점에 초점을 두고 있습니다."],
        strategyBullets: ["추세 유지 시 분할 매수를 관찰하는 전략이 유효합니다."],
        riskBullets: ["변동성 급등 시 비중 확대를 보류하는 편이 안전합니다."]
      })
    );

    expect(parsed).toEqual({
      oneLineSummary: "시장 지표와 보유 종목 기준으로 핵심 흐름을 정리했습니다.",
      marketBullets: ["미국 지수와 변동성 지표를 함께 보면 위험 선호가 약해졌습니다."],
      macroBullets: ["달러와 환율이 함께 올라 외환 압력이 이어지고 있습니다."],
      fundFlowBullets: ["한국 수급과 ETF flow 데이터는 아직 입력되지 않았습니다."],
      eventBullets: ["중동 리스크와 AI 반도체 이슈가 동시에 시장 변동성을 키우고 있습니다."],
      holdingTrendBullets: ["Apple은 시장 조정 영향으로 단기 변동성이 커졌습니다."],
      articleSummaryBullets: ["Apple 관련 핵심 기사는 아직 제품 기대감이 유지된다는 점에 초점을 두고 있습니다."],
      strategyBullets: ["추세 유지 시 분할 매수를 관찰하는 전략이 유효합니다."],
      riskBullets: ["변동성 급등 시 비중 확대를 보류하는 편이 안전합니다."]
    });
  });

  it("throws on invalid report output", () => {
    expect(() =>
      parseDailyReportStructuredOutput(
        JSON.stringify({
          oneLineSummary: "x",
          marketBullets: [],
          macroBullets: [],
          fundFlowBullets: [],
          eventBullets: [],
          holdingTrendBullets: [],
          articleSummaryBullets: "bad",
          strategyBullets: [],
          riskBullets: []
        })
      )
    ).toThrow("Daily report structured output is invalid");
  });
});
