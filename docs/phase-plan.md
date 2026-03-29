# Stock Chatbot Phase Plan

## 1. Purpose

이 문서는 구현 작업의 기준 계획서다. 이후 작업은 이 문서를 기준으로 진행하고, 작업이 끝날 때마다 상태를 갱신한다.

연동 문서:

- PRD: [docs/initial-prd.md](/Users/jisung/Projects/stock-chatbot/docs/initial-prd.md)
- 변경 이력: [docs/change-log.md](/Users/jisung/Projects/stock-chatbot/docs/change-log.md)
- 요약 컨텍스트: [docs/context-summary.md](/Users/jisung/Projects/stock-chatbot/docs/context-summary.md)

상태 규칙:

- `[ ]` not started
- `[-]` in progress
- `[x]` done
- 범위 변경이 생기면 먼저 변경 이력에 추가한 뒤 이 문서를 수정한다.

## 2. Current Execution Policy

- 항상 가장 위에 있는 `[-]` 또는 다음 `[ ]` 항목부터 진행한다.
- 한 작업이 끝나면 해당 항목을 `[x]`로 변경한다.
- 작업 중 PRD 변경이 발생하면 같은 작업 안에서 PRD와 이 문서를 함께 동기화한다.
- 새로운 기능 요청은 적절한 phase에 삽입하고 변경 이력에 근거를 남긴다.
- 큰 변경이 누적되면 요약 컨텍스트도 함께 갱신한다.
- 코드 변경 후에는 최소한 대상 범위 테스트와 기본 검증 결과를 남긴다.
- 검증이 끝난 작업 단위는 commit하고, 원격이 준비되어 있으면 push까지 수행한다.
- `git add`, `git commit`, `git push`는 검증 완료 후 별도 확인 없이 수행하는 기본 단계다.
- 구현 변경은 테스트 시나리오 delta와 scope 분류를 `docs/e2e-change-workflow.md`에 먼저 반영하고, 최종 gate `pnpm e2e:final`까지 수행하는 것을 기본값으로 한다.
- Telegram/webhook/cron/public feed/production Neon에 영향을 주는 작업은 `로컬 검증 -> commit/push -> production deploy 확인 -> production DB/data 반영 -> production smoke/E2E` 순서를 기본 마감 사이클로 사용한다.
- 위 사이클 중 하나라도 남아 있으면 해당 작업은 완료가 아니다.

## 3. Phase Overview

| Phase | Goal | Status |
| --- | --- | --- |
| Phase 0 | 문서 기준선과 운영 방식 확정 | done |
| Phase 1 | 저장소/런타임 기본 구조 구축 | done |
| Phase 2 | 사용자/포트폴리오/지표 도메인 구현 | done |
| Phase 3 | 세션형 정기 브리핑 파이프라인 구현 | done |
| Phase 4 | 뉴스 요약 및 퀀트 전략 엔진 구현 | done |
| Phase 5 | GitHub Actions 기반 CI/스케줄 운영 자동화 구축 | done |
| Phase 6 | 멀티채널 확장 준비 | done |
| Phase 7 | 공개 웹 전환 및 후속 운영 확장 | done |

## 4. Detailed Plan

### Phase 0. Planning and Governance

- [x] 초기 PRD 작성
- [x] phase 기반 실행 계획 문서 작성
- [x] 변경 이력 문서 작성
- [x] PRD/계획/변경 이력 동기화 skill 정의

### Phase 1. Repository Foundation

- [x] 모노레포 또는 멀티앱 디렉터리 구조 확정
- [x] 기본 런타임 선택 확정
- [x] 채널 독립형 core service 경계 정의
- [x] 패키지 매니저 및 공통 설정 파일 구성
- [x] 환경 변수 템플릿 정의
- [x] 린트/포맷/테스트 기본 설정
- [x] 공통 타입 및 계약 패키지 초안 작성
- [x] 텔레그램 봇 앱 기본 부트스트랩
- [x] Docker Compose 기반 PostgreSQL/Redis 로컬 인프라 구성
- [x] Makefile 기반 로컬/통합 실행 명령 구성

### Phase 2. Core Domain and Persistence

