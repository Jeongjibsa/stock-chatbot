# Prompt Contract

## 1. Purpose

이 문서는 일 브리핑 LLM prompt 계약의 현재 기준선을 정리한다.

연동 문서:

- [docs/initial-prd.md](/Users/jisung/Projects/stock-chatbot/docs/initial-prd.md)
- [docs/llm-integration-plan.md](/Users/jisung/Projects/stock-chatbot/docs/llm-integration-plan.md)
- [docs/change-log.md](/Users/jisung/Projects/stock-chatbot/docs/change-log.md)

## 2. Shared Rules

- LLM은 계산 엔진이 아니다.
- 이미 계산된 점수, 액션, 리스크, 팩트만 해석한다.
- 입력에 없는 뉴스, 수치, 일정, 기업 특성, 가격 패턴, 추가 로직을 만들지 않는다.
- hard rule 또는 제약 문구가 있으면 가장 먼저 설명한다.
- 강한 점수나 모멘텀이 blocking hard rule을 뒤집으면 안 된다.
- `marketResults.asOfDate`가 서로 다르면 같은 시점의 동시 움직임처럼 과장하지 않는다.
- 출력은 renderer가 바로 소비할 수 있는 structured output JSON만 반환한다.

현재 structured output 최상위 키:

- `oneLineSummary`
- `marketBullets`
- `macroBullets`
- `fundFlowBullets`
- `eventBullets`
- `holdingTrendBullets`
- `articleSummaryBullets`
- `strategyBullets`
- `riskBullets`

## 3. Telegram Personalized Contract

대상:

- Telegram DM 개인화 브리핑
- 질문: `오늘 이 사용자의 포트폴리오에서 무엇을 해야 하는가`

핵심 규칙:

- 일반 시장 요약보다 포트폴리오 해석을 우선한다.
- 설명 우선순위는 `제약/하드룰 -> 최종 action 또는 actionSummary -> 점수/시장 레짐 -> 기타 사실`이다.
- 과비중, 집중도, 상관관계, 이벤트 임박, 방어적 시장 레짐이 있으면 먼저 제약을 설명한다.
- `quantScorecards.action`, `actionSummary`, `quantScenarios`, `riskCheckpoints`를 upstream 최종 판단으로 존중한다.
- hard rule이나 최종 action 방향을 뒤집지 않는다.
- 시장 과열, 블랙스완, 극단적 고평가가 함께 보이면 보수적·중립적 확대 톤을 자동으로 약화한다.

structured output 매핑:

- `oneLineSummary`: 오늘 한 줄 결론
- `strategyBullets`: 오늘의 리밸런싱 제안
- `holdingTrendBullets`: 종목별 한줄 판단/가이드
- `articleSummaryBullets`: 종목 관련 기사·이벤트 요약
- `riskBullets`: 오늘의 포트 리스크 체크

## 4. Public Web Contract

대상:

- 공개 웹 시장 브리핑
- 질문: `오늘 시장에서 무엇이 중요하고, 어떻게 읽어야 하는가`

핵심 규칙:

- 개인 포트폴리오 리밸런싱 문구를 포함하지 않는다.
- 개인 보유 종목, 목표 비중, 포트 적합성, 사용자 맞춤 hard rule을 전제로 쓰지 않는다.
- `비중 확대`, `축소 우선`, `교체 검토`, `매수 기회`, `지금 사야 한다` 같은 개인 행동 언어를 쓰지 않는다.
- 표면 모멘텀이 유지돼도 밸류 부담과 구조 리스크가 높으면 균형 잡힌 경고 톤을 유지한다.
- 공개 웹에서는 개인 섹션을 쓰지 않으므로 `holdingTrendBullets`, `articleSummaryBullets`, `strategyBullets`는 빈 배열로 강제한다.

structured output 매핑:

- `oneLineSummary`: 오늘 한 줄 요약
- `marketBullets`: 시장 종합 해석
- `macroBullets`: 글로벌/국내 시장 스냅샷, 거시 관점
- `fundFlowBullets`: 자금 흐름, breadth, rotation, leadership, sector/style 흐름
- `eventBullets`: 핵심 뉴스/이벤트/일정
- `riskBullets`: 오늘의 리스크 포인트

## 5. Implementation Note

현재 구현은 최종 사용자용 markdown 전체를 LLM이 직접 생성하지 않는다.

- LLM은 채널별 규칙을 반영한 structured output만 반환한다.
- Telegram과 web renderer가 각 채널의 최종 포맷으로 조립한다.
- 따라서 prompt 템플릿은 채널별 의미를 강화하되, JSON 계약은 유지한다.
