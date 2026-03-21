# Stock Chatbot Context Summary

## 1. Purpose

이 문서는 새 스레드나 컨텍스트 압축 이후에도 작업을 이어갈 수 있도록 현재 프로젝트의 핵심 기준선을 압축해서 유지하는 문서다.

원본 기준 문서:

- PRD: [docs/initial-prd.md](/Users/jisung/Projects/stock-chatbot/docs/initial-prd.md)
- 실행 계획: [docs/phase-plan.md](/Users/jisung/Projects/stock-chatbot/docs/phase-plan.md)
- 변경 이력: [docs/change-log.md](/Users/jisung/Projects/stock-chatbot/docs/change-log.md)

## 2. Refresh Policy

아래 중 하나가 발생하면 이 문서를 갱신한다.

- change-log 항목이 마지막 롤업 이후 5개 이상 누적됨
- MVP 범위, 아키텍처 방향, phase 우선순위가 바뀜
- 새 스레드로 작업을 넘기기 전
- 대규모 구현 작업을 시작하기 전 기준선 재확인이 필요함
- 마지막 갱신 이후 7일이 지남

## 3. Rollup Status

- last_rollup_date: 2026-03-21
- included_change_ids: CHG-0001, CHG-0002, CHG-0003, CHG-0004, CHG-0005, CHG-0006, CHG-0007, CHG-0008, CHG-0009, CHG-0010, CHG-0011, CHG-0012, CHG-0013, CHG-0014, CHG-0015, CHG-0016, CHG-0017, CHG-0018, CHG-0019, CHG-0020, CHG-0021, CHG-0022, CHG-0023, CHG-0024, CHG-0025, CHG-0026, CHG-0027, CHG-0028, CHG-0029, CHG-0030, CHG-0031, CHG-0032, CHG-0033, CHG-0034, CHG-0035, CHG-0036, CHG-0037, CHG-0038, CHG-0039, CHG-0040, CHG-0041, CHG-0042, CHG-0043, CHG-0044, CHG-0045, CHG-0046, CHG-0047, CHG-0048, CHG-0049, CHG-0050, CHG-0051, CHG-0052, CHG-0053, CHG-0054
- source_of_truth: PRD + Phase Plan + Change Log

## 4. Current Product Baseline

- 제품은 개인화된 주식 리포트를 제공하는 서비스다.
- 현재 MVP는 텔레그램 기반이며, 매일 오전 9시에 한 번 자동 리포트를 발송한다.
- 초기 MVP에는 온디맨드 `/report`가 포함되지 않는다.
- MVP 전달 채널은 `텔레그램 요약본 + GitHub Pages 상세 브리핑`의 이중 구조다.
- 사용자 포트폴리오와 사용자별 시장 지표를 저장하고, 이를 바탕으로 시장 요약, 뉴스 요약, 퀀트 기반 시나리오를 생성한다.
- 장기적으로는 동일한 코어 서비스 위에 웹 앱과 모바일 앱까지 확장할 계획이 있으나, 우선순위는 가장 낮다.

## 5. Current Technical Direction

- 현재 권장 방향은 `API-first TypeScript backend`다.
- 이 방향은 이제 프로젝트의 확정 아키텍처다.
- LLM 계층은 provider-agnostic profile 기반으로 추상화하고, 기본 provider 기준선은 `OpenAI Responses API`다.
- 텔레그램은 첫 번째 delivery adapter로 두고, 코어 애플리케이션 서비스는 채널 독립적으로 유지한다.
- 초기 구현은 `Node.js 24.14.0 + TypeScript 5.9.2 + Fastify 5.6.0 + grammY 1.38.2 + BullMQ 5.58.5 + PostgreSQL 18.3 + Redis 8.6.0 + Drizzle 0.44.5` 기준선을 사용한다.
- 로컬 인프라는 `Docker Compose + Makefile` 기준으로 PostgreSQL과 Redis를 실행한다.
- 코드 변경의 기본 검증 명령은 `make verify`다.
- 현재 기본 검증 루프는 실제로 `pnpm verify` 통과 상태다.
- DB/저장 계층 변경 시 `make test-integration`까지 수행한다.
- GitHub public repository와 `origin/main` push 기준선이 준비됐다.
- 비용 최소화를 위해 초기 운영 자동화의 기본 런타임은 GitHub Actions다.
- 초기 운영은 GitHub Actions CI + scheduled workflow + workflow_dispatch를 우선 사용하고, 정확한 정시성이나 장시간 실행 요구가 커지면 전용 worker/queue로 이관한다.
- 저장소에는 GitHub Actions `CI`와 `Daily Report` workflow가 추가됐고, worker에는 queue 없이 직접 일 배치를 수행하는 daily report runner 엔트리포인트가 추가됐다.
- GitHub Actions에는 `Daily Report Smoke` workflow가 추가됐고, GitHub-hosted runner 안에서 임시 PostgreSQL을 띄워 mock 사용자/포트폴리오를 seed한 뒤 Gemini 기반 daily report 생성 경로를 수동 검증할 수 있다.
- 작업 단위는 검증 통과 후 commit하고, 원격 인증이 정상일 때 push까지 수행한다.
- `git add`, `git commit`, `git push`는 검증 완료 후 항상 수행하는 기본 마감 단계다.
- 분석 엔진이 커지면 Python 분석 서비스 분리를 고려한다.

