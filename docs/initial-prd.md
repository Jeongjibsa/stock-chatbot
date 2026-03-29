# Stock Chatbot Initial PRD

## 0. Document Governance

이 문서는 제품 요구사항의 기준 문서다. 아래 문서와 함께 항상 동기화한다.

- 실행 계획: [docs/phase-plan.md](/Users/jisung/Projects/stock-chatbot/docs/phase-plan.md)
- 변경 이력: [docs/change-log.md](/Users/jisung/Projects/stock-chatbot/docs/change-log.md)
- 요약 컨텍스트: [docs/context-summary.md](/Users/jisung/Projects/stock-chatbot/docs/context-summary.md)
- LLM 통합 계획: [docs/llm-integration-plan.md](/Users/jisung/Projects/stock-chatbot/docs/llm-integration-plan.md)
- E2E 변경 워크플로: [docs/e2e-change-workflow.md](/Users/jisung/Projects/stock-chatbot/docs/e2e-change-workflow.md)
- 저장소 에이전트 맵: [AGENTS.md](/Users/jisung/Projects/stock-chatbot/AGENTS.md)
- 문서 동기화 skill: [skills/project-doc-sync/SKILL.md](/Users/jisung/Projects/stock-chatbot/skills/project-doc-sync/SKILL.md)
- 컨텍스트 롤업 skill: [skills/context-rollup/SKILL.md](/Users/jisung/Projects/stock-chatbot/skills/context-rollup/SKILL.md)
- 구현 검증 skill: [skills/implementation-validation/SKILL.md](/Users/jisung/Projects/stock-chatbot/skills/implementation-validation/SKILL.md)
- E2E 자동화 skill: [skills/e2e-change-automation/SKILL.md](/Users/jisung/Projects/stock-chatbot/skills/e2e-change-automation/SKILL.md)
- git 게시 skill: [skills/git-publish/SKILL.md](/Users/jisung/Projects/stock-chatbot/skills/git-publish/SKILL.md)

운영 규칙:

- 요구사항, 범위, 구현 방식이 추가/수정/삭제되면 먼저 변경 이력에 남긴다.
- 변경 이력 작성 후 이 PRD와 실행 계획에 영향을 받은 부분을 같은 작업에서 함께 반영한다.
- 구현 완료 시 실행 계획의 해당 작업을 `done`으로 바꾸고, 필요 시 PRD와 변경 이력에 결과를 남긴다.
- 큰 방향 변경이나 change-log 누적이 일정 기준을 넘으면 요약 컨텍스트를 갱신한다.
- 구현 변경에는 항상 테스트와 검증 결과가 함께 따라야 한다.
- 코드 작업은 검증 통과 후 git commit까지 완료하는 것을 기본값으로 한다.
- 원격 저장소가 준비되어 있고 인증이 유효하면 작업 종료 전 push까지 수행한다.
- `git add`, `git commit`, `git push`는 검증 통과 후 항상 수행 가능한 기본 작업으로 간주한다.
- 구현 변경은 영향받는 테스트 시나리오 delta를 먼저 갱신하고, 최종 gate인 `COREPACK_HOME=/tmp/corepack pnpm e2e:final -- --scope=... --allow-production --suite=minimum` 또는 동등한 live verification까지 끝내야 한다.
- Telegram webhook, cron, 공개 웹 feed/detail, production Neon schema/data처럼 운영 경로에 영향을 주는 변경은 `로컬 검증 -> commit/push -> production 배포 확인 -> production DB/data 반영 -> production smoke/E2E 검증`까지 끝나야 완료로 간주한다.
- `AGENTS.md`는 세부 설계 문서가 아니라 현재 운영 기준선을 빠르게 찾기 위한 맵으로만 유지한다.

## 1. Product Summary

텔레그램 기반 주식 챗봇을 구축한다. 현재 MVP는 사용자가 커맨드를 보낼 때마다 응답하는 방식에 더해, `07:30 pre_market / 20:30 post_market` 정기 브리핑과 `토요일 08:00 weekend_briefing` 공개 브리핑을 함께 사용하는 세션형 스케줄 방식으로 동작한다. 주말 규칙은 미국장 기준으로 `토요일 오전 공개/정기 생성 허용`, `토요일 오후/일요일 전체 skip`을 사용한다.

- 오늘의 주요 증시 현황 요약
- 사용자가 보유한 종목의 최근 동향과 기사 요약
- 공개 웹에는 종목별 뉴스 대신 거시/정책/환율/야간선물/섹터 로테이션 중심의 트렌드 뉴스 요약
- 퀀트 투자 기법 기반의 매매 전략 제안
- 추후 사용자가 직접 추적 항목과 종목을 추가할 수 있는 확장 구조

핵심 목표는 "매일 빠르게 읽을 수 있는 개인화된 시장 브리핑"이다.
MVP 전달 채널은 `텔레그램 요약본 + 공개 웹 frontend`의 이중 구조를 사용한다.
초기 전달 채널은 텔레그램이지만, 공개 가능한 상세 브리핑은 Vercel에 배포되는 웹 frontend에서 제공한다.
현재 우선 구현 범위는 공개 웹 frontend까지이며, 모바일 앱은 현재 MVP와 활성 phase 범위에서 제외한다.
현재 운영 방향은 사용자 수 10명 이하를 전제로 `Vercel webhook + Vercel Cron primary + GitHub Actions manual reconcile` 구조를 기준선으로 삼는다.

## 2. Product Goals

- 텔레그램 안에서 끝나는 투자 브리핑 경험 제공
- 텔레그램에서는 한눈에 읽히는 요약본을 제공하고, 상세한 공개 브리핑은 공개 웹 frontend로 제공
- 장기적으로는 텔레그램과 웹이 같은 코어 서비스와 데이터 모델을 공유하도록 설계
- 시장 전반 정보와 개인 포트폴리오 정보를 하나의 응답으로 통합
- 요약뿐 아니라 행동 가능한 전략 가설까지 제시
- 단순 뉴스 나열이 아니라 시장 상태 판단과 행동 제안이 먼저 보이는 행동 중심 리포트 제공
- 프롬프트, 데이터 수집, 분석 단계를 skills와 하네스 기반으로 자동화
- 시장 지표, 종목, 분석 규칙이 이후에도 쉽게 추가되는 구조 확보

## 3. Non-Goals For MVP

- 자동 매매 주문 실행
- 실시간 틱 데이터 기반 초단타 전략
- 다중 사용자 공개 서비스 운영 기능
- 복잡한 웹 대시보드
- 모바일 앱 및 범용 사용자 앱 배포
- 금융 자문 수준의 법적 책임이 필요한 개인화 투자 자문

## 4. Target Users

### Primary User

- 한국어 기반 개인 투자자
- 한국 증시와 미국 증시를 함께 보는 사용자
- 매일 아침 혹은 장 마감 후 빠르게 핵심 정보만 확인하고 싶은 사용자

### Secondary User

- 자신의 보유 종목 중심으로 뉴스와 전략을 받고 싶은 사용자
- 텔레그램을 주 업무 도구처럼 쓰는 사용자

### Future Expansion User

- 텔레그램 대신 인증된 웹 화면에서 같은 리포트를 보고 싶은 사용자
- 리포트 히스토리, 설정 화면, 포트폴리오 관리 화면이 필요한 사용자

## 5. Core User Stories

1. 사용자는 장 시작 전과 장 마감 후에 서로 다른 역할의 브리핑을 자동으로 받고 싶다.
2. 사용자는 내 보유 종목을 별도 플로우로 저장하고 이후 보고서에 자동 반영되길 원한다.
3. 사용자는 추적하는 시장 지표를 나중에 추가하거나 제거하고 싶다.
4. 사용자는 단순 뉴스 나열이 아니라 "그래서 오늘 어떻게 대응할까"를 보고 싶다.
5. 운영자는 분석 프롬프트와 보고서 포맷을 skill 단위로 개선하고 스케줄 리포트를 안정적으로 재실행하고 싶다.
6. 후속 단계에서 사용자는 텔레그램이 아닌 인증된 웹에서도 같은 리포트와 포트폴리오 데이터를 사용하고 싶다.

## 6. MVP Scope

### 6.1 Commands

- `/start`
  - 봇 소개, 주요 명령 안내
