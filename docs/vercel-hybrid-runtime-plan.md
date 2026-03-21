# Vercel Hybrid Runtime Plan

## 목적

이 문서는 Telegram command runtime과 daily report scheduling을 `Vercel primary + GitHub Actions backup` 구조로 옮기기 위한 구현 기준을 정리한다.

현재 가정:

- active user 수는 10명 이하
- 공개 웹은 이미 `apps/web`의 Next.js App Router로 전환됨
- 로컬 개발/테스트는 Docker PostgreSQL 기준
- production DB는 Neon

## 운영 원칙

- Telegram command는 polling을 중단하고 webhook으로 전환한다.
- 개인화 일일 브리핑은 Vercel Cron이 1차 실행을 담당한다.
- GitHub Actions는 CI와 backup/reconcile/manual rerun만 담당한다.
- 동일 사용자/날짜 조합은 `report_runs` 기준으로 idempotent하게 처리한다.

## Route Contracts

### `/api/telegram/webhook`

역할:

- Telegram update 수신
- command dispatch
- group onboarding 메시지 처리
- DM `/register`, `/report`, `/portfolio_*`, `/market_*`, `/report_*` 처리

요구사항:

- Telegram `setWebhook` URL로 등록 가능해야 함
- webhook secret 또는 최소 토큰 검증을 둘 수 있어야 함
- 응답 시간이 길어질 수 있는 작업은 내부 service call 기준으로 1회 처리

### `/api/cron/daily-report`

역할:

- Vercel Cron primary entrypoint
- 같은 날짜의 공개 브리핑 생성
- due user 조회
- 개인화 Telegram DM 발송

요구사항:

- KST 오전 브리핑은 UTC cron으로 변환해 호출
- 동일 날짜 재호출 시 중복 발송을 차단

### `/api/cron/reconcile`

역할:

- GitHub Actions 또는 운영자 수동 호출용 backup/reconcile entrypoint
- Vercel Cron 실패 또는 일부 사용자 누락 시 미완료 대상만 재처리

요구사항:

- full rerun이 아니라 missing run만 복구
- manual run date override 허용 가능

## Migration Steps

1. `apps/telegram-bot` command router와 onboarding 로직을 webhook-compatible service로 분리
2. `apps/web`에 route handlers 추가
3. Telegram `setWebhook` 운영 절차와 smoke test 추가
4. Vercel Cron 설정 추가
5. GitHub Actions `Daily Report` workflow를 reconcile/manual rerun 중심으로 축소
6. polling runtime 제거 또는 deprecated 처리

## Non-Goals

- Telegram bot 전체를 독립 app server로 계속 운영하지 않음
- 사용자 수 10명 초과 대규모 fan-out 최적화는 현재 범위 밖
- 별도 queue 인프라 도입은 현재 범위 밖