## 6. Active Delivery Plan

- `Phase 1`은 완료됐다.
- `Phase 2`는 완료됐다.
- `Phase 3`는 완료됐다.
- `Phase 4`는 완료됐다.
- `Phase 5`는 진행 중이다.
- `Phase 6`은 부분적으로 시작됐다.
- `Phase 2`에서 사용자 모델, 포트폴리오 보유 종목, 기본 시장 지표 카탈로그, 사용자별 시장 지표 override에 대한 Drizzle 저장 계층과 unit/integration 테스트가 추가됐다.
- application 계층에는 정적 alias registry와 코드 정규화 기반의 포트폴리오/시장 지표 resolver가 추가됐다.
- application 계층에는 task별 provider-agnostic LLM 라우팅 정책 함수가 추가됐다.
- application 계층에는 provider-agnostic LLM client interface와 OpenAI adapter 초안이 추가됐다.
- application 계층에는 `FRED + Yahoo Finance scraping` 혼합 market data adapter가 추가됐다.
- application 계층에는 daily report orchestrator와 텔레그램 렌더러가 추가됐다.
- application 계층에는 Google News RSS 기반 뉴스 어댑터, 기사 정규화/중복 제거, portfolio news brief 서비스, structured output 뉴스/리포트 계약, 규칙 기반 quant/risk/scenario 엔진이 추가됐다.
- application 계층에는 mock telegram delivery adapter, reusable report preview 템플릿, 공통 report query model이 추가됐다.
- telegram report 렌더러는 이모지, 방향 기호, 섹션 중심 레이아웃으로 개선됐고 실채널 POC 메시지 발송으로 확인됐다.
- 시장 지표 렌더링은 `전일값 → 현재값` 형식으로 표시하고, `USD/KRW`는 `DXY`와 함께 상대 강도를 해석하도록 확장됐다.
- 텔레그램 리포트는 PRD 6.4 순서를 따르도록 재정렬됐고, 보유 종목도 `전일 종가 → 현재가`와 등락률을 표시할 수 있게 확장됐다.
- `주요 지표 변동 요약`과 `면책 문구`는 항상 출력되며, 현재 mock preview에는 중동 이란 전쟁 이슈를 당일 거시 이슈 예시로 포함한다.
- 텔레그램 리포트 전체 문체는 존댓말로 통일됐고, 면책 문구는 별도 헤더 없이 `❗` 한 줄 형식으로 출력된다.
- GitHub Actions schedule은 UTC cron과 기본 브랜치 기준으로 설계해야 하며, 정시 지연 가능성을 전제로 idempotency와 지연 허용 규칙을 함께 둔다.
- worker에는 BullMQ job scheduler 기반 오전 9시 트리거와 env 기반 패턴/타임존 설정이 추가됐다.
- worker에는 뉴스 brief 연동과 prompt/skill version 기록 연결이 추가됐다.
- FRED market data는 series 매핑 점검 기준을 문서화했고, `USD/KRW`는 `DEXKOUS`, 달러 강도 proxy는 `DTWEXBGS`를 기준으로 해석한다.
- application 계층에는 텔레그램 템플릿 구조와 직접 매핑되는 일 리포트 prompt v2와 `DailyReportCompositionService`가 추가됐다.
- worker의 실제 daily report 경로는 `OPENAI_API_KEY`가 있을 때 뉴스 요약뿐 아니라 리포트 본문 조합도 LLM으로 수행하고, 실패 시 기존 렌더러 fallback으로 계속 진행한다.
- application 계층에는 실 Telegram Bot API `getMe`/`sendMessage`를 감싼 provider adapter가 추가됐다.
- telegram-bot 앱에는 `TELEGRAM_TEST_CHAT_ID` 기반 smoke runner가 추가됐고, 로컬 `make test-telegram`과 GitHub Actions `Telegram Smoke Test` workflow로 같은 검증을 실행할 수 있다.
- 기본 거시 시장 카탈로그에는 `코스피`, `코스닥`, `S&P 500`, `국제 유가 (WTI)`, `천연가스 (Henry Hub)`, `구리`가 포함된다.
- `commodity:COPPER`는 FRED `PCOPPUSDM`으로 연결돼 있고 월간 지표로 해석한다.
- 지수성 자산(`S&P500`, `NASDAQ`, `DOW`, `VIX`, `KOSPI`, `KOSDAQ`)은 Yahoo Finance scraping을 우선 사용하고, 금리/환율/원자재는 FRED를 우선 사용한다.
- 매일 1회 정기 브리핑 성격에 맞춰 텔레그램 리포트 제목에는 기준일을 포함하고, `거시 시장 스냅샷` 자체에는 별도 일자 라벨을 반복 노출하지 않는다.
- 텔레그램 브리핑 제목은 `오늘의 브리핑 (YYYY-MM-DD 기준)` 형식을 사용한다.
- 텔레그램 브리핑 구조는 `한 줄 요약 -> 거시 시장 스냅샷 -> 주요 지표 변동 요약 -> 보유 종목별 최근 동향 -> 종목 관련 핵심 기사 및 이벤트 요약 -> 퀀트 기반 시그널 및 매매 아이디어 -> 리스크 체크리스트 -> 시장, 매크로, 자금 브리핑 -> 주요 일정 및 이벤트 브리핑 -> 면책 문구` 순서를 따른다.
- 텔레그램 요약본은 구분선과 짧은 액션 문장을 사용해 한눈에 스캔 가능해야 하며, `현재 시장 상태 판단 -> 행동 제안 -> 근거` 흐름을 우선한다.
- 텔레그램의 `퀀트 기반 시그널 및 매매 아이디어` 섹션은 `Macro / Trend / Event / Flow -> Total -> Action` 점수카드를 먼저 보여주고, 그 아래에 행동 bullet을 붙이는 방식으로 확장됐다.
- mock telegram report의 기본 포트폴리오는 사용자 제공 예시인 삼성전자, SK하이닉스, 현대차, 에코프로, 현대글로비스, HMM 기준으로 맞춰졌다.
- 텔레그램의 보유 종목 섹션과 퀀트 점수카드 헤더는 회사명만 노출하고, 종목 코드는 사용자 노출에서 제외한다.
- LLM 계층은 이제 `LLM_PROVIDER=openai|google`와 `OPENAI_API_KEY` / `GEMINI_API_KEY`를 통해 OpenAI와 Gemini를 선택할 수 있다.
- Google provider의 현재 기준 모델은 공식 문서 기준 `gemini-3-flash-preview`다.
- GitHub Actions `Daily Report` workflow는 `OPENAI_API_KEY`와 함께 `GEMINI_API_KEY`, `LLM_PROVIDER` env도 주입하도록 갱신돼, secrets 설정만으로 OpenAI와 Gemini를 선택해 운영 경로를 바꿀 수 있다.
- `tsc` 산출물 경로가 `dist/apps/<app>/src/...` 형태이므로, `api`, `telegram-bot`, `worker` 패키지의 `start` 및 `run:daily-report` 스크립트도 이 경로를 직접 가리키도록 수정됐다.
- build된 app runtime이 workspace 내부 패키지를 정상적으로 import하도록 `packages/application`, `packages/database`, `packages/core-types`의 package.json에 `main`/`types`/`exports` entry가 추가됐다.
- 현재 운영용 실행 스크립트는 compiled `dist` 대신 `tsx` source entrypoint를 사용한다. `pnpm build`는 여전히 타입/산출물 검증용으로 유지되지만, Actions와 로컬 런타임은 workspace ESM 해석 이슈를 줄이기 위해 source 실행을 기준으로 삼는다.
- GitHub Pages 상세 브리핑은 같은 날의 공개 가능한 상세 시장 브리핑을 블로그형 정적 페이지로 게시하는 채널이다.
- GitHub Pages 공개본에는 `보유 종목별 최근 동향`과 `종목 관련 핵심 기사 및 이벤트 요약` 같은 개인화 섹션이 포함되지 않는다.
- 텔레그램 메시지 하단에는 해당 날짜의 GitHub Pages 상세 브리핑 링크를 포함하는 방향으로 계획이 조정됐다.
- `거시 시장 스냅샷`은 `NASDAQ -> S&P500 -> DOW -> VIX -> KOSPI -> KOSDAQ -> 미국 10년물 금리 -> 국제 유가(WTI) -> 천연가스 -> 구리 -> USD/KRW -> 달러인덱스` 순서를 기본으로 하고, 그룹 사이를 빈 줄로 구분한다.
- `거시 시장 스냅샷`에서는 `USD/KRW`와 `달러인덱스`를 하단에 연속 배치하고, 두 지표를 함께 해석하는 FX 문장을 바로 아래에 붙인다.
- `market-report-composition` prompt는 v3로 올라갔고, `시장 / 매크로 / 자금 / 이벤트` 섹션을 별도 structured output 배열로 반환한다.
- database 계층에는 report_runs 저장 구조와 dedupe용 unique 키가 추가됐다.
- telegram-bot에는 command별 in-memory 대화 상태 저장소와 상태 전이 로직이 추가됐다.
- telegram-bot에는 `/mock_report` 예시 명령이 추가됐다.
- api에는 `/v1/reports/:userId/latest`, `/v1/reports/:userId/history`, `/v1/mock/telegram/daily-report` 초안이 추가됐다.
- `Phase 3`은 오전 9시 일 배치 리포트 파이프라인 구현이다.
- `Phase 4`는 뉴스 요약 및 퀀트 전략 엔진 구현 단계였고 현재 완료됐다.
- `Phase 5`는 하네스, 평가, 운영 자동화 구축 단계이며 fixture, grader, snapshot 비교 흐름이 이미 들어갔다.
- `Phase 5`의 다음 우선순위는 GitHub Pages 공개 상세 브리핑 생성/배포와 텔레그램 링크 연결이다.
- `Phase 6`은 멀티채널 준비 단계이며 mock delivery와 공통 report query model, API 계약 초안까지 들어간 상태다.
- `Phase 6`은 웹/앱 확장을 위한 멀티채널 준비 단계다.
- `Phase 7`은 온디맨드 `/report`, 웹 클라이언트, 모바일 앱 같은 후순위 확장 단계다.

## 7. Guardrails

- 수치 데이터는 계산 결과를 직접 주입하고 LLM은 해석을 담당한다.
- 기사 정보는 메타데이터 기준으로 유지하고 추측하지 않는다.
- 전략은 확정적 매매 지시가 아니라 시나리오 제안으로 표현한다.
- 일 배치 작업에는 중복 실행 방지 장치를 둔다.
- 채널별 UI 로직과 코어 분석 로직은 분리한다.

## 8. Current Open Questions

- 시장 데이터와 뉴스 데이터의 우선 소스를 무엇으로 할지
- 리포트 예약 전송을 사용자별로 확장할지
- 포트폴리오 수량과 평균단가를 어느 수준까지 정확히 관리할지
- 티커 및 지표 해석 계층에서 지원하지 않는 시장 지표 요청을 어떻게 폴백할지
- Gemini용 첫 provider adapter를 바로 추가할지
- 미래 앱/web 확장 시 인증과 계정 연결을 어떻게 설계할지

## 9. Handoff Notes

- 상세 배경은 change-log를 보면 되지만, 새 스레드는 이 문서를 우선 기준으로 사용한다.
- 이 문서가 오래됐거나 누락이 의심되면 `context-rollup` skill로 먼저 갱신한다.