- `/register`
  - 사용자 등록 및 개인 발송 대상 chat 연결
- `/unregister`
  - 사용자 등록 상태 및 개인 설정 초기화
- `/report`
  - DM에서 오늘 브리핑 즉시 생성 및 조회
- `/report_settings`
  - 정기 브리핑 설정 조회
- `/report_on`
  - 정기 브리핑 활성화
- `/report_off`
  - 정기 브리핑 비활성화
- `/report_time`
  - 고정 브리핑 정책 안내
- `/portfolio_add`
  - 보유 종목 추가 플로우 시작
- `/portfolio_bulk`
  - 여러 보유 종목 벌크 추가
- `/portfolio_list`
  - 현재 등록 종목 조회
- `/portfolio_remove`
  - 등록 종목 삭제
- `/help`
  - 명령 목록과 사용 예시 제공

초기 MVP의 중심은 정기 세션 브리핑 발송이지만, 현재 구현 기준으로는 `DM`에서 `/report` 온디맨드 호출도 지원한다.
`/report`는 등록만 완료되어 있으면 보유 종목이 없어도 실행 가능하며, 이 경우 보유 종목 관련 섹션을 제외한 시장 중심 브리핑을 제공한다.
현재 운영 기준으로 Telegram DM의 온디맨드 `/report`는 webhook 응답 시간과 안정성을 우선해 fast rule-based 경로를 기본값으로 사용한다. 즉, 장시간이 걸릴 수 있는 보유 종목별 뉴스 수집과 LLM 조합은 기본적으로 끄고, 시장 데이터와 기존 규칙 기반 렌더러로 빠르게 응답해야 한다. 필요 시에만 별도 env로 enrichment를 다시 켤 수 있다.
이 fast path에서도 `시장/매크로/자금/이벤트/리스크` 섹션은 비어 있지 않아야 하며, LLM composition이 비활성화되거나 실패하면 시장 데이터 기반 rule-based fallback 문장을 사용해야 한다.
Telegram `/report`와 공개 브리핑의 제목 날짜 및 공개 `report_date`는 항상 명령 또는 스케줄이 실행된 시점의 `서울 기준 날짜(runDate)`를 사용해야 한다. 과거 거래일 기준 데이터가 필요하더라도 사용자에게 보이는 제목과 공개 피드 날짜는 현재 요청일 기준으로 응답해야 한다.
개인화 리밸런싱 payload는 `user_id + run_date` 키의 precomputed snapshot cache를 우선 사용하고, cache가 없거나 stale하면 새 snapshot을 생성한 뒤 재사용해야 한다.
운영 환경에서 snapshot cache 테이블이나 공개 브리핑 `indicator_tags` 컬럼이 아직 반영되지 않은 경우에도 Telegram `/report`와 공개 웹 feed/detail 읽기 경로는 graceful fallback으로 동작해야 하며, `/report` 실행 중 예외가 발생하면 해당 `report_runs` row는 반드시 `failed`로 정리돼 다음 요청을 막지 않아야 한다.
정기 브리핑은 사용자별 `dailyReportEnabled` on/off만 유지하고, 실제 발송 시각은 `07:30 / 20:30` 고정 운영을 사용해야 한다. legacy `hour / minute / timezone` 필드는 스케줄 판단이 아니라 호환용 데이터로만 남길 수 있다.
초기 MVP에서는 Telegram command runtime을 Vercel webhook으로 처리하고, 공개 상세 브리핑은 Vercel 웹에서 제공한다.
Telegram webhook은 `/api/telegram/webhook` 경로를 기준으로 `setWebhook` 등록해야 하며, production에서는 `TELEGRAM_WEBHOOK_SECRET_TOKEN` header 검증을 반드시 활성화해야 한다.
polling 기반 bot runtime은 local development 또는 비상 fallback용으로만 유지하고, production의 primary command runtime은 webhook을 기준으로 한다.

### 6.2 Initial Market Coverage

초기 기본 항목은 시스템이 내장 설정으로 제공한다.

- 코스피
- 코스닥
- 나스닥 종합
- S&P 500
- 다우
- WTI 유가
- Henry Hub 천연가스
- 구리
- USD/KRW 환율
- 미국 10년물 국채금리
- VIX

초기 버전에서는 이 항목들을 시스템 기본 카탈로그로 탑재하고, Telegram `/report`와 공개 브리핑은 모두 이 기본 세트를 공통으로 사용한다. 사용자별 관심 지표 설정은 현재 MVP 개인화 대상에서 제외한다.

### 6.3 Portfolio Input Flow

사용자는 대화형 플로우로 보유 종목을 입력한다.

- 홈 `종목 추가` 버튼은 `여러 종목 빠르게 추가 / 한 종목 상세 추가` 2-depth 선택을 우선 제공한다.
- `/portfolio_add` 시작
- 종목명 또는 티커 입력
- 검색 결과 선택 또는 단건 후보 확인
- 평균 매수가 입력 여부 선택
- 보유 수량 입력 여부 선택

MVP에서는 수량/평균단가가 없어도 보고서 생성 가능해야 한다.
MVP 단계의 종목 검색은 CSV 기반 종목 마스터를 PostgreSQL에 적재한 뒤 ranked search로 처리해야 한다.
CSV 종목 마스터는 최소한 `symbol`, `name_en`, `name_kr`, `market`을 저장하고, 검색용 정규화 컬럼과 인덱스를 함께 유지해야 한다.
종목 검색 순서는 `exact symbol -> exact name -> prefix -> partial -> fuzzy`를 우선순위로 사용하고, 상위 5개 후보만 반환한다.
검색 정규화는 lowercase, 공백 제거, 특수문자 제거를 기본으로 하고 `name_en`, `name_kr`, `symbol`에 모두 적용한다.
한국어 약칭이나 자주 쓰는 축약어(`삼전`, `현대차`, `app`, `tesl`)는 curated alias fallback으로 canonical ticker를 보강할 수 있어야 한다. 단, canonical 종목 데이터와 최종 저장은 PostgreSQL ticker master를 기준으로 한다.
`/portfolio_add`는 아래 흐름을 따라야 한다.

1. 봇이 `종목명을 입력해주세요`를 안내한다.
2. 사용자 입력을 ranked search로 조회한다.
3. 결과가 없으면 `검색 결과가 없습니다. 다시 입력해주세요`를 반환한다.
4. 결과가 1개이고 high confidence면 `삼성전자 (005930)를 추가할까요? [예/아니오]` 형식으로 확인한다.
5. 결과가 여러 개면 상위 5개를 번호 목록으로 보여주고 숫자 선택을 받는다.
6. 선택된 종목에 대해 평균단가 입력 여부와 보유 수량 입력 여부만 이어서 묻는다.
7. 최종 저장 후 `삼성전자(005930)가 추가되었습니다` 형식으로 확인한다.
8. 평균단가/수량 여부 응답은 `y/n/yes/no/예/아니오`를 대소문자 구분 없이 허용해야 한다.

`/portfolio_bulk`는 comma, semicolon, newline으로 구분된 여러 종목명을 한 번에 받아 각 입력을 독립적으로 검색해야 한다.
`/portfolio_bulk`는 인라인 argument가 없으면 대화형 입력을 시작해야 한다.
`/portfolio_bulk`는 평균단가/수량/메모 없이 기본 보유 종목 레코드만 생성하고, 결과는 `추가 성공 / 이미 등록 / 실패(후보 없음 또는 후보 다수)` 요약으로 반환해야 한다.

### 6.3.1 Telegram Registration Policy

- 텔레그램 사용자는 개인화 기능 사용 전에 `/register`를 1회 수행해야 한다.
- `/register`는 최소한 `telegram_user_id`와 display name을 저장해야 한다.
- 같은 DM에서 이미 등록이 끝난 사용자가 `/register`를 다시 호출하면 중복 등록 대신 이미 등록된 상태임을 안내하고 `/report`, `/portfolio_list`, `/unregister` 다음 단계를 보여줘야 한다.
- `/unregister`는 기존 등록 상태, 보유 종목, 개인 설정, 대화 상태를 초기화하는 soft reset으로 제공해야 하며, 사용자 identity, request history, block 상태는 유지한 채 다시 `/register`로 온보딩을 재시작할 수 있어야 한다.
- 개인화 리포트 발송 대상 chat은 개인정보 보호를 위해 `private` chat을 우선 사용한다.
- 텔레그램 운영 채널은 아래 3계층으로 분리하는 것을 기본 정책으로 한다.
  - `채널`: 공개 브리핑 broadcast 전용
  - `그룹`: 온보딩, 안내, `/register` 유도
  - `DM`: 개인화 등록과 개인화 리포트 delivery 전용
