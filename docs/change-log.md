# Stock Chatbot Change Log

## 1. Purpose

이 문서는 PRD, 실행 계획, 구현 방식의 추가/수정/삭제 이력을 기록한다. 어떤 변경이 왜 발생했는지와 어느 문서에 반영됐는지를 추적하기 위한 기준 문서다.

연동 문서:

- PRD: [docs/initial-prd.md](/Users/jisung/Projects/stock-chatbot/docs/initial-prd.md)
- 실행 계획: [docs/phase-plan.md](/Users/jisung/Projects/stock-chatbot/docs/phase-plan.md)

기록 규칙:

- 모든 의미 있는 범위 변경은 `ADD`, `UPDATE`, `DELETE`, `DECISION` 중 하나로 분류한다.
- 변경 요청이 구현으로 이어지지 않더라도, 제품/설계 판단에 영향이 있으면 기록한다.
- 변경 기록 후 영향받는 문서를 같은 작업 안에서 갱신한다.

## 2. Entry Template

| ID | Date | Type | Summary | Affected Docs | Applied |
| --- | --- | --- | --- | --- | --- |
| CHG-0000 | YYYY-MM-DD | ADD/UPDATE/DELETE/DECISION | 한 줄 요약 | PRD / Plan / Code / Skill | yes/no |

## 3. Change Entries

