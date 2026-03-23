# Implementation Reference

이 문서는 `README`에서 분리한 구현 참고 메모입니다.
제품 요구사항과 현재 기준선은 항상 `docs/initial-prd.md`, `docs/phase-plan.md`, `docs/change-log.md`를 우선합니다.

## 1. Technical Stack

### Core / Application

- `Node.js 24`
- `TypeScript 5.9`
- `pnpm workspace`

선택 이유:

- `web`, `telegram-bot`, `worker`, shared packages를 한 저장소에서 일관되게 운영하기 쉽습니다.
- 채널별 런타임과 공통 애플리케이션 계층을 분리하기 좋습니다.

### Data

- `FRED`
- `Yahoo Finance scraping`
- 확장 후보: `ECOS`, 수급/실적 캘린더

선택 이유:

- 초기 비용을 낮추면서 미국/매크로 지표와 주요 지수를 빠르게 커버할 수 있습니다.
- 로컬 검증과 production 경로를 같은 데이터 계약 위에서 유지하기 쉽습니다.

### LLM

- `OpenAI`
- `Google Gemini`
- provider-agnostic client interface

선택 이유:

- 모델 교체와 fallback 전략을 최소 코드 변경으로 유지할 수 있습니다.
- 개인화 브리핑과 공개 브리핑을 같은 composition 경계에서 다룰 수 있습니다.

### Telegram / Delivery

- `Telegram Bot API`
- `grammY`

선택 이유:

- 명령 기반 UX와 DM delivery 분리가 명확합니다.
- webhook runtime과 local polling fallback을 같은 command assembly로 재사용할 수 있습니다.

### Web / Public Archive

- `Next.js App Router`
- `Tailwind CSS`
- `Pretendard`
- `React Markdown`

선택 이유:

- 공개 브리핑 feed/detail과 `/admin`을 단일 런타임에서 운영하기 좋습니다.
- Vercel 배포와 Telegram webhook route, cron route를 같은 앱에서 관리할 수 있습니다.

### Infra / Ops

- `Vercel`
- `Neon`
- `Docker Compose`
- `PostgreSQL`
- `Redis`
- `GitHub Actions`

선택 이유:

- local 검증은 Docker, production은 Vercel + Neon으로 단순하게 분리할 수 있습니다.
- CI, backup, reconcile, manual rerun을 GitHub Actions로 운영하기 좋습니다.

## 2. Implementation Principles

- 코어 로직은 채널 독립적으로 유지하고 Telegram-specific delivery는 adapter 경계 안에 둡니다.
- LLM은 계산을 대신하지 않고, 이미 계산된 입력을 문장화하는 마지막 레이어로만 사용합니다.
- public/private boundary를 엄격히 나눕니다. 공개 웹에는 개인 포트폴리오, 개인 기사 요약, 개인 점수카드를 노출하지 않습니다.
- production Telegram runtime의 기본값은 polling이 아니라 webhook입니다.
- `/report`, `/register`, `/portfolio_add`, `/portfolio_list`, `/market_add` 흐름은 깨지면 안 됩니다.
- 큰 리팩토링보다 작은 diff를 선호하고, 기존 구조를 우선 재사용합니다.
- 문서와 구현 기준선은 함께 움직여야 합니다. 범위/동작/운영 기준이 바뀌면 문서도 같은 change set에서 갱신합니다.

## 3. Delivery Principles

| Channel | Principle |
| --- | --- |
| Telegram DM | 개인화 입력과 개인화 리포트 delivery 전용 |
| Telegram Group | 온보딩과 `/register` 유도 전용 |
| Telegram Channel | 공용 브리핑 broadcast 전용 |
| Public Web | market-only archive, no personal portfolio data |
| `/admin` | 운영 확인용 read-only console |

추가 규칙:

- Telegram DM의 온디맨드 `/report`는 빠른 응답을 위해 fast rule-based 경로를 기본값으로 사용합니다.
- LLM이 실패해도 공개 브리핑은 rule-based fallback으로 계속 생성돼야 합니다.
- Telegram `/report`와 scheduled daily delivery는 둘 다 유지돼야 합니다.

## 4. Quant / Briefing Design Notes

현재 점수카드는 설명 가능한 규칙 기반 구조를 전제로 합니다.

- `Macro`: 금리, 환율, 달러 강세, 레짐
- `Trend`: 가격 추세, 이동평균, 모멘텀
- `Event`: 뉴스/이벤트 방향성
- `Flow`: 자금 흐름 또는 대용 지표
- `Total`: 종합 점수

예시:

```text
Macro: -0.60 / Trend: -0.40 / Event: +0.20 / Flow: -0.30
-> Total: -0.42
-> fixed BUY/SELL 대신 시나리오 제안
```

브리핑 설계 원칙:

- 숫자 데이터는 계산 결과를 직접 주입합니다.
- 전략은 확정적 매매 지시가 아니라 시나리오 제안으로 표현합니다.
- 개인화 브리핑과 공개 브리핑은 같은 입력 계층을 공유하되 출력 규칙은 분리합니다.

## 5. Harness Principles

- 하네스는 snapshot 비교만으로 끝나지 않습니다.
- suite 기준선은 `harness/suite-contracts.json`에 둡니다.
- active suite는 fixture, grader, snapshot 요구사항을 모두 만족해야 합니다.
- 하네스 변경 시 `docs/harness-engineering.md`를 먼저 확인합니다.

## 6. Operational Considerations

### Cost

- LLM 호출은 가장 비싼 단계입니다.
- 공개 브리핑과 개인화 브리핑을 분리해 호출 수를 줄이는 구조가 유리합니다.
- 개발/테스트는 local Docker, production은 Neon을 사용해 비용과 안정성을 분리합니다.

### Data Quality

- FRED와 Yahoo Finance의 기준 시점이 다를 수 있습니다.
- 일부 지표는 `asOfDate`가 다르므로 같은 시점 데이터처럼 과장하면 안 됩니다.
- 기사 품질이 낮거나 데이터가 누락돼도 전체 브리핑은 계속 생성되도록 설계해야 합니다.

### Failure Handling

- Telegram delivery 실패와 report generation 실패를 분리 기록합니다.
- `/report` 실행 중 예외가 나면 `report_runs`는 `failed`로 정리돼야 합니다.
- Vercel/GitHub Actions schedule은 지연될 수 있으므로 idempotency가 필요합니다.

### Privacy

- 공개 웹에는 개인화 포트폴리오 데이터가 포함되지 않습니다.
- 보유 종목, 개인 기사 요약, 개인 점수카드는 Telegram DM 전용입니다.

## 7. Deployment Notes

- local dev/test DB는 Docker PostgreSQL을 사용합니다.
- production DB target은 Neon입니다.
- Vercel은 public web, Telegram webhook, primary cron entrypoint를 담당합니다.
- `PUBLIC_BRIEFING_BASE_URL`은 실제 공개 웹 URL을 가리켜야 합니다.
- production Telegram runtime은 polling이 아니라 webhook입니다.

참고 문서:

- `docs/vercel-deployment.md`
- `docs/telegram-production-test-scenarios.md`
- `docs/telegram-e2e-harness.md`

## 8. Related References

- `docs/initial-prd.md`
- `docs/phase-plan.md`
- `docs/change-log.md`
- `docs/context-summary.md`