- 사용자가 그룹 채팅에서 `/register`를 실행한 경우:
  - 계정은 생성 또는 갱신할 수 있다.
  - 하지만 개인화 리포트 발송용 `preferred_delivery_chat_id`는 저장하지 않는다.
  - 봇은 사용자가 1:1 DM에서도 `/register`를 다시 실행해 개인 발송 대상을 확정하도록 안내해야 한다.
- `/portfolio_add`, `/portfolio_bulk`, `/portfolio_remove`, `/portfolio_list`는 등록된 사용자만 사용할 수 있어야 한다.
- 개인화 포트폴리오 정보는 채널이나 그룹에 공개되지 않아야 하며, 사용자별 DM delivery를 기본값으로 한다.
- 온디맨드 `/report`는 KST 하루 1회까지만 허용하고, 정기 브리핑은 이 한도에 포함하지 않아야 한다.
- `/portfolio_add`와 `/portfolio_bulk` 시작은 KST 하루 합산 3회까지만 허용해야 한다.
- 같은 `telegram_user_id`가 1초 3회 초과 또는 10초 10회 초과 요청을 보내면 자동 block 해야 하며, 해제는 `/admin`에서만 수행해야 한다.
- 운영자 `telegram_user_id=8606362482`는 위 일일 한도와 flood block에서 완전히 제외해야 한다.

### 6.4 Report Output Structure

정기 브리핑은 채널별 깊이뿐 아니라 세션별 역할을 구분한다. 발송 시각은 `Asia/Seoul 07:30 pre_market`, `Asia/Seoul 20:30 post_market`으로 고정한다.

운영 캘린더:

- `월~금`: pre + post 둘 다 생성/발송
- `토`: `pre_market` 개인화 브리핑과 `weekend_briefing` 공개 브리핑 생성
- `일`: 정기/public 브리핑 없음

수동 Telegram `/report`는 주말에도 허용하지만, 정기 발송과 공개 피드는 위 운영 캘린더를 따른다.

텔레그램 요약본:

`pre_market` 제목은 `오늘의 포트폴리오 프리마켓 브리핑 (YYYY-MM-DD)` 형식을 사용한다.

1. 오늘 한 줄 결론
2. 오늘의 판단 프레임
3. 성향별 대응
4. 포트폴리오 리밸런싱 제안
5. 오늘 반드시 볼 리스크
6. 참고용 공개 프리마켓 브리핑 링크
7. 면책 문구

`post_market` 제목은 `오늘의 포트폴리오 포스트마켓 브리핑 (YYYY-MM-DD)` 형식을 사용한다.

1. 오늘 해석 요약
2. 오전 프레임 대비 맞은 점/빗나간 점
3. 보유 종목 검증
4. 기준 보정 제안
5. 다음 세션으로 넘길 리스크
6. 참고용 공개 포스트마켓 브리핑 링크
7. 면책 문구

시장 데이터는 `runDate` 기준 최근 가용일 스냅샷을 사용해야 한다. 즉 과거 날짜 backfill이나 재실행에서도 항상 최신값이 아니라 `runDate` 이전 마지막 거래일 데이터를 조회해야 한다.

공개 웹 frontend 상세 브리핑:

1. 제목과 기준일
2. 오늘 한 줄 요약
3. 브리핑 역할
  - `pre_market`: `미장 마감 분석 기반 국장 시초가 예측`
  - `post_market`: `국장/대체거래소 결과 분석 및 미장 예보`
  - `weekend_briefing`: `주간 이슈 총정리 및 다음 주 일정 요약`
4. 시장 종합 해석
  - 첫 문장은 반드시 이번 브리핑의 목적과 해석 범위를 직접 드러내야 한다.
5. 글로벌/국내 시장 스냅샷
6. 주요 지표 변화 요약
7. 오늘 강한 섹터 / 약한 섹터
8. 시장 해석
9. 핵심 뉴스 이벤트
  - 수집된 RSS 원문 headline을 기반으로 `출처 + 헤드라인 + 브리핑용 요약 제안` 구조를 사용해야 한다.
  - headline은 입력된 기사 제목을 재작성하지 않고 그대로 사용해야 한다.
10. 세션별 체크포인트
  - `pre_market`: 오늘 대응 기준
  - `post_market`: 오늘 밤 체크포인트
  - `weekend_briefing`: 다음 주 주요 일정 요약
11. 오늘의 리스크 포인트
12. 오늘 시장에서 읽어야 할 포인트
13. 공개 브리핑 면책 문구

`weekend_briefing` 공개 브리핑:

1. 이번 주 한 줄 요약
2. 주간 시장 종합 해석
3. 글로벌/국내 시장 스냅샷
4. 거시 트렌드 뉴스
5. 다음 주 체크포인트
6. 주요 리스크
7. 참고한 뉴스 출처
8. 공개 브리핑 면책 문구

공개 웹 브리핑의 뉴스 입력 규칙:

- 개별 보유 종목 기사나 개인화 기사 요약은 넣지 않는다.
- 공개 웹 뉴스는 `거시 정책`, `금리/환율`, `야간 선물`, `글로벌 지정학/공급망`, `섹터 로테이션`, `시장 전반 테마`에 한정한다.
- 단일 기업 뉴스는 최소 2개 이상 소스에서 시장 전반 테마로 군집화된 경우에만 공개 경로에 반영할 수 있다.
- `핵심 뉴스 이벤트`는 `headlineEvents` structured output을 사용해 RSS headline과 브리핑용 요약 제안을 함께 노출해야 한다.

공개 웹 frontend UI 기준:

- Pretendard 계열 sans-serif 타이포그래피를 기본으로 사용한다.
- `shadcn/ui` 스타일의 재사용 가능한 `ui/*` 컴포넌트를 우선 사용한다.
- 공개 feed/detail은 마케팅 랜딩 페이지가 아니라 금융 리포트 archive에 맞는 조밀하고 읽기 쉬운 레이아웃을 사용한다.
- 공개 웹은 pure white 대면적 배경 대신 soft white/gray 계층을 기본으로 하고, accent는 blue 단일 축으로 제한한다.
- 카드, 배지, 버튼, 메트릭 타일은 shadcn/ui 기본 형태를 그대로 쓰지 않고 제품 톤에 맞게 커스터마이즈해야 한다.

채널별 포함 범위:

- 텔레그램에는 개인화 정보가 포함된다.
- 공개 웹 frontend에는 공개 가능한 공용 브리핑만 포함한다.
- `종목별 리밸런싱 가이드`, `포트 적합성`, `최종 action`, `보유 종목별 기사` 같은 개인별 특화 정보는 공개 웹에 포함하지 않는다.
- 정기 브리핑은 같은 날, 같은 `briefing_session`의 공개 웹 상세 브리핑 row를 먼저 업로드한 뒤 그 uuid 링크를 함께 제공해야 한다.
- 고정 스케줄 정기 Telegram 발송은 공개 브리핑 row 적재가 끝난 뒤 같은 `report_date + briefing_session` row의 `summary/signals`와 개인화 데이터만 다시 조합해 본문을 만들어야 하며, 공통 시장 해석을 위해 두 번째 LLM 조합을 다시 호출하면 안 된다.
- 공개 브리핑 업로드가 최종적으로 실패한 세션에서는 텔레그램 본문을 계속 보내되, 공개 링크 섹션은 placeholder 없이 통째로 생략해야 한다.
- 공개 `채널` 메시지에는 공개 웹 링크와 공용 시장 브리핑만 포함하고, 개인화 섹션은 포함하지 않는다.
- 개인화 텔레그램 리포트는 사용자별 `DM`에서만 제공한다.
- Telegram command는 polling이 아니라 webhook 방식으로 처리해야 하며, webhook 수신 엔드포인트는 Vercel에 배포되는 웹 앱 내부 route handler를 기준으로 한다.
- Telegram webhook URL은 `/api/telegram/webhook` 경로를 기준으로 운영하고, 배포 후 `setWebhook` 등록/갱신 절차가 있어야 한다.

