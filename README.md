# Stock Chatbot

초기 개발 환경은 `로컬 앱 실행 + Docker 기반 인프라`와 `Docker Compose 기반 전체 스택 실행` 두 가지를 모두 지원한다.

## Quick Start

1. `.env.example`을 참고해 `.env`를 만든다.
2. `pnpm install`
3. 로컬 인프라 실행: `make up`
4. API 실행: `make dev-api`
5. Telegram bot 실행: `make dev-bot`
6. Worker 실행: `make dev-worker`
7. 변경 후 검증: `make verify`

## GitHub Actions

public repository 기준으로 아래 workflow를 사용한다.

- `CI`
  - push / pull_request 시 `pnpm verify` 실행
- `Daily Report`
  - 매일 `00:07 UTC`에 실행되어 `09:07 KST` 근처 일 배치 리포트 런너를 호출
  - `workflow_dispatch`로 수동 실행 가능

필요한 GitHub Secrets:

- `DATABASE_URL`
- `FRED_API_KEY`
- `OPENAI_API_KEY`
- `REDIS_URL`
- `TELEGRAM_BOT_TOKEN`

Actions용 일 배치 진입점:

- `pnpm --filter @stock-chatbot/worker run run:daily-report`

현재 GitHub Actions 런너는 queue 없이 직접 일 배치 작업을 실행한다. 정확한 정시성보다 저비용 운영을 우선하며, schedule 지연은 저장 계층 중복 방지로 흡수한다.

## Make Commands

- `make up`
  - PostgreSQL, Redis만 Docker로 실행
- `make down`
  - Docker Compose 서비스 종료
- `make stack-up`
  - API, Worker, PostgreSQL, Redis를 모두 Docker Compose로 실행
- `make stack-down`
  - 전체 스택 종료
- `make logs`
  - Compose 로그 확인
- `make lint`
  - ESLint 실행
- `make format`
  - Prettier 포맷 적용
- `make format-check`
  - 포맷 검사
- `make test`
  - Vitest 실행
- `make test-integration`
  - Docker PostgreSQL 기반 integration test 실행
- `make test-telegram`
  - 실 Telegram Bot API smoke test 실행
- `make verify`
  - lint, typecheck, test, compose 검증을 한 번에 실행
- `make harness-check`
  - 하네스 fixture 형식과 스냅샷 기준선 검증
- `make compose-validate`
  - Compose 설정 검증
- `make dev-api`
  - 로컬 Fastify API 실행
- `make dev-bot`
  - 로컬 Telegram bot 실행
- `make dev-worker`
  - 로컬 BullMQ worker 실행
- `make typecheck`
  - 타입 검사

## Services

- API: `http://localhost:3000`
- Health endpoint: `GET /healthz`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## Telegram Bot

`TELEGRAM_BOT_TOKEN`이 설정되어 있으면 `make dev-bot`으로 polling 기반 bot을 실행할 수 있다.

현재 지원 명령:

- `/start`
- `/help`
- `/portfolio_add`
- `/portfolio_remove`
- `/market_add`
- `/market_items`
- `/mock_report`

`/portfolio_add`, `/portfolio_remove`, `/market_add`는 in-memory 대화 상태 저장소 기반으로 단계별 입력 플로우를 유지한다.
`/mock_report`는 실제 Telegram provider 연동 없이 현재 리포트 템플릿을 미리보기로 보여준다.

실 Telegram smoke test:

- 로컬: `make test-telegram`
- GitHub Actions: `Telegram Smoke Test` workflow 수동 실행
- 필요 env/secrets:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_TEST_CHAT_ID`

smoke test는 먼저 `getMe`로 봇 신원을 검증하고, 이어서 현재 템플릿 기반 preview report를 테스트 채팅으로 실제 발송한다.

## Mock Contracts

- `GET /v1/reports/:userId/latest`
  - future web/app용 latest report 조회 계약 초안
- `GET /v1/reports/:userId/history`
  - future web/app용 report history 조회 계약 초안
- `GET /v1/mock/telegram/daily-report`
  - mock telegram delivery preview

## External Keys

- `OPENAI_API_KEY`
  - OpenAI adapter 사용 시 필요
- `FRED_API_KEY`
  - FRED 기반 시장 데이터 어댑터 사용 시 필요
- `ENABLE_DAILY_REPORT_SCHEDULER`
  - worker에서 일 배치 스케줄 등록 여부 제어
- `DAILY_REPORT_PATTERN`
  - BullMQ scheduler cron pattern
- `REPORT_TIMEZONE`
  - 스케줄 계산 타임존
- `REPORT_RUN_DATE`
  - 특정 날짜로 job을 재현할 때만 선택적으로 사용
- `REPORT_TRIGGER_TYPE`
  - `schedule`, `workflow_dispatch`, `manual` 같은 실행 트리거 구분값

`.env`를 셸에서 직접 불러야 할 때는 공백이 포함된 값이 있으므로 파일 안의 quoted 값을 유지해야 한다. Node 실행은 가능하면 `node --env-file=.env ...` 또는 앱 내부 `dotenv/config` 로딩을 사용한다.

## Validation Policy

구현 변경 후 기본 검증 명령은 `make verify`다. DB나 저장 계층을 바꾸면 `make test-integration`까지 함께 실행한다.

## Harness

- fixture 위치: `harness/fixtures`
- grader 기준: `harness/graders/report-structure-grader.md`
- snapshot 위치: `harness/snapshots`
- 검증 명령: `make harness-check`
