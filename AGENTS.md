# AGENTS.md

## Purpose

이 파일은 이 저장소에서 작업하는 에이전트를 위한 짧은 운영 맵이다. 세부 요구사항과 구현 규칙을 전부 여기에 반복하지 않는다. 현재 기준선, 우선순위, 검증 규칙, 반드시 따라야 하는 문서 경로를 빠르게 찾게 하는 것이 목적이다.

## Project Snapshot

현재 제품은 `Telegram + public web` 이중 채널을 사용하는 시장 브리핑 자동화 시스템이다. 개인화 입력과 개인 리포트 delivery는 Telegram DM이 담당하고, 공개 가능한 상세 브리핑은 `apps/web`의 Next.js 웹에서 제공한다. 모바일 앱은 현재 MVP 범위 밖이다. production primary runtime은 `apps/web`이고, 개발/테스트 DB는 로컬 Docker PostgreSQL, production DB는 Neon을 대상으로 한다.

## Source of Truth

작업 전 아래 문서를 먼저 읽는다.

- [docs/initial-prd.md](/Users/jisung/Projects/stock-chatbot/docs/initial-prd.md)
- [docs/phase-plan.md](/Users/jisung/Projects/stock-chatbot/docs/phase-plan.md)
- [docs/change-log.md](/Users/jisung/Projects/stock-chatbot/docs/change-log.md)
- [docs/context-summary.md](/Users/jisung/Projects/stock-chatbot/docs/context-summary.md)
- [docs/llm-integration-plan.md](/Users/jisung/Projects/stock-chatbot/docs/llm-integration-plan.md)
- [docs/harness-engineering.md](/Users/jisung/Projects/stock-chatbot/docs/harness-engineering.md)
- [docs/telegram-e2e-harness.md](/Users/jisung/Projects/stock-chatbot/docs/telegram-e2e-harness.md)

우선순위는 아래다.

1. PRD
2. phase plan
3. change log
4. context summary

행동/범위/출력/런타임이 바뀌면 코드와 문서를 같은 change set 안에서 함께 갱신한다.

## Current Runtime Architecture

- [apps/web](/Users/jisung/Projects/stock-chatbot/apps/web)
  - production-facing primary runtime
  - public feed/detail
  - `/admin` 운영 콘솔
  - `/api/telegram/webhook`
  - `/api/cron/daily-report`
  - `/api/cron/reconcile`
- [apps/telegram-bot](/Users/jisung/Projects/stock-chatbot/apps/telegram-bot)
  - Telegram command/runtime logic의 공용 구현
  - local polling dev fallback
  - webhook에서도 재사용하는 `build-bot` 기반 command assembly
- [apps/worker](/Users/jisung/Projects/stock-chatbot/apps/worker)
  - daily report orchestration
  - public briefing generation
  - delivery / snapshot / backtest write path
- [apps/api](/Users/jisung/Projects/stock-chatbot/apps/api)
  - 현재 MVP production 필수 런타임은 아님
  - health/mock/report 조회용 초안 성격이 강함
- [packages/application](/Users/jisung/Projects/stock-chatbot/packages/application)
  - 시장 데이터, 뉴스, quant, LLM composition, renderer, orchestration
- [packages/database](/Users/jisung/Projects/stock-chatbot/packages/database)
  - schema, migration SQL, repositories

현재 기준 런타임 관계:

- Vercel: primary public runtime
- GitHub Actions: CI + backup/reconcile/manual rerun
- local Docker PostgreSQL/Redis: 개발 및 검증용
- Neon: production DB target
- GitHub Pages: 현재 기준 deprecated fallback 성격의 공개 경로

## Active Product Rules

- Telegram DM은 개인화 입력과 개인화 리포트 delivery 전용이다.
- Telegram 그룹은 온보딩과 `/register` 유도 전용이다.
- Telegram 채널은 공용 브리핑 broadcast 전용이다.
- public web에는 개인 포트폴리오 데이터, 개인 기사 요약, 개인 점수카드를 노출하면 안 된다.
- `/register`, `/report`, `/portfolio_add`, `/portfolio_list`, `/market_add` 흐름은 유지돼야 한다.
- 그룹 온보딩과 `/register` 안내는 깨지면 안 된다.
- scheduled daily delivery와 on-demand `/report`는 둘 다 유지돼야 한다.
- Telegram production primary runtime은 polling이 아니라 webhook이다.
- `apps/web`의 public feed/detail과 `/admin`은 현재 MVP에 포함된 기능이다.
- Telegram E2E는 synthetic webhook inbound + 실제 Telegram Bot API outbound + DB assertion 조합으로 운영 경로를 검증한다.

## Repository Working Rules

- 기존 구조를 우선 재사용하고, 필요한 곳만 확장한다.
- 문서가 요구하지 않는 아키텍처 재설계는 하지 않는다.
- 큰 리팩토링보다 작은 diff를 선호한다.
- 불필요한 의존성을 추가하지 않는다.
- core logic는 채널 독립적으로 유지하고, Telegram-specific delivery는 adapter 경계 안에 둔다.
- `apps/api`를 새 primary runtime처럼 다루지 않는다.

