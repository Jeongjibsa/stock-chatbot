# Market Overlay Spec

## Purpose

이 문서는 개인화 리밸런싱 브리핑과 공개 시장 브리핑에서 공통으로 참조하는 market overlay 해석 기준의 현재 코드 기준선을 정리한다.

## Source of Truth

- runtime prompt input: `packages/application/src/report-prompt-contract.ts`
- Telegram renderer: `packages/application/src/telegram-report-renderer.ts`
- public web builder: `packages/application/src/public-daily-briefing.ts`
- optional payload contract: `packages/application/src/rebalancing-contract.ts`

## Current Contract

`portfolioRebalancing.marketOverlay`는 아래 성격의 값을 optional로 받는다.

- `market`
- `marketCompositeLabel`
- `sentimentLabel`
- `marketStrengthLabel`
- `marketFundamentalLabel`
- `blackSwanLabel`
- `buffettByMarketLabel`
- `finalMarketRegimeScoreConservative`
- `finalMarketRegimeScoreBalanced`
- `finalMarketRegimeScoreAggressive`

## Interpretation Order

Telegram 개인화 해석 기준:

1. hard rule / constraint
2. final action
3. selected profile score / final market regime
4. stock-view summary
5. other facts

시장 해석 기준:

1. 시장 종합
2. 심리/강도
3. 밸류/펀더멘털
4. 구조 리스크

## Renderer Rule

- overlay 값이 있으면 Telegram renderer는 `시장 레짐 요약`과 `성향별 해석`에 우선 반영한다.
- `marketFundamentalLabel=과열`, `blackSwanLabel=과열`, `buffettByMarketLabel=매우 고평가` 조합이면 보수적/중립적 확대 톤을 약화한다.
- overlay 값이 없으면 현재 확보된 시장 bullet과 risk bullet을 이용해 자연스러운 fallback 문장을 만든다.

## Public Boundary

- 공개 웹은 overlay를 쓰더라도 개인 action language로 해석하지 않는다.
- public renderer에는 `비중 확대`, `축소 우선`, `포트 적합성` 같은 개인화 필드가 노출되면 안 된다.
