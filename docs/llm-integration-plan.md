# Stock Chatbot LLM Integration Plan

## 1. Purpose

이 문서는 텔레그램 입력과 일 배치 리포트 생성 과정에서 어떤 LLM API와 모델을 어떤 역할로 사용할지 정의하고, OpenAI 외 다른 모델 공급자도 손쉽게 교체할 수 있는 추상화 기준을 정의한다.

연동 문서:

- PRD: [docs/initial-prd.md](/Users/jisung/Projects/stock-chatbot/docs/initial-prd.md)
- 실행 계획: [docs/phase-plan.md](/Users/jisung/Projects/stock-chatbot/docs/phase-plan.md)
- 변경 이력: [docs/change-log.md](/Users/jisung/Projects/stock-chatbot/docs/change-log.md)
- prompt 계약: [docs/prompt-contract.md](/Users/jisung/Projects/stock-chatbot/docs/prompt-contract.md)

## 2. Current Decision

- 2026-03-20 기준 기본 LLM 공급자는 `OpenAI`이고 기본 호출 API 기준선은 `Responses API`다.
- 2026-03-21 기준 `Gemini`용 첫 adapter가 추가됐고, worker는 `LLM_PROVIDER=openai|google`와 API key 존재 여부를 기준으로 공급자를 선택할 수 있다.
- 2026-03-29 기준 토큰 비용 절감을 위해 Gemini 연동 시 Native Structured Outputs(`responseSchema`)와 Context Caching을 적용하며, 태스크별로 모델 라우팅을 세분화한다.
- Google provider의 리포트 조합 기준 모델은 `gemini-3-flash-preview`를 유지하고, 단순 정보 추출 등은 `gemini-1.5-flash-8b` 등 경량 모델로 다운그레이드한다.
- 구현은 `provider profile + task routing policy` 구조로 유지해 Gemini 등 다른 공급자로 쉽게 교체할 수 있어야 한다.
- 텔레그램 command 입력 플로우 자체는 LLM 없이 규칙 기반으로 유지한다.
- 수치 계산과 데이터 정합성 검증은 코드가 담당하고, LLM은 요약/설명/리포트 문장 조합에만 사용한다.
- 장시간 리포트 조합은 필요 시 `background mode`를 사용한다.

코드 기준 추상화:

- [packages/application/src/llm-policy.ts](/Users/jisung/Projects/stock-chatbot/packages/application/src/llm-policy.ts)

## 3. LLM Usage Boundaries

### 3.1 No-LLM Zones

- `/portfolio_add`, `/portfolio_remove`, `/market_add`의 단계별 상태 전이
- 티커 및 시장 지표 해석 1차 시도
- 시장/뉴스 원본 수집
- 수치 계산, 등락률 계산, 규칙 기반 퀀트 시그널 계산
- 중복 실행 방지와 재시도 제어

### 3.2 LLM Zones

- 뉴스 제목/요약에서 핵심 이벤트 추출
- 같은 종목의 기사 묶음 요약
- 시장/포트폴리오/퀀트 결과를 자연어 리포트로 조합
- 리스크 체크포인트 문장화
- 텔레그램 템플릿 구조와 직접 매핑되는 섹션별 bullet 생성

## 4. Provider Abstraction

- 애플리케이션 코드는 특정 공급자 SDK 타입에 직접 의존하지 않는다.
- `LlmProviderProfile`이 공급자별 모델 이름, background 지원 여부, structured output 방식을 정의한다.
- `getLlmPolicy(task, providerProfile)`가 현재 task에 맞는 실행 정책을 계산한다.
- OpenAI는 첫 기본 프로필일 뿐이고, Gemini나 다른 공급자는 새 profile만 추가하면 된다.

## 5. Model Routing Policy

