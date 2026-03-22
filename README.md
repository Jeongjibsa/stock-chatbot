# Stock Briefing Bot

거시 지표, 시장 이벤트, 퀀트 시그널을 종합해 텔레그램으로 자동 발송하고, 공개 브리핑은 웹 아카이브로 제공하는 시장 브리핑 자동화 시스템

## 문제 정의

매일 시장을 확인하는 일의 핵심 비용은 조회보다 해석에 있습니다.  
미국/한국 지수, 금리, 환율, 원자재, 뉴스, 이벤트, 보유 종목을 따로 보고 다시 연결해야 하기 때문입니다.

이 프로젝트는 그 해석 비용을 줄이기 위해 만들어졌습니다.

- 시장 데이터를 수집합니다.
- 거시/추세/이벤트/자금 신호를 계산합니다.
- LLM은 마지막 브리핑 생성 레이어로만 사용합니다.
- 개인화 결과는 Telegram DM으로, 공개 가능한 결과는 웹 archive로 전달합니다.

핵심은 “뉴스 요약 봇”이 아니라 **시장 브리핑 자동화 시스템**이라는 점입니다.

## 왜 필요한가

- 매일 반복되는 시장 점검과 요약 작업을 자동화합니다.
- 같은 입력에서 같은 구조의 브리핑을 일관되게 생성합니다.
- 미국/한국 시장을 함께 보는 투자자 관점의 입력과 출력 구조를 가집니다.
- 공개 브리핑과 개인화 브리핑을 분리해 개인정보 노출 없이 운영할 수 있습니다.

## 핵심 기능

### 1. 시장 상태를 구조화해 전달

- 미국 지수와 한국 지수를 함께 봅니다.
- 금리, 환율, 달러 인덱스, 원자재를 같은 브리핑 안에서 해석합니다.
- `전일값 → 현재값`, 등락률, 리스크 온/오프 시그널을 함께 보여줍니다.

### 2. 코드 기반 분석 + LLM 기반 해석

- 데이터 수집과 점수 계산은 코드가 담당합니다.
- LLM은 이미 계산된 입력을 바탕으로 최종 브리핑을 문장화합니다.
- LLM이 실패해도 공개 브리핑은 규칙 기반 fallback으로 계속 생성됩니다.

### 3. Telegram 개인화 delivery

- `/register`, `/unregister`, `/portfolio_add`, `/portfolio_bulk`, `/report` 흐름으로 사용자별 입력을 받습니다.
- Telegram DM의 온디맨드 `/report`는 webhook 응답 안정성을 위해 fast rule-based 경로를 기본값으로 사용합니다. 보유 종목별 뉴스 수집과 LLM 조합은 기본적으로 끄고, 시장 데이터와 규칙 기반 렌더러로 먼저 빠르게 응답합니다. 이 경로에서도 시장/매크로/자금/이벤트/리스크 섹션과 공개 상세 링크는 rule-based fallback으로 비어 있지 않게 유지합니다.
- 3대 관점 기반 리밸런싱 해석은 optional `portfolioRebalancing` payload가 실제 runtime에 연결될 때 fully surface됩니다. payload가 없으면 템플릿 구조는 유지하되 `확인 필요 / 점검 필요 / 데이터 보강 필요` fallback label을 사용합니다.
- 운영이나 수동 검증에서 특정 거래일 `/report`를 재현해야 할 때는 `REPORT_RUN_DATE=YYYY-MM-DD` override로 기준일을 고정할 수 있습니다.
- `/portfolio_add`는 CSV 기반 ticker master 검색 결과를 보여주고, 상위 5개 후보 중 번호 선택으로 종목을 추가합니다.
- `삼전`, `현대차`, `app`, `tesl` 같은 짧은 alias는 curated fallback으로 보강하되, 최종 저장과 표시는 PostgreSQL ticker master를 기준으로 합니다.
- `/portfolio_bulk`는 comma/newline/semicolon으로 여러 키워드를 받아 각 항목을 독립 검색한 뒤 `추가 성공 / 이미 등록 / 실패` 요약을 돌려줍니다.
- 개인화 리포트는 Telegram DM으로만 전송합니다.
- 그룹은 온보딩, DM은 개인화 delivery, 웹은 공개 archive 역할로 분리됩니다.

