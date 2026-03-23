# Telegram E2E Harness

## 목적

이 문서는 production-like Telegram E2E harness의 실행 방식과 자동화 경계를 설명한다.

현재 기준 harness는 다음을 동시에 검증한다.

- 실제 production webhook route 통과 여부
- 실제 Telegram Bot API outbound reply 경로
- DB side effect (`users`, `portfolio_holdings`, `report_runs` 등)
- 멀티유저/그룹 분리 정책

## 핵심 원칙

- UI/browser automation은 사용하지 않는다.
- command handler mocking은 사용하지 않는다.
- inbound는 synthetic webhook update를 production webhook route에 직접 POST한다.
- outbound는 bot runtime이 실제 Telegram Bot API `sendMessage`를 사용한다.
- Telegram-visible reply text는 `telegram_outbound_messages` audit log로 검증한다.

## 왜 inbound를 webhook update로 주입하나

Telegram Bot API는 bot이 “사용자처럼” DM 명령을 보내는 기능을 제공하지 않는다. 현재 webhook 모드에서는 `getUpdates` polling도 primary test path가 아니다.

그래서 현재 harness는 다음 절충안을 사용한다.

1. inbound:
   - production webhook URL
   - `x-telegram-bot-api-secret-token`
   - Telegram update payload
2. bot runtime:
   - 실제 `build-bot` command flow
   - 실제 repository write path
   - 실제 Telegram Bot API outbound
3. assertion:
   - outbound audit log
   - DB state

이 방식은 command handler를 mock하지 않으면서도 production integration path를 최대한 유지한다.

운영 기준:

- Telegram webhook, `/report`, `/register`, `/portfolio_*`, cron/public feed와 연결된 변경은 production 반영 후 이 하네스의 minimum suite 또는 동등한 live verification을 마지막 단계로 수행한다.
- 로컬 검증만 통과한 상태는 운영 영향 변경의 완료로 간주하지 않는다.

## 환경 변수

예시는 [apps/telegram-bot/.env.e2e.example](/Users/jisung/Projects/stock-chatbot/apps/telegram-bot/.env.e2e.example)에 있다.

필수:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_URL`
- `TELEGRAM_WEBHOOK_SECRET_TOKEN`
- `DATABASE_URL`
- `TELEGRAM_E2E_PRIMARY_CHAT_ID`
- `TELEGRAM_E2E_PRIMARY_USER_ID`

선택:

- `TELEGRAM_E2E_SECONDARY_CHAT_ID`
- `TELEGRAM_E2E_SECONDARY_USER_ID`
- `TELEGRAM_E2E_GROUP_CHAT_ID`
- `TELEGRAM_E2E_TIMEOUT_MS`
- `TELEGRAM_E2E_POLL_INTERVAL_MS`
- `TELEGRAM_E2E_CLEANUP`

안전장치:

- 실제 운영 채팅에 write를 발생시키므로 `TELEGRAM_E2E_ALLOW_PRODUCTION=1` 또는 `--allow-production`이 있어야 실행된다.

## 실행 명령

최소 회귀 세트:

```bash
COREPACK_HOME=/tmp/corepack pnpm test:telegram:e2e -- --suite=minimum --allow-production
```

전체 세트:

```bash
COREPACK_HOME=/tmp/corepack pnpm test:telegram:e2e -- --suite=full --allow-production
```

특정 시나리오만:

```bash
COREPACK_HOME=/tmp/corepack pnpm test:telegram:e2e -- --scenario=register_basic,portfolio_add_exact_symbol --allow-production
```

결과를 파일로 저장:

```bash
COREPACK_HOME=/tmp/corepack pnpm test:telegram:e2e -- --suite=minimum --allow-production --output=/tmp/telegram-e2e-results.json
```

## 최소 회귀 세트

현재 최소 8개 시나리오는 아래다.

1. `smoke_connectivity`
2. `dm_onboarding`
3. `register_basic`
4. `unregister_reregister`
5. `portfolio_add_exact_symbol`
6. `portfolio_bulk_mixed`
7. `report_without_holdings`
8. `report_with_holdings`

`report_with_holdings`는 현재 아래까지 함께 본다.

- 보유 종목명이 실제 답장과 `report_runs.report_text`에 포함되는지
- `포트폴리오 리밸런싱 제안` 묶음이 보이는지
- `시세 스냅샷 연결 전입니다` placeholder가 남지 않는지
- `/report`가 실행 시점에 맞는 세션 제목(`프리마켓` 또는 `포스트마켓`)을 선택하는지
- `/unregister` 후에도 user row가 남고 `is_registered=false`로 soft reset 되는지

정기 발송과 공개 브리핑의 운영 캘린더는 별도로 아래를 따른다.

- `월~금`: 07:30 pre + 20:30 post
- `토`: 07:30 pre만 실행
- `일`: 정기/public 브리핑 없음

`/report_time`과 settings의 `시간 변경` 버튼은 더 이상 개별 시각 변경이 아니라 위 고정 정책 안내를 검증 대상으로 본다.
Telegram rate-limit은 production minimum suite에서 직접 소진하지 않는다. 다만 test runtime의 `resetUser()`는 scenario 독립성을 위해 request history와 block 상태까지 정리하고, 실제 `/unregister` 시나리오는 soft reset semantics를 별도로 검증한다.

## 자동화 범위

완전 자동화 가능:

- `/start`
- `/help`
- `/register`
- duplicate `/register`
- `/unregister`
- `/portfolio_add`
- `/portfolio_bulk`
- `/portfolio_list`
- `/portfolio_remove`
- `/report`
- `/admin` block/unblock route unit test

조건부 자동화:

- 멀티유저 격리
  - secondary DM chat/user env 필요
- 그룹 온보딩
  - group chat env 필요

수동 보완이 필요한 부분:

- 실제 Telegram client 화면 렌더링 확인
- push notification / mobile notification 동작
- 인간 사용자의 오타/지연/중단 입력 체감 UX

## 정리 규칙

- 기본적으로 `TELEGRAM_E2E_CLEANUP=1`이라 suite 종료 후 test user와 test outbound log를 정리한다.
- production-like DB 오염을 줄이기 위해 dedicated test chat/user를 쓰는 것이 권장된다.
- group/secondary env가 없으면 해당 시나리오는 `skipped`로 기록된다.
