# Stock Chatbot LLM Integration Plan

## 1. Purpose

이 문서는 텔레그램 입력과 일 배치 리포트 생성 과정에서 어떤 LLM API와 모델을 어떤 역할로 사용할지 정의하고, OpenAI 외 다른 모델 공급자도 손쉽게 교체할 수 있는 추상화 기준을 정의한다.

연동 문서:

- PRD: [docs/initial-prd.md](/Users/jisung/Projects/stock-chatbot/docs/initial-prd.md)
- 실행 계획: [docs/phase-plan.md](/Users/jisung/Projects/stock-chatbot/docs/phase-plan.md)
- 변경 이력: [docs/change-log.md](/Users/jisung/Projects/stock-chatbot/docs/change-log.md)

## 2. Current Decision

- 2026-03-20 기준 기본 LLM 공급자는 `OpenAI`이고 기본 호출 API 기준선은 `Responses API`다.
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

## 4. Provider Abstraction

- 애플리케이션 코드는 특정 공급자 SDK 타입에 직접 의존하지 않는다.
- `LlmProviderProfile`이 공급자별 모델 이름, background 지원 여부, structured output 방식을 정의한다.
- `getLlmPolicy(task, providerProfile)`가 현재 task에 맞는 실행 정책을 계산한다.
- OpenAI는 첫 기본 프로필일 뿐이고, Gemini나 다른 공급자는 새 profile만 추가하면 된다.

## 5. Model Routing Policy

| Task | API | Model | Mode | Reason |
| --- | --- | --- | --- | --- |
| 뉴스 이벤트 추출 | Responses API | `gpt-5-nano` | synchronous | 가장 싸고 빠른 분류/추출 작업 |
| 뉴스 묶음 요약 | Responses API | `gpt-5-mini` | synchronous | 짧은 요약 품질과 비용 균형 |
| 기본 리포트 조합 | Responses API | `gpt-5-mini` | synchronous or background | 메인 리포트 품질 기준선 |
| 리포트 fallback 재생성 | Responses API | `gpt-5.1` | synchronous or background | 요약 품질 저하나 실패 시 상위 fallback |
| 리스크 체크포인트 검토 | Responses API | `gpt-5-mini` | synchronous | 설명 가능성 중심 |

기본 공급자는 OpenAI지만, 다른 공급자를 쓸 때는 같은 task key를 유지하고 model 문자열만 provider profile에서 바꾼다.

## 6. Invocation Rules

### 6.1 OpenAI Responses API

- 기본 호출 API는 `responses.create`
- JSON 또는 구조화된 출력 계약을 먼저 고정하고, 자연어 렌더링은 마지막 단계에서만 수행
- 수치 데이터와 기사 메타데이터는 입력으로 직접 주입하고 모델이 숫자를 재계산하지 않게 한다

### 6.2 Non-OpenAI Providers

- Gemini나 다른 공급자를 붙일 때도 호출 인터페이스는 공통 request/response contract를 유지한다.
- 공급자별 SDK 호출 차이는 adapter layer에서만 흡수한다.
- structured output이 native가 아니면 adapter에서 schema validation을 수행한다.

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

## 8. Implementation Sequence

1. `provider-agnostic LLM client interface` 추가
2. `OpenAI adapter` 추가
3. `news-event-extraction` structured output 계약 추가
4. `news-summary` structured output 계약 추가
5. `market-report-composition` prompt 계약 추가
6. 결과 캐시, 실행 로그, prompt version 기록 연결

## 9. Open Questions

- 배치 API를 후속 비용 최적화 수단으로 도입할지
- 리포트 조합 fallback을 항상 둘지, 장애 시에만 둘지
- structured output 스키마를 어떤 패키지에 둘지
- Gemini나 다른 공급자용 첫 adapter를 언제 추가할지

## 10. Official References

- [Responses API](https://platform.openai.com/docs/api-reference/responses)
- [Background mode guide](https://platform.openai.com/docs/guides/background)
- [GPT-5 nano model](https://platform.openai.com/docs/models/gpt-5-nano)
- [GPT-5 mini model](https://platform.openai.com/docs/models/gpt-5-mini)
- [GPT-5.1 model](https://platform.openai.com/docs/models/gpt-5.1)
