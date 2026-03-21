# Vercel Deployment Runbook

## 목적

이 문서는 공개 브리핑 웹 frontend를 Vercel에 배포하기 위한 최소 설정 기준이다.

현재 기준:

- 개발/테스트 DB: 로컬 Docker PostgreSQL
- production 웹 DB: Neon PostgreSQL
- 배포 대상 앱: `apps/web`
- Telegram webhook command runtime도 `apps/web` 내부 route handler를 사용한다.
- Vercel Cron이 `daily-report` primary scheduler를 담당한다.

## Vercel 프로젝트 생성

1. Vercel에서 저장소를 import한다.
2. 프로젝트의 Root Directory를 `apps/web`로 설정한다.
3. Framework Preset은 `Next.js`를 사용한다.

권장 빌드 설정:

| 항목 | 값 |
| --- | --- |
| Root Directory | `apps/web` |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm build` |
| Output Directory | 비워 둠 |
| Node.js Version | `24.x` |

`apps/web/vercel.json`에도 같은 install/build 명령이 반영돼 있다.

## Production Environment Variables

Vercel 프로젝트에는 최소 아래 값이 필요하다.

```bash
DATABASE_URL=postgresql://neondb_owner:***@ep-***.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
TELEGRAM_BOT_TOKEN=123456:telegram-bot-token
TELEGRAM_WEBHOOK_SECRET_TOKEN=webhook-secret-token
CRON_SECRET=vercel-cron-shared-secret
```

메모:

- 공개 웹은 `DATABASE_URL`을 읽는다.
- webhook/cron route는 `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET_TOKEN`, `CRON_SECRET`을 사용한다.
- 개인화 브리핑 생성은 여전히 기존 worker/application 로직을 재사용한다.

## GitHub Actions 연동

공개 웹을 Vercel로 전환한 뒤에는 GitHub repository variable `PUBLIC_BRIEFING_BASE_URL`과 `VERCEL_RECONCILE_URL`을 실제 배포 URL로 맞춰야 한다.

예시:

```bash
PUBLIC_BRIEFING_BASE_URL=https://your-project.vercel.app
VERCEL_RECONCILE_URL=https://your-project.vercel.app/api/cron/reconcile
```

이 값은 아래 용도로 사용된다.

- Telegram 리포트 하단의 공개 상세 링크 생성
- daily report worker의 public detail URL 조합
- GitHub Actions `Daily Report` backup/reconcile 호출

GitHub repository secret에는 아래 값도 필요하다.

```bash
CRON_SECRET=vercel-cron-shared-secret
```

## Telegram webhook 등록

배포 후 Telegram bot은 polling 대신 webhook으로 등록해야 한다.

```bash
TELEGRAM_BOT_TOKEN=123456:telegram-bot-token \
TELEGRAM_WEBHOOK_URL=https://your-project.vercel.app/api/telegram/webhook \
TELEGRAM_WEBHOOK_SECRET_TOKEN=webhook-secret-token \
COREPACK_HOME=/tmp/corepack pnpm telegram:webhook:register
```

이 스크립트는 `setWebhook` 실행 후 `getWebhookInfo`까지 바로 출력한다.

## 배포 후 검증 체크리스트

1. `/`에서 최신순 feed가 보이는지 확인
2. `/reports/[id]` detail 페이지가 열리는지 확인
3. `/api/telegram/webhook` `GET`이 `mode=webhook`을 반환하는지 확인
4. `pnpm telegram:webhook:register` 후 `getWebhookInfo.url`이 새 도메인을 가리키는지 확인
5. 빈 DB 상태에서 empty state가 보이는지 확인
6. `DATABASE_URL`이 Neon으로 연결돼도 500 없이 조회되는지 확인
7. GitHub Actions `PUBLIC_BRIEFING_BASE_URL`과 `VERCEL_RECONCILE_URL`이 새 Vercel URL을 가리키는지 확인

## 비범위

- 개발 중 Neon을 기본 DB로 사용하지 않음
- polling runtime 제거 자체는 아직 비범위이며, local fallback으로만 유지할 수 있음
