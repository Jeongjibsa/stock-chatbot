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
4. Vercel env와 Neon production schema가 준비되어 있다.
5. `/admin` Basic Auth 계정이 준비되어 있다.

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
  - `/market_add`
- 설명은 짧고 명확해야 한다.

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

## 시나리오 4. 관심 지표 설정

### 절차

1. DM에서 `/market_add`를 실행한다.
2. 관심 지표를 추가한다.
3. `/market_items`를 실행한다.

### 기대 결과

- 사용자의 관심 지표가 저장된다.
- `/market_items`는 사용자별 목록만 보여준다.
- 이후 `/report`에서 반영 가능한 지표는 해당 사용자 맥락으로 사용된다.

## 시나리오 5. 리포트 설정

### 절차

1. DM에서 `/report_settings`를 실행한다.
2. `/report_mode compact`를 실행한다.
3. `/report`를 실행한다.
4. `/report_link_off`를 실행한다.
5. `/report`를 다시 실행한다.
6. `/report_mode standard`와 `/report_link_on`으로 원복한다.

### 기대 결과

- `compact` 모드에서는 하단 상세 섹션이 압축된다.
- `link_off` 상태에서는 공개 링크가 제거된다.
- 설정은 사용자별로만 반영된다.

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

## 운영 메모

- Neon free tier를 아끼기 위해 production smoke는 schema 적용과 최소 GET/empty state 확인까지만 수행한다.
- 공개 feed가 empty state인 것은 정상일 수 있다. 아직 `reports`에 공개 브리핑이 저장되지 않았다는 뜻일 뿐이다.
- 첫 실운영 브리핑이 생성되면 `/`와 `/reports/[id]`를 다시 확인한다.
- Telegram 실운영 점검은 반드시 DM, 그룹, 공개 웹을 분리해 확인한다.
