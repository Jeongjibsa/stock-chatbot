# Telegram Production Test Scenarios

## 목적

이 문서는 production 기준 Telegram 연동을 실제 사용자 관점에서 점검하기 위한 운영 체크리스트다.

현재 기준:

- public web: `https://web-three-tau-58.vercel.app`
- Telegram webhook: `https://web-three-tau-58.vercel.app/api/telegram/webhook`
- 개인화 리포트는 DM 전용
- 그룹은 온보딩 및 `/register` 유도 전용

## 사전 조건

아래 조건이 먼저 만족되어야 한다.

1. Telegram bot의 privacy mode가 `Disable` 상태다.
2. bot이 그룹의 관리자다.
3. webhook이 production URL로 등록되어 있다.
4. webhook 등록 시 `TELEGRAM_WEBHOOK_SECRET_TOKEN`이 함께 설정되어 있다.
5. Vercel env와 Neon production schema가 준비되어 있다.
6. `/admin` Basic Auth 계정이 준비되어 있다.

## 시나리오 1. DM 기본 온보딩

### 절차

1. bot과 1:1 DM을 연다.
2. `/start`를 실행한다.
3. `/help`를 실행한다.

### 기대 결과

- `/start`와 `/help`는 한국어로 응답한다.
- 권장 흐름이 보여야 한다.
  - `/register`
  - `/report`
  - `/portfolio_add`
  - `/portfolio_list`
  - `/report_settings`
- 설명은 짧고 명확해야 한다.

## 시나리오 0. webhook secret 보호 경계

### 절차

1. `/api/telegram/webhook`에 secret header 없이 POST를 보낸다.
2. 같은 요청에 `x-telegram-bot-api-secret-token` 헤더를 정확히 넣어 다시 보낸다.

### 기대 결과

- header 없이 보낸 요청은 `401` 또는 `500`으로 차단돼야 한다.
- 올바른 secret header가 있는 요청만 `200`으로 통과해야 한다.
- production에서는 secret env가 빠진 상태로 webhook이 열려 있으면 안 된다.

## 시나리오 2. 등록 후 즉시 리포트

### 절차

1. DM에서 `/register`를 실행한다.
2. 바로 `/report`를 실행한다.

### 기대 결과

- `/register` 성공 메시지에 다음 단계 안내가 포함된다.
  - `/report`
  - `/portfolio_add`
- `/report`는 보유 종목이 없어도 실패하지 않는다.
- 보유 종목 관련 섹션을 제외한 시장 중심 브리핑이 생성된다.
- 공개 상세 링크가 기본값이면 하단에 노출된다.

## 시나리오 3. 포트폴리오 입력과 조회

### 절차

1. DM에서 `/portfolio_add`를 실행한다.
2. 종목명, 평단, 수량을 입력한다.
3. `/portfolio_list`를 실행한다.
4. `/report`를 다시 실행한다.

### 기대 결과

- 입력한 종목이 저장된다.
- `/portfolio_list`에 입력한 종목만 보인다.
- `/report`에 해당 종목 기반 개인화 섹션이 포함된다.
- 다른 사용자의 종목은 절대 섞이지 않는다.

## 시나리오 4. 관심 지표 deprecation

### 절차

1. DM에서 `/market_add`를 실행한다.
3. `/market_items`를 실행한다.

### 기대 결과

- 두 명령 모두 더 이상 개인화 대상이 아니라는 안내를 반환한다.
- 이후 `/report`는 사용자별 관심 지표가 아니라 시스템 기본 시장 지표 세트를 사용한다.

## 시나리오 5. 리포트 설정

### 절차

1. DM에서 `/report_settings`를 실행한다.
2. `브리핑 켜기` inline button을 누른다.
3. `브리핑 끄기` inline button을 누른다.
4. `시간 변경` inline button을 누른다.

### 기대 결과

- inline button이 실제로 반응하고 상태가 갱신된다.
- 시간 변경 버튼은 더 이상 입력 대기 상태로 가지 않고, `07:30 / 20:30` 고정 운영과 주말 skip 규칙을 안내한다.

## 시나리오 6. 그룹 온보딩

### 절차

1. 미등록 사용자를 그룹에 초대한다.
2. 그룹 입장 직후 안내 메시지를 확인한다.
3. 같은 사용자가 그룹에서 일반 메시지를 1개 보낸다.

### 기대 결과

