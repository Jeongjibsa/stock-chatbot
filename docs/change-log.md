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

## 4. Open Change Notes

- 현재까지 보류 중인 변경 요청 없음