세부 렌더링 원칙:

- 리포트는 단순 뉴스 요약이 아니라 `현재 시장 상태 판단 -> 행동 제안 -> 세부 근거` 흐름으로 읽혀야 한다.
- `한 줄 요약`은 가능하면 `시장 상태 -> 권장 대응`을 한 문장으로 압축한다.
- 시장 지표는 가능하면 `전일값 → 현재값`과 등락률을 함께 보여준다.
- `pre_market` 텔레그램 브리핑은 `판단 프레임 -> 성향별 대응 -> 리밸런싱 제안 -> 리스크` 순서로 읽히게 구성한다.
- `post_market` 텔레그램 브리핑은 `해석 검증 -> 보유 종목 검증 -> 기준 보정 -> 다음 리스크` 순서로 읽히게 구성한다.
- `포트폴리오 리밸런싱 제안`은 `비중 확대 검토 / 유지 우세 / 비중 조절 필요 / 우선 관찰 대상` 4개 라인을 항상 채운다.
- 종목별 가이드는 가능하면 `내재 가치 / 가격·추세 / 미래 기대치 / 포트 적합성 / 제약 요인 / 가이드`를 보여준다.
- rich rebalancing payload가 없을 때는 raw `0.00` 대신 `확인 필요`, `점검 필요`, `데이터 보강 필요` 같은 fallback을 사용한다.
- Telegram `/report` runtime은 optional `portfolioRebalancing` payload가 실제로 연결된 경우에만 3대 관점과 하드룰 기반 해석을 fully surface해야 하며, payload가 없으면 자연스러운 fallback label을 유지한다.
- 운영/테스트에서는 `REPORT_RUN_DATE=YYYY-MM-DD` override로 worker/manual backfill 기준일을 고정해 특정 거래일 실데이터를 재현할 수 있어야 한다. Telegram `/report`는 이 override를 따르지 않고 항상 요청 당시 서울 기준 날짜로 응답해야 한다.
- 공개 웹은 시장 해석 중심으로 유지하고, 개인 행동 지시처럼 읽히는 표현은 피한다.
- 사용자 설정이 `report_detail_level=compact`인 경우 텔레그램 리포트는 `시장·매크로·자금 브리핑`과 `주요 일정 및 이벤트 브리핑` 섹션을 생략한 압축형으로 제공할 수 있다.
- 사용자 설정이 `include_public_briefing_link=false`인 경우 텔레그램 하단의 공개 상세 링크는 생략할 수 있다.
- 공개 웹 상세 브리핑은 feed형 웹 frontend에서 제공하고, 공개 페이지에는 개인 식별 정보나 보유 종목 정보가 포함되지 않아야 한다.
- 공개 웹은 날짜별 grouped feed와 단건 detail 화면을 함께 제공해야 한다.
- 공개 웹 데이터는 Postgres 호환 `reports` 읽기 모델을 기준으로 구성하고, 상세 경로는 `/reports/[id]`를 기본 규칙으로 사용한다.
- 리포트 전체 문체는 텔레그램 발송 기준으로 존댓말을 사용한다.
- 면책 문구는 데이터가 일부 누락돼도 항상 마지막에 포함하며, 별도 제목 없이 `❗` 한 줄로만 표기한다.

### 6.5 Quant Strategy For MVP

MVP에서는 설명 가능성이 높은 규칙 기반 퀀트 전략을 우선 적용한다.

- 추세 추종: 단기/중기 이동평균 방향
- 모멘텀: 최근 수익률 구간 비교
- 변동성 기반 포지션 경고
- 거래량 급증 여부
- 시장 체력 점수와 개별 종목 점수 결합

초기에는 "추천"보다 "시나리오 제안" 형태로 표현한다.

현재 구현 기준으로는 생성된 퀀트 점수카드를 `strategy_snapshots` 읽기 모델에 저장하고, 운영 콘솔에서 최근 시그널의 이후 수익률과 액션 적합도를 간단히 회고하는 전략 성과 추적/백테스트 MVP를 포함한다.

예시:

- 상승 추세 유지 시 분할 매수 관찰
- 실적 이벤트 전 변동성 확대 구간 경계
- 추세 훼손 시 비중 축소 검토

## 7. Functional Requirements

### 7.1 Market Data

- 일간 기준 주요 지표 가격/등락률 수집
- 장중/장후 여부를 판단해 문구 차등화
- 소스 장애 시 일부 지표 누락 허용, 전체 보고서는 계속 생성
- 초기 구현은 `FRED + Yahoo Finance scraping` 혼합 market data adapter를 사용하고, 지수성 자산은 Yahoo Finance, 금리/환율/원자재는 FRED를 우선 사용한다.
- FRED series 매핑 기준은 별도 점검 문서로 유지하고, `USD/KRW`는 `DEXKOUS`, 달러 강도 proxy는 `DTWEXBGS`를 기준으로 해석한다.
- 로컬 개발과 통합 테스트에서는 worker의 BullMQ job scheduler를 계속 지원해야 함
- production 기본 스케줄러는 Vercel Cron을 사용해야 하며, `07:30 pre_market`, `20:30 post_market`를 각각 별도 cron route로 운영해야 함
- GitHub Actions는 scheduled primary가 아니라 manual reconcile/manual rerun 용도로 사용해야 함
- Vercel Cron과 GitHub Actions backup 모두 저장 계층 idempotency를 전제로 설계해야 함

### 7.2 News and Trend Analysis

- 보유 종목별 최신 기사 수집
- 기사 제목/본문에서 핵심 이벤트 추출
- 중복 기사 제거
- 동일 이슈 묶음 요약
- 루머성 출처나 품질 낮은 출처는 낮은 신뢰도로 처리
- LLM 호출은 `OpenAI Responses API`를 기준으로 하고, 추출/요약 단계는 structured output을 우선 사용
- 현재 Gemini 기준 `market-report-composition` prompt는 입력에 실제 값이 없는 `fundFlowBullets`, `holdingTrendBullets`, `articleSummaryBullets`, `eventBullets`를 추론하지 않고 빈 배열로 반환하도록 제한한다.
- 일 리포트 본문 조합도 structured output 기반으로 수행하되, 텔레그램 템플릿 섹션 구조와 동일한 키 집합을 반환해야 한다.
- 초기 구현은 `Google News RSS` 기반 뉴스 수집 어댑터와 canonical URL 기반 중복 제거 규칙을 사용
- 뉴스 brief 생성은 `portfolio news brief service`가 수행하고, 실패 시 보고서는 계속 생성하되 partial success로 기록
- LLM 기반 리포트 조합이 실패해도 규칙 기반 렌더러 fallback으로 보고서는 계속 생성해야 한다.
- 정기 공개 브리핑 `public_web` LLM 조합은 cron critical path를 막지 않도록 hard timeout을 가져야 하며, timeout 또는 provider 지연 시에는 즉시 규칙 기반 fallback으로 완료해야 한다.

### 7.3 Personalization

- 사용자별 포트폴리오 저장
- 시스템 기본 시장 지표 카탈로그 제공
- 사용자별 추적 지표 저장
- 사용자별 기본 지표 숨김과 커스텀 지표 추가를 지원하는 override 구조 확보
- 사용자별 보고서 언어/시간대 설정 가능 구조 확보

### 7.4 Telegram Experience