## Documentation Sync Rules

- 요구사항, 범위, 명령 의미, 출력 구조, 런타임, 운영 기준이 바뀌면 먼저 [docs/change-log.md](/Users/jisung/Projects/stock-chatbot/docs/change-log.md)를 수정한다.
- 그 다음 영향받는 문서를 같은 change set에서 수정한다.
  - [docs/initial-prd.md](/Users/jisung/Projects/stock-chatbot/docs/initial-prd.md)
  - [docs/phase-plan.md](/Users/jisung/Projects/stock-chatbot/docs/phase-plan.md)
  - [docs/context-summary.md](/Users/jisung/Projects/stock-chatbot/docs/context-summary.md)
- 구현이 끝난 항목은 [docs/phase-plan.md](/Users/jisung/Projects/stock-chatbot/docs/phase-plan.md)에서 실제 상태대로 `done` 처리한다.
- 하네스를 바꾸면 [docs/harness-engineering.md](/Users/jisung/Projects/stock-chatbot/docs/harness-engineering.md)와 하네스 자산도 같이 갱신한다.

## Validation Rules

기본 검증 명령:

```bash
COREPACK_HOME=/tmp/corepack pnpm verify
```

하네스 변경 시 추가:

```bash
COREPACK_HOME=/tmp/corepack pnpm harness:check
COREPACK_HOME=/tmp/corepack pnpm test -- scripts/harness/fixture-utils.test.js
```

DB schema/repository 변경 시 추가:

```bash
make test-integration
```

web 변경 시 추가:

```bash
COREPACK_HOME=/tmp/corepack pnpm --filter @stock-chatbot/web build
```

Telegram E2E harness 변경 시 추가:

```bash
COREPACK_HOME=/tmp/corepack pnpm test -- apps/telegram-bot/src/e2e/env.test.ts apps/telegram-bot/src/e2e/webhook-driver.test.ts
make test-integration
```

운영 영향 변경의 표준 마감 사이클:

1. 로컬 코드/문서 변경과 source-of-truth 동기화
2. `COREPACK_HOME=/tmp/corepack pnpm verify`와 필요한 범위별 추가 검증 수행
3. commit/push
4. production deploy 확인
5. Neon production DB schema/data 반영
6. public web/webhook/cron smoke
7. Telegram production E2E 또는 동등한 live verification

Telegram webhook, cron, public web feed/detail, production Neon schema/data를 건드린 작업은 이 사이클이 끝나기 전에는 완료가 아니다.

검증을 못 돌리면 다음을 반드시 결과에 적는다.

- 무엇을 못 돌렸는지
- 왜 못 돌렸는지
- 남는 리스크가 무엇인지

## Harness Rules

- 하네스는 snapshot만 보는 구조가 아니다.
- suite 기준선은 [harness/suite-contracts.json](/Users/jisung/Projects/stock-chatbot/harness/suite-contracts.json)에 있다.
- active suite는 fixture, grader, snapshot 요구사항을 기계적으로 만족해야 한다.
- 하네스 변경 시 [docs/harness-engineering.md](/Users/jisung/Projects/stock-chatbot/docs/harness-engineering.md)를 먼저 확인한다.

## Git Workflow

- 검증이 끝나기 전 commit하지 않는다.
- stage는 현재 작업과 관련된 파일만 포함한다.
- `.env`, `.env.*`, 키 파일, local-only 파일이 stage되지 않았는지 확인한다.
- 검증이 통과하면 기본적으로 다음을 수행한다.

```bash
git add .
git commit -m "<focused message>"
git push origin main
```

## Deployment and Environment Notes

- local dev/test DB는 Docker PostgreSQL이다.
- Neon은 local 검증이 끝난 뒤 production에서만 연결한다.
- Vercel은 public web, Telegram webhook, primary cron entrypoint를 담당한다.
- GitHub Actions는 CI와 backup/reconcile/manual rerun 용도다.
- production에 필요한 핵심 env는 대략 아래다.
  - `DATABASE_URL`
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_WEBHOOK_SECRET_TOKEN`
  - `CRON_SECRET`
  - `PUBLIC_BRIEFING_BASE_URL`
  - `OPENAI_API_KEY` 또는 `GEMINI_API_KEY`
  - `FRED_API_KEY`

## What Not to Break

- Telegram `/register`
- Telegram `/report`
- Telegram `/portfolio_add`, `/portfolio_list`, `/market_add`
- 그룹 온보딩 및 중복 없는 `/register` 안내
- scheduled daily delivery
- public feed/detail
- `/admin` 운영 콘솔
- strategy snapshot tracking
- user report settings (`report_mode`, public link on/off)
- public/private data boundary
- docs/code sync

## Current Priorities

현재 phase plan의 구현 항목은 모두 완료 상태다. 무작위 리팩토링으로 다음 일을 만들지 않는다. 다음 우선순위는 운영 연결과 smoke 검증이다.

1. Vercel production webhook / cron smoke
2. Neon production read/write smoke
3. 전략 스코어 튜닝과 운영 지표 보강

새 범위를 추가할 때는 먼저 change log와 PRD/phase plan을 갱신한다.