### 4. 공개 웹 브리핑 archive

- 공개 가능한 시장/매크로/자금/이벤트 브리핑을 web feed로 제공합니다.
- 날짜별 최신순 top-down feed와 단건 detail 화면을 제공합니다.
- 보유 종목 정보와 개인 기사 요약은 공개 웹에 저장하지 않습니다.

### 5. 운영 콘솔

- `/admin`에서 최근 공개 브리핑, 최근 리포트 실행 로그, 최근 전략 스냅샷 회고를 확인할 수 있습니다.
- production에서는 Basic Auth로 보호할 수 있습니다.
- 운영 콘솔도 개인 포트폴리오 상세 정보는 노출하지 않습니다.
- 공개 웹 feed/detail에는 운영 콘솔 링크를 노출하지 않으며, 운영자는 `/admin` URL에 직접 접근합니다.

### 6. 전략 성과 추적

- 생성된 퀀트 점수카드는 `strategy_snapshots` 읽기 모델에 저장합니다.
- 운영 콘솔은 최근 시그널의 이후 수익률과 액션 적합도를 간단한 heuristic 기준으로 회고합니다.
- 이 결과는 프롬프트와 점수 규칙을 튜닝하기 위한 운영 지표로 사용합니다.

### 7. 스케줄 기반 무인 운영

- Vercel이 공개 웹, Telegram webhook, primary cron 진입점을 담당합니다.
- GitHub Actions는 CI와 backup/reconcile/manual rerun 역할을 담당합니다.
- worker와 shared application 계층이 공개 브리핑 생성, Telegram delivery, 실행 로그 기록을 수행합니다.
- 개발과 테스트는 로컬 Docker PostgreSQL 기준으로 진행하고, production은 Neon을 사용합니다.
- 시장 데이터는 `runDate` 기준 최근 가용일 스냅샷을 조회하므로 과거 날짜 backfill과 manual rerun도 같은 로직으로 처리합니다.

## 주요 시그널 및 분석 항목

| 구분 | 주요 항목 | 목적 |
| --- | --- | --- |
| 미국 시장 | `S&P 500`, `NASDAQ`, `DOW`, `VIX`, `미국 10년물 금리` | 위험 선호, 성장주 압력, 변동성 레짐 |
| 한국 시장 | `KOSPI`, `KOSDAQ`, `USD/KRW` | 국내 리스크 프리미엄, 환율 부담 |
| 매크로/원자재 | `WTI`, `천연가스`, `구리`, `달러 인덱스`, `CPI/Fed 일정` | 인플레이션, 달러 강세, 경기 민감도 |
| 이벤트 | 지정학 리스크, 실적 일정, AI/반도체/원자재 이슈 | 단기 변동성, 섹터 촉매 |
| 퀀트 신호 | `Macro`, `Trend`, `Event`, `Flow`, `Total` | `BUY / HOLD / REDUCE` 대신 시나리오 제안 |

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

## 기술 스택

### Core / Application

- `Node.js 24`
- `TypeScript 5.9`
- `pnpm workspace`

선택 이유:
- bot, worker, web, shared packages를 한 저장소에서 일관되게 운영하기 쉽습니다.

### Data

- `FRED`
- `Yahoo Finance scraping`
- 향후 `ECOS`, 수급/실적 캘린더 확장 예정

선택 이유:
- 초기 비용을 낮추면서 미국/매크로 지표와 주요 지수를 빠르게 커버할 수 있습니다.

### LLM

- `OpenAI`
- `Google Gemini`
- provider-agnostic client interface

선택 이유:
- 모델 교체와 fallback 전략을 최소 코드 변경으로 유지할 수 있습니다.

### Bot / Delivery

- `Telegram Bot API`
- `grammY`

선택 이유:
- 명령 기반 UX와 DM delivery 분리가 명확합니다.

### Web / Public Archive

- `Next.js App Router`
- `Tailwind CSS`
- `Pretendard`
- `shadcn/ui` 스타일 컴포넌트
- `React Markdown`