- 환영 메시지는 1회만 나와야 한다.
- 메시지는 `/register`를 DM에서 하라고 안내해야 한다.
- 개인화 정보는 그룹에 노출되지 않아야 한다.
- 동일 조인 이벤트에 대해 중복 안내가 나오면 안 된다.

## 시나리오 7. 그룹에서 등록 시도

### 절차

1. 그룹에서 `/register`를 실행한다.

### 기대 결과

- 그룹에서는 계정 생성 또는 안내만 수행한다.
- DM에서 다시 `/register`하라는 메시지가 나와야 한다.
- 개인 발송 대상 chat은 DM에서만 확정된다.

## 시나리오 8. 공개 웹과 개인정보 경계

### 절차

1. public web `/`에 접속한다.
2. 브리핑이 없으면 empty state를 확인한다.
3. 브리핑이 생성된 뒤 `/reports/[id]` detail을 확인한다.

### 기대 결과

- 공개 웹에는 보유 종목, 개인 기사 요약, 개인 점수카드가 없어야 한다.
- 공개 가능한 시장/매크로/자금/이벤트/리스크만 보여야 한다.
- detail에는 세션에 맞는 `브리핑 역할`이 직접 노출돼야 한다.
  - `pre_market`: `미장 마감 분석 기반 국장 시초가 예측`
  - `post_market`: `국장/대체거래소 결과 분석 및 미장 예보`
  - `weekend_briefing`: `주간 이슈 총정리 및 다음 주 일정 요약`
- `시장 종합 해석` 첫 문장은 해당 세션의 목적을 직접 설명해야 한다.
- `핵심 뉴스 이벤트`는 실제 RSS 기사 기준의 `출처 + 헤드라인 + 브리핑용 요약 제안` 구조여야 한다.
- `거시 트렌드 뉴스`와 `참고한 뉴스 출처` 섹션이 함께 보여야 한다.
- 개인화 정보는 Telegram DM에서만 확인 가능해야 한다.

## 시나리오 9. 운영 보호 경계

### 절차

1. `/admin`에 인증 없이 접속한다.
2. Basic Auth로 접속한다.

### 기대 결과

- 인증 없이 접근하면 `401`이어야 한다.
- 인증 후에는 최근 공개 브리핑, 최근 실행 로그, 최근 전략 회고가 보여야 한다.
- 운영 콘솔에도 개인 포트폴리오 상세는 없어야 한다.

## 시나리오 10. 스케줄/백업 경로

### 절차

1. 운영자가 `GET /api/cron/daily-report`를 Bearer auth로 호출한다.
2. 운영자가 `GET /api/cron/reconcile`를 Bearer auth로 호출한다.
3. GitHub Actions `Daily Report`를 `workflow_dispatch`로 한 번 실행한다.

### 기대 결과

- 두 route 모두 `200` JSON을 반환한다.
- due user가 없으면 `userCount`만 보이고 실패 없이 끝나야 한다.
- GitHub Actions run도 success여야 한다.
- `VERCEL_RECONCILE_URL + CRON_SECRET` 조합으로 backup 경로가 동작해야 한다.

## 시나리오 11. 임시 cron 재배치 smoke

### 절차

1. production deploy 전에 cron 스케줄을 현재 UTC 기준 가까운 시각으로 임시 조정한다.
2. production deploy를 수행한다.
3. Vercel Hobby의 1시간 flexible window를 감안해 `/api/cron/pre-market-briefing`, `/api/cron/post-market-briefing` 자동 invocation 로그를 확인한다.
4. `reports`에 같은 날짜 `pre_market`, `post_market` row가 적재됐는지 확인한다.
5. `report_runs` 또는 운영 로그에서 같은 세션의 개인 정기 리포트가 공개 브리핑 row 이후에 완료됐는지 확인한다.
6. 검증이 끝나면 cron 스케줄을 `07:30 pre / 20:30 post` 고정값으로 되돌려 다시 production deploy한다.

### 기대 결과

- 두 cron route 모두 실제 스케줄 invocation으로 `200` 완료되어야 한다.
- 공개 브리핑 row가 먼저 생성되고, 그 뒤 같은 날짜/세션의 개인 정기 리포트가 이어져야 한다.
- scheduled Telegram 리포트는 공개 브리핑 row의 `summary/signals`를 재사용해 공통 시장 해석용 추가 LLM 조합 없이 발송되어야 한다.
- 마지막 production deploy 후 cron 정의는 다시 `30 22 * * 0-5`, `30 11 * * 1-5`로 복구돼 있어야 한다.
- 임시 UTC 시각은 반드시 서울 기준 유효 세션 창을 만족해야 한다. 금요일 늦은 UTC 시각은 서울 기준 토요일 00시 이후가 되어 `post_market` 자동 smoke가 skip될 수 있다.

