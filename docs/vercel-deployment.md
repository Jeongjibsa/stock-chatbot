# Vercel Deployment Runbook

## 목적

이 문서는 공개 브리핑 웹 frontend를 Vercel에 배포하기 위한 최소 설정 기준이다.

현재 기준:

- 개발/테스트 DB: 로컬 Docker PostgreSQL
- production 웹 DB: Neon PostgreSQL
- 배포 대상 앱: `apps/web`

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
```

메모:

- 웹 frontend는 `DATABASE_URL`만 읽는다.
- Telegram, FRED, LLM API key는 Vercel 웹 배포에 필요하지 않다.
- 개인화 기능은 계속 worker와 Telegram bot이 담당한다.

## GitHub Actions 연동

공개 웹을 Vercel로 전환한 뒤에는 GitHub repository variable `PUBLIC_BRIEFING_BASE_URL`을 실제 배포 URL로 맞춰야 한다.

예시:

```bash
PUBLIC_BRIEFING_BASE_URL=https://your-project.vercel.app
```

이 값은 아래 용도로 사용된다.

- Telegram 리포트 하단의 공개 상세 링크 생성
- daily report worker의 public detail URL 조합

## 배포 후 검증 체크리스트

1. `/`에서 최신순 feed가 보이는지 확인
2. `/reports/[id]` detail 페이지가 열리는지 확인
3. 빈 DB 상태에서 empty state가 보이는지 확인
4. `DATABASE_URL`이 Neon으로 연결돼도 500 없이 조회되는지 확인
5. GitHub Actions `PUBLIC_BRIEFING_BASE_URL`이 새 Vercel URL을 가리키는지 확인

## 비범위

- Telegram bot/webhook을 Vercel로 이전하지 않음
- worker/scheduler를 Vercel cron으로 이전하지 않음
- 개발 중 Neon을 기본 DB로 사용하지 않음
