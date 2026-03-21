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
  - 매일 `00:07 UTC`에 실행되어 `09:07 KST` 근처 공개 브리핑 생성·배포 후 일 배치 리포트 런너를 호출
  - `workflow_dispatch`로 수동 실행 가능
- `Daily Report Smoke`
  - `workflow_dispatch` 전용
  - GitHub-hosted runner 안에서 임시 PostgreSQL을 띄우고 mock 포트폴리오를 seed한 뒤 Gemini 기반 일 리포트 생성 경로를 검증

필요한 GitHub Secrets:

- `DATABASE_URL`
- `FRED_API_KEY`
- `GEMINI_API_KEY`
- `LLM_PROVIDER`
- `OPENAI_API_KEY`
- `REDIS_URL`
- `TELEGRAM_BOT_TOKEN`
- `DAILY_REPORT_TRIGGER_URL`
- `DAILY_REPORT_TRIGGER_TOKEN`

Actions용 일 배치 진입점:

- `pnpm --filter @stock-chatbot/worker run run:daily-report`
- `pnpm --filter @stock-chatbot/worker run run:public-briefing`

현재 GitHub Actions 런너는 queue 없이 직접 일 배치 작업을 실행한다. 정확한 정시성보다 저비용 운영을 우선하며, schedule 지연은 저장 계층 중복 방지로 흡수한다.
`DAILY_REPORT_TRIGGER_URL`이 secret으로 설정되면 local worker 대신 외부 전용 worker trigger endpoint를 호출하는 방식으로 전환할 수 있다.
공개 브리핑은 같은 `runDate`에 대해 canonical `/briefings/YYYY-MM-DD/`와 archive `/briefings/YYYY/MM/DD/`를 동일하게 재생성하며, root `/`와 `/briefings/` index도 함께 갱신한다.
daily report runner는 생성 성공 후 `preferred_delivery_chat_id`가 있는 사용자에게만 Telegram DM delivery를 시도하고, 로그에는 `delivered`, `deliverySkipped`, `deliveryFailed` 집계를 함께 남긴다.
현재 app runtime 스크립트는 workspace ESM 해석 이슈를 피하기 위해 `tsx` source entrypoint를 사용하고, `pnpm build`는 검증용 단계로 유지한다.

Gemini 기반 smoke test는 `Daily Report Smoke` workflow가 담당한다. 이 workflow는 외부 DB 없이 GitHub-hosted runner 안에서 PostgreSQL service를 띄우고, mock 사용자와 포트폴리오를 seed한 뒤 `pnpm --filter @stock-chatbot/worker run run:daily-report`를 실행한다.

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
  - 첫 사용 안내와 추천 순서 확인
- `/help`
  - 명령 요약 확인
- `/register`
  - 개인화 리포트 수신 대상 등록
- `/report`
  - 오늘 브리핑 바로 받기
- `/report_settings`
  - 정기 브리핑 설정 확인
- `/report_on`
  - 정기 브리핑 켜기
- `/report_off`
  - 정기 브리핑 끄기
- `/report_time`
  - 정기 브리핑 시간 변경
- `/portfolio_add`
  - 보유 종목 추가
- `/portfolio_list`
  - 저장된 보유 종목 확인
- `/portfolio_remove`
  - 보유 종목 삭제
- `/market_add`
  - 관심 지표 추가
- `/market_items`
  - 추적 중인 지표 확인
- `/mock_report`
  - 예시 리포트 보기

`/register`는 MVP 필수 등록 단계다. group/supergroup에서는 계정만 만들고, 개인화 리포트 발송 대상 chat은 private DM에서 다시 `/register`할 때 저장한다.
새 사용자가 그룹에 들어오면 봇은 `/register` 안내 메시지를 자동으로 보내고, 미등록 사용자가 그룹에서 일반 메시지를 남기면 1회 등록 안내를 다시 보낸다.
조인 이벤트가 `new_chat_members`와 `chat_member`로 중복 들어오는 경우를 대비해, 같은 사용자와 그룹 조합의 환영 메시지는 짧은 시간 안에 1회만 전송한다.
이 자동 안내가 동작하려면 봇이 해당 그룹의 관리자 권한을 가져야 하고, polling은 `chat_member` 업데이트를 구독해야 한다.
`/portfolio_add`, `/portfolio_remove`, `/market_add`는 단계별 입력 플로우를 유지하면서 실제 DB 저장/조회와 연결된다.
`/report_settings`, `/report_on`, `/report_off`, `/report_time HH:MM`으로 사용자별 정기 브리핑 발송 여부와 시간을 조정할 수 있다.
`/mock_report`는 실제 Telegram provider 연동 없이 현재 리포트 템플릿을 미리보기로 보여준다.

권장 사용자 흐름:

1. DM에서 `/start`
2. DM에서 `/register`
3. `/report`로 오늘 브리핑 바로 확인
4. `/portfolio_add`로 보유 종목 입력
5. `/portfolio_list`로 저장 결과 확인
6. 필요하면 `/market_add`로 관심 지표 추가
7. 필요하면 `/report_time 09:00` 등으로 정기 브리핑 시간을 조정
8. 이후 개인화 브리핑은 DM으로 수신

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

- `LLM_PROVIDER`
  - `openai` 또는 `google`
- `OPENAI_API_KEY`
  - OpenAI adapter 사용 시 필요
- `GEMINI_API_KEY`
  - Gemini adapter 사용 시 필요
- `FRED_API_KEY`
  - FRED 기반 시장 데이터 어댑터 사용 시 필요
- Yahoo Finance 지수 시세는 별도 API 키 없이 scraping 기반 chart endpoint를 사용
- `ENABLE_DAILY_REPORT_SCHEDULER`
  - worker에서 일 배치 스케줄 등록 여부 제어
- `DAILY_REPORT_PATTERN`
  - BullMQ scheduler cron pattern
- `DAILY_REPORT_WINDOW_MINUTES`
  - 사용자별 예약 발송 허용 윈도우 분 단위. 기본값은 `15`
- `REPORT_TIMEZONE`
  - 스케줄 계산 타임존
- `REPORT_RUN_DATE`
  - 특정 날짜로 job을 재현할 때만 선택적으로 사용
- `REPORT_TRIGGER_TYPE`
  - `schedule`, `workflow_dispatch`, `manual` 같은 실행 트리거 구분값
- `PUBLIC_BRIEFING_BASE_URL`
  - 텔레그램 하단에 넣을 GitHub Pages 공개 브리핑 기준 URL
- `PUBLIC_BRIEFING_OUTPUT_PATH`
  - 공개 브리핑 JSON 산출 경로

`.env`를 셸에서 직접 불러야 할 때는 공백이 포함된 값이 있으므로 파일 안의 quoted 값을 유지해야 한다. Node 실행은 가능하면 `node --env-file=.env ...` 또는 앱 내부 `dotenv/config` 로딩을 사용한다.

## Validation Policy

구현 변경 후 기본 검증 명령은 `make verify`다. DB나 저장 계층을 바꾸면 `make test-integration`까지 함께 실행한다.

## Harness

- fixture 위치: `harness/fixtures`
- grader 기준: `harness/graders/report-structure-grader.md`
- snapshot 위치: `harness/snapshots`
- 검증 명령: `make harness-check`