- 긴 응답은 섹션 구분이 명확해야 함
- 실패 시 "어느 단계가 비어 있는지" 설명
- 스케줄 실행 성공/실패가 로그로 남아야 함
- `/portfolio_add`, `/portfolio_remove`는 명령 시작 후 단계별 상태를 유지하는 대화형 플로우로 동작해야 함
- DM에서는 `/start`, `/help`, `/register` 이후 홈 reply keyboard를 노출해 `브리핑 보기 / 종목 추가 / 내 종목 / 설정` 흐름을 버튼으로 바로 진입할 수 있어야 함
- 홈 `종목 추가` 버튼은 우선 `여러 종목 빠르게 추가 / 한 종목 상세 추가` chooser를 띄우고, bulk 경로를 기본 CTA로 제공해야 함
- `/report_settings`는 inline keyboard로 `브리핑 켜기/끄기`, `고정 발송 시각(07:30 / 20:30)`, `주말 발송 규칙`, `역할 설명`을 보여줘야 하며 기존 slash command semantics는 유지해야 함
- 초기 MVP에서는 대화형 중간 상태 메시지보다 배치 성공률과 안정성이 우선임
- 배치 리포트는 텔레그램 전송 전 렌더링된 문자열을 남기고, 부분 실패 시 누락 항목 섹션을 포함해야 함
- 실제 Telegram provider 연동 전에는 `/mock_report` 명령과 mock delivery adapter로 동일 템플릿 미리보기를 확인할 수 있어야 함
- 실제 Telegram provider 연동 후에는 `getMe` 기반 봇 신원 확인과 테스트 채팅 대상 smoke message 발송을 자동화된 검증 경로로 유지해야 함
- 텔레그램 리포트는 이모지 기반 섹션 헤더와 `🔴▲`, `🔵▼`, `⚪■` 같은 시각적 상태 표식을 사용해 한눈에 방향을 파악할 수 있어야 함
- 개인화 `/report`는 현재 서울 시각 기준으로 `00:00~15:29 = pre_market`, `15:30~23:59 = post_market` 세션을 자동 선택해야 함
- `pre_market`은 `오늘 한 줄 결론 -> 오늘의 판단 프레임 -> 성향별 대응 -> 포트폴리오 리밸런싱 제안 -> 오늘 반드시 볼 리스크` 순서를 사용해야 함
- `post_market`은 `오늘 해석 요약 -> 오전 프레임 대비 맞은 점/빗나간 점 -> 보유 종목 검증 -> 기준 보정 제안 -> 다음 세션으로 넘길 리스크` 순서를 사용해야 함
- 시장 지표는 가능하면 `전일값 → 현재값` 형식으로 함께 보여야 하며, 환율은 `USD/KRW` 단독이 아니라 `달러인덱스(DXY)`와 함께 해석해 원화만의 상대 약세/강세인지 구분해야 함
- 정기 텔레그램 메시지 하단 링크는 `공개 브리핑 업로드 -> uuid 링크 확정 -> 개인 발송` 순서를 따라야 하며, 링크가 없을 때 `확인 필요` 같은 placeholder를 노출하면 안 됨

### 7.5 Public Detail Briefing Experience

- Vercel에 배포되는 Next.js App Router 기반 공개 웹 frontend를 사용해 날짜별 최신순 feed와 detail 페이지를 제공해야 함
- 공개 브리핑은 텔레그램 요약본보다 상세해야 하지만, 개인화 정보는 포함하지 않아야 함
- 웹 root `/`는 날짜별 grouped feed 역할을 해야 하며, 같은 날짜 아래에 `장 시작 전`, `장 마감 후` 카드를 `pre_market -> post_market` 순서로 정렬해야 함
- detail 페이지는 `/reports/[id]` 경로에서 markdown 기반 상세 브리핑을 블록형 레이아웃으로 렌더링해야 함
- 공개 웹 데이터는 Postgres 호환 `reports` 읽기 모델에서 조회해야 함
- `reports` 읽기 모델은 `report_date + briefing_session` 조합으로 한 날짜에 2개 공개 브리핑을 함께 유지할 수 있어야 함
- 개발 및 테스트 중 DB는 로컬 Docker PostgreSQL을 사용하고, production 배포 시에만 Neon을 연결해야 함
- 공개 웹의 기본 배포 대상은 Vercel이며, Vercel 프로젝트는 `apps/web`를 root directory로 사용해야 함
- 운영자는 같은 `apps/web` 안의 `/admin` 콘솔에서 최근 공개 브리핑과 최근 리포트 실행 상태를 조회하고 Telegram user block/unblock을 제어할 수 있어야 함
- `/admin`은 기본적으로 운영자용 route이며, production에서는 `ADMIN_DASHBOARD_USERNAME` / `ADMIN_DASHBOARD_PASSWORD` 기반 Basic Auth로 보호할 수 있어야 함
- 운영 콘솔에는 공개 브리핑 요약과 실행 상태만 포함하고, 개인 포트폴리오 상세 정보나 종목별 기사 요약 같은 개인화 콘텐츠는 노출하지 않아야 함

### 7.6 Future Multi-Client Support

- 백엔드는 텔레그램 전용 비즈니스 로직으로 잠기지 않아야 함
- 리포트 생성, 포트폴리오 관리, 사용자 설정은 채널 독립 서비스로 분리 가능해야 함
- 텔레그램은 첫 번째 delivery adapter로 구현하고, 추후 웹/앱 API adapter를 추가할 수 있어야 함
- 인증 체계는 초기에는 텔레그램 계정 기준으로 단순화하되, 추후 앱 계정 체계로 확장 가능해야 함
- LLM 계층도 특정 공급자 SDK에 잠기지 않고 provider adapter 교체가 가능해야 함
- 초기 준비 단계에서는 mock telegram delivery adapter와 공통 report query model을 기준으로 web/app용 API 계약을 먼저 고정해야 함
- 채널 역할 분리는 아래를 기본 기준으로 한다.
  - 텔레그램: 개인화된 보유 종목 정보 입력, 요약본 수신, 개인 리포트 delivery
  - Public web frontend: 공개 가능한 시장/매크로/자금/이벤트 상세 브리핑 archive/feed
  - future authenticated web console: 포트폴리오 관리, 리포트 히스토리 조회, 설정 변경, 온디맨드 실행
- 계정 확장 전략은 `core user`와 `channel identity`를 분리 가능한 방향으로 유지한다.
  - 현재 MVP의 식별자 기준은 `telegram_user_id`
  - 이후 웹/앱 도입 시에는 `users`를 core profile로 유지하고, telegram/web/app 로그인 식별자를 별도 identity 매핑 계층으로 확장할 수 있어야 한다.
  - `preferred_delivery_chat_id` 같은 채널별 delivery 정보는 core profile이 아니라 channel identity 성격의 데이터로 취급한다.

### 7.5 Admin and Observability

- 보고서 생성 로그 저장
- 각 단계별 소요 시간 측정
- 실패 원인 분류
- 프롬프트/skill 버전 기록
- LLM 호출 시 모델, execution mode, prompt version, response id를 함께 기록
- LLM adapter는 provider-agnostic 인터페이스 뒤에 숨기고, OpenAI는 첫 구현체로만 사용
- 동일 사용자/날짜/스케줄 조합의 중복 실행은 저장 계층에서 차단해야 함
- daily report worker는 기본 prompt version과 skill version을 각 run 기록에 항상 함께 남겨야 함
- GitHub Actions 실행 시 workflow run id, commit sha, trigger type(`workflow_dispatch`)를 run 기록과 함께 남길 수 있어야 함

### 7.7 Delivery and Runtime Strategy

- 사용자 수 10명 이하의 현재 MVP에서는 `Vercel webhook + Vercel Cron primary + GitHub Actions backup/reconcile` 구조를 기본 운영 전략으로 사용한다.
- Telegram command runtime은 `getUpdates` polling이 아니라 `setWebhook` 기반 webhook 방식으로 처리해야 한다.
- Telegram webhook endpoint는 Vercel에 배포되는 웹 앱 내부 route handler를 기준으로 한다.
- Vercel Cron은 개인화 일일 브리핑의 1차 실행 주체다.
- Vercel Cron은 `/api/cron/daily-report`를 호출하는 primary scheduler이고, `CRON_SECRET`을 설정한 경우 same secret 기반 인증을 사용해야 한다.
- GitHub Actions는 더 이상 command runtime을 담당하지 않으며, 아래 역할로 제한한다.
  - CI
  - manual rerun
  - backup/reconcile
