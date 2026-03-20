# Stock Chatbot Initial PRD

## 0. Document Governance

이 문서는 제품 요구사항의 기준 문서다. 아래 문서와 함께 항상 동기화한다.

- 실행 계획: [docs/phase-plan.md](/Users/jisung/Projects/stock-chatbot/docs/phase-plan.md)
- 변경 이력: [docs/change-log.md](/Users/jisung/Projects/stock-chatbot/docs/change-log.md)
- 요약 컨텍스트: [docs/context-summary.md](/Users/jisung/Projects/stock-chatbot/docs/context-summary.md)
- LLM 통합 계획: [docs/llm-integration-plan.md](/Users/jisung/Projects/stock-chatbot/docs/llm-integration-plan.md)
- 문서 동기화 skill: [skills/project-doc-sync/SKILL.md](/Users/jisung/Projects/stock-chatbot/skills/project-doc-sync/SKILL.md)
- 컨텍스트 롤업 skill: [skills/context-rollup/SKILL.md](/Users/jisung/Projects/stock-chatbot/skills/context-rollup/SKILL.md)
- 구현 검증 skill: [skills/implementation-validation/SKILL.md](/Users/jisung/Projects/stock-chatbot/skills/implementation-validation/SKILL.md)
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

## 1. Product Summary

텔레그램 기반 주식 챗봇을 구축한다. 초기 MVP는 사용자가 커맨드를 보낼 때마다 응답하는 방식이 아니라, 매일 오전 9시에 한 번 자동으로 개인화된 리포트를 보내는 일 배치 스케줄 방식으로 동작한다. 이후 단계에서 `/report` 같은 온디맨드 커맨드 요청을 추가한다.

- 오늘의 주요 증시 현황 요약
- 사용자가 보유한 종목의 최근 동향과 기사 요약
- 퀀트 투자 기법 기반의 매매 전략 제안
- 추후 사용자가 직접 추적 항목과 종목을 추가할 수 있는 확장 구조

핵심 목표는 "매일 빠르게 읽을 수 있는 개인화된 시장 브리핑"이다.
초기 전달 채널은 텔레그램이지만, 장기적으로는 동일한 코어 엔진을 기반으로 웹 앱과 모바일 앱까지 확장 가능한 구조를 목표로 한다.

## 2. Product Goals

- 텔레그램 안에서 끝나는 투자 브리핑 경험 제공
- 장기적으로는 텔레그램, 웹, 모바일 앱이 같은 코어 서비스와 데이터 모델을 공유하도록 설계
- 시장 전반 정보와 개인 포트폴리오 정보를 하나의 응답으로 통합
- 요약뿐 아니라 행동 가능한 전략 가설까지 제시
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

- 텔레그램 대신 앱 또는 웹에서 같은 리포트를 보고 싶은 사용자
- 푸시 알림, 리포트 히스토리, 설정 화면이 필요한 사용자

## 5. Core User Stories

1. 사용자는 매일 오전 9시에 오늘 시장 상황과 내 종목 관련 이슈를 자동으로 받고 싶다.
2. 사용자는 내 보유 종목을 별도 플로우로 저장하고 이후 보고서에 자동 반영되길 원한다.
3. 사용자는 추적하는 시장 지표를 나중에 추가하거나 제거하고 싶다.
4. 사용자는 단순 뉴스 나열이 아니라 "그래서 오늘 어떻게 대응할까"를 보고 싶다.
5. 운영자는 분석 프롬프트와 보고서 포맷을 skill 단위로 개선하고 스케줄 리포트를 안정적으로 재실행하고 싶다.
6. 후속 단계에서 사용자는 텔레그램이 아닌 웹/앱에서도 같은 리포트와 포트폴리오 데이터를 사용하고 싶다.

## 6. MVP Scope

### 6.1 Commands

- `/start`
  - 봇 소개, 주요 명령 안내
- `/portfolio_add`
  - 보유 종목 추가 플로우 시작
- `/portfolio_list`
  - 현재 등록 종목 조회
- `/portfolio_remove`
  - 등록 종목 삭제
- `/market_items`
  - 현재 추적 중인 증시 지표 조회
- `/market_add`
  - 신규 지표 추가 요청
- `/help`
  - 명령 목록과 사용 예시 제공

초기 MVP에서는 `/report`를 제공하지 않는다. 보고서는 매일 오전 9시 스케줄 실행으로만 발송한다. `/report` 온디맨드 호출은 후속 phase에서 추가한다.
초기 MVP에서는 텔레그램만 지원하며, 웹/앱 클라이언트는 후순위 확장 범위로 둔다.

### 6.2 Initial Market Coverage

초기 기본 항목은 시스템이 내장 설정으로 제공한다.

