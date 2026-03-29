# Telegram E2E Test Scenarios

## 목적

이 문서는 현재 production 기준 Telegram 봇의 핵심 사용자 흐름을 끝까지 검증하기 위한 실사용 체크리스트다.

검증 범위:

- `/start`, `/help`, `/register`, `/unregister`
- `/portfolio_add` 검색/선택/저장
- `/portfolio_bulk` 벌크 추가
- `/portfolio_list`, `/portfolio_remove`
- `/report`
- 그룹 입장 안내와 DM 유도

## 테스트 전제

아래 조건이 먼저 만족돼야 한다.

1. Telegram webhook이 production URL에 등록돼 있다.
2. `TELEGRAM_WEBHOOK_SECRET_TOKEN` 검증이 활성화돼 있다.
3. production DB에 `ticker_masters`가 적재돼 있다.
4. 봇 privacy mode는 `Disable` 상태다.
5. 그룹 테스트 시 봇은 관리자 권한이 있다.

## 테스트 계정

최소 아래 2개 계정을 준비한다.

- `User A`: 주 사용 테스트 계정
- `User B`: 그룹 안내/개인화 분리 검증용 보조 계정

## 시나리오 1. DM 기본 온보딩

### 절차

1. 봇과 1:1 DM을 연다.
2. `/start`를 실행한다.
3. `/help`를 실행한다.

### 기대 결과

- 두 명령 모두 한국어로 응답한다.
- 아래 흐름이 짧고 명확하게 안내된다.
  - `/register`
  - `/report`
  - `/portfolio_add`
  - `/portfolio_bulk`
  - `/portfolio_list`

## 시나리오 2. 등록 기본 흐름

### 절차

1. DM에서 `/register`를 실행한다.

### 기대 결과

- 등록 완료 메시지가 나온다.
- 다음 단계로 `/report`, `/portfolio_add`, `/portfolio_bulk`가 안내된다.

## 시나리오 3. 중복 등록

### 절차

1. 이미 등록된 상태에서 `/register`를 다시 실행한다.

### 기대 결과

- 중복 등록 에러로 끊기지 않는다.
- 이미 등록된 사용자라는 점을 안내한다.
- 필요 시 `/unregister`로 초기화할 수 있다고 안내한다.

## 시나리오 4. 등록 초기화

### 절차

1. DM에서 `/unregister`를 실행한다.
2. 다시 `/register`를 실행한다.

### 기대 결과

- 등록/설정 초기화가 완료된다.
- 다시 `/register`할 수 있다.
- 초기화 후 `/portfolio_list`는 비어 있거나 재등록 안내를 반환한다.

## 시나리오 5. `/portfolio_add` exact symbol 검색

### 절차

1. `/portfolio_add`
2. `005930` 입력
3. `예` 입력
4. 평균단가/수량/메모를 순서대로 입력한다.

### 기대 결과

- `삼성전자 (005930)를 추가할까요? [예/아니오]` 형태의 확인 메시지가 나온다.
- 마지막에 `삼성전자(005930)가 추가되었습니다`가 나온다.

## 시나리오 6. `/portfolio_add` 한글 alias 검색

### 절차

1. `/portfolio_add`
2. `삼전` 입력

### 기대 결과

- `삼성전자 (005930)`가 high-confidence confirm 또는 top result로 나온다.

## 시나리오 7. `/portfolio_add` 회사명 검색

### 절차

1. `/portfolio_add`
2. `현대차` 입력

### 기대 결과

- `현대자동차 (005380)`가 확인 또는 최상위 결과로 나온다.

## 시나리오 8. `/portfolio_add` 영문 오타 검색

### 절차

1. `/portfolio_add`
2. `tesl` 입력

### 기대 결과

- `Tesla Inc. Common Stock (TSLA)`가 최상위 결과로 나온다.

## 시나리오 9. `/portfolio_add` 다건 후보 선택

### 절차

1. `/portfolio_add`
2. `삼성` 입력
3. 후보 리스트가 나오면 숫자 `1` 입력

### 기대 결과

- 상위 5개 이하의 번호 리스트가 나온다.
- 숫자 선택으로 다음 단계로 진행된다.

## 시나리오 10. `/portfolio_add` 실패 케이스

### 절차

1. `/portfolio_add`
2. `zzzzzz` 입력

### 기대 결과

- `검색 결과가 없습니다. 다시 입력해주세요`가 나온다.

## 시나리오 11. `/portfolio_bulk` 기본 성공 케이스

### 절차

1. 아래 중 하나를 입력한다.

```text
/portfolio_bulk 삼성전자, 현대차, tesl
```

또는

```text
/portfolio_bulk
삼성전자
현대차
tesl
```

### 기대 결과

- 결과 요약이 나온다.
- `추가됨`에 3개 종목이 포함된다.

## 시나리오 12. `/portfolio_bulk` 혼합 결과 케이스

### 절차

1. 아래를 입력한다.

```text
/portfolio_bulk 005930, 삼성, zzzzzz
```

### 기대 결과