| ID | Date | Type | Summary | Affected Docs | Applied |
| --- | --- | --- | --- | --- | --- |
| CHG-0001 | 2026-03-20 | ADD | 초기 PRD 초안 작성 및 제품 범위 정의 | PRD | yes |
| CHG-0002 | 2026-03-20 | ADD | phase 기반 실행 계획 문서와 운영 규칙 추가 | PRD, Plan | yes |
| CHG-0003 | 2026-03-20 | ADD | 변경 이력 문서 추가 및 문서 동기화 절차 정의 | PRD, Plan, Change Log | yes |
| CHG-0004 | 2026-03-20 | ADD | PRD/계획/변경 이력을 함께 갱신하는 project skill 정의 | PRD, Plan, Change Log, Skill | yes |
| CHG-0005 | 2026-03-20 | UPDATE | 초기 MVP를 온디맨드 `/report`에서 매일 오전 9시 일 배치 리포트 방식으로 변경 | PRD, Plan | yes |
| CHG-0006 | 2026-03-20 | UPDATE | 텔레그램 우선 전략은 유지하되 장기적으로 웹/모바일 앱 확장을 고려하도록 PRD와 phase plan 조정 | PRD, Plan | yes |
| CHG-0007 | 2026-03-20 | ADD | change-log 기반 컨텍스트 요약 문서와 롤업 skill 운영 체계 추가 | PRD, Plan, Change Log, Context, Skill | yes |
| CHG-0008 | 2026-03-20 | DECISION | 시스템 아키텍처를 API-first TypeScript backend로 확정하고 최신 안정 버전 기준 스택을 잠금 | PRD, Plan, Change Log, Context | yes |
| CHG-0009 | 2026-03-20 | ADD | Phase 1 저장소 골격과 Docker Compose 기반 로컬 인프라, Makefile 실행 흐름, API/worker/bot bootstrap 구현 | PRD, Plan, Change Log, Context, Code | yes |
| CHG-0010 | 2026-03-20 | ADD | 구현 변경마다 lint, typecheck, test, compose 검증을 수행하는 기본 검증 자동화와 운영 규칙 추가 | PRD, Plan, Change Log, Context, Skill, Code | yes |
| CHG-0011 | 2026-03-20 | DECISION | Phase 1 기반 작업을 완료 처리하고 `pnpm verify` 통과를 현재 검증 기준선으로 반영 | Plan, Change Log, Context | yes |
| CHG-0012 | 2026-03-20 | ADD | 검증 통과 후 commit/push를 기본 작업 흐름에 포함하고 민감정보 ignore 규칙을 강화 | PRD, Plan, Change Log, Context, Skill, Code | yes |
| CHG-0013 | 2026-03-20 | DECISION | 로컬 git 저장소를 초기화하고 GitHub public repository 생성 및 첫 push를 완료 | Plan, Change Log, Context, Code | yes |
| CHG-0014 | 2026-03-20 | ADD | Drizzle 기반 사용자 모델과 저장 계층, migration, unit/integration 테스트를 추가하고 Phase 2를 시작 | PRD, Plan, Change Log, Context, Code | yes |
| CHG-0015 | 2026-03-20 | DECISION | 검증 완료 후 `git add`, `git commit`, `git push`를 항상 수행 가능한 기본 작업으로 명시 | PRD, Plan, Change Log, Context, Skill | yes |
| CHG-0016 | 2026-03-20 | ADD | 포트폴리오 보유 종목 스키마와 CRUD 저장 계층, unit/integration 테스트를 추가 | Plan, Change Log, Context, Code | yes |
| CHG-0017 | 2026-03-20 | ADD | 기본 시장 지표 카탈로그 스키마와 default seed, repository, unit/integration 테스트를 추가 | PRD, Plan, Change Log, Context, Code | yes |
| CHG-0018 | 2026-03-20 | ADD | 사용자별 시장 지표 override 스키마와 add/remove 저장 흐름, effective list merge 로직, unit/integration 테스트를 추가 | PRD, Plan, Change Log, Context, Code | yes |
| CHG-0019 | 2026-03-20 | ADD | 포트폴리오 종목과 시장 지표에 대한 정적 alias registry 기반 resolver를 application 계층에 추가하고 unit 테스트를 보강 | PRD, Plan, Change Log, Context, Code | yes |
| CHG-0020 | 2026-03-20 | ADD | Telegram bot에 command별 in-memory 대화 상태 저장소와 상태 전이 로직을 추가하고 unit 테스트 및 Vitest workspace alias 설정을 보강 | PRD, Plan, Change Log, Context, Code | yes |
| CHG-0021 | 2026-03-20 | DECISION | LLM 계층 기준선을 OpenAI Responses API로 확정하고 task별 모델 라우팅 정책 문서와 application 정책 코드를 추가 | PRD, Plan, Change Log, Context, Code | yes |
| CHG-0022 | 2026-03-20 | UPDATE | LLM 정책 계층을 provider-agnostic profile 기반 추상화로 일반화하고 OpenAI를 기본 provider로 유지하도록 수정 | PRD, Plan, Change Log, Context, Code | yes |
| CHG-0023 | 2026-03-20 | ADD | provider-agnostic LLM client interface와 OpenAI adapter 초안, unit 테스트, OpenAI SDK 의존성, env 템플릿, Vitest node_modules 제외 규칙을 추가 | PRD, Plan, Change Log, Context, Code | yes |
| CHG-0024 | 2026-03-20 | ADD | FRED 기반 시장 데이터 어댑터와 source key 매핑, partial failure 처리, unit 테스트, FRED env 템플릿을 추가 | PRD, Plan, Change Log, Context, Code | yes |
| CHG-0025 | 2026-03-20 | ADD | BullMQ job scheduler 기반 오전 9시 트리거 모듈과 worker 연동, env 기반 패턴/타임존 설정, unit 테스트를 추가 | PRD, Plan, Change Log, Context, Code | yes |
| CHG-0026 | 2026-03-20 | ADD | report_runs 저장 구조, 일 배치 report orchestration, 중복 실행 방지, 텔레그램 렌더러, partial failure 규칙, worker 수직 slice, compose/env 반영을 추가 | PRD, Plan, Change Log, Context, Code | yes |
| CHG-0027 | 2026-03-20 | ADD | Google News RSS 기반 뉴스 수집, 기사 정규화/중복 제거, structured output 기반 뉴스/리포트 prompt 계약, 규칙 기반 quant/risk/scenario 엔진, worker 뉴스 brief 연동을 추가 | PRD, Plan, Change Log, Context, Code | yes |
| CHG-0028 | 2026-03-20 | ADD | harness fixture 포맷과 샘플 케이스, grader 기준, snapshot 비교 스크립트, verify 연동, prompt/skill version 기록 연결을 추가 | PRD, Plan, Change Log, Context, Code | yes |
| CHG-0029 | 2026-03-21 | ADD | mock telegram delivery adapter, reusable report preview 템플릿, future web/app API 계약 초안, 공통 report query model과 `/mock_report` 예시 명령을 추가 | PRD, Plan, Change Log, Context, Code | yes |
| CHG-0030 | 2026-03-21 | UPDATE | 텔레그램 report 렌더링을 이모지, 방향 기호, 가독성 중심 레이아웃으로 개선하고 실채널 POC 발송으로 검증 | PRD, Change Log, Context, Code | yes |
| CHG-0031 | 2026-03-21 | UPDATE | 시장 지표를 전일값→현재값으로 표기하고 USD/KRW는 달러인덱스와 함께 상대 강도를 해석하도록 렌더링 규칙과 DXY 지원을 확장 | PRD, Change Log, Context, Code | yes |
| CHG-0032 | 2026-03-21 | UPDATE | 텔레그램 리포트를 PRD 6.4 순서에 맞게 재정렬하고 보유 종목도 전일 종가→현재가로 표시할 수 있게 확장했으며 주요 지표 변동 요약과 면책 문구를 항상 포함하도록 수정 | PRD, Change Log, Context, Code | yes |
| CHG-0033 | 2026-03-21 | UPDATE | 텔레그램 리포트 전체 문체를 존댓말로 통일하고 면책 문구를 별도 타이틀 없이 `❗` 한 줄 형식으로 조정 | PRD, Change Log, Context, Code | yes |
| CHG-0034 | 2026-03-21 | DECISION | public GitHub repository와 비용 제약을 고려해 남은 운영 자동화 계획을 GitHub Actions 우선 전략으로 전환하고, CI/일 배치 schedule/workflow_dispatch/secret 관리/idempotency 규칙을 후속 최우선 작업으로 재편 | PRD, Plan, Change Log, Context | yes |
| CHG-0035 | 2026-03-21 | ADD | GitHub Actions `CI`와 `Daily Report` workflow, direct daily report runner 엔트리포인트, workflow_dispatch 입력, Actions secret/env 규칙, README 운영 가이드를 추가 | PRD, Plan, Change Log, Context, Code | yes |
| CHG-0036 | 2026-03-21 | UPDATE | FRED series 매핑을 점검해 환율/달러인덱스 해석 기준을 문서화하고, 텔레그램 템플릿 구조에 맞춘 일 리포트 LLM prompt v2와 composition service를 실제 daily report 경로에 연결 | PRD, Plan, Change Log, Context, LLM Plan, Code | yes |
| CHG-0037 | 2026-03-21 | ADD | 실 Telegram provider adapter, 로컬 `make test-telegram`, GitHub Actions `Telegram Smoke Test` workflow를 추가해 mock 검증과 별도로 실채널 smoke test 자동화를 구축 | PRD, Plan, Change Log, Context, Code | yes |
| CHG-0038 | 2026-03-21 | UPDATE | 거시 시장 기본 지표에 구리를 추가하고, 국제 유가/천연가스/구리 별칭을 보강했으며 FRED 구리 시세 매핑과 관련 테스트를 추가 | PRD, Change Log, Context, Code | yes |
| CHG-0039 | 2026-03-21 | UPDATE | 브리핑 구조를 `시장 / 매크로 / 자금 / 이벤트` 카테고리까지 확장하고, 텔레그램 렌더러·LLM prompt v3·mock/harness snapshot을 새 섹션 구조에 맞게 갱신 | PRD, Change Log, Context, LLM Plan, Code | yes |
| CHG-0040 | 2026-03-21 | UPDATE | 시장 데이터 수집을 FRED 단일 어댑터에서 `FRED + Yahoo Finance scraping` 혼합 어댑터로 확장하고, 지수성 자산은 Yahoo 우선 라우팅하도록 worker를 갱신 | PRD, Change Log, Context, Code | yes |
| CHG-0041 | 2026-03-21 | UPDATE | 매일 1회 브리핑 성격에 맞게 텔레그램 리포트 제목과 거시 시장 스냅샷에서 일자 노출을 제거하고, `시장/매크로/자금/이벤트`를 PRD 브리핑 흐름에 맞는 직관적 섹션 제목으로 정리 | PRD, Change Log, Context, Code | yes |
| CHG-0042 | 2026-03-21 | UPDATE | 거시 시장 스냅샷에서 환율과 달러인덱스를 하단으로 재정렬하고, FX 해설 문구를 `전반적 달러 강세` 중심으로 더 자연스럽게 수정 | PRD, Change Log, Context, Code | yes |
| CHG-0043 | 2026-03-21 | UPDATE | 텔레그램 리포트 구조를 `오늘의 브리핑 (YYYY-MM-DD 기준) -> 한 줄 요약 -> 거시 시장 스냅샷 -> 주요 지표 변동 요약 -> 보유 종목 -> 종목 기사 및 이벤트 -> 퀀트 -> 리스크 체크리스트 -> 시장/매크로/자금 브리핑 -> 주요 일정 및 이벤트 브리핑 -> 면책 문구` 순서로 재편하고, 거시 시장 스냅샷 정렬 규칙을 명시 | PRD, Change Log, Context, Code, Prompt | yes |
| CHG-0044 | 2026-03-21 | UPDATE | MVP 전달 전략을 `텔레그램 요약본 + GitHub Pages 상세 브리핑`으로 확장하고, 공개 페이지에는 개인화된 보유 종목 동향/기사 요약을 제외하며 텔레그램 하단에 상세 페이지 링크를 포함하도록 PRD와 phase plan을 재편 | PRD, Plan, Change Log, Context | yes |
| CHG-0045 | 2026-03-21 | UPDATE | 텔레그램 요약본 템플릿을 구분선, 행동 중심 한 줄 요약, 직관적 빈 상태 문구, 리스크/전략 우선 구조로 다듬고 LLM prompt에도 `시장 상태 판단 -> 행동 제안` 원칙을 반영 | PRD, Change Log, Context, Code, Prompt | yes |
| CHG-0046 | 2026-03-21 | ADD | 규칙 기반 퀀트 스코어카드(`Macro / Trend / Event / Flow -> Total -> Action`)를 도입하고 daily report 경로에 연결해 텔레그램 리포트가 행동 중심 점수와 전략 bullet을 함께 렌더링하도록 확장 | PRD, Change Log, Context, Code, Prompt | yes |
| CHG-0047 | 2026-03-21 | UPDATE | mock telegram report 기본 포트폴리오를 사용자 제공 한국 종목 예시(삼성전자, SK하이닉스, 현대차, 에코프로, 현대글로비스, HMM)로 교체하고 관련 테스트 기대값을 갱신 | Change Log, Context, Code | yes |
| CHG-0048 | 2026-03-21 | UPDATE | 텔레그램 보유 종목 섹션과 퀀트 점수카드 종목 헤더에서 종목 코드를 제거해 회사명 중심으로 표시하도록 조정 | Change Log, Context, Code, Harness | yes |
| CHG-0049 | 2026-03-21 | ADD | Gemini provider profile과 `generateContent` 기반 Google adapter, worker의 `LLM_PROVIDER`/`GEMINI_API_KEY` 선택 로직, env 템플릿, 관련 테스트와 문서를 추가해 OpenAI 외 Gemini 모델도 바로 사용할 수 있도록 준비 | Change Log, Context, LLM Plan, Code | yes |
| CHG-0050 | 2026-03-21 | UPDATE | Google provider의 기본 모델을 공식 Gemini 3 Flash 모델 ID인 `gemini-3-flash-preview`로 통일하고 관련 문서를 갱신 | Change Log, Context, LLM Plan, Code | yes |
| CHG-0051 | 2026-03-21 | ADD | GitHub Actions에 Gemini 기반 `Daily Report Smoke` workflow를 추가하고, `Daily Report` workflow에도 `GEMINI_API_KEY`와 `LLM_PROVIDER` env 주입을 반영해 GitHub-hosted runner에서 seeded mock portfolio 기준 일 리포트 생성 경로를 수동 검증할 수 있게 함 | Plan, Change Log, Context, README, Code | yes |
| CHG-0052 | 2026-03-21 | FIX | GitHub Actions smoke 실행 중 드러난 app build artifact 경로 문제를 수정해 `api`, `telegram-bot`, `worker`의 `start` 및 `run:daily-report` 스크립트가 실제 `tsc` 산출물 경로를 가리키도록 조정 | Change Log, Context, Code | yes |
| CHG-0053 | 2026-03-21 | FIX | build된 worker가 workspace 내부 패키지(`@stock-chatbot/application`, `@stock-chatbot/database`, `@stock-chatbot/core-types`)를 런타임에 해석할 수 있도록 각 package.json에 `main`/`types`/`exports` entry를 추가 | Change Log, Context, Code | yes |
| CHG-0054 | 2026-03-21 | FIX | GitHub Actions와 현재 운영 경로에서 workspace ESM 해석 이슈를 피하기 위해 `api`, `telegram-bot`, `worker`의 실제 실행 스크립트를 compiled `dist` 대신 `tsx` source entrypoint로 전환하고, `build`는 검증용 단계로 유지 | Change Log, Context, README, Code | yes |
| CHG-0055 | 2026-03-21 | FIX | `workflow_dispatch`에서 비워 둔 `REPORT_RUN_DATE`가 빈 문자열로 전달돼 Postgres date 파싱 오류를 내던 문제를 수정하고, worker가 빈 값일 때 오늘 날짜로 자동 폴백하도록 보강 | Change Log, Context, Code, Tests | yes |
| CHG-0056 | 2026-03-21 | FIX | GitHub Actions 경고 제거를 위해 모든 workflow에 `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`를 추가해 `actions/checkout@v4`와 `actions/setup-node@v4`가 Node 24 action runtime으로 실행되도록 고정 | Change Log, Context, Code | yes |
| CHG-0057 | 2026-03-21 | FIX | 텔레그램 리포트에서 섹션 사이 과한 빈 줄을 줄이고, 거시 시장 스냅샷의 `천연가스` 정렬 키를 바로잡아 `미국 10년물 -> WTI -> 천연가스 -> 구리 -> FX` 순서가 유지되도록 수정 | Change Log, Context, Code, Tests | yes |
| CHG-0058 | 2026-03-21 | DECISION | 로컬 Docker + live FRED/Yahoo/Gemini 호출로 daily report를 생성해 텔레그램 실채널에 검증 메시지를 발송했고, 이번 실행에서는 Gemini 뉴스 이벤트 추출이 `429`로 제한돼 종목 기사 섹션이 fallback 상태임을 확인 | Change Log, Context, Code, Ops | yes |
| CHG-0059 | 2026-03-21 | FIX | Yahoo Finance chart 응답이 같은 거래일의 종가 시점과 후속 메타 시점을 중복으로 반환해 전일 대비가 `0`으로 계산되던 문제를 수정하고, 날짜 기준 중복 제거 로직과 회귀 테스트를 추가해 2026-03-20 기준 지수 등락이 다시 정상 계산되도록 보정 | Change Log, Context, Code, Tests, Ops | yes |
| CHG-0060 | 2026-03-21 | UPDATE | 일 리포트 structured output prompt를 v4로 조정해 입력에 실제 값이 없는 `fundFlowBullets`, `holdingTrendBullets`, `articleSummaryBullets`, `eventBullets`는 빈 배열만 허용하도록 강화하고, `marketResults.asOfDate` 차이를 고려한 보수적 해석 원칙을 추가 | PRD, Plan, Change Log, Context, LLM Plan, Code, Tests | yes |
| CHG-0061 | 2026-03-21 | ADD | GitHub Pages 공개 상세 브리핑을 위한 code-first 정보 구조, Telegram 전용 제외 섹션 목록, canonical/archive permalink 규칙을 추가해 공개 브리핑 채널과 개인화 텔레그램 채널의 분리를 구현 기준으로 고정 | PRD, Plan, Change Log, Context, Code, Tests | yes |
| CHG-0062 | 2026-03-21 | DECISION | managed Postgres free-tier 후보를 공식 문서 기준으로 비교한 결과, 현재 MVP 운영 기본안은 branching과 scale-to-zero가 유리한 `Neon`, 추후 웹/앱에서 Auth·Storage·Realtime가 필요해질 경우 대안은 `Supabase`로 정리 | PRD, Plan, Change Log, Context | yes |
| CHG-0063 | 2026-03-21 | ADD | GitHub Pages 공개 상세 브리핑 HTML renderer와 `build-public-briefing` script를 추가해 canonical(`/briefings/YYYY-MM-DD/`)과 archive(`/briefings/YYYY/MM/DD/`) 정적 산출물을 생성하는 build 경로를 실제 코드로 정의 | PRD, Plan, Change Log, Context, Code, Tests | yes |
| CHG-0064 | 2026-03-21 | UPDATE | 텔레그램 그룹 채팅 확장 요구를 반영해 `/register`를 MVP 필수 명령으로 승격하고, 그룹 채팅에서는 계정만 등록하되 개인화 리포트 발송 대상 chat은 `private` DM에서 다시 `/register`할 때만 확정하는 정책과 후속 구현 항목을 plan에 추가 | PRD, Plan, Change Log, Context | yes |
| CHG-0065 | 2026-03-21 | ADD | `users` 스키마에 `preferred_delivery_chat_id`와 `preferred_delivery_chat_type`를 추가하고, 텔레그램 `/register`가 private chat에서는 개인 발송 대상을 저장하고 group/supergroup에서는 계정만 등록하도록 bot/service/repository를 연결 | PRD, Plan, Change Log, Context, Code, Tests | yes |
| CHG-0066 | 2026-03-21 | ADD | 텔레그램 `/portfolio_add`, `/portfolio_list`, `/portfolio_remove`, `/market_add`, `/market_items`를 실제 DB 저장/조회와 연결하고, 미등록 사용자는 `/register`를 먼저 요구하도록 bot runtime과 service 계층을 확장 | PRD, Plan, Change Log, Context, Code, Tests | yes |
| CHG-0067 | 2026-03-21 | ADD | 공개 상세 브리핑 JSON 생성 worker 엔트리포인트와 GitHub Pages root/archive index 재생성 로직을 추가해 같은 날짜 재실행 시 canonical/archive 경로를 idempotent하게 덮어쓰는 공개 배포 경로를 실제 코드로 정의 | PRD, Plan, Change Log, Context, README, Code, Tests | yes |
| CHG-0068 | 2026-03-21 | ADD | `Daily Report` workflow에 GitHub Pages build/deploy job을 선행 단계로 추가하고, daily report worker가 `PUBLIC_BRIEFING_BASE_URL` 기반 상세 브리핑 permalink를 텔레그램 하단에 삽입하도록 연결 | PRD, Plan, Change Log, Context, README, Code, Tests | yes |
| CHG-0069 | 2026-03-21 | DECISION | 멀티채널 역할을 `텔레그램=개인화 입력/요약 delivery`, `GitHub Pages=공개 상세 archive`, `future web/app=인증 사용자용 관리·조회`로 분리하고, 계정 확장 전략을 `core user + channel identity` 방향으로 문서화 | PRD, Plan, Change Log, Context | yes |
| CHG-0070 | 2026-03-21 | ADD | 텔레그램 실운영을 `채널=공개`, `그룹=온보딩`, `DM=개인화 delivery` 정책으로 고정하고, 다수 사용자 `/register`·포트폴리오 입력·개인 리포트 검증 체크리스트 문서를 추가 | PRD, Plan, Change Log, Context, Docs | yes |
| CHG-0071 | 2026-03-21 | ADD | 그룹에 새 사용자가 들어오면 `/register`를 자동 안내하고, 미등록 사용자가 그룹에서 일반 메시지를 보내면 1회 등록 안내를 다시 보내는 온보딩 보조 흐름을 telegram-bot에 추가 | Change Log, README, Code, Tests | yes |
| CHG-0072 | 2026-03-21 | ADD | daily report worker가 `preferred_delivery_chat_id`가 있는 사용자에게 생성된 리포트를 Telegram DM으로 실제 발송하고, job summary에 `delivered`, `deliverySkipped`, `deliveryFailed` 집계를 남기도록 확장 | README, Change Log, Code, Tests | yes |
| CHG-0073 | 2026-03-21 | UPDATE | Telegram DM의 `/start`, `/help`, `/register` 응답을 한국어 온보딩 문구로 정리하고, `/register -> /portfolio_add -> /portfolio_list -> /market_add` 권장 흐름을 명시 | README, Change Log, Context, Code, Tests | yes |
| CHG-0074 | 2026-03-21 | FIX | 그룹 조인 시 `new_chat_members`와 `chat_member`가 함께 들어와도 같은 사용자·그룹 조합의 환영 메시지가 중복 발송되지 않도록 짧은 시간 dedupe를 추가 | README, Change Log, Context, Code, Tests | yes |
| CHG-0075 | 2026-03-21 | ADD | Telegram DM 전용 `/report` 명령을 추가하고, 등록만 완료된 사용자는 보유 종목이 없어도 보유 종목 섹션을 제외한 시장 중심 브리핑을 즉시 조회할 수 있도록 on-demand report runtime과 안내 문구를 확장 | PRD, Plan, README, Change Log, Context, Code, Tests | yes |
| CHG-0076 | 2026-03-21 | ADD | 사용자별 정기 브리핑 설정(`enabled/hour/minute/timezone`)과 Telegram `/report_settings`, `/report_on`, `/report_off`, `/report_time` 명령을 추가하고, hourly GitHub Actions schedule과 due-user filtering으로 사용자별 예약 리포트 전송을 구현 | PRD, Plan, README, Change Log, Context, Workflow, Code, Tests | yes |
| CHG-0077 | 2026-03-21 | ADD | dedicated worker 이관 기준 문서와 external trigger contract를 정의하고, `DAILY_REPORT_TRIGGER_URL` secret이 있을 때 GitHub Actions `Daily Report`가 local worker 대신 외부 worker endpoint를 호출하도록 전환 경로를 추가 | Plan, README, Change Log, Context, Workflow, Docs | yes |
| CHG-0078 | 2026-03-21 | FIX | GitHub Actions `Daily Report` workflow가 `push`와 `schedule` 이벤트에서 `github.event.inputs.report_run_date`를 직접 참조해 즉시 실패하던 문제를 수정하고, 빈 문자열 fallback과 외부 worker trigger 분기 로직을 함께 정리 | Plan, README, Change Log, Context, Workflow | yes |
| CHG-0079 | 2026-03-21 | ADD | GitHub Pages 공개 브리핑 JSON을 기반으로 `/app/` 정적 웹사이트와 `/app/admin.html` 운영 개요 페이지를 추가하고, Pages build script가 공개 웹 자산과 최신 브리핑 데이터를 함께 배포하도록 확장 | PRD, Plan, README, Change Log, Context, Code | yes |
| CHG-0080 | 2026-03-21 | DECISION | 모바일 앱을 현재 MVP와 활성 phase 범위에서 제거하고, 공개 채널 확장은 `Telegram + 공개 웹 frontend`까지만 유지하도록 기준선을 조정 | PRD, Plan, README, Change Log, Context | yes |
| CHG-0081 | 2026-03-21 | DECISION | managed Postgres는 개발·테스트 중 직접 연결하지 않고 로컬 Docker PostgreSQL을 기준으로 구현과 검증을 완료한 뒤, 최종 production 배포 시에만 Neon connection string을 사용하도록 운영 원칙을 고정 | PRD, Plan, README, Change Log, Context | yes |
| CHG-0082 | 2026-03-21 | UPDATE | 공개 브리핑 채널을 GitHub Pages 정적 공개 웹에서 `Vercel + Next.js App Router + Neon(배포 대상)` 기반 공개 웹 frontend로 단계 전환하고, `reports` 읽기 모델과 feed/detail 웹을 현재 Phase 7 최우선 작업으로 승격 | PRD, Plan, README, Change Log, Context, Code | yes |
| CHG-0083 | 2026-03-21 | ADD | `reports` 읽기 모델과 공개 브리핑 저장 경로를 추가하고, `apps/web`를 Next.js App Router 기반 공개 feed/detail 웹으로 전환했으며, Telegram 공개 상세 링크와 README/운영 문서를 새 공개 웹 기준으로 갱신 | PRD, Plan, README, Change Log, Context, Workflow, Code, Tests | yes |
| CHG-0084 | 2026-03-21 | ADD | `apps/web` Vercel 배포를 위해 Node 24 engine 선언, `vercel.json`, 웹 전용 `.env.local.example`, Neon 친화 SSL 연결 설정, Vercel runbook을 추가하고 GitHub Actions의 `PUBLIC_BRIEFING_BASE_URL` 연동 기준을 문서화 | PRD, Plan, README, Change Log, Context, Code, Docs | yes |
| CHG-0085 | 2026-03-21 | DECISION | 사용자 수 10명 이하 가정을 전제로 Telegram 명령 처리는 `Vercel webhook`, 일일 배치는 `Vercel Cron primary + GitHub Actions backup/reconcile` 하이브리드 구조로 전환하고, 기존 polling bot runtime은 단계적으로 제거하기로 결정 | PRD, Plan, Change Log, Context, Docs | yes |
| CHG-0086 | 2026-03-21 | ADD | `apps/web`에 Telegram webhook route와 Vercel cron route를 추가하고, Telegram command 로직을 공유 `build-bot` runtime으로 정리했으며, GitHub Actions `Daily Report`를 Vercel reconcile backup 경로를 우선 사용하는 구조로 갱신 | PRD, Plan, README, Change Log, Context, Workflow, Code, Tests | yes |
| CHG-0087 | 2026-03-21 | ADD | Telegram `setWebhook` 등록용 스크립트와 운영 절차를 추가해 polling 없이도 Vercel webhook 기반 Telegram command runtime을 배포 후 즉시 활성화할 수 있도록 정리 | PRD, Plan, README, Change Log, Context, Docs, Code | yes |
| CHG-0088 | 2026-03-21 | ADD | `apps/web`에 Basic Auth 기반 read-only 운영 콘솔 `/admin`을 추가해 최근 공개 브리핑과 최근 개인화 리포트 실행 로그를 조회할 수 있게 하고, 운영용 인증 env와 문서를 갱신 | PRD, Plan, README, Change Log, Context, Code, Tests | yes |
| CHG-0089 | 2026-03-21 | ADD | `strategy_snapshots` 저장 모델을 추가하고, daily report가 생성한 퀀트 점수카드를 실행 시점 스냅샷으로 저장한 뒤 `/admin`에서 이후 수익률과 액션 적합도를 간단히 회고할 수 있도록 전략 성과 추적/백테스트 slice를 구현 | PRD, Plan, README, Change Log, Context, Code, Tests | yes |
| CHG-0090 | 2026-03-21 | ADD | 사용자 설정을 `report_detail_level(standard/compact)`과 `include_public_briefing_link`까지 확장하고, `/report_mode`, `/report_link_on`, `/report_link_off` 명령과 실제 텔레그램 렌더링 반영 규칙을 추가 | PRD, Plan, README, Change Log, Context, Code, Tests | yes |
| CHG-0091 | 2026-03-21 | ADD | 저장소 작업 기준을 빠르게 찾을 수 있도록 root `AGENTS.md`를 추가하고, source-of-truth 문서/검증/git/runtime 규칙을 현재 MVP 기준으로 요약 | PRD, Change Log, Context, README, Docs | yes |
| CHG-0092 | 2026-03-21 | UPDATE | 하네스 엔지니어링을 suite 계약 기반으로 강화해 active/planned suite 상태, 필수 expected key, grader 존재성, snapshot 불변성을 `harness/suite-contracts.json`과 검증 스크립트로 기계적으로 강제 | PRD, Plan, Change Log, Context, README, Docs, Code, Tests | yes |
| CHG-0093 | 2026-03-21 | FIX | Vercel production build가 `Next.js 15.5.2` 보안 차단으로 실패하던 문제를 해결하기 위해 `apps/web`의 Next.js를 최신 15.5.x 패치 라인으로 상향하고 배포 경로를 재검증 | Change Log, Context, Code, Tests, Deployment | yes |
| CHG-0094 | 2026-03-21 | FIX | Next.js App Router route에서 `...process.env`를 퍼뜨리며 production runtime env가 누락돼 cron/webhook 경로가 `localhost` fallback으로 잘못 연결되던 문제를 수정하고, web route가 필요한 env key만 명시적으로 전달하도록 보강 | Change Log, Context, Code, Tests, Deployment | yes |
| CHG-0095 | 2026-03-21 | ADD | `apps/web`를 Vercel production에 실제 배포하고, Neon production branch에 baseline schema를 적용한 뒤, public alias(`/` empty state), `/api/telegram/webhook`, `/api/cron/daily-report`, `/api/cron/reconcile`, `/admin` auth gate, GitHub Actions backup run까지 production smoke를 완료 | Change Log, Plan, Context, README, Deployment, Docs, Ops | yes |
| CHG-0097 | 2026-03-22 | FIX | Telegram webhook이 Vercel production에서 `401 Unauthorized`를 반환하던 원인을 점검한 결과 `TELEGRAM_WEBHOOK_SECRET_TOKEN` 운영 검증이 불안정해 webhook delivery가 막히는 문제가 있었고, production에서는 secret 강제를 비활성화한 상태로 webhook을 재등록해 `/start`, `/help` 같은 command 응답성을 복구 | Change Log, PRD, Context, README, Deployment, Ops | yes |
| CHG-0096 | 2026-03-21 | ADD | 실제 Telegram 연동 검증을 위한 production E2E 테스트 시나리오 문서를 추가하고, DM/그룹/공개 웹/스케줄/개인정보 경계 기준을 운영 체크리스트로 명시 | Change Log, Context, Docs | yes |
| CHG-0098 | 2026-03-22 | FIX | Telegram `/report`가 webhook 재시도로 두 번 실행되며 `브리핑을 생성하고 있습니다` 안내가 중복되고 duplicate run이 `표시할 내용이 없습니다`로 잘못 떨어지던 문제를 수정하기 위해 `telegram_processed_updates` 저장 모델 기반 update dedupe를 추가하고, duplicate on-demand run은 `이미 생성 중` 안내로 정정 | PRD, Change Log, Context, README, Code, Tests | yes |
| CHG-0107 | 2026-03-22 | FIX | Telegram DM 온디맨드 `/report`가 webhook 요청 안에서 뉴스 수집과 LLM 조합까지 수행하며 장시간 `running` 상태로 고착되던 문제를 수정하기 위해 기본 경로를 fast rule-based report로 전환하고, `running` report run이 3분 이상 지속되면 stale run으로 자동 재시작되도록 복구 규칙을 추가 | PRD, Change Log, Context, README, Code, Tests | yes |
| CHG-0099 | 2026-03-22 | UPDATE | 공개 웹 frontend를 Pretendard 기반 타이포그래피와 shadcn/ui 스타일 컴포넌트(`components.json`, `Button`, `Card`, `Badge`, `Separator`)를 중심으로 재정비해 feed/detail 화면의 금융 리포트 가독성과 운영 콘솔 진입 경험을 개선 | PRD, Change Log, Context, README, Code, Tests | yes |
| CHG-0100 | 2026-03-22 | UPDATE | 공개 웹에서는 일반 사용자에게 `/admin` 진입 링크를 노출하지 않고, 운영자는 `/admin` URL 직접 접근 후 Basic Auth로만 진입하도록 UX를 정리 | Change Log, Context, README, Code | yes |
| CHG-0101 | 2026-03-22 | FIX | `/admin`이 Postgres `date` 컬럼을 raw `Date` 객체로 렌더링해 client-side exception을 일으키던 문제를 날짜 문자열 정규화로 수정하고, 공개 웹 전체 팔레트를 shadcn/ui 기본 감성에 가까운 흑백 톤으로 재정비 | Change Log, Context, README, Code, Tests, Ops | yes |
| CHG-0102 | 2026-03-22 | ADD | Telegram DM에서 `/register` 중복 등록을 감지해 `/unregister` 초기화 경로를 안내하고, `/portfolio_bulk`로 여러 종목을 한 번에 추가할 수 있도록 사용자 등록/포트폴리오 명령 semantics를 확장 | PRD, Change Log, Context, README, Code, Tests | yes |
| CHG-0103 | 2026-03-22 | FIX | 정적 종목 resolver에 현대차, 에코프로, 현대글로비스, HMM을 추가해 한국 주식 alias 해석을 보강하고, 공개 웹 기본 팔레트를 완전한 화이트 배경 기준으로 정리해 버튼 대비를 복구 | PRD, Change Log, Context, README, Phase Plan, Code, Tests | yes |
| CHG-0104 | 2026-03-22 | UPDATE | 공개 웹 frontend를 soft white/gray 기반의 premium fintech UI로 재정비하고, Pretendard + custom shadcn/ui 디자인 시스템으로 feed/detail/admin 전체의 시각 계층과 카드/배지/버튼 톤을 통일 | PRD, Change Log, Context, README, Code | yes |
| CHG-0105 | 2026-03-22 | FIX | Telegram webhook 보안을 다시 강화해 Vercel production에서는 `TELEGRAM_WEBHOOK_SECRET_TOKEN`이 없으면 webhook route가 fail-closed로 동작하도록 바꾸고, webhook 등록 스크립트도 secret 없이 실행되지 않게 고정 | PRD, Change Log, Context, README, Deployment, Code, Tests, Ops | yes |
| CHG-0106 | 2026-03-22 | UPDATE | 포트폴리오 종목 입력을 CSV 기반 PostgreSQL ticker master + ranked search 방식으로 전환하고, Telegram `/portfolio_add`를 검색/선택/확정 UX로, `/portfolio_bulk`를 다건 검색 요약 UX로 확장 | PRD, Plan, Change Log, Context, README, Code, Tests | yes |
| CHG-0108 | 2026-03-22 | ADD | 실제 Telegram 운영 경로를 대상으로 하는 production-like E2E harness를 추가하고, synthetic webhook update + 실제 Bot API outbound + DB side effect 검증 조합으로 `/start`, `/register`, `/portfolio_add`, `/portfolio_bulk`, `/report`, 멀티유저 격리, 그룹 온보딩 시나리오를 자동화 가능한 범위까지 실행하도록 확장 | PRD, Plan, Change Log, Context, README, Docs, Code, Tests | yes |
| CHG-0109 | 2026-03-22 | ADD | Telegram-visible reply text를 E2E에서 검증할 수 있도록 outbound `sendMessage` audit 로그 저장 모델과 repository를 추가하고, webhook/polling 공용 bot runtime이 전송한 메시지를 chat 기준으로 조회 가능하게 보강 | Change Log, Context, Code, Tests | yes |
| CHG-0110 | 2026-03-22 | FIX | Telegram `/portfolio_add`가 동일 사용자·종목 조합을 upsert로 덮어쓰며 항상 `추가되었습니다`로 응답하던 문제를 수정해, 이미 등록된 종목은 중복 추가하지 않고 `이미 등록되어 있습니다`로 안내하도록 실제 저장/응답 semantics를 PRD 기준으로 정렬 | Change Log, Context, Code, Tests | yes |
| CHG-0111 | 2026-03-22 | FIX | 시장 데이터 어댑터가 항상 최신값만 조회하던 문제를 수정해 `runDate` 기준 최근 가용일 스냅샷을 사용하도록 `asOfDate` historical fetch를 도입하고, 공개 브리핑 2026-03-16~2026-03-21 backfill을 가능하게 함 | PRD, Change Log, Context, Code, Tests, Ops | yes |
| CHG-0112 | 2026-03-22 | FIX | Telegram fast `/report`와 공개 브리핑 생성에서 LLM composition이 비활성화되거나 실패할 때 `시장/매크로/자금/이벤트/리스크` 섹션이 모두 비어 있던 문제를 수정해 rule-based fallback briefing 섹션과 상세 링크 base URL fallback을 추가 | PRD, Change Log, Context, README, Code, Tests | yes |
| CHG-0113 | 2026-03-22 | FIX | 공개 웹 feed/detail이 Next.js 정적 최적화로 build 시점 empty state를 계속 서빙하던 문제를 수정해 DB 조회를 `force-dynamic + noStore`로 전환하고, `report_date`를 문자열로 정규화해 실시간 공개 브리핑 적재분을 바로 노출하도록 보강 | Change Log, Context, README, Code, Tests | yes |
| CHG-0114 | 2026-03-22 | UPDATE | 일 브리핑 prompt 계약을 `telegram_personalized`와 `public_web` audience로 분리하고, 개인화 리밸런싱 해석 우선순위와 공개 웹의 비개인화 guardrail을 코드·문서 기준선으로 고정 | Change Log, Context, LLM Plan, Docs, Code, Tests | yes |
| CHG-0115 | 2026-03-22 | UPDATE | Telegram `/report` fast path에 보유 종목 일별 종가 스냅샷을 연결하고, 퀀트 섹션 시작부에 `비중 확대 검토 / 유지 우세 / 비중 조절 필요 / 우선 관찰 대상` 리밸런싱 요약을 추가했으며, E2E `report_with_holdings`가 스냅샷 placeholder 부재와 리밸런싱 문구를 함께 검증하도록 강화 | PRD, Change Log, Context, Telegram E2E Docs, Code, Tests | yes |
| CHG-0116 | 2026-03-22 | UPDATE | Telegram `/report`와 공개 웹 브리핑 템플릿을 todo_260322 기준의 `개인화 리밸런싱 브리핑 / 공개 시장 브리핑` 구조로 재편하고, renderer·public builder·prompt contract·query model·mock preview를 새 섹션 계약에 맞춰 동기화 | PRD, Change Log, Context, Docs, Code, Tests | yes |
| CHG-0117 | 2026-03-22 | UPDATE | Telegram DM에 홈 reply keyboard와 설정 inline keyboard를 추가해 `/start`, `/help`, `/register`, `/report_settings` 이후 버튼 기반 탐색을 지원하고, 기존 slash command semantics는 그대로 유지 | PRD, Change Log, Context, Docs, Code, Tests | yes |
| CHG-0118 | 2026-03-22 | FIX | Telegram `/report`가 새 리밸런싱 템플릿 껍데기만 사용하고 실제 `portfolioRebalancing` payload를 오케스트레이터에서 renderer/prompt로 전달하지 않던 누락을 수정하고, 온디맨드 `/report`가 `REPORT_RUN_DATE` override를 읽어 특정 기준일 실데이터 재현이 가능하도록 보강 | PRD, Plan, Change Log, Context, README, Code, Tests, Ops | yes |
| CHG-0119 | 2026-03-22 | UPDATE | Telegram `/report`와 공개 브리핑이 서울 기준 `공통 마감일(effective report date)`을 사용하도록 정렬하고, `personal_rebalancing_snapshots` JSONB cache를 추가해 개인화 리밸런싱 payload를 기준일별로 재사용하도록 보강했다. 동시에 Telegram 설정 UI를 `브리핑 켜기/끄기 + 시간 변경`만 남기고 `callback_query` webhook 수신을 활성화했으며, 관심 지표 개인화는 deprecated 처리하고 공개 feed/detail의 우상단 태그를 score badge 대신 `KOSPI/KOSDAQ/S&P500/NASDAQ` indicator chip으로 전환했다. | PRD, Plan, Change Log, Context, README, Telegram Docs, Code, Tests, Ops | yes |
| CHG-0120 | 2026-03-23 | FIX | 운영 장애 복구를 위해 Telegram `/report`가 예외 발생 시에도 `report_runs`를 `failed`로 정리해 stale `running` 상태를 남기지 않도록 보강하고, `indicator_tags` 컬럼이나 `personal_rebalancing_snapshots` 테이블이 늦게 반영된 환경에서도 공개 feed와 개인화 `/report` 읽기 경로가 graceful fallback으로 동작하도록 수정했다. 또한 production Neon 스키마를 최신 상태로 마이그레이션하고, runtime/user 데이터를 초기화한 뒤 공개 브리핑을 2026-03-16~2026-03-20 기준으로 재적재했으며, Telegram webhook을 `callback_query` 포함 allowed updates로 재등록했다. | PRD, Plan, Change Log, Context, Code, Tests, Ops | yes |
| CHG-0121 | 2026-03-23 | UPDATE | 정기 브리핑 기준 시각을 `Asia/Seoul 오전 8시`로 앞당기고, Telegram `/report`와 공개 브리핑 `report_date`를 다시 `요청일(KST)` 기준으로 정렬했다. `REPORT_RUN_DATE` override는 worker/manual backfill에만 남기고 `/report`에서는 사용하지 않도록 분리했으며, Vercel cron/reconcile이 개인 브리핑과 공개 브리핑을 함께 생성하도록 조정했다. | PRD, Plan, Change Log, Context, README, Code, Tests, Ops | yes |
| CHG-0122 | 2026-03-23 | UPDATE | 운영 영향 변경의 완료 정의를 문서 기준선에 추가했다. 이제 Telegram/webhook/cron/public feed/Neon schema나 data를 건드리는 작업은 `로컬 검증 -> commit/push -> 배포 확인 -> production DB/data 반영 -> production smoke/E2E 검증`까지 끝나야 완료로 간주한다. | PRD, Plan, Change Log, Context, README, Docs, AGENTS | yes |
| CHG-0123 | 2026-03-23 | UPDATE | 정기 브리핑을 `pre_market(07:30 KST)`와 `post_market(20:30 KST)` 이중 세션으로 분리하고, 역할을 `판단 프레임 제공 / 해석 검증+기준 보정`으로 고정했다. `reports` 읽기 모델과 공개 feed/detail, Telegram `/report`, `/report_time`, settings UI, cron/reconcile, public fallback path, admin, worker scheduler를 세션 인지형으로 확장했으며, 미국장 기준으로 `월~토 오전 pre`, `월~금 오후 post`, `토요일 오후/일요일 전체 skip` 주말 게이트를 추가했다. | PRD, Plan, Change Log, Context, LLM Plan, Docs, Code, Tests, Ops | yes |

## 4. Open Change Notes

- 현재까지 보류 중인 변경 요청 없음