- scheduled workflow 외에도 운영 검증과 POC를 위해 `workflow_dispatch` 기반 수동 실행 경로를 제공해야 한다.
- GitHub Actions와 Vercel에 저장되는 비밀 값은 `TELEGRAM_BOT_TOKEN`, `OPENAI_API_KEY`, `FRED_API_KEY`, `DATABASE_URL`, `REDIS_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` 수준으로 제한하고, 로컬 `.env`와 분리 관리해야 한다.
- GitHub Actions workflow는 최소 `CI`, `Daily Report(workflow_dispatch)`를 유지한다.
- `Daily Report Reconcile` workflow는 Vercel Cron이 놓친 실행이나 운영자 수동 재실행만 담당해야 한다.
- `Daily Report` workflow는 `workflow_dispatch`로만 실행하며, 기본 mode는 Vercel의 `/api/cron/reconcile` endpoint를 호출하는 manual reconcile이다. 필요할 때만 explicit `local-worker` mode를 사용한다.
- GitHub Actions나 CI를 건드리는 변경은 마감 전에 `gh workflow list`, `gh run list --limit <n>`, `gh run view <run-id> --log-failed` 기준으로 workflow inventory와 최근 failing run을 먼저 확인해야 한다.
- 공개 웹 Vercel 배포가 준비되면 GitHub repository variable `PUBLIC_BRIEFING_BASE_URL`은 실제 배포된 Vercel URL을 가리켜야 한다.
- Telegram webhook이 설정된 동안에는 polling runtime을 함께 사용하지 않아야 한다.
- `/api/cron/pre-market-briefing`, `/api/cron/post-market-briefing`, `/api/cron/weekend-briefing`를 primary session cron route로 사용하고, `/api/cron/daily-report`는 현재 KST 기준 허용 세션만 실행하는 maintenance route로 유지한다.
- `/api/cron/reconcile`는 `briefingSession=pre_market|post_market|weekend_briefing|both`를 받아 세션별 보정 실행을 지원해야 한다.

### 7.7.1 Vercel Route Contracts

- `/api/telegram/webhook`
  - Telegram Bot API webhook 수신
  - `/start`, `/register`, `/report`, `/portfolio_add`, `/portfolio_list`, `/report_settings` 등의 명령을 처리
- `/api/cron/daily-report`
  - Vercel Cron primary entrypoint
  - due user 조회, 공개 브리핑 생성, 개인화 DM 발송
- `/api/cron/reconcile`
  - GitHub Actions 또는 운영자가 호출하는 backup/reconcile entrypoint
  - 같은 날짜의 미발송 사용자만 재처리

## 8. Non-Functional Requirements

- 기본 응답 시간: 20~60초 이내 목표
- 초기 무료 운영 단계의 정기 스케줄은 `07:30 pre_market`, `20:30 post_market` 고정 운영을 기준으로 하고, exact minute delivery보다는 세션별 idempotent 생성/발송을 우선한다.
- scheduled workflow 지연을 줄이기 위해 정각이 아닌 오프셋 분(minute offset)으로 스케줄하는 것을 기본값으로 둔다.
- 데이터 소스 장애에 대한 부분 복구 허용
- 프롬프트 변경이 코드 배포 없이 가능해야 함
- 사용자 데이터는 계정 단위로 분리 저장
- 기사 원문 저장보다 메타데이터와 요약 중심 저장 우선
- 구현 과정에서 lint, typecheck, test, compose 검증이 반복 가능해야 함
- 운영 영향 변경은 로컬 검증만으로 끝내지 않고, 실제 배포 후 production DB 정합성 확인과 Telegram/public web production smoke까지 포함해야 함
- LLM은 수치 계산이 아니라 요약/설명 계층에만 사용해야 함

## 9. Data Model Draft

### User

- telegram_user_id
- preferred_delivery_chat_id nullable
- preferred_delivery_chat_type nullable
- display_name
- locale
- timezone
- created_at

### PortfolioHolding

- user_id
- symbol
- exchange
- company_name
- avg_price nullable
- quantity nullable
- note nullable
- created_at
- updated_at

### MarketWatchCatalogItem

- item_code
- item_name
- asset_type
- source_key
- is_default
- sort_order

### UserMarketWatchItem

- user_id
- item_code
- item_name nullable
- asset_type nullable
- source_key nullable
- is_active
- is_custom
- created_at
- updated_at

### ReportRun

- user_id
- run_date
- schedule_type
- status
- started_at
- completed_at
- prompt_version
- skill_version

### NewsItem

- symbol
- source
- published_at
- headline
- url
- summary
- sentiment nullable

## 10. System Workflow

### Session-Based Briefing Flow

1. `07:30 pre_market` 또는 `20:30 post_market` 스케줄 트리거 실행
2. 리포트 대상 사용자 조회
3. 사용자 설정과 포트폴리오 조회
4. 시스템 기본 지표 카탈로그와 사용자 추가 항목을 합쳐 시장 지표 목록 구성
5. 시장 데이터 수집
6. 보유 종목별 뉴스 수집
7. 뉴스 정제 및 중복 제거
8. 퀀트 시그널 계산
9. 세션 역할에 맞춰 LLM 또는 규칙 기반으로 최종 리포트 조합
10. 같은 `report_date + briefing_session` 공개 브리핑 저장/갱신
11. 텔레그램 메시지 전송
12. 실행 로그 저장

### `/portfolio_add` Flow

1. 종목명/티커 입력
2. PostgreSQL ticker master ranked search 실행
3. no result면 재입력 요청
4. single high-confidence면 `예/아니오` 확인
5. multiple result면 상위 5개 번호 선택
6. 평균단가 입력 여부를 묻고 필요 시 숫자를 입력받는다.
7. 보유 수량 입력 여부를 묻고 필요 시 숫자를 입력받는다.
8. note 입력 단계는 두지 않는다.
9. 저장 결과 응답

### `/report_time` Flow

1. 사용자가 `/report_settings`의 `시간 변경` 버튼을 누르거나 `/report_time`을 직접 입력
2. 시스템은 고정 운영 정책을 안내한다.
3. 안내 내용에는 `07:30 pre_market`, `20:30 post_market`, `토요일 오후/일요일 skip` 규칙을 포함한다.
4. 사용자별 발송 시각 변경은 더 이상 지원하지 않는다.

### Ticker Interpretation Rule

- 사용자의 입력값을 정규화한 뒤 PostgreSQL ticker master에서 `exact ticker -> exact name -> prefix -> partial -> fuzzy` 순서로 검색한다.
- fuzzy는 전체 테이블 full scan 대신 trigram 기반 후보 풀 위에서만 수행한다.
- colloquial alias가 많은 입력은 curated alias fallback으로 canonical symbol을 먼저 찾고, 최종 표시는 ticker master의 canonical 이름을 사용한다.
- `/portfolio_add`는 상위 5개 후보를 보여주고 사용자가 번호로 선택할 수 있어야 한다.
- `/portfolio_bulk`는 각 입력을 독립적으로 검색하고, high confidence 단건만 자동 추가한다.
- ticker master가 비어 있거나 검색 결과가 없으면 `검색 결과가 없습니다. 다시 입력해주세요` 또는 bulk 실패 요약으로 안내하고 등록하지 않는다.

### Future `/report` On-Demand Flow

후속 phase에서 사용자가 커맨드로 즉시 리포트를 요청할 수 있게 확장한다. 단, 초기 MVP 범위에는 포함하지 않는다.

### Future Web/App Flow

후속 phase에서 동일한 리포트 엔진과 포트폴리오 저장소를 기반으로 웹/앱 클라이언트를 추가한다. 초기부터 API-first 구조를 유지해 텔레그램 adapter와 앱/web adapter가 코어 서비스를 공유하도록 설계한다.

## 11. Harness Engineering Strategy

하네스 엔지니어링은 "프롬프트와 분석 플로우를 코드처럼 검증 가능하게 운영"하는 데 초점을 둔다.

### 11.1 Harness Objectives

- 동일 입력에 대해 보고서 품질을 반복 검증
- 프롬프트 변경 시 회귀 확인
- 실패 케이스를 재현 가능한 fixture로 보관
- skill 단위 결과를 독립 테스트 가능하게 분리

### 11.2 Harness Test Suites

- suite 목록과 상태는 `harness/suite-contracts.json`을 기준으로 관리한다.
- suite는 `active`와 `planned`로 구분한다.
- `active` suite는 fixture가 비어 있으면 안 되며, 관련 grader와 snapshot 자산도 실제로 존재해야 한다.
- `daily_schedule_cases`
  - 정상 실행/중복 실행 방지/일부 사용자 실패 케이스
- `market_snapshot_cases`
  - 정상 장중/장후/휴장일 케이스