- [x] 사용자 모델 설계 및 저장 계층 구현
- [x] 포트폴리오 보유 종목 CRUD 구현
- [x] 기본 시장 지표 시드 정의
- [x] 사용자별 지표 추가/삭제 플로우 구현
- [x] 티커 및 지표 해석 계층 구현
- [x] CSV 기반 ticker master 저장 모델, ranked search, Telegram 선택형 종목 입력 UX 구현
- [x] 명령별 대화 상태 관리 구조 구현
- [x] 텔레그램 `/register` 기반 사용자 등록 및 개인 발송 대상 chat 정책 구현
- [x] 텔레그램 포트폴리오/시장 지표 명령을 실제 DB 저장/조회와 연결

### Phase 3. Daily Scheduled Report Pipeline

- [x] 시장 데이터 수집 어댑터 구현
- [x] 정기 브리핑 스케줄 트리거 구현
- [x] 일 배치 보고서 실행 orchestration 구현
- [x] provider-agnostic LLM client interface 및 OpenAI adapter 초안 구현
- [x] 중복 실행 방지 및 재시도 규칙 구현
- [x] 텔레그램 메시지 렌더링 포맷 구현
- [x] 실패/부분 성공 응답 규칙 구현
- [x] 실행 로그 저장 구조 구현

### Phase 4. News and Quant Intelligence

- [x] 종목별 뉴스 수집 어댑터 구현
- [x] 뉴스 정규화 및 중복 제거 구현
- [x] 이벤트 추출 및 요약 흐름 구현
- [x] structured output 기반 뉴스/리포트 prompt 계약 구현
- [x] 규칙 기반 퀀트 시그널 엔진 구현
- [x] 전략 시나리오 생성 규칙 구현
- [x] 리스크 체크포인트 생성 규칙 구현

### Phase 5. Harness and Automation

- [x] 일 배치 스케줄 fixture 포맷 정의
- [x] 정상 실행/중복 실행 방지/부분 실패 케이스 작성
- [x] 하네스 fixture 포맷 정의
- [x] 시장/뉴스/퀀트/report 케이스 fixture 작성
- [x] grader 기준 정의
- [x] 스냅샷 비교 흐름 구축
- [x] prompt/skill 버전 기록 체계 구축
- [x] GitHub Actions CI workflow 정의
- [x] GitHub Actions manual reconcile workflow 정의
- [x] GitHub Actions `workflow_dispatch` 수동 실행 경로 정의
- [x] GitHub Actions secret/env 주입 규칙 정의
- [x] GitHub Actions `workflow_dispatch` 기반 Gemini daily report smoke workflow와 seeded mock portfolio 검증 경로 정의
- [x] schedule 지연 대비 idempotency 및 지연 허용 규칙 정의
- [x] GitHub Actions에서 daily report runner를 호출하는 실행 진입점 구현
- [x] 주기 보고서 자동화 설계 고도화
- [x] 텔레그램 템플릿 구조에 맞춘 일 리포트 structured output prompt v2와 composition service를 actual daily report 경로에 연결
- [x] 실 Telegram provider smoke test 자동화와 로컬/Actions 실행 경로 정의
- [x] change-log 기반 컨텍스트 요약 및 롤업 흐름 구축
- [x] GitHub Pages용 공개 상세 브리핑 정보 구조 정의
- [x] 텔레그램 요약본과 GitHub Pages 상세 브리핑의 채널별 포함/제외 규칙 구현 설계
- [x] GitHub Actions에서 날짜별 공개 상세 브리핑 정적 파일을 생성하는 build 경로 정의
- [x] GitHub Pages 배포 workflow 또는 Pages deploy job 정의
- [x] 날짜별 상세 브리핑 permalink 규칙 정의
- [x] 날짜별 상세 브리핑 재실행 idempotency 규칙 정의
- [x] 상세 브리핑 index/archive 페이지 구조 정의
- [x] 텔레그램 메시지 하단에 GitHub Pages 상세 브리핑 링크를 삽입하는 전달 규칙 정의
- [x] 공개 페이지에서 개인화 정보(보유 종목/개인 기사 요약)를 제외하는 privacy guardrail 정의
- [x] managed Postgres free-tier 후보(Neon, Supabase) 비교 및 현재 운영 권장안 정의
- [x] 기능 변경용 E2E workflow 문서, scope-based final verification runner, project skill 정의

