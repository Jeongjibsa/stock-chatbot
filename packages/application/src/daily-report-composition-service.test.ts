import { describe, expect, it, vi } from "vitest";

import {
  DailyReportCompositionService,
  diversifyPublicKeyIndicatorBullets,
  repairPublicHeadlineEvents,
  repairPublicSummaryLine
} from "./daily-report-composition-service.js";

describe("DailyReportCompositionService", () => {
  it("builds a structured composition request and parses the response", async () => {
    const generate = vi.fn(async () => ({
      id: "resp_report_1",
      executionMode: "synchronous" as const,
      model: "gpt-5-mini",
      outputText: JSON.stringify({
        oneLineSummary: "시장 지표와 보유 종목 기준으로 핵심 흐름을 정리했습니다.",
        marketBullets: ["미국 지수와 변동성 지표를 함께 보면 위험 선호가 약해졌습니다."],
        macroBullets: ["달러와 환율이 함께 올라 외환 압력이 이어지고 있습니다."],
        fundFlowBullets: ["한국 수급과 ETF flow 데이터는 아직 입력되지 않았습니다."],
        eventBullets: ["중동 리스크와 AI 반도체 이슈가 동시에 시장 변동성을 키우고 있습니다."],
        holdingTrendBullets: ["Apple은 시장 조정 영향으로 단기 변동성이 커졌습니다."],
        articleSummaryBullets: ["Apple 관련 핵심 기사는 제품 기대감 유지에 초점을 두고 있습니다."],
        keyIndicatorBullets: ["달러 강세와 환율 부담을 먼저 점검하셔야 합니다."],
        headlineEvents: [],
        strategyBullets: ["추세 유지 시 분할 매수를 관찰하는 전략이 유효합니다."],
        riskBullets: ["변동성 급등 시 비중 확대를 보류하는 편이 안전합니다."],
        trendNewsBullets: ["달러 강세와 금리 뉴스가 겹쳐 시장 전반 부담이 커졌습니다."],
        newsReferences: [
          {
            sourceLabel: "Reuters",
            title: "Dollar strength persists",
            url: "https://example.com/reuters-dollar"
          }
        ]
      }),
      provider: "openai" as const,
      status: "completed" as const
    }));
    const service = new DailyReportCompositionService({
      llmClient: {
        generate
      }
    });

    const result = await service.compose({
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
      quantScenarios: [],
      riskCheckpoints: [],
      runDate: "2026-03-21",
      timeoutMs: 8000
    });

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          promptAudience: "telegram_personalized",
          promptKind: "telegram-personalized-report-composition"
        }),
        task: "market-report-composition",
        timeoutMs: 8000
      })
    );
    expect(result).toEqual({
      oneLineSummary: "시장 지표와 보유 종목 기준으로 핵심 흐름을 정리했습니다.",
      marketBullets: ["미국 지수와 변동성 지표를 함께 보면 위험 선호가 약해졌습니다."],
      macroBullets: ["달러와 환율이 함께 올라 외환 압력이 이어지고 있습니다."],
      fundFlowBullets: ["한국 수급과 ETF flow 데이터는 아직 입력되지 않았습니다."],
      eventBullets: ["중동 리스크와 AI 반도체 이슈가 동시에 시장 변동성을 키우고 있습니다."],
      holdingTrendBullets: ["Apple은 시장 조정 영향으로 단기 변동성이 커졌습니다."],
      articleSummaryBullets: ["Apple 관련 핵심 기사는 제품 기대감 유지에 초점을 두고 있습니다."],
      keyIndicatorBullets: ["달러 강세와 환율 부담을 먼저 점검하셔야 합니다."],
      headlineEvents: [],
      strategyBullets: ["추세 유지 시 분할 매수를 관찰하는 전략이 유효합니다."],
      riskBullets: ["변동성 급등 시 비중 확대를 보류하는 편이 안전합니다."],
      trendNewsBullets: ["달러 강세와 금리 뉴스가 겹쳐 시장 전반 부담이 커졌습니다."],
      newsReferences: [
        {
          sourceLabel: "Reuters",
          title: "Dollar strength persists",
          url: "https://example.com/reuters-dollar"
        }
      ],
      llmResponseId: "resp_report_1"
    });
  });

  it("repairs empty public keyIndicatorBullets from other public composition bullets", async () => {
    const generate = vi.fn(async () => ({
      executionMode: "synchronous" as const,
      model: "gpt-5-mini",
      outputText: JSON.stringify({
        oneLineSummary: "달러 강세와 금리 부담을 함께 봐야 하는 날입니다.",
        marketBullets: [
          "이번 오전 브리핑은 미국장 마감 결과를 바탕으로 오늘 국내장 시초가와 장 초반 수급 방향을 가늠하는 데 목적이 있습니다.",
          "미국 증시 반등이 이어져 국내 개장 초반 위험 선호 회복 여부를 볼 필요가 있습니다."
        ],
        macroBullets: ["달러 강세와 환율 부담이 이어져 외환 압력을 같이 보셔야 합니다."],
        fundFlowBullets: [],
        eventBullets: ["오늘 대응 기준은 환율과 선물 방향이 같은 쪽인지 먼저 보는 것입니다."],
        holdingTrendBullets: [],
        articleSummaryBullets: [],
        keyIndicatorBullets: [],
        headlineEvents: [],
        strategyBullets: [],
        riskBullets: ["미국 장기금리 부담이 남아 있어 성장주 밸류 부담을 같이 보셔야 합니다."],
        trendNewsBullets: ["달러 강세 뉴스가 반복돼 위험 자산 선호는 다소 눌릴 수 있습니다."],
        newsReferences: []
      }),
      provider: "openai" as const,
      status: "completed" as const
    }));
    const service = new DailyReportCompositionService({
      llmClient: { generate }
    });

    const result = await service.compose({
      audience: "public_web",
      briefingSession: "pre_market",
      holdings: [],
      marketResults: [],
      newsBriefs: [],
      quantScorecards: [],
      quantScenarios: [],
      riskCheckpoints: [],
      runDate: "2026-03-29"
    });

    expect(result.keyIndicatorBullets).toEqual([
      "미국 증시 반등이 이어져 국내 개장 초반 위험 선호 회복 여부를 볼 필요가 있습니다.",
      "달러 강세와 환율 부담이 이어져 외환 압력을 같이 보셔야 합니다.",
      "미국 장기금리 부담이 남아 있어 성장주 밸류 부담을 같이 보셔야 합니다.",
      "오늘 대응 기준은 환율과 선물 방향이 같은 쪽인지 먼저 보는 것입니다."
    ]);
  });

  it("rewrites public headline event summaries into title-aligned Korean lines", () => {
    const result = repairPublicHeadlineEvents({
      briefingSession: "pre_market",
      headlineEvents: [
        {
          sourceLabel: "MarketWatch",
          headline:
            "Nike’s stock is at 9-year lows ahead of earnings. It faces these questions as doubt grows over its turnaround.",
          summary:
            "공개 시장 해석 기준으로 The sportswear giant has been trying to focus more on the needs of athletes."
        },
        {
          sourceLabel: "Yahoo Finance",
          headline:
            "Trump 'pays attention to the stock market': Wall Street eyes signs of TACO amid Iran war",
          summary: "Some English summary from upstream."
        }
      ],
      macroTrendBriefs: [
        {
          theme: "market_theme",
          summary: "공개 시장 해석 기준으로 시장 전반 테마 뉴스가 반복돼 지수 심리와 업종 확산 여부를 함께 점검해야 합니다.",
          sentiment: "neutral",
          confidence: "medium",
          publishedAt: "2026-03-29T00:00:00.000Z",
          sourceIds: ["marketwatch-topstories"],
          headlines: [
            "Nike’s stock is at 9-year lows ahead of earnings. It faces these questions as doubt grows over its turnaround."
          ],
          references: [
            {
              sourceLabel: "MarketWatch",
              title:
                "Nike’s stock is at 9-year lows ahead of earnings. It faces these questions as doubt grows over its turnaround.",
              url: "https://example.com/nike"
            }
          ]
        },
        {
          theme: "global_risk",
          summary: "공개 시장 해석 기준으로 공급망과 지정학 리스크가 시장 전반 테마에 영향을 주고 있어 방어적 해석 비중을 높일 필요가 있습니다.",
          sentiment: "negative",
          confidence: "medium",
          publishedAt: "2026-03-29T00:00:00.000Z",
          sourceIds: ["yahoo-finance-news"],
          headlines: [
            "Trump 'pays attention to the stock market': Wall Street eyes signs of TACO amid Iran war"
          ],
          references: [
            {
              sourceLabel: "Yahoo Finance",
              title:
                "Trump 'pays attention to the stock market': Wall Street eyes signs of TACO amid Iran war",
              url: "https://example.com/taco"
            }
          ]
        }
      ]
    });

    expect(result).toEqual([
      {
        sourceLabel: "MarketWatch",
        headline:
          "Nike’s stock is at 9-year lows ahead of earnings. It faces these questions as doubt grows over its turnaround.",
        summary:
          "개별 대형주와 업종 뉴스가 지수 기여도와 섹터 심리를 얼마나 흔드는지 함께 보셔야 합니다."
      },
      {
        sourceLabel: "Yahoo Finance",
        headline:
          "Trump 'pays attention to the stock market': Wall Street eyes signs of TACO amid Iran war",
        summary:
          "관세와 지정학 변수는 경기민감주와 수출주 심리를 동시에 흔들 수 있어 방어적 해석이 필요합니다."
      }
    ]);
  });

  it("diversifies repeated public signals with macro theme candidates", () => {
    const result = diversifyPublicKeyIndicatorBullets({
      briefingSession: "post_market",
      priorSignals: [
        "VIX 급등으로 변동성 경계가 강화됐습니다.",
        "에너지 가격 약세가 이어져 인플레이션 기대와 경기 민감주 해석을 함께 조정하셔야 합니다.",
        "미국 장기금리 부담이 남아 있어 밸류에이션이 높은 성장주는 금리 민감도를 같이 봐야 합니다."
      ],
      signals: [
        "VIX 급등으로 변동성 경계가 강화됐습니다.",
        "에너지 가격 약세가 이어져 인플레이션 기대와 경기 민감주 해석을 함께 조정하셔야 합니다.",
        "미국 장기금리 부담이 남아 있어 밸류에이션이 높은 성장주는 금리 민감도를 같이 봐야 합니다."
      ],
      macroTrendBriefs: [
        {
          theme: "global_risk",
          summary: "공개 시장 해석 기준으로 공급망과 지정학 리스크가 시장 전반 테마에 영향을 주고 있어 방어적 해석 비중을 높일 필요가 있습니다.",
          sentiment: "negative",
          confidence: "medium",
          publishedAt: "2026-03-29T00:00:00.000Z",
          sourceIds: ["yahoo-finance-news"],
          headlines: [],
          references: []
        }
      ]
    });

    expect(result).toContain(
      "관세와 지정학 뉴스가 반복돼 경기민감주 심리보다 방어 업종 반응을 먼저 보셔야 합니다."
    );
  });

  it("rewrites duplicated generic public summaries from signals and theme context", () => {
    const result = repairPublicSummaryLine({
      briefingSession: "pre_market",
      currentSummary:
        "달러 강세와 환율 부담이 이어지고 있어, 비중 확대보다 관망과 리스크 관리에 집중하시는 편이 좋습니다.",
      priorSummary:
        "달러 강세와 환율 부담이 이어지고 있어, 비중 확대보다 관망과 리스크 관리에 집중하시는 편이 좋습니다.",
      keyIndicatorBullets: [
        "달러 강세와 원화 약세가 함께 나타나 환율 부담을 먼저 점검하셔야 합니다.",
        "장 시작 전에는 미국장 마감 흐름이 국내 시초가에 그대로 이어지는지 먼저 확인하셔야 합니다."
      ],
      macroTrendBriefs: [
        {
          theme: "fx_rates",
          summary: "공개 시장 해석 기준으로 달러, 환율, 채권금리 흐름이 변동성 방향을 좌우하고 있어 외환과 금리 민감도를 같이 봐야 합니다.",
          sentiment: "negative",
          confidence: "medium",
          publishedAt: "2026-03-29T00:00:00.000Z",
          sourceIds: ["reuters"],
          headlines: [],
          references: []
        }
      ]
    });

    expect(result).toBe(
      "달러 강세와 원화 약세가 함께 나타나 환율 부담을 먼저 점검하셔야 합니다. 환율과 채권금리 뉴스가 자산 가격 해석의 중심에 있습니다. 국장 시초가와 초반 수급 반응을 함께 확인하셔야 합니다."
    );
  });

  it("rotates repeated public summaries toward non-overlapping prior signals", () => {
    const result = repairPublicSummaryLine({
      briefingSession: "pre_market",
      currentSummary:
        "에너지 가격 약세가 이어져 인플레이션 기대와 경기 민감주 해석을 함께 조정하셔야 합니다. 국장 시초가와 초반 수급 반응을 함께 확인하셔야 합니다.",
      priorSummary:
        "에너지 가격 약세가 이어져 인플레이션 기대와 경기 민감주 해석을 함께 조정하셔야 합니다. 국장 시초가와 초반 수급 반응을 함께 확인하셔야 합니다.",
      priorSignals: [
        "에너지 가격 약세가 이어져 인플레이션 기대와 경기 민감주 해석을 함께 조정하셔야 합니다.",
        "미국 증시 반등 흐름이 이어져 국내 개장 초반 위험 선호 회복 여부를 볼 필요가 있습니다."
      ],
      keyIndicatorBullets: [
        "에너지 가격 약세가 이어져 인플레이션 기대와 경기 민감주 해석을 함께 조정하셔야 합니다.",
        "VIX 안정 구간이 이어져 공포 심리는 다소 완화됐습니다.",
        "장 시작 전에는 미국장 마감 흐름이 국내 시초가에 그대로 이어지는지 먼저 확인하셔야 합니다."
      ],
      macroTrendBriefs: []
    });

    expect(result).toBe(
      "VIX 안정 구간이 이어져 공포 심리는 다소 완화됐습니다. 국장 시초가와 초반 수급 반응을 함께 확인하셔야 합니다."
    );
  });
});
