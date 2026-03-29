# E2E Change Workflow

## 목적

이 문서는 이 저장소에서 기능 추가나 버그 수정이 발생할 때 `구현 -> 테스트 시나리오 갱신 -> 범위별 검증 -> 최종 live E2E`를 같은 루프 안에서 끝내기 위한 기준선입니다.

핵심 규칙:

- 사용자-visible 변경이나 운영 경로 변경은 시나리오 delta 없이 끝내지 않습니다.
- 최종 마감은 `pnpm e2e:final` 또는 동등한 live verification까지 포함합니다.
- live E2E를 못 돌리면 완료가 아니라 blocked 상태로 보고합니다.
- browser verification은 `web` 변경일 때만 Playwright를 조건부로 사용합니다.
- GitHub Actions/CI 변경은 코드 수정만으로 끝내지 않고 workflow inventory와 최근 failing run 확인까지 포함합니다.

## 기본 작업 순서

1. 변경 범위를 분류합니다.
   - `default`
   - `db`
   - `web`
   - `telegram-harness`
   - `ops`
2. GitHub Actions/CI를 건드리는 변경이면 `gh workflow list`, `gh run list --limit <n>`, `gh run view <run-id> --log-failed`로 현재 inventory와 최근 실패 원인을 먼저 확인합니다.
3. 아래 시나리오 기준선에서 영향받는 항목을 찾고, 기대 결과를 문서와 테스트에 반영합니다.
4. 코드와 테스트를 함께 수정합니다.
5. source-of-truth 문서가 바뀌면 `change-log -> PRD -> phase plan -> context summary` 순으로 동기화합니다.
6. 로컬 범위 검증을 실행합니다.
7. `pnpm e2e:final -- --scope=... --allow-production --suite=minimum`으로 최종 gate를 수행합니다.
8. production 영향 변경은 deploy/DB 반영 후 live E2E 결과까지 남깁니다.

## 시나리오 기준선

| Surface | 반드시 확인할 시나리오 | 자동화 자산 |
| --- | --- | --- |
| DM 온보딩 | `/start`, `/help`, `/register`, duplicate `/register`, `/unregister` | `docs/telegram-e2e-test-scenarios.md`, `apps/telegram-bot/src/e2e/scenarios.ts` |
| 포트폴리오 입력 | `/portfolio_add` exact/alias/ambiguous/failure, `/portfolio_bulk`, `/portfolio_list`, `/portfolio_remove` | same as above |
| 개인화 브리핑 | `/report` without holdings, `/report` with holdings, 세션별 제목/핵심 섹션 분기, placeholder 부재, public link 노출 규칙, legacy/`확인 필요` 문구 부재 | same as above + `report_runs` assertion |
| 그룹/운영 제어 | 그룹 온보딩, 그룹 `/register`, rate-limit/block, `/admin` block/unblock | E2E scenario + 관련 unit/integration tests |
| 공개 웹/운영 경로 | webhook secret 보호, `/api/cron/*`, 공개 feed/detail privacy, `/admin` auth, public briefing LLM timeout fallback, `weekend_briefing` 생성, 공개 웹의 세션별 `브리핑 역할`, RSS headline 기반 `핵심 뉴스 이벤트`, 거시 트렌드 뉴스와 출처 링크 노출, 최근 7일 rolling public briefing recovery coverage, 임시 cron 재배치 후 자동 업로드 확인/고정 스케줄 복구 | `docs/telegram-production-test-scenarios.md`, web/integration tests |

새 기능을 추가하면 위 표에 row를 늘리거나 기존 row의 기대 결과를 명시적으로 강화합니다.

## 검증 매트릭스

| Scope | 추가 검증 | 이유 |
| --- | --- | --- |
| `default` | `pnpm verify` + Telegram E2E unit checks + live minimum suite | 기본 회귀와 세션별 `/report` 문구/placeholder 회귀 |
| `db` | `make test-integration` | repository/schema 경로 검증. integration test는 반드시 로컬 Docker PostgreSQL만 사용해야 하며, non-local/Neon `DATABASE_URL` 대상으로는 실행되면 안 된다. |
| `web` | `pnpm --filter @stock-chatbot/web build` | Vercel/Next.js 빌드 회귀 |
| `telegram-harness` | `make test-integration` + E2E env/webhook-driver tests | 하네스/driver 회귀 |
| `ops` | `make test-integration` + web build + rolling 7-day public recovery smoke + live minimum suite + production cron smoke + GitHub Actions triage(해당 시) | webhook/cron/feed/admin 운영 경로와 cron fallback/재배치, `weekend_briefing`, Upstash env wiring, 최근 7일 public archive recovery smoke, workflow inventory/최근 failing run 회귀 |

## 자동화 명령

기본 최종 gate:

```bash
COREPACK_HOME=/tmp/corepack pnpm e2e:final -- --scope=default --allow-production --suite=minimum
```

DB + web + 운영 영향 변경:

```bash
COREPACK_HOME=/tmp/corepack pnpm e2e:final -- --scope=db,web,ops --allow-production --suite=minimum
```

로컬 준비 단계에서 live suite만 잠시 건너뛰는 예시:

```bash
COREPACK_HOME=/tmp/corepack pnpm e2e:final -- --scope=telegram-harness --skip-live
```

주의:

- `--skip-live`는 로컬 준비 단계용입니다.
- 최종 완료 보고에는 `--allow-production` 기반 live suite 또는 동등한 production verification이 필요합니다.
- integration test는 검증용 로컬 DB와 운영용 Neon DB를 반드시 분리해야 합니다. Docker Postgres를 띄운 뒤에도 production `DATABASE_URL`을 넘긴 채 실행하면 안 됩니다.
- Upstash는 source-of-truth가 아니므로 cache 관련 변경일 때만 검증 대상으로 올립니다.

## 에이전트용 완료 정의

아래 4개가 모두 있어야 완료입니다.

1. 변경된 기능에 대한 테스트 시나리오 delta
2. 구현과 테스트 코드
3. 범위별 로컬 검증 결과
4. 최종 live E2E 결과 또는 명시적 blocker

## 관련 문서와 skill

- `docs/harness-engineering.md`
- `docs/telegram-e2e-harness.md`
- `docs/telegram-e2e-test-scenarios.md`
- `docs/telegram-production-test-scenarios.md`
- `skills/e2e-change-automation/SKILL.md`