- 코스피
- 코스닥
- 나스닥 종합
- S&P 500
- 다우
- WTI 유가
- Henry Hub 천연가스
- USD/KRW 환율
- 미국 10년물 국채금리
- VIX

초기 버전에서는 이 항목들을 시스템 기본 카탈로그로 탑재하고, 이후 `/market_add`로 사용자 관심 항목을 개별 확장한다.

### 6.3 Portfolio Input Flow

사용자는 대화형 플로우로 보유 종목을 입력한다.

- 종목명 또는 티커 입력
- 시장 선택 (KR/US)
- 평균 매수가 입력 여부 선택
- 보유 수량 입력 여부 선택
- 메모 입력 여부 선택

MVP에서는 수량/평균단가가 없어도 보고서 생성 가능해야 한다.
MVP 단계의 티커 해석은 정적 alias registry와 코드 정규화 규칙을 우선 사용하고, 후속 phase에서 외부 심볼 검색 소스로 확장한다.

### 6.4 Report Output Structure

오전 9시 자동 발송 리포트는 아래 순서를 따른다.

1. 한 줄 요약
2. 거시 시장 스냅샷
3. 주요 지표 변동 요약
4. 보유 종목별 최근 동향
5. 종목 관련 핵심 기사 요약
6. 퀀트 기반 시그널 및 매매 아이디어
7. 리스크 체크포인트
8. 면책 문구

### 6.5 Quant Strategy For MVP

MVP에서는 설명 가능성이 높은 규칙 기반 퀀트 전략을 우선 적용한다.

- 추세 추종: 단기/중기 이동평균 방향
- 모멘텀: 최근 수익률 구간 비교
- 변동성 기반 포지션 경고
- 거래량 급증 여부
- 시장 체력 점수와 개별 종목 점수 결합

초기에는 "추천"보다 "시나리오 제안" 형태로 표현한다.

예시:

- 상승 추세 유지 시 분할 매수 관찰
- 실적 이벤트 전 변동성 확대 구간 경계
- 추세 훼손 시 비중 축소 검토

## 7. Functional Requirements

### 7.1 Market Data

- 일간 기준 주요 지표 가격/등락률 수집
- 장중/장후 여부를 판단해 문구 차등화
- 소스 장애 시 일부 지표 누락 허용, 전체 보고서는 계속 생성

### 7.2 News and Trend Analysis

- 보유 종목별 최신 기사 수집
- 기사 제목/본문에서 핵심 이벤트 추출
- 중복 기사 제거
- 동일 이슈 묶음 요약
- 루머성 출처나 품질 낮은 출처는 낮은 신뢰도로 처리
- LLM 호출은 `OpenAI Responses API`를 기준으로 하고, 추출/요약 단계는 structured output을 우선 사용

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
- `/portfolio_add`, `/portfolio_remove`, `/market_add`는 명령 시작 후 단계별 상태를 유지하는 대화형 플로우로 동작해야 함
- 초기 MVP에서는 대화형 중간 상태 메시지보다 배치 성공률과 안정성이 우선임

### 7.6 Future Multi-Client Support

- 백엔드는 텔레그램 전용 비즈니스 로직으로 잠기지 않아야 함
- 리포트 생성, 포트폴리오 관리, 사용자 설정은 채널 독립 서비스로 분리 가능해야 함
- 텔레그램은 첫 번째 delivery adapter로 구현하고, 추후 웹/앱 API adapter를 추가할 수 있어야 함
- 인증 체계는 초기에는 텔레그램 계정 기준으로 단순화하되, 추후 앱 계정 체계로 확장 가능해야 함

### 7.5 Admin and Observability

- 보고서 생성 로그 저장
- 각 단계별 소요 시간 측정
- 실패 원인 분류
- 프롬프트/skill 버전 기록
- LLM 호출 시 모델, execution mode, prompt version, response id를 함께 기록

## 8. Non-Functional Requirements

- 기본 응답 시간: 20~60초 이내 목표
- 오전 9시 배치 스케줄은 지정 시각 기준 안정적으로 한 번 실행되어야 함
- 데이터 소스 장애에 대한 부분 복구 허용
- 프롬프트 변경이 코드 배포 없이 가능해야 함
- 사용자 데이터는 계정 단위로 분리 저장
- 기사 원문 저장보다 메타데이터와 요약 중심 저장 우선
- 구현 과정에서 lint, typecheck, test, compose 검증이 반복 가능해야 함
- LLM은 수치 계산이 아니라 요약/설명 계층에만 사용해야 함

## 9. Data Model Draft

### User

- telegram_user_id
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

### Daily 09:00 Report Flow