- `portfolio_news_cases`
  - 기사 다수/기사 부족/중복 기사 케이스
- `quant_signal_cases`
  - 상승 추세/하락 추세/혼조장 케이스
- `report_render_cases`
  - 텔레그램 메시지 길이, 포맷, 누락 필드 점검
- `telegram_e2e_cases`
  - production webhook, outbound reply, DB side effect를 묶어 `/start`, `/register`, `/portfolio_add`, `/portfolio_bulk`, `/report`, 멀티유저 격리, 그룹 온보딩을 end-to-end로 점검

### 11.3 Evaluation Metrics

- 필수 섹션 누락 여부
- 숫자 필드 환각 여부
- 기사 출처 누락 여부
- 전략 제안의 설명 가능성
- 응답 길이 제한 준수 여부
- 한국어 가독성

### 11.4 Recommended Harness Assets

- `harness/suite-contracts.json`
  - suite 상태, 필수 expected key, grader, snapshot 요구사항을 선언
- 고정 입력 fixture JSON
- 기대 출력 스냅샷
- LLM grader prompt
- 실행 로그 및 diff 리포트
- 초기 구현에는 `harness/fixtures`, `harness/snapshots`, `harness/graders`, `scripts/harness` 구조를 기준선으로 사용

### 11.5 Harness Operational Rules

- fixture는 자유 형식 JSON이 아니라 suite 계약을 따라야 한다.
- snapshot 비교만으로 충분하지 않으므로, grader와 expected key 검증을 같이 사용한다.
- `report_render_cases`처럼 출력 구조가 중요한 suite는 snapshot 존재성, `renderedText`, grader 연결을 모두 강제한다.
- Telegram E2E는 UI automation이나 command handler mock을 쓰지 않고, synthetic webhook update + 실제 Telegram Bot API outbound + DB assertion 조합으로 검증한다.
- 기능 변경 시에는 `docs/e2e-change-workflow.md`에 시나리오 기준선과 scope를 먼저 맞추고, `pnpm e2e:final`로 최종 E2E gate를 수행한다.
- 하네스 변경 시에는 `docs/harness-engineering.md`와 `AGENTS.md`도 함께 갱신한다.

## 12. Skill-Based Flow Automation

운영용 skill은 분석 단계를 작게 분해하는 것이 좋다.

### 12.1 Recommended Internal Skills

- `daily-report-orchestrator`
  - `pre_market / post_market` 세션 실행, 대상 사용자 반복 처리, 재시도 규칙 적용
- `market-snapshot`
  - 주요 지표를 읽고 한글 시장 요약 생성
- `portfolio-news-brief`
  - 종목별 최신 기사 묶음 정리 및 핵심 이벤트 도출
- `quant-signal-evaluator`
  - 룰 기반 지표를 해석해 매매 시나리오 제시
- `report-composer`
  - 각 단위 결과를 최종 텔레그램 응답 포맷으로 조합
- `ticker-resolution`
  - 사용자 입력 종목명/지표명을 내부 코드로 매핑

### 12.2 Skill Design Principles

- `SKILL.md`에는 입력/출력 계약과 예외 처리만 둔다
- 기사 분류 규칙, 지표 코드 표, 프롬프트 템플릿은 `references/`로 분리
- 자주 반복되는 전처리/정규화는 `scripts/`로 분리
- 각 skill은 단일 책임을 갖고 독립 테스트가 가능해야 한다

### 12.3 Skill Invocation Pattern

- scheduler 또는 orchestrator가 세션별 정기 브리핑 작업을 시작
- 데이터 수집 완료 후 skill별 입력 객체 생성
- skill 결과를 표준 JSON 스키마로 반환
- 최종 composer가 텔레그램 메시지로 렌더링

### 12.4 Cross-Thread Context Maintenance

- change-log는 상세 이력을 유지한다
- `context-rollup` skill은 change-log와 PRD, 실행 계획을 읽고 요약 컨텍스트를 갱신한다
- 새 스레드나 컨텍스트 압축 가능성이 큰 작업은 요약 컨텍스트를 우선 기준으로 사용한다
- 요약 컨텍스트는 현재 MVP 범위, 최신 결정, 활성 phase, 보류 이슈를 항상 포함해야 한다

## 13. Architecture Options

### Option A. TypeScript Scheduled Worker

구성:

- Telegram bot: Node.js + Telegraf
- Scheduler/worker: Fastify or standalone Node worker
- DB: PostgreSQL + Prisma
- Job queue: Trigger.dev or BullMQ
- LLM orchestration: OpenAI API

장점:

- 프론트/백/봇을 한 언어로 통일
- 정기 세션 배치 스케줄 구현이 단순함
- 개발 속도가 빠름
- 추후 웹 관리 페이지 추가 쉬움
- 앱/웹 확장 시 API-first 구조로 이전하기 비교적 쉬움

단점:

- 퀀트 계산과 데이터 처리에서 Python 생태계 이점이 약함
- 분석 고도화 시 TS only 구조가 비효율적일 수 있음
- 온디맨드 리포트가 추가되면 worker와 bot 경계 재정리가 필요할 수 있음

추천 상황:

- 세션형 정기 브리핑 MVP를 가장 빠르게 만들고 싶은 경우

### Option A-Prime. API-First TypeScript Backend

구성:

- Core API: Fastify
- Telegram adapter: grammY
- Worker/scheduler: BullMQ worker or Trigger.dev
- DB: PostgreSQL + Drizzle or Prisma
- Optional future clients: Next.js web, React Native or Flutter app

장점:

- 초기에는 텔레그램만 붙여도 되고, 추후 웹/앱 확장이 가장 자연스럽다
- 채널 adapter와 core domain/service 경계를 초기에 분리할 수 있다
- 텔레그램 종속 로직이 코어 서비스에 섞이지 않는다

단점:

- 순수 배치 MVP만 놓고 보면 설계가 다소 무겁다
- 초기 구조 설계에 조금 더 시간이 든다

추천 상황:

- 텔레그램으로 시작하지만 웹/앱 확장을 실제로 고려하는 경우

### Option B. TS Bot + Python Analysis Service

구성:

- Telegram bot/API: Node.js + Telegraf/Fastify
- Analysis service: Python + FastAPI
- Quant/data pipeline: pandas, numpy, optional vectorized backtests
- DB: PostgreSQL
- Queue: Redis/BullMQ or Celery

장점:

- 텔레그램/웹/운영은 TS로 빠르게 개발
- 스케줄러와 분석 서비스 역할 분리가 명확함
- 퀀트, 데이터 정제, 백테스트는 Python으로 유리
- 모델/분석 로직을 서비스로 분리하기 좋음

단점:

- 운영 복잡도 증가
- 서비스 간 계약 관리 필요

추천 상황:

- 정기 세션 브리핑으로 시작하되 퀀트 로직을 지속적으로 키울 계획이 있는 경우

### Option C. Managed Scheduler + Serverless Jobs

구성:

- Telegram webhook: Vercel/Cloud Run
- DB: Supabase/Postgres
- Scheduled jobs: GitHub Actions, Trigger.dev, Cloud Scheduler
- Data fetch + report generation: serverless functions

장점:

- 초기 인프라 부담 낮음
- 하루 1회 스케줄 작업에는 특히 잘 맞음
- 소규모 개인 프로젝트에 적합

단점:

- 사용자 수가 늘거나 분석 단계가 길어지면 불리
- 디버깅과 리트라이 설계가 복잡해질 수 있음
- 장기적으로 앱/웹 공용 백엔드로 확장할 때 재구성이 필요할 수 있음

추천 상황:

- 사용자 수가 적고 정기 세션 배치만 먼저 빠르게 돌리고 싶은 경우

## 14. Selected Technical Direction

최종 선택은 `Option A-Prime`이다.

이유:

- 현재 MVP는 하루 2세션 정기 브리핑 자동 발송이므로 시스템 복잡도를 낮추는 것이 더 중요하다
- 텔레그램만 빠르게 붙이되, 코어 서비스를 채널 독립적으로 두면 나중에 웹/앱 확장이 수월하다
- 배치 스케줄 중심 MVP는 단일 TS backend + worker 구조로 충분히 구현 가능하다
- 온디맨드 `/report`, 앱/web, 고급 퀀트 분석이 실제 요구로 확인되면 그때 `Option B`로 확장해도 늦지 않다