선택 이유:
- feed/detail 중심 공개 웹을 빠르게 만들 수 있고 Vercel 배포와 잘 맞습니다. Pretendard와 custom shadcn/ui 컴포넌트, soft white/gray + single blue accent 팔레트로 금융 리포트 톤의 밀도 높은 화면을 일관되게 유지합니다.

### Infra / Ops

- `GitHub Actions`
- `Docker Compose`
- `PostgreSQL`
- `Redis`
- `Neon` (production DB target)
- `Vercel` (public web target)

선택 이유:
- 로컬 검증 루프와 production 배포 경로를 분리하면서도 구조를 단순하게 유지할 수 있습니다.

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

- `apps/telegram-bot`: Telegram 명령 처리와 사용자 입력 UX
- `apps/worker`: daily report 실행, 공개 브리핑 생성, Telegram delivery
- `apps/web`: 공개 브리핑 feed/detail 웹 앱
- `packages/application`: 시장 데이터, 퀀트, LLM, 렌더링, orchestration
- `packages/database`: schema, repository, persistence logic
- `apps/worker/src/import-ticker-master.ts`: CSV 종목 마스터를 PostgreSQL `ticker_masters`로 적재
- `scripts/pages`: deprecated fallback Pages build 경로

## 실행 방법

### 1. 의존성 설치

```bash
COREPACK_HOME=/tmp/corepack pnpm install
```

### 2. 로컬 인프라 실행

```bash
make up
```

### 3. 개발 서버 실행

```bash
make dev-api
make dev-bot
make dev-worker
COREPACK_HOME=/tmp/corepack pnpm dev:web
```

### 4. 주요 Telegram 명령

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
/mock_report      예시 리포트 보기
```

`/report`와 공개 브리핑 날짜는 서울 기준 요청일이 아니라 `공통 마감일(effective report date)`을 사용합니다. 즉 국장과 미장의 대표 지표에서 모두 확인 가능한 가장 최근 마감일을 제목과 공개 `report_date` 기준으로 삼습니다. 관심 지표 개인 설정은 현재 개인화 입력 대상에서 제외됐고, `/report`와 공개 브리핑은 시스템 기본 시장 지표 세트를 공통으로 사용합니다.

### 5. 종목 마스터 CSV 적재

로컬 Docker PostgreSQL에서 구현과 검증을 끝낸 뒤 ticker master를 적재합니다.

```bash
COREPACK_HOME=/tmp/corepack pnpm tickers:import -- --file="/Users/jisung/Downloads/주식종목데이터/통합_국영문_UTF-8-SIG.csv"
```

지원 컬럼:

```text
symbol | name_en | name_kr | market
종목코드 | 종목명(영문) | 종목명(한글) | 시장구분
```

### 6. 전체 검증

```bash
COREPACK_HOME=/tmp/corepack pnpm verify
```

### 7. 웹 앱 빌드 확인

```bash
COREPACK_HOME=/tmp/corepack pnpm --filter @stock-chatbot/web build
```

### 6. 통합 테스트

```bash
make test-integration
```

### 7. 하네스 검증

```bash
COREPACK_HOME=/tmp/corepack pnpm harness:check
COREPACK_HOME=/tmp/corepack pnpm test -- scripts/harness/fixture-utils.test.js
```

관련 기준 문서:

- [AGENTS.md](/Users/jisung/Projects/stock-chatbot/AGENTS.md)
- [docs/harness-engineering.md](/Users/jisung/Projects/stock-chatbot/docs/harness-engineering.md)
- [harness/suite-contracts.json](/Users/jisung/Projects/stock-chatbot/harness/suite-contracts.json)

### 8. 실제 Telegram E2E 하네스

production-like Telegram E2E는 UI 자동화 없이 아래 조합으로 검증합니다.

- inbound: production webhook route에 synthetic Telegram update POST
- outbound: bot runtime의 실제 Telegram Bot API `sendMessage`
- assertion: DB side effect + `telegram_outbound_messages` audit log

최소 회귀 세트:

```bash
COREPACK_HOME=/tmp/corepack pnpm test:telegram:e2e -- --suite=minimum --allow-production
```

전체 세트:

```bash
COREPACK_HOME=/tmp/corepack pnpm test:telegram:e2e -- --suite=full --allow-production
```

관련 문서:

- [docs/telegram-production-test-scenarios.md](/Users/jisung/Projects/stock-chatbot/docs/telegram-production-test-scenarios.md)
- [docs/telegram-e2e-harness.md](/Users/jisung/Projects/stock-chatbot/docs/telegram-e2e-harness.md)
- [apps/telegram-bot/.env.e2e.example](/Users/jisung/Projects/stock-chatbot/apps/telegram-bot/.env.e2e.example)

## 환경 변수 설정

```bash
DATABASE_URL=postgresql://stockbot:stockbot@localhost:5432/stockbot
REDIS_URL=redis://localhost:6379

OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
LLM_PROVIDER=google

TELEGRAM_BOT_TOKEN=123456:telegram-bot-token
TELEGRAM_TEST_CHAT_ID=123456789
TELEGRAM_WEBHOOK_URL=https://your-vercel-domain.vercel.app/api/telegram/webhook
TELEGRAM_WEBHOOK_SECRET_TOKEN=webhook-secret-token
TELEGRAM_E2E_PRIMARY_CHAT_ID=123456789
TELEGRAM_E2E_PRIMARY_USER_ID=123456789
TELEGRAM_E2E_SECONDARY_CHAT_ID=
TELEGRAM_E2E_SECONDARY_USER_ID=
TELEGRAM_E2E_GROUP_CHAT_ID=
TELEGRAM_E2E_ALLOW_PRODUCTION=0
TELEGRAM_E2E_CLEANUP=1

FRED_API_KEY=fred_api_key

PUBLIC_BRIEFING_BASE_URL=https://your-vercel-domain.vercel.app
CRON_SECRET=vercel-cron-shared-secret
ADMIN_DASHBOARD_USERNAME=operator
ADMIN_DASHBOARD_PASSWORD=strong-password
REPORT_TIMEZONE=Asia/Seoul
DAILY_REPORT_PATTERN="0 0 9 * * *"
DAILY_REPORT_WINDOW_MINUTES=15
```

운영 원칙:

- **개발/테스트**: 로컬 Docker PostgreSQL 사용
- **배포**: Vercel env의 `DATABASE_URL`을 Neon connection string으로 설정
- `.env`, `.env.*`, 키 파일은 git ignore 대상

## 스케줄링 / 자동화 방식

현재 운영 기준은 `Vercel primary + GitHub Actions backup`입니다.

- `Vercel webhook`
  - `/api/telegram/webhook`
  - `/start`, `/register`, `/report`, `/portfolio_*`, `/market_*`, `/report_*` 처리
- `Vercel Cron`
  - `/api/cron/daily-report`
  - 공개 브리핑 생성
  - `reports` read model 저장
  - 사용자별 daily report 생성 및 Telegram DM 발송
- `GitHub Actions Daily Report`
  - backup/reconcile/manual rerun
  - `VERCEL_RECONCILE_URL + CRON_SECRET`가 있으면 Vercel reconcile route 호출
  - 불가능할 때만 local worker 또는 external trigger fallback
- `CI`
  - `push`, `pull_request` 시 `pnpm verify`
- `Daily Report Smoke`
  - seeded mock portfolio 기준 worker 경로 검증
- `Telegram Smoke Test`
  - 실제 Bot API로 `getMe` / `sendMessage` 검증

중요한 운영 규칙:

- `PUBLIC_BRIEFING_BASE_URL`은 Vercel 공개 웹 URL을 기준으로 설정
- 공개 feed/detail은 정적 build snapshot이 아니라 dynamic DB 조회로 동작하므로, `reports` 적재 후 redeploy 없이 바로 반영되어야 합니다.
- Vercel cron 보안을 위해 production에서는 `CRON_SECRET`을 설정
- production webhook 보안을 위해 `TELEGRAM_WEBHOOK_SECRET_TOKEN`을 반드시 설정
- `DATABASE_URL`이 없으면 local worker fallback 단계는 skip
- 공개 웹은 개인화 데이터를 저장하거나 노출하지 않음
- Telegram polling runtime은 local development나 비상 fallback용으로만 사용하고, production primary runtime은 webhook 기준

## 하네스 엔지니어링

이 저장소의 하네스는 snapshot 비교만으로 끝나지 않습니다.

- suite 기준선은 [harness/suite-contracts.json](/Users/jisung/Projects/stock-chatbot/harness/suite-contracts.json)에 둡니다.
- `active` suite는 fixture, grader, snapshot 요구사항을 모두 만족해야 합니다.
- `report_render_cases`처럼 렌더링 품질이 중요한 suite는 `snapshotFile`, `renderedText`, grader 연결을 함께 검증합니다.
- 하네스 세부 운영 기준은 [docs/harness-engineering.md](/Users/jisung/Projects/stock-chatbot/docs/harness-engineering.md)에 정리합니다.

## Telegram 브리핑 예시

```text
1. 🗞️ 오늘의 포트폴리오 리밸런싱 브리핑 (2026-03-20)