- 요약이 섹션별로 구분된다.
- `005930`은 exact symbol로 성공해야 한다.
- `삼성`은 `후보 다수`로 실패할 수 있다.
- `zzzzzz`는 `후보 없음`으로 실패한다.

## 시나리오 13. `/portfolio_list` 조회

### 절차

1. `/portfolio_list`

### 기대 결과

- 현재 사용자 종목만 보여야 한다.
- 다른 사용자 종목은 절대 보이면 안 된다.

## 시나리오 14. 중복 종목 추가

### 절차

1. 이미 있는 종목으로 다시 `/portfolio_add`
2. 예: `삼성전자`

### 기대 결과

- 중복 등록이 감지된다.
- 이미 등록된 종목이라는 안내가 나온다.

## 시나리오 15. 종목 삭제

### 절차

1. `/portfolio_remove`
2. `삼성전자` 또는 `005930` 입력
3. `/portfolio_list`

### 기대 결과

- 해당 종목만 제거된다.
- 목록에서 사라진다.

## 시나리오 16. 보유 종목 없는 `/report`

### 절차

1. 포트폴리오가 없는 상태에서 `/report`

### 기대 결과

- 시장 중심 브리핑은 정상 생성된다.
- 제목은 실행 시점에 따라 `프리마켓` 또는 `포스트마켓` 브리핑으로 선택된다.
- 보유 종목 관련 섹션만 비어 있거나 안전 문구로 대체된다.

## 시나리오 17. 보유 종목 있는 `/report`

### 절차

1. `삼성전자`, `현대차` 등을 넣은 뒤 `/report`

### 기대 결과

- 보유 종목 섹션이 개인화되어 나온다.
- 제목은 실행 시점에 따라 `프리마켓` 또는 `포스트마켓` 브리핑으로 선택된다.
- 핵심 가이드 섹션은 세션에 따라 `포트폴리오 리밸런싱 제안` 또는 `기준 보정 제안`을 포함해야 한다.
- `시세 스냅샷 연결 전입니다` placeholder가 남지 않아야 한다.
- 공개 링크 placeholder `확인 필요`나 legacy `/briefings/` 경로가 남지 않아야 한다.
- 공개 링크는 사용자 설정에 따라 포함/제외된다.

## 시나리오 17A. 공개 링크 detail 포맷 smoke

### 절차

1. `/report` 응답에 공개 링크가 포함되면 해당 `/reports/[id]` detail을 연다.
2. current session에 맞는 공개 브리핑 row가 없으면 운영자가 먼저 같은 날짜/세션 public briefing을 생성한다.

### 기대 결과

- detail에는 세션별 `브리핑 역할`이 직접 보여야 한다.
- `시장 종합 해석`에는 세션 목적을 설명하는 문장이 포함돼야 한다.
- `핵심 뉴스 이벤트`는 RSS 기준 `출처 + 헤드라인 + 브리핑용 요약 제안` 구조여야 한다.
- `거시 트렌드 뉴스`와 `참고한 뉴스 출처` 섹션이 노출돼야 한다.
- detail 어디에도 개인 포트폴리오 종목명, 평단, 수량 같은 개인정보가 노출되면 안 된다.

## 시나리오 18. 그룹 온보딩

### 절차

1. `User B`를 테스트 그룹에 초대한다.
2. 그룹 입장 직후 안내 메시지를 확인한다.
3. `User B`가 그룹에서 일반 메시지를 1개 보낸다.

### 기대 결과

- 입장 안내는 1회만 나와야 한다.
- DM에서 `/register`하라는 메시지가 보여야 한다.
- 개인화 데이터는 그룹에 노출되면 안 된다.

## 시나리오 19. 그룹에서 명령 시도

### 절차

1. 그룹에서 `/register`
2. 그룹에서 `/portfolio_add`

### 기대 결과

- DM에서 다시 진행하라는 안내가 나와야 한다.
- 개인 발송 대상 chat은 DM에서만 확정된다.

## 시나리오 20. 멀티 유저 분리 검증

### 절차

1. `User A`는 `삼성전자`, `현대차`를 등록한다.
2. `User B`는 `Tesla`, `AAPL`을 등록한다.
3. 두 사용자가 각각 `/portfolio_list`, `/report`를 실행한다.

### 기대 결과

- 각 사용자 화면에는 자기 종목만 보여야 한다.
- 사용자 간 데이터가 섞이면 실패다.

## 권장 최소 회귀 세트

릴리즈 후 최소한 아래 8개는 다시 확인한다.

1. `/start`
2. `/register`
3. `/portfolio_add` -> `현대차`
4. `/portfolio_add` -> `삼성`
5. `/portfolio_add` -> `tesl`
6. `/portfolio_bulk 삼성전자, 현대차, zzzzzz`
7. `/portfolio_list`
8. `/report`
9. `/report` 공개 링크 detail smoke

## 운영 메모

- production에서는 `ticker_masters` 적재 여부가 검색 UX의 선행 조건이다.
- exact ticker 우선 규칙 때문에 `app`는 `AAPL`보다 `APP`가 먼저 잡힐 수 있다.
- colloquial alias는 curated fallback으로 처리되지만, 최종 저장은 DB canonical ticker 기준이어야 한다.