최종 아키텍처 원칙:

- 코어 애플리케이션 서비스는 채널 독립적으로 구현
- 텔레그램은 첫 번째 delivery adapter로 구현
- 정기 세션 브리핑은 worker와 queue로 처리
- 향후 웹/앱은 동일한 API와 도메인 서비스를 재사용
- 분석 엔진이 커질 때만 Python 분리를 검토

참고용 비교 기준:

- 가장 빠른 MVP: `Option C`
- 이후 확장까지 고려한 균형형 MVP: `Option A-Prime`
- 분석 엔진 장기 확장이 명확한 경우: `Option B`

### 14.1 Locked Stack Baseline

기준일: 2026-03-23

- Runtime: Node.js `24.14.0` LTS
- Language: TypeScript `5.9.2`
- Package manager: pnpm `10.15.1`
- API framework: Fastify `5.6.0`
- Telegram bot framework: grammY `1.38.2`
- grammY conversations plugin: `@grammyjs/conversations` `2.1.0`
- Queue/worker: BullMQ `5.58.5`
- Database: PostgreSQL `18.3`
- Redis: Redis Open Source `8.6.0`
- ORM: Drizzle ORM `0.44.5`

버전 선택 원칙:

- 메이저 라인은 현재 시점의 최신 안정 라인을 사용
- 패치는 가능한 한 최신 안정 패치를 사용
- 베타, RC, nightly는 사용하지 않음
- Redis는 현재 시점의 최신 GA인 `8.6.0`을 사용

### 14.2 Implementation Shape

- `apps/api`
  - Fastify 기반 코어 HTTP API와 health endpoint 담당
- `apps/telegram-bot`
  - 텔레그램 입력과 발송 담당
- `apps/worker`
  - 세션별 정기 브리핑 생성과 배치 처리 담당
- `packages/application`
  - 채널 독립형 유스케이스와 서비스 계층
- `packages/database`
  - Drizzle 스키마, migration, repository 담당
- `packages/core-types`
  - 공통 도메인 타입과 계약
- `packages/market-data`
  - 시장 데이터 수집 어댑터
- `packages/prompt-contracts`
  - LLM 입력/출력 계약
- `packages/delivery-adapters`
- 텔레그램, future authenticated web 전달 어댑터

### 14.3 Local Development and Infra

- 로컬 개발 시 API, Telegram bot, worker는 호스트에서 실행할 수 있어야 함
- PostgreSQL, Redis 같은 외부 인프라는 Docker Compose로 실행
- 전체 스택 검증 시 API, worker, 인프라를 Docker Compose profile로 함께 실행
- 자주 쓰는 실행 명령은 `Makefile`에 표준화
- integration 테스트 전후에도 동일한 Compose 명령 체계를 사용

### 14.3.1 Managed Postgres Direction

- 현재 MVP 운영용 managed Postgres free-tier 기본 추천은 `Neon`이다.
- 이유:
  - 현재 제품은 `일 배치 + GitHub Actions + 외부 app server 최소화`가 중심이라 database branching과 scale-to-zero가 잘 맞는다.
  - Postgres 전용 서비스라 현재 구조(`Drizzle + worker + report_runs`)와 가장 단순하게 연결된다.
  - GitHub Actions 기반 검증/preview branch와의 궁합이 좋다.
- `Supabase`는 추후 인증된 웹 단계에서 `Auth`, `Storage`, `Realtime`, Edge Functions가 함께 필요해질 때 재검토하는 대안으로 둔다.
- 따라서 현재 우선순위는:
  - 로컬/테스트: Docker Compose PostgreSQL
  - production 배포 DB: Neon
  - 추후 인증/스토리지 통합 플랫폼 후보: Supabase

### 14.4 Validation and Quality Gates

- 모든 구현 변경은 최소한 lint, typecheck, test를 통과해야 함
- Docker Compose 기반 인프라는 설정 검증과 함께 관리해야 함
- 로컬 기본 검증 명령은 `make verify`
- 검증을 실행하지 못한 경우 그 사유와 미실행 범위를 작업 결과에 명시해야 함

### 14.5 Source Control Workflow

- 프로젝트는 git 기반으로 관리한다
- 각 의미 있는 작업 단위는 검증 통과 후 commit한다
- 원격 저장소가 설정되어 있고 인증이 정상이라면 작업 단위별 push를 수행한다
- `.env`, `.env.*`, 키 파일 등 민감정보는 항상 ignore 대상이어야 한다
- 커밋 전에 민감정보가 stage되지 않았는지 확인한다

### 14.6 Upgrade Policy

- 초기 구축 후 무분별한 메이저 업그레이드는 피한다
- 보안/버그 수정 성격의 minor/patch는 정기적으로 반영한다
- 메이저 업그레이드는 phase 단위로만 수행한다
- 새 기능 도입보다 현재 기준선의 안정성을 우선한다

## 15. Suggested Repository Shape

```text
stock-chatbot/
  apps/
    api/
    telegram-bot/
    worker/
    web/
  packages/
    application/
    database/
    core-types/
    prompt-contracts/
    market-data/
    delivery-adapters/
  skills/
    market-snapshot/
    portfolio-news-brief/
    quant-signal-evaluator/
    report-composer/
    ticker-resolution/
  harness/
    fixtures/
    graders/
    snapshots/
  docs/
    initial-prd.md
  docker/
  Makefile
```

## 16. MVP Delivery Plan

### Phase 1

- 저장소 구조와 런타임 확정
- 채널 독립형 core service 경계 확정
- 텔레그램 봇 및 worker 기본 구조 부트스트랩

### Phase 2

- 사용자/포트폴리오/시장 지표 도메인 구현
- 티커 및 지표 해석 계층 구현
- 텔레그램 입력 플로우 안정화

### Phase 3

- 세션형 정기 브리핑 스케줄 구현
- 리포트 생성 orchestration과 발송 구현
- 실행 로그, 재시도, 중복 실행 방지 구현

### Phase 4

- 종목 뉴스 수집 및 요약
- 규칙 기반 퀀트 시그널 추가
- 리포트 포맷과 전략 시나리오 고도화

### Phase 5

- 하네스 fixture와 grader 구축
- prompt/skill 버전 관리 체계 구축
- change-log 기반 컨텍스트 롤업 자동화 정착

### Phase 6

- 웹/앱 확장을 위한 멀티채널 준비
- 공통 API 계약과 계정 확장 전략 정리
- 리포트 히스토리 및 공통 조회 모델 정리
- `/v1/reports/:userId/latest`, `/v1/reports/:userId/history`, `/v1/mock/telegram/daily-report`를 web/app 계약 초안 기준선으로 사용

### Phase 7

- 온디맨드 `/report` 기능 추가
- 공개 웹 frontend 구현
- 백테스트, 웹 관리 콘솔, 고급 개인화 설정

## 17. Key Risks

- 시장 데이터와 뉴스 소스 품질 편차
- LLM이 수치나 기사 사실관계를 과장할 위험
- 텔레그램 메시지 길이 제한과 가독성 문제
- 사용자 정의 지표 추가 시 심볼 매핑 실패
- 퀀트 전략을 투자 권유처럼 보이게 만들 위험

## 18. Guardrails

- 수치 데이터는 가능하면 계산 결과를 직접 주입하고 LLM은 해석만 담당
- 기사 URL과 시간 정보는 원문 메타데이터 기준으로 유지
- 전략은 확률적 시나리오로 표현하고 확정적 매수/매도 지시는 피함
- 소스 실패 시 "데이터 부족"을 명시하고 추측하지 않음
- 일 배치 작업은 중복 실행 방지 장치를 둔다
- 채널별 UI 로직과 코어 분석 로직은 분리한다

## 19. Open Questions

- 한국/미국 시장 데이터의 공식 우선 소스는 무엇으로 할지
- 기사 수집 범위를 무료 소스로 제한할지
- 리포트 생성 시각을 사용자별 예약 전송까지 확장할지
- 포트폴리오의 평균단가/수량을 얼마나 정밀하게 관리할지
- 종목별 전략을 단기/중기 중 어느 관점으로 통일할지
- 미래 앱/web 확장 시 인증과 계정 연결 방식을 어떻게 가져갈지
