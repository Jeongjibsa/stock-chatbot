# Stock Chatbot

거시 지표, 시장 이벤트, 퀀트 시그널을 종합해 Telegram DM으로 개인화 브리핑을 보내고, 공개 가능한 브리핑은 웹 아카이브로 제공하는 시장 브리핑 시스템입니다.

| Entry | URL / Note |
| --- | --- |
| Public briefing web | [https://web-three-tau-58.vercel.app](https://web-three-tau-58.vercel.app) |
| Public feed | [https://web-three-tau-58.vercel.app/](https://web-three-tau-58.vercel.app/) |
| Admin console | `/admin` (`Basic Auth` when enabled) |
| Telegram runtime | production primary mode is `webhook` |

## 프로젝트 한눈에 보기

이 프로젝트는 “뉴스 요약 봇”보다 “시장 브리핑 자동화 시스템”에 가깝습니다.
시장 데이터와 규칙 기반 점수 계산은 코드가 담당하고, 자연어는 마지막 전달 레이어에서만 사용합니다.

```text
입력: /report
해석: 사용자 + 보유 종목 + 오늘 시장 상태 + 전략 스냅샷
출력: Telegram 개인화 브리핑 + 공개 브리핑 상세 링크
```

## 왜 이 프로젝트를 만들었는가

매일 시장을 보는 비용은 조회보다 해석에 있습니다.
미국/한국 지수, 금리, 환율, 원자재, 뉴스, 이벤트, 보유 종목을 따로 보고 다시 연결해야 하기 때문입니다.

이 저장소는 그 해석 비용을 줄이기 위해 아래를 자동화합니다.

- 시장 데이터를 수집합니다.
- 거시/추세/이벤트/자금 신호를 계산합니다.
- 개인화 브리핑은 Telegram DM으로 보냅니다.
- 공개 가능한 브리핑은 웹 feed/detail로 남깁니다.

## 채널 역할

| Channel | Role | 포함 내용 |
| --- | --- | --- |
| Telegram DM | 개인화 입력 + 개인화 리포트 delivery | 보유 종목, 리밸런싱 해석, 개인 링크 |
| Telegram Group | 온보딩 + `/register` 유도 | 안내, 중복 없는 등록 유도 |
| Telegram Channel | 공개 브리핑 broadcast | 공개 링크, 공용 브리핑 |
| Public Web | 공개 브리핑 archive | 시장/매크로/자금/이벤트 |
| `/admin` | 운영 확인 | 최근 공개 브리핑, 실행 로그, 전략 회고 |

공개 웹에는 개인 포트폴리오 데이터, 개인 기사 요약, 개인 점수카드를 저장하거나 노출하지 않습니다.

## 핵심 기능 우선순위

### 1. 시장 상태를 구조화해 전달

- 미국/한국 지수를 함께 봅니다.
- 금리, 환율, 달러 강도, 원자재를 같은 브리핑 안에서 해석합니다.
- `전일값 -> 현재값`, 등락률, 리스크 온/오프를 함께 보여줍니다.

### 2. Telegram 개인화 delivery

- `/register`, `/report`, `/portfolio_add`, `/portfolio_bulk`, `/portfolio_list` 흐름을 유지합니다.
- `/report`는 DM에서 빠르게 응답하도록 fast rule-based 경로를 기본값으로 사용합니다.
- LLM이 꺼지거나 실패해도 `시장 / 매크로 / 자금 / 이벤트 / 리스크` 섹션은 비어 있지 않게 유지합니다.

### 3. 공개 웹 브리핑 archive

- 공개 가능한 시장/매크로/자금/이벤트 브리핑을 최신순 feed와 detail 화면으로 제공합니다.
- Telegram 하단 상세 링크는 `reports` read model을 우선 사용합니다.
- feed/detail은 정적 스냅샷이 아니라 DB 기반 동적 조회를 사용합니다.

### 4. 운영 콘솔과 전략 회고

- `/admin`에서 최근 공개 브리핑, 최근 리포트 실행 로그, 전략 스냅샷 회고를 확인할 수 있습니다.
- 전략 스냅샷은 `strategy_snapshots` 읽기 모델에 저장합니다.
- 이 데이터는 프롬프트와 점수 규칙 튜닝용 운영 지표로 사용합니다.

### 5. 스케줄 기반 무인 운영

- Vercel이 공개 웹, Telegram webhook, primary cron 진입점을 담당합니다.
- GitHub Actions는 CI + backup/reconcile + manual rerun 역할을 담당합니다.
- worker와 shared application 계층이 공개 브리핑 생성, Telegram delivery, 실행 로그 기록을 수행합니다.

## 주요 시그널

| 구분 | 주요 항목 | 목적 |
| --- | --- | --- |
| 미국 시장 | `S&P 500`, `NASDAQ`, `DOW`, `VIX`, `미국 10년물 금리` | 위험 선호, 성장주 압력, 변동성 레짐 |
| 한국 시장 | `KOSPI`, `KOSDAQ`, `USD/KRW` | 국내 리스크 프리미엄, 환율 부담 |
| 매크로/원자재 | `WTI`, `천연가스`, `구리`, `달러 인덱스` | 인플레이션, 달러 강세, 경기 민감도 |
| 이벤트 | 지정학 리스크, 실적 일정, AI/반도체 이슈 | 단기 변동성, 섹터 촉매 |
| 퀀트 신호 | `Macro`, `Trend`, `Event`, `Flow`, `Total` | 고정된 매매 지시 대신 시나리오 제안 |

## Telegram 흐름 예시

| Input | Parsed | Output |
| --- | --- | --- |
| `/register` in DM | `register + private_delivery_chat` | 개인 발송 대상 등록 |
| `/register` in group | `register + onboarding_only` | DM에서 다시 등록하라는 안내 |
| `/portfolio_add 삼전` | `portfolio_add + alias_resolved:005930` | 후보 확인 또는 상위 5개 선택 |
| `/portfolio_bulk AAPL, MSFT` | `portfolio_bulk + multi_search` | 성공 / 이미 등록 / 실패 요약 |
| `/report` | `personal_rebalancing_briefing` | 개인화 브리핑 + 공개 상세 링크 |

짧은 alias 예시:

- `삼전` -> `삼성전자(005930)`
- `현대차` -> `현대자동차(005380)`
- `tesl` -> `TSLA`
- `app` -> curated alias fallback 후 canonical ticker 탐색

## 리포트 구조 예시

Telegram DM 요약본은 아래 흐름을 기본으로 사용합니다.

```text
오늘의 포트폴리오 리밸런싱 브리핑
-> 오늘 한 줄 결론
-> 오늘의 리밸런싱 제안
-> 성향별 해석
-> 내 포트폴리오 요약
-> 시장 레짐 요약
-> 종목별 리밸런싱 가이드
-> 오늘의 포트 리스크 체크
-> 참고용 시장 브리핑
-> 공개 상세 브리핑 링크
```

공개 웹 브리핑은 개인화 용어를 제거한 `시장 / 매크로 / 자금 / 이벤트` 중심 구조를 사용합니다.

## 시스템 아키텍처

```text
[FRED / Yahoo Finance / News Sources]
                  |
                  v
         [Market Data Adapters]
                  |
                  v
     [Quant Signals / Event Extraction]
                  |
                  v
      [LLM Composition Layer (OpenAI/Gemini)]
                  |
        +---------+-----------+
        |                     |
        v                     v
[Telegram DM / Channel]   [Public Report Read Model]
        |                     |
        v                     v
 [Personal Delivery]     [Next.js Web Feed / Detail]
```

운영 플로우:

```text
Vercel webhook / Vercel Cron
  -> Telegram 명령 처리 / daily report 생성
  -> reports / strategy_snapshots / report_runs 저장
  -> Telegram 개인화 리포트 발송
  -> 공개 웹은 reports 테이블을 읽어 feed/detail 제공

GitHub Actions
  -> CI
  -> backup/reconcile
  -> manual rerun / smoke test
```

## 런타임과 스택

| Layer | Choice |
| --- | --- |
| Core | `Node.js 24`, `TypeScript 5.9`, `pnpm workspace` |
| Data | `FRED`, `Yahoo Finance scraping` |
| LLM | `OpenAI`, `Google Gemini`, provider-agnostic interface |
| Telegram | `Telegram Bot API`, `grammY` |
| Web | `Next.js App Router`, `Tailwind CSS`, `React Markdown` |
| Infra | `Vercel`, `Neon`, `Docker Compose`, `GitHub Actions`, `Redis` |

현재 production primary runtime은 `apps/web`입니다.
`apps/api`는 MVP production 필수 런타임이 아니라 draft 성격을 유지합니다.

## 디렉토리 구조

```text
.
├── apps
│   ├── api
│   ├── telegram-bot
│   ├── web
│   └── worker
├── docs
├── harness
├── packages
│   ├── application
│   ├── core-types
│   └── database
├── scripts
│   ├── harness
│   └── pages
├── docker-compose.yml
├── Makefile
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

| Path | Role |
| --- | --- |
| `apps/web` | public feed/detail, `/admin`, `/api/telegram/webhook`, `/api/cron/*` |
| `apps/telegram-bot` | Telegram command/runtime logic, local polling fallback |
| `apps/worker` | daily report orchestration, public briefing generation, delivery write path |
| `packages/application` | 시장 데이터, 뉴스, quant, LLM composition, renderer |
| `packages/database` | schema, migration SQL, repositories |
| `harness` | fixture, grader, snapshot 기준선 |

## 로컬 실행

### 1. 의존성 설치

```bash
COREPACK_HOME=/tmp/corepack pnpm install
cp .env.example .env
```

### 2. 로컬 인프라 실행

```bash
make up
```

### 3. 개발 서버 실행

```bash
make dev-bot
make dev-worker
COREPACK_HOME=/tmp/corepack pnpm dev:web
```

필요 시:

```bash
make dev-api
COREPACK_HOME=/tmp/corepack pnpm tickers:import
```

## 주요 명령

```text
/register         개인화 리포트 등록
/unregister       등록 및 설정 초기화
/report           지금 브리핑 생성
/report_settings  정기 브리핑 설정 확인
/report_on        정기 브리핑 켜기
/report_off       정기 브리핑 끄기
/report_time      발송 시간 변경
/portfolio_add    보유 종목 추가
/portfolio_bulk   여러 종목 빠르게 추가
/portfolio_list   보유 종목 확인
/portfolio_remove 보유 종목 삭제
/help             명령 안내
```

`/report`와 공개 브리핑 날짜는 항상 서울 기준 요청일을 사용합니다.
시장 데이터는 해당 날짜 이전 마지막 가용 거래일 스냅샷으로 조회합니다.

## 검증

기본 검증:

```bash
COREPACK_HOME=/tmp/corepack pnpm verify
```

하네스 변경 시:

```bash
COREPACK_HOME=/tmp/corepack pnpm harness:check
COREPACK_HOME=/tmp/corepack pnpm test -- scripts/harness/fixture-utils.test.js
```

DB schema/repository 변경 시:

```bash
make test-integration
```

웹 변경 시:

```bash
COREPACK_HOME=/tmp/corepack pnpm --filter @stock-chatbot/web build
```

Telegram E2E harness 변경 시:

```bash
COREPACK_HOME=/tmp/corepack pnpm test -- apps/telegram-bot/src/e2e/env.test.ts apps/telegram-bot/src/e2e/webhook-driver.test.ts
make test-integration

운영 영향 변경의 표준 마감 사이클:

1. 로컬 코드/문서 수정과 source-of-truth 동기화
2. `pnpm verify`와 필요한 범위별 추가 검증 실행
3. commit/push
4. production deploy 확인
5. Neon production DB schema/data 반영
6. 공개 웹, webhook, cron smoke
7. Telegram production E2E 또는 동등한 live verification
```

## 배포 메모

- local dev/test DB는 Docker PostgreSQL을 사용합니다.
- production DB target은 Neon입니다.
- Vercel은 public web, Telegram webhook, primary cron entrypoint를 담당합니다.
- `PUBLIC_BRIEFING_BASE_URL`은 실제 공개 웹 URL을 가리켜야 합니다.
- production Telegram runtime은 polling이 아니라 webhook입니다.

Webhook 등록 예시:

```bash
TELEGRAM_BOT_TOKEN=123456:telegram-bot-token \
TELEGRAM_WEBHOOK_URL=https://web-three-tau-58.vercel.app/api/telegram/webhook \
TELEGRAM_WEBHOOK_SECRET_TOKEN=webhook-secret-token \
COREPACK_HOME=/tmp/corepack pnpm telegram:webhook:register
```

## 운영 노트

- 개인화 리포트는 Telegram DM 전용입니다.
- 공개 웹은 market-only boundary를 유지해야 합니다.
- 과거 날짜 재현은 worker/manual backfill 경로의 `REPORT_RUN_DATE=YYYY-MM-DD` override를 사용합니다.
- 현재 다음 우선순위는 production webhook/cron smoke, Neon read/write smoke, 전략 스코어 튜닝입니다.

## 문서 기준선

아래 문서를 source of truth로 사용합니다.

- `docs/initial-prd.md`
- `docs/phase-plan.md`
- `docs/change-log.md`
- `docs/context-summary.md`
- `docs/harness-engineering.md`
- `docs/telegram-e2e-harness.md`

## 추가 구현 참고

README에서 분리한 구현 메모는 아래 문서를 참고합니다.

- [docs/implementation-reference.md](/Users/jisung/Projects/stock-chatbot/docs/implementation-reference.md)
- [docs/vercel-deployment.md](/Users/jisung/Projects/stock-chatbot/docs/vercel-deployment.md)
- [docs/telegram-production-test-scenarios.md](/Users/jisung/Projects/stock-chatbot/docs/telegram-production-test-scenarios.md)
