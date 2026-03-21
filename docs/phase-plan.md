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

## 3. Phase Overview

| Phase | Goal | Status |
| --- | --- | --- |
| Phase 0 | 문서 기준선과 운영 방식 확정 | done |
| Phase 1 | 저장소/런타임 기본 구조 구축 | done |
| Phase 2 | 사용자/포트폴리오/지표 도메인 구현 | done |
| Phase 3 | 오전 9시 일 배치 리포트 파이프라인 구현 | done |
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
- [x] 오전 9시 스케줄 트리거 구현
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
- [x] GitHub Actions scheduled workflow 정의
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
- [x] GitHub Actions `Daily Report`를 backup/reconcile/manual rerun 역할로 재편
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

## 5. Immediate Next Work

현재 활성 phase 계획은 모두 완료됐다.

다음 권장 작업:

1. 실제 Telegram E2E 운영 점검
2. 첫 공개 브리핑 저장 확인 및 feed/detail 실데이터 점검
3. 전략 스코어 튜닝과 운영 지표 보강
4. active harness suite 확장과 grader 정밀도 개선

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
- 2026-03-20: BullMQ job scheduler 기반 오전 9시 daily report 트리거와 env 기반 패턴/타임존 설정, unit 테스트 추가 완료
- 2026-03-20: daily report orchestrator, report run log 저장 구조, 텔레그램 렌더러, 중복 실행 방지, partial failure 규칙, worker 수직 slice 연결, unit/integration 테스트 추가 완료
- 2026-03-20: Google News RSS 기반 뉴스 어댑터, 기사 정규화/중복 제거, portfolio news brief 서비스, structured output 뉴스/리포트 계약, 규칙 기반 quant/risk/scenario 엔진, worker 뉴스 연동 추가 완료
- 2026-03-20: harness fixture 포맷, 일 배치/뉴스/퀀트/report 샘플 fixture, grader 기준, snapshot 비교 스크립트, verify 연동, prompt/skill version 기록 연결 완료
- 2026-03-21: mock telegram delivery adapter, reusable report preview 템플릿, future authenticated web API 계약 초안, 공통 report query model 추가 완료
- 2026-03-21: 텔레그램 리포트를 PRD 6.4 순서에 맞게 재정렬하고 보유 종목 `전일 종가 → 현재가` 표기, 주요 지표 변동 요약, 면책 문구, 이란 전쟁 이슈 예시를 포함한 mock preview로 개선 완료
- 2026-03-21: 텔레그램 리포트 전체 문체를 존댓말로 통일하고 면책 문구를 `❗` 한 줄 형식으로 조정, 관련 테스트와 하네스 스냅샷 갱신 완료
- 2026-03-21: public GitHub repository를 기준으로 남은 운영 자동화 계획을 GitHub Actions 우선 전략으로 재편하고, CI/일 배치 스케줄/수동 실행/secret 관리/지연 허용 규칙을 다음 우선 작업으로 상향 조정
- 2026-03-21: GitHub Actions `CI`와 `Daily Report` workflow, `workflow_dispatch`, secret/env 주입 규칙, direct daily report runner 엔트리포인트를 추가 완료
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
- 2026-03-21: 사용자 수 10명 이하 조건을 전제로 Telegram command runtime을 Vercel webhook으로, daily report는 `Vercel Cron primary + GitHub Actions backup/reconcile` 하이브리드 구조로 전환하기로 결정하고 관련 Phase 7 작업을 최우선으로 재정렬
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
- 2026-03-21: 실제 Telegram 운영 검증용 `docs/telegram-production-test-scenarios.md`를 추가해 DM/그룹/공개 웹/개인정보 경계/E2E 기대 결과를 운영 체크리스트로 정리