## 시나리오 12. current-week 공개 브리핑 coverage / backfill

### 절차

1. `GET /api/cron/public-backfill?briefingSession=...&reportRunDate=...`를 current-week 허용 세션 수만큼 호출한다.
2. 필요 시 로컬 worker `run:backfill-public-week`는 참고용으로만 사용하고, 최종 source-of-truth는 production site runtime backfill 결과로 본다.
3. 이어서 `pnpm --filter @stock-chatbot/worker run run:verify-public-week`를 실행한다.
4. public feed에서 이번 주 날짜 그룹과 `pre_market`, `post_market`, `weekend_briefing` 노출을 확인한다.

### 기대 결과

- 서울 기준 이번 주 월요일부터 현재까지 허용된 세션 row가 `reports`에 모두 존재해야 한다.
- 토요일 기준 기대 세션은 `월~금 pre/post + 토 pre + 토 weekend`다.
- `/api/cron/public-backfill`와 `run:backfill-public-week`는 기본적으로 `DISABLE_UPSTASH_NEWS_CACHE=true` 경로를 사용해 cross-session dedupe 때문에 뉴스 출처가 비는 현상을 줄여야 한다.
- `run:verify-public-week`는 최소 `pre_market`, `weekend_briefing` detail에서 `브리핑 역할`, `시장 종합 해석`, `핵심 뉴스 이벤트`, `거시 트렌드 뉴스`, `참고한 뉴스 출처`를 확인해야 한다.
- final gate에서 `pnpm e2e:final -- --scope=ops`를 실행할 때도 같은 coverage smoke가 포함되어야 한다.

## 운영 메모

- Neon free tier를 아끼기 위해 production smoke는 schema 적용과 최소 GET/empty state 확인까지만 수행한다.
- 공개 feed가 empty state인 것은 정상일 수 있다. 아직 `reports`에 공개 브리핑이 저장되지 않았다는 뜻일 뿐이다.
- 첫 실운영 브리핑이 생성되면 `/`와 `/reports/[id]`를 다시 확인한다.
- Telegram 실운영 점검은 반드시 DM, 그룹, 공개 웹을 분리해 확인한다.
- `/unregister`는 이제 user row 삭제가 아니라 soft reset이므로, 운영 DB 확인 시 `is_registered=false`와 holdings/conversation cleanup을 기준으로 본다.
- 필요 시 `/admin`에서 test user를 block/unblock 하며 수동 제어 smoke를 추가할 수 있다.

## 최소 회귀 세트

실제 운영 배포 후 빠르게 회귀를 확인할 때는 아래 8개를 우선 실행한다.

1. `smoke_connectivity`
2. `dm_onboarding`
3. `register_basic`
4. `unregister_reregister`
5. `portfolio_add_exact_symbol`
6. `portfolio_bulk_mixed`
7. `report_without_holdings`
8. `report_with_holdings`

자동화 실행 경로와 env는 [docs/telegram-e2e-harness.md](/Users/jisung/Projects/stock-chatbot/docs/telegram-e2e-harness.md)를 따른다.

운영 경로 보강:

- cron/public 경로를 수정한 change set에서는 최소 회귀 세트와 별도로 공개 브리핑 cron이 LLM timeout 시에도 rule-based fallback으로 `200`을 반환하고 `reports` 적재를 계속하는지 확인한다.
- 공개 브리핑 포맷을 수정한 change set에서는 `pre_market`, `post_market`, `weekend_briefing` 중 영향을 받은 세션 row를 production에서 다시 생성한 뒤, public detail에서 `브리핑 역할`, 목적 문장, RSS headline 기반 `핵심 뉴스 이벤트`, `거시 트렌드 뉴스`, `참고한 뉴스 출처`를 직접 확인한다.
- public feed가 의도보다 적은 수의 row만 보이면 worker current-week backfill을 먼저 수행하고, `run:verify-public-week`로 DB와 detail HTML을 동시에 확인한다.
- cron 스케줄 자체를 만진 change set에서는 임시 재배치 smoke를 수행한 뒤, 마지막 production deploy에서 반드시 오전/오후 고정 스케줄 정의를 복구한다.