### Phase 6. Multi-Channel Readiness

- [x] 텔레그램 adapter와 core application service 경계 고정
- [x] future authenticated web API 계약 초안 정의
- [x] GitHub Pages 공개 브리핑과 future authenticated web 런타임의 역할 분리 기준 정의
- [x] 사용자 계정 확장 전략 초안 정의
- [x] 텔레그램 `채널 / 그룹 / DM` 운영 역할과 멀티 사용자 테스트 시나리오 문서화
- [x] 공통 리포트 조회 모델과 히스토리 모델 정의

### Phase 7. Public Web Transition and Expansion

- [x] Telegram polling runtime을 Vercel webhook 기반 command runtime으로 전환하는 설계 확정
- [x] `apps/web` 내부 Telegram webhook route contract 정의 및 구현
- [x] `apps/web` 내부 daily report cron route contract 정의 및 구현
- [x] `apps/telegram-bot` command 처리 로직을 webhook-compatible service로 이동
- [x] Telegram `setWebhook` 등록/갱신 및 smoke 검증 경로 정의
- [x] Vercel Cron을 primary daily scheduler로 전환
- [x] GitHub Actions `Daily Report`를 manual reconcile/manual rerun 역할로 재편
- [x] 온디맨드 `/report` 요청 처리 추가
- [x] 사용자별 예약 리포트 전송
- [x] GitHub Actions에서 전용 worker/queue 인프라로 이관하는 기준 정의 및 전환
- [x] 공개 브리핑 DB read model(`reports`) 도입
- [x] 공개 브리핑 생성 경로를 `reports` 저장까지 확장
- [x] `apps/web`를 Next.js App Router 앱으로 전환
- [x] 공개 feed `/` 구현
- [x] 공개 detail `/reports/[id]` 구현
- [x] Telegram 공개 상세 링크를 새 웹으로 전환
- [x] README 및 운영 문서를 Vercel + Neon 기준으로 갱신
- [x] Vercel 배포 설정 및 운영 runbook 정리
- [x] 웹 관리 콘솔
- [x] 전략 성과 추적 및 백테스트
- [x] 사용자 설정 고도화
- [x] Telegram `/report`를 개인화 리밸런싱 브리핑 템플릿으로 재편
- [x] 공개 웹 브리핑을 public-market 전용 구조로 분리
- [x] Telegram DM home reply keyboard 및 settings inline keyboard 추가
- [x] Telegram `/report`에 `portfolioRebalancing` payload를 실제 런타임으로 연결하고 worker/manual backfill용 `REPORT_RUN_DATE` override를 유지
- [x] 정기 브리핑을 `pre_market / post_market` 이중 세션으로 전환하고 주말 게이트를 추가
- [x] `reports` 읽기 모델과 public feed/detail/admin을 세션 라벨 인지형으로 확장
- [x] Telegram `/report` 자동 세션 분기, `/report_time` 고정 정책 안내, Vercel/worker 세션별 cron 경로를 반영
- [x] 정기 세션에서 `공개 브리핑 업로드 -> 개인 발송` 순서를 강제하고, 공개 링크 실패 시 링크 섹션 생략 fallback과 재시도 정책을 반영
- [x] 공개 웹용 거시 트렌드 뉴스 수집/분석 계층, `weekend_briefing` 세션, Upstash dedupe/cache, `news_items`/`news_analysis_results` 저장 경로, RSS headline 기반 `headlineEvents` 출력 구조를 추가

## 5. Immediate Next Work

현재 활성 phase 계획은 모두 완료됐다.

다음 권장 작업:

1. 실제 Telegram E2E 운영 점검
2. 첫 공개 브리핑 저장 확인 및 feed/detail 실데이터 점검
3. 전략 스코어 튜닝과 운영 지표 보강
4. active harness suite 확장과 grader 정밀도 개선

운영 영향 변경의 표준 마감 사이클:

1. 로컬 코드/문서 변경과 source-of-truth 동기화
2. `pnpm verify` + 필요한 범위별 추가 검증 실행
3. commit/push
4. production deploy 반영 확인
5. Neon production DB schema/data 정합성 반영
6. 공개 웹/cron/webhook smoke
7. Telegram production E2E 또는 동등한 live verification