2. 📌 오늘 한 줄 결론
- 종목별 흐름은 일부 버티고 있지만, 시장 valuation 부담과 구조 리스크가 높아 오늘은 신규 확대보다 유지와 선별 조정 중심 접근이 더 적절합니다.

3. 🎯 오늘의 리밸런싱 제안
- 비중 확대 검토: 삼성전자
- 유지 우세: SK하이닉스, 현대자동차, 현대글로비스
- 비중 조절 필요: 에코프로
- 우선 관찰 대상: HMM

6. 🌡️ 시장 레짐 요약
- 시장 종합: 매우 방어적 구간으로 해석하는 편이 적절합니다.
- 심리/강도: 적정 / 적정
- 밸류/펀더멘털: 과열 / 매우 고평가
- 구조 리스크: 과열
- 한줄 해석: 표면 모멘텀은 유지되더라도 내부 밸류 부담과 구조적 취약성 때문에 방어적으로 읽는 편이 적절합니다.

7. 📈 종목별 리밸런싱 가이드
[삼성전자]
- 최종 의견: 확대 검토
- 한줄 판단: 내재 가치는 양호하고 포트 적합성도 무난해 선별적 확대 후보로 볼 수 있지만, 시장 전체가 공격적 확대를 허용하는 환경은 아닙니다.
- 내재 가치: 양호
- 가격/추세: 중립
- 미래 기대치: 중립
- 포트 적합성: 보통

10. 🔎 공개 상세 브리핑
https://your-vercel-domain.vercel.app/reports/report-2026-03-20