1. 매일 오전 9시 스케줄 트리거 실행
2. 리포트 대상 사용자 조회
3. 사용자 설정과 포트폴리오 조회
4. 시스템 기본 지표 카탈로그와 사용자 추가 항목을 합쳐 시장 지표 목록 구성
5. 시장 데이터 수집
6. 보유 종목별 뉴스 수집
7. 뉴스 정제 및 중복 제거
8. 퀀트 시그널 계산
9. LLM으로 최종 리포트 조합
10. 텔레그램 메시지 전송
11. 실행 로그 저장

### `/portfolio_add` Flow

1. 종목명/티커 입력
2. 종목 해석 및 확인
3. 평균단가/수량 입력 선택
4. 저장 결과 응답

### `/market_add` Flow

1. 사용자가 항목 이름 입력
2. 시스템이 정적 alias registry와 지표 코드 정규화 규칙으로 지원 가능한 티커/지표 매핑 시도
3. 확인 후 저장

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

### 11.3 Evaluation Metrics

- 필수 섹션 누락 여부
- 숫자 필드 환각 여부
- 기사 출처 누락 여부
- 전략 제안의 설명 가능성
- 응답 길이 제한 준수 여부
- 한국어 가독성

### 11.4 Recommended Harness Assets

- 고정 입력 fixture JSON
- 기대 출력 스냅샷
- LLM grader prompt
- 실행 로그 및 diff 리포트

## 12. Skill-Based Flow Automation

운영용 skill은 분석 단계를 작게 분해하는 것이 좋다.

### 12.1 Recommended Internal Skills

- `daily-report-orchestrator`
  - 오전 9시 스케줄 실행, 대상 사용자 반복 처리, 재시도 규칙 적용
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

- scheduler 또는 orchestrator가 오전 9시 작업을 시작
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
- 오전 9시 배치 스케줄 구현이 단순함
- 개발 속도가 빠름
- 추후 웹 관리 페이지 추가 쉬움
- 앱/웹 확장 시 API-first 구조로 이전하기 비교적 쉬움

단점:

- 퀀트 계산과 데이터 처리에서 Python 생태계 이점이 약함
- 분석 고도화 시 TS only 구조가 비효율적일 수 있음
- 온디맨드 리포트가 추가되면 worker와 bot 경계 재정리가 필요할 수 있음

추천 상황:

- 오전 9시 배치 MVP를 가장 빠르게 만들고 싶은 경우

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

- 오전 9시 배치로 시작하되 퀀트 로직을 지속적으로 키울 계획이 있는 경우

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

- 사용자 수가 적고 오전 9시 일 배치만 먼저 빠르게 돌리고 싶은 경우

## 14. Selected Technical Direction

최종 선택은 `Option A-Prime`이다.

이유:

- 현재 MVP는 오전 9시 하루 1회 자동 발송이므로 시스템 복잡도를 낮추는 것이 더 중요하다
- 텔레그램만 빠르게 붙이되, 코어 서비스를 채널 독립적으로 두면 나중에 웹/앱 확장이 수월하다
- 배치 스케줄 중심 MVP는 단일 TS backend + worker 구조로 충분히 구현 가능하다
- 온디맨드 `/report`, 앱/web, 고급 퀀트 분석이 실제 요구로 확인되면 그때 `Option B`로 확장해도 늦지 않다

최종 아키텍처 원칙:

- 코어 애플리케이션 서비스는 채널 독립적으로 구현
- 텔레그램은 첫 번째 delivery adapter로 구현
- 오전 9시 일 배치 리포트는 worker와 queue로 처리
- 향후 웹/앱은 동일한 API와 도메인 서비스를 재사용
- 분석 엔진이 커질 때만 Python 분리를 검토

참고용 비교 기준:

- 가장 빠른 MVP: `Option C`
- 이후 확장까지 고려한 균형형 MVP: `Option A-Prime`
- 분석 엔진 장기 확장이 명확한 경우: `Option B`

### 14.1 Locked Stack Baseline

기준일: 2026-03-20

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
  - 오전 9시 리포트 생성과 배치 처리 담당
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
  - 텔레그램, future web/app 전달 어댑터

### 14.3 Local Development and Infra

- 로컬 개발 시 API, Telegram bot, worker는 호스트에서 실행할 수 있어야 함
- PostgreSQL, Redis 같은 외부 인프라는 Docker Compose로 실행
- 전체 스택 검증 시 API, worker, 인프라를 Docker Compose profile로 함께 실행
- 자주 쓰는 실행 명령은 `Makefile`에 표준화
- integration 테스트 전후에도 동일한 Compose 명령 체계를 사용

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
    web/ (future)
    mobile/ (future)
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

- 오전 9시 일 배치 스케줄 구현
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

### Phase 7

- 온디맨드 `/report` 기능 추가
- 웹 클라이언트 또는 모바일 앱 구현
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