## 6. Completion Log

작업 완료 시 필요하면 아래에 간단히 남긴다.

- 2026-03-20: Phase 0 기준 문서와 동기화 skill 초안 작성 완료
- 2026-03-20: 아키텍처 1안 확정. Node.js 24 LTS, Fastify, grammY, BullMQ, PostgreSQL 18, Redis 8.6, Drizzle 기준선 잠금
- 2026-03-20: pnpm workspace, Fastify API, Telegram bot skeleton, BullMQ worker, Docker Compose, Makefile 기반 로컬 인프라 구성을 추가
- 2026-03-20: ESLint, Prettier, Vitest, make verify 기반의 기본 검증 자동화와 테스트 skeleton 추가
- 2026-03-20: `pnpm verify` 통과. lint, typecheck, unit test, compose validation까지 기본 검증 루프 확인
- 2026-03-20: GitHub public repository 생성 및 첫 baseline push 완료
- 2026-03-20: Drizzle 기반 사용자 스키마, repository, unit/integration 테스트 추가 완료
- 2026-03-20: 포트폴리오 보유 종목 스키마, CRUD repository, unit/integration 테스트 추가 완료
- 2026-03-20: 기본 시장 지표 카탈로그 스키마, default seed 정의, repository, unit/integration 테스트 추가 완료
- 2026-03-20: 사용자별 시장 지표 override 스키마, add/remove repository, effective list merge 로직, unit/integration 테스트 추가 완료
- 2026-03-20: 정적 alias registry와 코드 정규화 기반의 티커/시장 지표 해석 계층, unit 테스트 추가 완료
- 2026-03-20: Telegram bot에 in-memory 대화 상태 저장소와 command별 상태 전이 구조, unit 테스트 추가 완료
- 2026-03-20: provider-agnostic LLM client interface와 OpenAI adapter 초안, unit 테스트, OpenAI SDK 의존성 및 env 템플릿 추가 완료
- 2026-03-20: FRED 기반 시장 데이터 어댑터와 source key 매핑, partial failure 처리, unit 테스트, FRED env 템플릿 추가 완료
- 2026-03-20: BullMQ job scheduler 기반 정기 브리핑 트리거와 env 기반 패턴/타임존 설정, unit 테스트 추가 완료
- 2026-03-20: daily report orchestrator, report run log 저장 구조, 텔레그램 렌더러, 중복 실행 방지, partial failure 규칙, worker 수직 slice 연결, unit/integration 테스트 추가 완료
- 2026-03-20: Google News RSS 기반 뉴스 어댑터, 기사 정규화/중복 제거, portfolio news brief 서비스, structured output 뉴스/리포트 계약, 규칙 기반 quant/risk/scenario 엔진, worker 뉴스 연동 추가 완료
- 2026-03-20: harness fixture 포맷, 일 배치/뉴스/퀀트/report 샘플 fixture, grader 기준, snapshot 비교 스크립트, verify 연동, prompt/skill version 기록 연결 완료
- 2026-03-21: mock telegram delivery adapter, reusable report preview 템플릿, future authenticated web API 계약 초안, 공통 report query model 추가 완료
- 2026-03-21: 텔레그램 리포트를 PRD 6.4 순서에 맞게 재정렬하고 보유 종목 `전일 종가 → 현재가` 표기, 주요 지표 변동 요약, 면책 문구, 이란 전쟁 이슈 예시를 포함한 mock preview로 개선 완료
- 2026-03-21: 텔레그램 리포트 전체 문체를 존댓말로 통일하고 면책 문구를 `❗` 한 줄 형식으로 조정, 관련 테스트와 하네스 스냅샷 갱신 완료
- 2026-03-21: public GitHub repository를 기준으로 남은 운영 자동화 계획을 GitHub Actions 우선 전략으로 재편하고, CI/일 배치 스케줄/수동 실행/secret 관리/지연 허용 규칙을 다음 우선 작업으로 상향 조정
- 2026-03-21: GitHub Actions `CI`와 `Daily Report` workflow, `workflow_dispatch`, secret/env 주입 규칙, direct daily report runner 엔트리포인트를 추가 완료
- 2026-03-25: 정기 세션 cron이 공개 브리핑 업로드를 선행하도록 재정렬하고, 공개 업로드가 생성한 `/reports/[uuid]` 링크를 scheduled daily report에 직접 주입하도록 수정했다. 공개 업로드는 3회까지 재시도하며, 최종 실패 시 `확인 필요` 대신 링크 섹션 자체를 생략한다.
- 2026-03-28: 공개 웹 브리핑을 종목 기사 대신 거시 트렌드 뉴스 기반으로 확장하고, `weekend_briefing` 세션, Upstash REST dedupe/hot cache, `news_items`/`news_analysis_results` 저장 모델, public `newsReferences` 노출을 추가했다.
- 2026-03-28: 공개 웹 브리핑의 `브리핑 역할`과 `시장 종합 해석`을 세션 의도 중심으로 보강하고, `핵심 뉴스 이벤트`를 RSS 헤드라인 + 브리핑용 요약 제안 구조의 `headlineEvents`로 확장했다.
- 2026-03-21: FRED series 매핑 점검 문서를 추가하고, 텔레그램 템플릿 구조에 맞춘 일 리포트 structured output prompt v2와 composition service를 실제 daily report worker 경로에 연결 완료
- 2026-03-21: 실 Telegram provider adapter, `make test-telegram`, GitHub Actions `Telegram Smoke Test` workflow, smoke runner/unit test를 추가해 실채널 검증 자동화 완료
- 2026-03-21: 브리핑 구조를 `시장 / 매크로 / 자금 / 이벤트` 섹션까지 확장하고, LLM prompt v3, 텔레그램 렌더러, mock preview, harness snapshot을 새 구조로 갱신 완료
- 2026-03-21: GitHub Actions `Daily Report Smoke` workflow를 추가해 GitHub-hosted runner의 임시 PostgreSQL과 seeded mock portfolio로 Gemini 기반 일 리포트 생성 경로를 수동 검증할 수 있게 함
- 2026-03-21: GitHub Actions smoke 실행 중 드러난 app runtime script 경로 버그를 수정해 `api`, `telegram-bot`, `worker`의 `start` 및 `run:daily-report` 스크립트가 실제 `tsc` 산출물을 가리키도록 정리
- 2026-03-21: build된 worker가 workspace 내부 패키지를 런타임에 해석할 수 있도록 internal package의 `main`/`types`/`exports` entry를 보강
- 2026-03-21: GitHub Actions와 현재 운영 경로에서는 workspace ESM 해석 이슈를 줄이기 위해 app runtime 스크립트를 `tsx` source entrypoint 기준으로 전환하고, `build`는 검증 단계로 유지
- 2026-03-21: `workflow_dispatch`에서 비워 둔 `REPORT_RUN_DATE`가 빈 문자열로 전달될 때 worker가 오늘 날짜로 폴백하도록 수정해 Postgres date 파싱 오류를 제거
- 2026-03-21: 모든 GitHub Actions workflow에 `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`를 추가해 Node 20 action runtime deprecation 경고를 줄이도록 조정
- 2026-03-21: Yahoo Finance의 같은 거래일 중복 timestamp를 제거해 지수 전일 대비 계산을 바로잡고, `2026-03-20` 기준 live Gemini 한 줄 요약이 `미국 증시 급락 + 변동성 급등 -> 반등 시 비중 축소` 방향으로 복구됨을 확인
- 2026-03-21: 일 리포트 structured output prompt를 추론 억제형 v4로 조정해 `fundFlowBullets`, `holdingTrendBullets`, `articleSummaryBullets`, `eventBullets`가 입력 부재 시 빈 배열을 강제하도록 보강
- 2026-03-21: GitHub Pages 공개 상세 브리핑 구조, canonical/archive permalink 규칙, Telegram 전용 제외 섹션 목록을 code-first로 정의
- 2026-03-21: GitHub Pages 공개 상세 브리핑 HTML renderer와 `scripts/pages/build-public-briefing.mjs`를 추가해 canonical/archive 정적 파일 출력 경로를 실제 코드로 정의
- 2026-03-21: managed Postgres free-tier 후보를 비교한 결과 현재 MVP 운영 기본안은 `Neon`, 추후 앱/Auth/Storage 확장 대안은 `Supabase`로 정리
- 2026-03-21: 텔레그램 `/register`를 추가하고, 그룹 채팅에서는 계정만 등록하되 DM에서 다시 `/register`할 때 개인 발송 대상 chat을 저장하는 정책을 실제 코드와 스키마에 반영
- 2026-03-21: 텔레그램 `/portfolio_add`, `/portfolio_list`, `/portfolio_remove`, `/market_add`, `/market_items`를 실제 DB 저장/조회와 연결하고 관련 unit/integration 검증을 통과
- 2026-03-21: 공개 브리핑 JSON 생성 worker 엔트리포인트, root/archive index 재생성 로직, GitHub Pages deploy job, 텔레그램 하단 상세 브리핑 링크 주입 규칙을 추가해 `공개 상세 브리핑 생성 -> Pages 배포 -> 텔레그램 요약 생성` 순서를 workflow 기준선으로 고정
- 2026-03-21: 멀티채널 역할을 `텔레그램=개인화 입력/요약 delivery`, `GitHub Pages=공개 상세 archive`, `future authenticated web=인증 사용자용 관리·조회`로 분리하고, 사용자 확장 전략을 `core user + channel identity` 방향으로 문서화
- 2026-03-21: 텔레그램 실운영 검증을 위한 `채널=공개`, `그룹=온보딩`, `DM=개인화 delivery` 정책과 멀티 사용자 등록/포트폴리오 입력/개인 리포트 검증 체크리스트 문서를 추가
- 2026-03-21: dedicated worker 이관 기준 문서와 external trigger contract를 추가하고, `DAILY_REPORT_TRIGGER_URL` secret이 있을 때 GitHub Actions가 local worker 대신 외부 worker endpoint를 호출하도록 전환 경로를 구현
- 2026-03-21: GitHub Actions `Daily Report` workflow의 `REPORT_RUN_DATE` 입력 참조 오류를 수정하고, GitHub Pages `/app/` 공개 웹사이트와 `/app/admin.html` 운영 개요 페이지를 추가
- 2026-03-21: 모바일 앱을 현재 MVP 범위에서 제거하고, 공개 채널 확장은 `Telegram + 공개 웹 frontend`까지만 유지하는 방향으로 plan을 재정렬
- 2026-03-21: 개발 및 테스트는 로컬 Docker PostgreSQL 기준으로 유지하고, Neon은 최종 production 배포 시에만 연결하는 운영 원칙을 기준선으로 고정
- 2026-03-21: `reports` 읽기 모델과 공개 브리핑 저장 경로를 추가하고, `apps/web`를 Next.js App Router 기반 공개 feed/detail 웹으로 전환했으며, Telegram 공개 상세 링크와 README를 새 공개 웹 기준으로 갱신
- 2026-03-21: `apps/web`용 Vercel 배포 설정, Neon 친화적 웹 DB 연결 옵션, 웹 전용 env 예시, 배포 runbook을 추가하고 `PUBLIC_BRIEFING_BASE_URL` 운영 기준을 문서화
- 2026-03-21: 사용자 수 10명 이하 조건을 전제로 Telegram command runtime을 Vercel webhook으로, daily report는 `Vercel Cron primary + GitHub Actions manual reconcile` 구조로 전환하기로 결정하고 관련 Phase 7 작업을 최우선으로 재정렬
- 2026-03-21: `apps/web`에 `/api/telegram/webhook`, `/api/cron/daily-report`, `/api/cron/reconcile` route를 추가하고, `apps/telegram-bot/src/build-bot.ts`를 polling/webhook 공용 command runtime entrypoint로 정리
- 2026-03-21: `pnpm telegram:webhook:register` 기반 `setWebhook` 등록 절차를 추가하고, GitHub Actions `Daily Report`를 `VERCEL_RECONCILE_URL + CRON_SECRET` 기반 backup/reconcile 우선 구조로 재편
- 2026-03-21: `apps/web`에 Basic Auth 기반 read-only `/admin` 운영 콘솔을 추가해 최근 공개 브리핑, 최근 24시간 실행 요약, 최근 개인화 리포트 실행 로그를 조회할 수 있게 하고 관련 env/runbook을 정리
- 2026-03-21: `strategy_snapshots` 저장 모델을 추가하고 daily report가 생성한 퀀트 점수카드를 스냅샷으로 저장한 뒤 `/admin`에서 최근 시그널의 이후 수익률과 액션 적합도를 회고할 수 있게 함
- 2026-03-21: 사용자 설정을 `report_detail_level`, `include_public_briefing_link`까지 확장하고 `/report_mode`, `/report_link_on`, `/report_link_off` 명령과 compact 텔레그램 렌더링을 추가
- 2026-03-21: root `AGENTS.md`를 추가하고, 하네스를 `harness/suite-contracts.json` 기준의 suite 계약 구조로 강화해 active/planned suite와 grader/snapshot 불변성을 검증 스크립트에서 강제
- 2026-03-21: `apps/web`를 Vercel production(`https://web-three-tau-58.vercel.app`)에 실제 배포하고, Neon production branch에 baseline schema를 적용한 뒤 public alias, webhook, cron, reconcile, admin auth gate, GitHub Actions backup run까지 production smoke 완료
- 2026-03-22: Telegram `/report`의 duplicate webhook update를 `telegram_processed_updates` 저장 모델로 dedupe하고, duplicate on-demand run 응답을 `이미 생성 중`으로 정정
- 2026-03-22: 공개 웹 frontend를 Pretendard와 shadcn/ui 스타일 컴포넌트 기준으로 재정비하고 feed/detail 레이아웃을 현대적인 금융 브리핑 톤으로 갱신
- 2026-03-22: Telegram DM `/register` 중복 등록 감지와 `/unregister` 초기화 안내를 추가하고, `/portfolio_bulk`로 다종목 벌크 입력을 지원했으며, 정적 종목 resolver에 현대차/에코프로/현대글로비스/HMM을 보강
- 2026-03-22: CSV 기반 ticker master와 ranked search를 도입하고, `/portfolio_add`를 검색/선택/확정 플로우로, `/portfolio_bulk`를 다건 검색 요약 플로우로 확장 완료
- 2026-03-22: Telegram webhook secret header 검증을 production 필수 조건으로 되돌리고, `pnpm telegram:webhook:register`가 secret 없이 실행되지 않도록 운영 기준을 강화
- 2026-03-22: 실제 production webhook + DB side effect를 대상으로 하는 Telegram E2E harness와 outbound reply audit 로그를 추가하고, 최소 회귀 세트 8개와 full suite 실행 경로를 문서화
- 2026-03-21: 실제 Telegram 운영 검증용 `docs/telegram-production-test-scenarios.md`를 추가해 DM/그룹/공개 웹/개인정보 경계/E2E 기대 결과를 운영 체크리스트로 정리
- 2026-03-22: 시장 데이터 조회를 `runDate` 기준 historical fetch로 보정하고, Telegram fast `/report`와 공개 브리핑 생성 경로에 rule-based fallback 섹션을 추가했으며, 공개 웹 feed/detail을 dynamic DB 조회로 전환하고 2026-03-16~2026-03-21 공개 브리핑 backfill을 적재
- 2026-03-22: Telegram `/report`를 개인화 리밸런싱 브리핑 구조로 재편하고, optional `portfolioRebalancing` payload contract, 종목별 리밸런싱 가이드, 시장 레짐 요약, 성향별 해석 fallback을 코드 기준선으로 반영
- 2026-03-22: 공개 웹 브리핑을 `오늘의 시장 브리핑` 구조로 재편하고, 개인 포트 용어를 renderer 단계에서 배제하도록 public builder/markdown/html renderer를 동기화
- 2026-03-22: Telegram DM에 home reply keyboard와 settings inline keyboard를 추가하고, `/start`, `/help`, `/register`, `/report_settings` 이후 버튼 기반 탐색을 지원하면서 기존 slash command semantics를 유지
- 2026-03-22: Telegram `/report`가 실제 runtime에서 `portfolioRebalancing` payload를 renderer/prompt까지 전달하도록 오케스트레이터와 report service를 연결하고, worker/manual backfill 경로에서 `REPORT_RUN_DATE=2026-03-20` override로 실데이터 재현을 확인
- 2026-03-22: `personal_rebalancing_snapshots` JSONB cache를 추가해 개인화 리밸런싱 payload를 날짜별로 재사용하도록 구현
- 2026-03-23: 정기 실행 시각을 `07:30 pre_market / 20:30 post_market`로 재편하고, Telegram `/report`와 공개 브리핑 날짜를 `요청일(KST)` 기준으로 유지한 채 Vercel cron/reconcile이 세션별 공개 브리핑 생성까지 함께 수행하도록 보강
- 2026-03-23: 정기 브리핑을 `07:30 pre_market / 20:30 post_market` 이중 세션으로 전환하고, 공개 브리핑 read model, Telegram `/report`, `/report_time`, cron/reconcile, public fallback path, admin, worker scheduler를 세션 인지형으로 재편했으며 `토요일 오후/일요일 전체 skip` 주말 게이트를 운영 기준으로 고정
- 2026-03-24: Telegram 홈 `종목 추가`를 bulk-first 2-depth chooser로 전환하고, `/portfolio_bulk` 대화형 입력, `/portfolio_add` note 제거 및 yes/no 입력 단순화, 사용자별 KST 일일 한도(`/report` 1회, portfolio 시작 3회), flood auto-block, `/unregister` soft reset, admin exempt, `/admin` user block/unblock 제어까지 구현 완료
- 2026-03-22: Telegram 설정 UI를 `브리핑 켜기 / 브리핑 끄기 / 시간 변경`만 남기도록 단순화하고, webhook/register 경로의 `allowed_updates`에 `callback_query`를 추가해 inline button이 실제로 동작하도록 복구
- 2026-03-22: 관심 지표 개인화는 deprecated 처리하고 `/report`와 공개 브리핑을 시스템 기본 시장 지표 세트 기준으로 통일했으며, 홈 keyboard에서 `📈 관심 지표`를 제거하고 `/market_add`, `/market_items`, `/report_mode`, `/report_link_*`는 deprecation 응답으로 정리
- 2026-03-22: 공개 `reports` read model에 `indicator_tags`를 추가하고, public feed/detail 우상단 태그를 score badge 대신 `KOSPI/KOSDAQ/S&P500/NASDAQ` indicator chip으로 전환했으며, 공개 적재 경로를 `report_date` 기준 latest-upsert + feed date dedupe 구조로 조정
- 2026-03-23: Telegram `/report`가 예외 발생 시에도 `report_runs`를 `failed`로 정리해 stale `running`을 남기지 않도록 보강하고, optional read model이 아직 반영되지 않은 환경에서 개인화 `/report`와 공개 feed 읽기 경로가 graceful fallback으로 계속 동작하도록 수정
- 2026-03-23: Neon production branch에 최신 schema migration을 적용하고 runtime/user 데이터를 초기화한 뒤 공개 브리핑을 2026-03-16~2026-03-20 기준으로 재적재했으며, Telegram webhook을 `callback_query` 포함 allowed updates로 재등록
- 2026-03-27: 기능 변경 시 `시나리오 delta -> scope 분류 -> 범위별 검증 -> live Telegram E2E`를 같은 루프에서 끝내도록 `docs/e2e-change-workflow.md`, `skills/e2e-change-automation`, `pnpm e2e:final` runner, README 지시문 예시를 추가
- 2026-03-27: Vercel cron 공개 브리핑 업로드가 Gemini composition 지연으로 길어지던 문제를 수정하기 위해 `public_web` LLM 조합에 hard timeout을 추가하고, timeout 시 즉시 rule-based fallback으로 전환했으며 관련 Telegram E2E 시나리오와 E2E workflow 기준선을 세션별 `/report` 제목/핵심 섹션 분기까지 반영하도록 갱신
- 2026-03-27: 고정 스케줄 정기 Telegram 발송은 공개 브리핑 row 적재를 선행 조건으로 두고, 같은 세션의 persisted public `summary/signals`와 개인화 데이터만 재조합해 보내도록 보강했다. 이에 따라 scheduled delivery는 공통 시장 해석용 두 번째 LLM 조합을 건너뛰며, production smoke 기준선에는 임시 cron 재배치 후 자동 업로드 확인과 최종 고정 스케줄 복구 절차를 추가했다.
