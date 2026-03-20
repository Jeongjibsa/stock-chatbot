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
- `make verify`
  - lint, typecheck, test, compose 검증을 한 번에 실행
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

`TELEGRAM_BOT_TOKEN`이 설정되어 있으면 `make dev-bot`으로 polling 기반 bot skeleton을 실행할 수 있다.

## Validation Policy

구현 변경 후 기본 검증 명령은 `make verify`다. 이후 기능이 늘어나면 이 명령에 integration 테스트와 스케줄/worker 검증을 계속 추가한다.
