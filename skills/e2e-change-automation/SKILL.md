---
name: e2e-change-automation
description: Use when implementing or fixing behavior in this stock-chatbot project and you need to carry the work through scenario updates, scope-based validation, and final live Telegram E2E verification.
---

# E2E Change Automation

이 skill은 이 저장소의 기본 작업 루프를 `구현 -> 시나리오 갱신 -> 범위별 검증 -> 최종 live E2E`로 강제하기 위한 운영용 skill이다.

## Read First

작업 시작 전에 아래를 확인한다.

- `docs/e2e-change-workflow.md`
- `docs/harness-engineering.md`
- `docs/telegram-e2e-harness.md`
- `docs/telegram-e2e-test-scenarios.md`
- `docs/telegram-production-test-scenarios.md`

요구사항/범위가 바뀌면 추가로 아래를 같이 갱신한다.

- `docs/change-log.md`
- `docs/initial-prd.md`
- `docs/phase-plan.md`
- `docs/context-summary.md`

## Required Workflow

1. 변경 범위를 먼저 분류한다.
   - `default`
   - `db`
   - `web`
   - `telegram-harness`
   - `ops`
2. `docs/e2e-change-workflow.md`의 시나리오 기준선에서 영향받는 항목을 찾는다.
3. 새 기능/버그 수정에 맞춰 테스트 시나리오 delta를 문서와 테스트 코드에 반영한다.
4. 구현과 테스트를 같은 change set에서 수정한다.
5. 아래 최종 gate를 실행한다.

```bash
COREPACK_HOME=/tmp/corepack pnpm e2e:final -- --scope=<comma-separated-scopes> --allow-production --suite=minimum
```

6. live suite를 못 돌리면 그 이유와 남는 리스크를 blocked 상태로 명시한다.
7. webhook, cron, public web, Neon production에 영향이 있는 작업은 deploy/production smoke/E2E까지 끝나야 완료로 본다.

## Scope Guide

- `default`: 일반 기능 변경
- `db`: schema, migration, repository, read model
- `web`: Next.js feed/detail/admin, webhook/cron route
- `telegram-harness`: E2E driver, scenario, env, runtime
- `ops`: production 경로, webhook/cron/public feed, live delivery semantics

겹치는 경우는 comma로 함께 넘긴다. 예: `db,web,ops`

## Output Contract

작업 결과 보고에는 아래를 항상 포함한다.

- 어떤 시나리오를 추가/수정했는지
- 어떤 scope로 검증했는지
- `pnpm e2e:final` 실행 결과
- 실행하지 못한 검증과 이유
- 남는 운영 리스크

## Do Not Skip

- 시나리오 문서 업데이트 없는 기능 추가
- 테스트 없는 구현
- live E2E 없이 “완료” 선언
- source-of-truth 문서와 코드 기준선 불일치
