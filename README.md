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

`/portfolio_add`, `/portfolio_remove`, `/market_add`는 in-memory 대화 상태 저장소 기반으로 단계별 입력 플로우를 유지한다.

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

## Validation Policy

구현 변경 후 기본 검증 명령은 `make verify`다. DB나 저장 계층을 바꾸면 `make test-integration`까지 함께 실행한다.

## Harness

- fixture 위치: `harness/fixtures`
- grader 기준: `harness/graders/report-structure-grader.md`
- snapshot 위치: `harness/snapshots`
- 검증 명령: `make harness-check`