| Task | API | Model | Mode | Reason |
| --- | --- | --- | --- | --- |
| 뉴스 이벤트 추출 | Responses API / GenerateContent | `gpt-5-nano` / `gemini-1.5-flash-8b` | synchronous | 가장 싸고 빠른 분류/추출 작업 |
| 뉴스 묶음 요약 | Responses API / GenerateContent | `gpt-5-mini` / `gemini-3-flash-preview` | synchronous | 짧은 요약 품질과 비용 균형 |
| 기본 리포트 조합 | Responses API / GenerateContent | `gpt-5-mini` / `gemini-3-flash-preview` | synchronous or background | 메인 리포트 품질 기준선 |
| 리포트 fallback 재생성 | Responses API / GenerateContent | `gpt-5.1` / `gemini-3-flash-preview` | synchronous or background | 요약 품질 저하나 실패 시 상위 fallback |
| 리스크 체크포인트 검토 | Responses API / GenerateContent | `gpt-5-mini` / `gemini-3-flash-preview` | synchronous | 설명 가능성 중심 |

기본 공급자는 OpenAI지만, 다른 공급자를 쓸 때는 같은 task key를 유지하고 model 문자열만 provider profile에서 바꾼다. 특히 단순 반복/대량 호출이 일어나는 추출 태스크는 비용 절감을 위해 각 provider의 가장 경량화된 모델(`1.5-flash-8b` 등)을 우선 할당한다.

## 6. Invocation Rules

### 6.1 OpenAI Responses API

- 기본 호출 API는 `responses.create`
- JSON 또는 구조화된 출력 계약을 먼저 고정하고, 자연어 렌더링은 마지막 단계에서만 수행
- 수치 데이터와 기사 메타데이터는 입력으로 직접 주입하고 모델이 숫자를 재계산하지 않게 한다

### 6.2 Non-OpenAI Providers (Gemini)

- Gemini나 다른 공급자를 붙일 때도 호출 인터페이스는 공통 request/response contract를 유지한다.
- 공급자별 SDK 호출 차이는 adapter layer에서만 흡수한다.
- structured output이 native가 아니면 adapter에서 schema validation을 수행하지만, Gemini API의 경우 `responseSchema` 필드를 이용해 Native Structured Outputs를 구현하여 모델의 불필요한 텍스트 패딩에 의한 토큰 소모를 원천 차단한다.
- 현재 Gemini adapter는 공식 `generateContent` REST 경로를 사용하고, `system_instruction` 및 OpenAPI 스키마 객체(`responseSchema`)를 전달한다.
- 대량의 공통 시장 데이터를 포함한 fan-out 리포트 발송 시, 공용 컨텍스트 정보는 Gemini Context Caching API를 이용해 캐시하여 입력 토큰 비용을 대폭 환원한다.

### 6.3 Background Mode

아래 중 하나면 background mode를 허용한다.

- 사용자 수가 늘어 오전 9시 배치 fan-out이 커짐
- 사용자 1명당 기사/종목 수가 많아 리포트 조합 시간이 길어짐
- 네트워크 재시도와 함께 장시간 작업 추적이 필요함

초기 MVP에서는 먼저 synchronous 호출로 시작하고, 리포트 생성 시간이 길어지면 background mode를 켠다.

## 7. Prompt Contract Rules

- 추출 단계는 가능한 한 구조화된 필드만 반환
- 요약 단계는 기사/지표 출처 ID를 함께 반환
- 리포트 조합 단계는 최종 텔레그램 섹션 구조를 고정
- 모델에게 매수/매도 확정 지시를 요구하지 않고 시나리오 제안 형식으로 제한
- 현재 일 리포트 prompt의 출력 키는 `oneLineSummary`, `keyIndicatorBullets`, `marketBullets`, `macroBullets`, `fundFlowBullets`, `eventBullets`, `holdingTrendBullets`, `articleSummaryBullets`, `headlineEvents`, `strategyBullets`, `riskBullets`, `trendNewsBullets`, `newsReferences`로 고정한다.
- prompt v4는 `입력 부재 시 빈 배열 강제` 규칙을 추가해 `fundFlowBullets`, `holdingTrendBullets`, `articleSummaryBullets`, `eventBullets`에서 근거 없는 추론을 금지한다.
- prompt v5는 같은 structured output을 유지하되 `telegram_personalized`와 `public_web` audience를 분리한다.
- 현재 prompt 입력은 audience 외에 `briefingSession=pre_market|post_market`도 함께 받아, 같은 채널 안에서도 `판단 프레임 제공 / 해석 검증+기준 보정` 역할을 분리한다.
- Telegram personalized prompt는 `제약/하드룰 -> 최종 action -> 점수/시장 레짐 -> 기타 사실` 우선순위와 개인화 리밸런싱 해석을 강화한다.
- Public web prompt는 개인 포트폴리오 언어를 금지하고, 공개 시장 해석과 공용 리스크 설명에만 집중한다.
- Public web prompt는 `headlineEvents`에서 실제 RSS headline과 브리핑용 요약 제안을 함께 생성하고, `eventBullets`는 세션별 체크포인트/일정으로 사용한다.
- Public web prompt는 `keyIndicatorBullets`를 통해 feed/detail 카드의 `핵심 시그널`을 직접 생성하고, composition 실패 시에만 rule-based fallback이 이를 대신한다.
- 리포트 조합 결과는 renderer가 그대로 섹션에 주입할 수 있어야 하며, 숫자 재계산 대신 해석 문장만 생성해야 한다.
- 정보가 부족한 섹션은 빈 배열로 반환하도록 강제한다.

