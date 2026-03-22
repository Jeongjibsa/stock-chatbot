# Stock Scoring Spec

## Purpose

이 문서는 종목별 리밸런싱 가이드에 필요한 stock-view / portfolio-fit label 기준과 optional payload contract를 정리한다.

## Source of Truth

- `packages/application/src/rebalancing-contract.ts`
- `packages/application/src/telegram-report-renderer.ts`
- `packages/application/src/report-prompt-contract.ts`

## Supported Optional Fields

`portfolioRebalancing.holdings[]`

- `name`
- `finalAction`
- `oneLineJudgment`
- `guide`
- `intrinsicValueScore`
- `priceTrendScore`
- `futureExpectationScore`
- `portfolioFitScore`
- `hardRules[]`
- `constraints[]`

## Label Mapping

stock-view:

- 80+ = 매우 양호
- 65-79 = 양호
- 50-64 = 중립
- 35-49 = 부담
- 34 이하 = 취약

portfolio-fit:

- 80+ = 높음
- 65-79 = 보통
- 50-64 = 점검 필요
- 49 이하 = 낮음

## Runtime Rule

- 값이 제공되면 renderer는 점수 자체를 재계산하지 않고 label만 매핑한다.
- 값이 없으면 `확인 필요`, `점검 필요`, `데이터 보강 필요` 같은 자연스러운 fallback을 사용한다.
- final action 방향은 절대 뒤집지 않는다.
- hard rule reason이 있으면 `제약 요인`에 우선 노출한다.