11. ❗ 이 리포트는 정보 제공용이며, 투자 판단과 책임은 본인에게 있습니다.
```

## 퀀트 스코어링 아이디어

현재 점수카드는 설명 가능한 규칙 기반입니다.

- `Macro`: 금리, 환율, 달러 강세, 레짐
- `Trend`: 가격 추세, 이동평균, 모멘텀
- `Event`: 뉴스/이벤트 방향성
- `Flow`: 자금 흐름 또는 대용 지표
- `Total`: 종합 점수
- `Action`: `BUY / HOLD / REDUCE` 대신 시나리오 제안

예시:

```text
Macro: -0.60 / Trend: -0.40 / Event: +0.20 / Flow: -0.30
→ Total: -0.42 → REDUCE
```

## 운영 시 고려사항 / 리스크

### 비용

- LLM 호출은 가장 비싼 단계입니다.
- 공개 브리핑과 개인화 브리핑을 분리해 호출 수를 줄이는 구조가 유리합니다.
- production DB는 Neon을 사용하되, 개발 단계에서는 비용 없는 로컬 Docker 경로를 유지합니다.

### 데이터 품질

- FRED와 Yahoo Finance의 기준 시점이 다를 수 있습니다.
- 일부 지표는 `asOfDate`가 다르므로 같은 시점 데이터처럼 과장하면 안 됩니다.
- 기사 품질이 낮거나 데이터가 누락돼도 전체 브리핑은 계속 생성되도록 설계합니다.

### 장애 대응

- Telegram delivery 실패와 report generation 실패를 분리 기록합니다.
- LLM composition 실패 시 fallback renderer로 계속 진행합니다.
- GitHub Actions schedule은 지연될 수 있으므로 idempotency가 필요합니다.

### 개인정보

- 공개 웹에는 개인화 포트폴리오 데이터가 포함되지 않습니다.
- 보유 종목, 개인 기사 요약, 개인 점수카드는 Telegram DM 전용입니다.

## 향후 개선 계획

- `reports` read model을 기반으로 공개 웹 feed/detail 고도화
- 공개 웹을 Vercel 기준으로 안정화한 뒤 GitHub Pages fallback 축소
- 인증된 웹 관리 콘솔 추가
- 전략 성과 추적 및 백테스트
- 자금 흐름/실적 캘린더 데이터 소스 확장
- LLM fallback 정책 고도화

현재 범위에서 제외:

- 모바일 앱
- 자동 매매
- 인증 기반 개인 웹 대시보드

## Vercel 배포 메모

이 프로젝트의 공개 웹은 `apps/web`를 root directory로 두고 배포하는 것을 기준으로 합니다.

1. Vercel에서 repo import
2. Root Directory를 `apps/web`로 설정
3. Node.js Version은 `24.x`로 설정
4. Environment Variables에 최소 아래를 설정

```bash
DATABASE_URL=postgresql://neondb_owner:***@ep-***.neon.tech/neondb?sslmode=require
```

5. build는 기본 `pnpm build`
6. 공개 웹은 `reports` 테이블만 읽고, 개인화 Telegram 기능은 계속 worker가 담당
7. GitHub repository variable `PUBLIC_BRIEFING_BASE_URL`을 배포된 Vercel URL로 설정

```bash
PUBLIC_BRIEFING_BASE_URL=https://your-vercel-domain.vercel.app
```

8. Telegram webhook 등록

```bash
TELEGRAM_BOT_TOKEN=123456:telegram-bot-token \
TELEGRAM_WEBHOOK_URL=https://your-vercel-domain.vercel.app/api/telegram/webhook \
TELEGRAM_WEBHOOK_SECRET_TOKEN=webhook-secret-token \
COREPACK_HOME=/tmp/corepack pnpm telegram:webhook:register
```

9. GitHub Actions backup/reconcile용 variable과 secret 설정

```bash
PUBLIC_BRIEFING_BASE_URL=https://your-vercel-domain.vercel.app
VERCEL_RECONCILE_URL=https://your-vercel-domain.vercel.app/api/cron/reconcile
CRON_SECRET=vercel-cron-shared-secret
```

10. 운영 콘솔 Basic Auth 설정

```bash
ADMIN_DASHBOARD_USERNAME=operator
ADMIN_DASHBOARD_PASSWORD=strong-password
```

추가 메모:

- `apps/web/vercel.json`에 install/build 명령이 고정돼 있습니다.
- `apps/web/.env.local.example`는 로컬 웹 실행용 최소 env 예시입니다.
- production에서는 Neon connection string을 Vercel의 `DATABASE_URL`에 넣고, 개발과 테스트는 계속 로컬 Docker PostgreSQL을 사용합니다.
- 현재 public alias 기준 운영 URL은 `https://web-three-tau-58.vercel.app`입니다.
- `pnpm telegram:webhook:register`는 `setWebhook`과 `getWebhookInfo`를 연속 호출해 현재 webhook 설정을 바로 확인합니다. `TELEGRAM_WEBHOOK_SECRET_TOKEN`이 없으면 스크립트가 실패하며, production에서는 secret header 검증을 필수로 사용합니다.
- Telegram webhook route는 `telegram_processed_updates` read model로 같은 `update_id`를 dedupe하므로, webhook 재시도로 같은 command가 두 번 실행되지 않아야 합니다.
- 운영 콘솔은 `https://your-vercel-domain.vercel.app/admin` 경로입니다.
- 실제 Telegram 운영 검증 순서는 [docs/telegram-production-test-scenarios.md](/Users/jisung/Projects/stock-chatbot/docs/telegram-production-test-scenarios.md)를 기준으로 진행합니다.

## 라이선스

별도 라이선스를 아직 지정하지 않았습니다. 필요 시 프로젝트 성격에 맞춰 추가합니다.