## 8. Implementation Sequence

1. `provider-agnostic LLM client interface` 추가
2. `OpenAI adapter` 추가
3. `news-event-extraction` structured output 계약 추가
4. `news-summary` structured output 계약 추가
5. `market-report-composition` prompt 계약 추가
6. 결과 캐시, 실행 로그, prompt version 기록 연결

현재 상태:

- `market-report-composition` prompt v5가 채널별 audience 분리와 세션별 역할 분기를 포함한 structured output 계약으로 구현됐고, 부재 데이터 추론을 더 강하게 억제한다. 2026-03-29 기준 public path는 `headlineEvents`에 더해 `keyIndicatorBullets`를 사용해 실제 공개 `핵심 시그널`도 LLM composition 결과를 우선 노출한다.
- `DailyReportCompositionService`가 실제 daily report worker 경로에 연결됐다.
- public briefing build는 같은 service를 쓰되 `public_web` audience로 호출해 개인 행동 언어를 금지하고, `post_market`에서는 같은 날짜의 오전 공개 브리핑/전략 스냅샷이 있으면 검증 관점 비교 입력을 함께 제공한다.
- fixed scheduled Telegram delivery는 공개 브리핑 row가 먼저 적재된 세션에서는 persisted public `summary/signals`와 개인화 snapshot만 재사용하고, 공통 시장 해석용 추가 LLM 조합을 다시 호출하지 않는다.
- `OPENAI_API_KEY`가 없거나 composition 단계가 실패하면 기존 규칙 기반 renderer fallback으로 계속 생성한다.
- scheduled public briefing의 `public_web` composition은 cron critical path 보호를 위해 hard timeout을 사용하고, timeout 또는 provider 지연 시에도 규칙 기반 fallback으로 즉시 완료해야 한다.
- `GEMINI_API_KEY`와 `LLM_PROVIDER=google`를 설정하면 같은 worker 경로에서 Gemini 모델을 바로 사용할 수 있다.

## 9. Open Questions

- 배치 API를 후속 비용 최적화 수단으로 도입할지
- 리포트 조합 fallback을 항상 둘지, 장애 시에만 둘지
- structured output 스키마를 어떤 패키지에 둘지
- Gemini adapter에 generationConfig나 safety 설정을 얼마나 노출할지

## 10. Official References

- [Responses API](https://platform.openai.com/docs/api-reference/responses)
- [Background mode guide](https://platform.openai.com/docs/guides/background)
- [GPT-5 nano model](https://platform.openai.com/docs/models/gpt-5-nano)
- [GPT-5 mini model](https://platform.openai.com/docs/models/gpt-5-mini)
- [GPT-5.1 model](https://platform.openai.com/docs/models/gpt-5.1)
- [Gemini API text generation](https://ai.google.dev/gemini-api/docs/text-generation)
- [Gemini API libraries](https://ai.google.dev/gemini-api/docs/sdks)
- [Gemini API release notes](https://ai.google.dev/gemini-api/docs/changelog)
