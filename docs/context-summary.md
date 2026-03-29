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

- last_rollup_date: 2026-03-28
- included_change_ids: CHG-0001, CHG-0002, CHG-0003, CHG-0004, CHG-0005, CHG-0006, CHG-0007, CHG-0008, CHG-0009, CHG-0010, CHG-0011, CHG-0012, CHG-0013, CHG-0014, CHG-0015, CHG-0016, CHG-0017, CHG-0018, CHG-0019, CHG-0020, CHG-0021, CHG-0022, CHG-0023, CHG-0024, CHG-0025, CHG-0026, CHG-0027, CHG-0028, CHG-0029, CHG-0030, CHG-0031, CHG-0032, CHG-0033, CHG-0034, CHG-0035, CHG-0036, CHG-0037, CHG-0038, CHG-0039, CHG-0040, CHG-0041, CHG-0042, CHG-0043, CHG-0044, CHG-0045, CHG-0046, CHG-0047, CHG-0048, CHG-0049, CHG-0050, CHG-0051, CHG-0052, CHG-0053, CHG-0054, CHG-0055, CHG-0056, CHG-0057, CHG-0058, CHG-0059, CHG-0060, CHG-0061, CHG-0062, CHG-0063, CHG-0064, CHG-0065, CHG-0066, CHG-0067, CHG-0068, CHG-0069, CHG-0070, CHG-0071, CHG-0072, CHG-0073, CHG-0074, CHG-0075, CHG-0076, CHG-0077, CHG-0078, CHG-0079, CHG-0080, CHG-0081, CHG-0082, CHG-0083, CHG-0084, CHG-0085, CHG-0086, CHG-0087, CHG-0088, CHG-0089, CHG-0090, CHG-0091, CHG-0092, CHG-0093, CHG-0094, CHG-0095, CHG-0096, CHG-0097, CHG-0098, CHG-0099, CHG-0100, CHG-0101, CHG-0102, CHG-0103, CHG-0104, CHG-0105, CHG-0106, CHG-0107, CHG-0108, CHG-0109, CHG-0110, CHG-0111, CHG-0112, CHG-0113, CHG-0114, CHG-0115, CHG-0116, CHG-0117, CHG-0118, CHG-0119, CHG-0120, CHG-0121, CHG-0122, CHG-0123, CHG-0124, CHG-0125, CHG-0126, CHG-0127, CHG-0128, CHG-0129, CHG-0130, CHG-0131, CHG-0132, CHG-0133, CHG-0134, CHG-0135, CHG-0136, CHG-0137
- source_of_truth: PRD + Phase Plan + Change Log

## 4. Current Product Baseline

- 제품은 개인화된 주식 리포트를 제공하는 서비스다.
- 현재 MVP는 텔레그램 + 공개 웹 기반이며, 정기 브리핑은 `07:30 pre_market`, `20:30 post_market`, `토요일 08:00 weekend_briefing(public only)` 세션으로 운영된다. 미국장 기준으로 `월~토 오전`, `월~금 오후`, `토요일 주말 공개 브리핑`만 생성이 허용된다.
- 현재 구현 기준으로는 DM에서 온디맨드 `/report`도 지원한다.
- MVP 전달 채널은 `텔레그램 요약본 + 공개 웹 frontend`의 이중 구조다.
- 사용자 포트폴리오와 사용자별 시장 지표를 저장하고, 이를 바탕으로 시장 요약, 뉴스 요약, 퀀트 기반 시나리오를 생성한다.
- 장기적으로는 동일한 코어 서비스 위에 공개 웹과 인증된 웹 관리 화면까지 확장할 계획이 있으나, 모바일 앱은 현재 활성 로드맵에서 제외됐다.

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
- 기능 변경은 `docs/e2e-change-workflow.md`에 시나리오 delta와 scope를 먼저 반영하고, `pnpm e2e:final`로 최종 live E2E gate를 수행하는 기준선을 사용한다.
- Telegram/webhook/cron/public web/Neon production에 영향을 주는 변경은 로컬 검증으로 끝내지 않고 `commit/push -> production deploy 확인 -> production DB/data 반영 -> production smoke/E2E`까지 끝나야 완료로 본다.
- GitHub public repository와 `origin/main` push 기준선이 준비됐다.
- 비용 최소화를 위해 초기 운영 자동화의 기본 런타임은 GitHub Actions다.
- 초기 운영은 GitHub Actions CI + workflow_dispatch 기반 검증을 우선 사용했고, 정시 실행은 현재 Vercel Cron primary 기준으로 고정한다. 장시간 실행 요구가 커지면 전용 worker/queue로 이관한다.
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
- `Phase 5`는 완료됐다.
- `Phase 6`은 완료됐다.
- `Phase 7`은 공개 웹 전환과 후속 운영 확장 계획까지 구현 완료 상태다.
- `Phase 2`에서 사용자 모델, 포트폴리오 보유 종목, 기본 시장 지표 카탈로그, 사용자별 시장 지표 override에 대한 Drizzle 저장 계층과 unit/integration 테스트가 추가됐다.
- application 계층에는 정적 alias registry와 코드 정규화 기반의 포트폴리오/시장 지표 resolver가 추가됐다.
- application 계층에는 task별 provider-agnostic LLM 라우팅 정책 함수가 추가됐다.
- application 계층에는 provider-agnostic LLM client interface와 OpenAI adapter 초안이 추가됐다.
- application 계층에는 `FRED + Yahoo Finance scraping` 혼합 market data adapter가 추가됐다.
- application 계층에는 daily report orchestrator와 텔레그램 렌더러가 추가됐다.
- application 계층에는 Google News RSS 기반 종목 뉴스 어댑터와 별도로, 국내/해외 RSS 소스를 읽는 `MacroTrendNewsService`, 기사 정규화/중복 제거, portfolio news brief 서비스, structured output 뉴스/리포트 계약, 규칙 기반 quant/risk/scenario 엔진이 추가됐다.
- 공개 웹은 더 이상 종목별 기사 요약을 쓰지 않고 `거시 정책 / 환율·금리 / 야간 선물 / 글로벌 리스크 / 섹터 로테이션 / 시장 테마` 중심의 `macroTrendBriefs`만 반영한다.
- 공개 웹의 `브리핑 역할`은 세션별로 `미장 마감 분석 기반 국장 시초가 예측 / 국장·대체거래소 결과 분석 및 미장 예보 / 주간 이슈 총정리 및 다음 주 일정 요약`을 직접 드러내야 한다.
- 공개 웹의 `핵심 뉴스 이벤트`는 RSS 원문 headline과 `브리핑용 요약 제안`을 함께 출력하는 `headlineEvents` 구조를 사용하고, 공개 `eventBullets`는 세션별 체크포인트/일정 용도로 사용한다.
- Upstash REST cache는 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` env가 있을 때만 활성화되고, 뉴스 dedupe/hot cache/analysis cache에만 사용한다. 영속 저장과 최종 idempotency는 Postgres `news_items`, `news_analysis_results`, `reports.news_references`가 담당한다.
- 운영용 `/api/cron/public-backfill`는 이제 write path 실행 뒤 동일 runtime의 public read path로 persisted row를 즉시 재검증해야 한다. row를 다시 읽지 못하면 성공 응답 대신 실패로 처리해, current-week backfill에서 “응답은 성공인데 공개 feed/detail에는 없음” 상태를 남기면 안 된다.
- `run:backfill-public-week`는 `PUBLIC_BRIEFING_BASE_URL`과 `CRON_SECRET`가 있으면 local worker insert 대신 production runtime `/api/cron/public-backfill`를 우선 사용한다. 운영 백필은 write-path와 read-path가 같은 runtime을 기준으로 검증해야 한다.
- 공개 `feed/detail` page는 `dynamic = "force-dynamic"`만으로는 build 시점 스냅샷이 남을 수 있어, Next 15 `connection()`을 호출해 요청 시점 runtime 연결을 먼저 확보한 뒤 DB read path를 수행해야 한다.
- application 계층에는 mock telegram delivery adapter, reusable report preview 템플릿, 공통 report query model이 추가됐다.
- telegram report 렌더러는 이모지, 방향 기호, 섹션 중심 레이아웃으로 개선됐고 실채널 POC 메시지 발송으로 확인됐다.
- 시장 지표 렌더링은 `전일값 → 현재값` 형식으로 표시하고, `USD/KRW`는 `DXY`와 함께 상대 강도를 해석하도록 확장됐다.
- 텔레그램 리포트는 PRD 6.4 순서를 따르도록 재정렬됐고, 보유 종목도 `전일 종가 → 현재가`와 등락률을 표시할 수 있게 확장됐다.
- `주요 지표 변동 요약`과 `면책 문구`는 항상 출력되며, 현재 mock preview에는 중동 이란 전쟁 이슈를 당일 거시 이슈 예시로 포함한다.
- 텔레그램 리포트 전체 문체는 존댓말로 통일됐고, 면책 문구는 별도 헤더 없이 `❗` 한 줄 형식으로 출력된다.
- GitHub Actions schedule은 UTC cron과 기본 브랜치 기준으로 설계해야 하며, 정시 지연 가능성을 전제로 idempotency와 지연 허용 규칙을 함께 둔다.
- worker에는 BullMQ job scheduler 기반 `pre_market / post_market` 세션 트리거와 env 기반 패턴/타임존 설정이 추가됐다.
- worker에는 뉴스 brief 연동과 prompt/skill version 기록 연결이 추가됐다.
- FRED market data는 series 매핑 점검 기준을 문서화했고, `USD/KRW`는 `DEXKOUS`, 달러 강도 proxy는 `DTWEXBGS`를 기준으로 해석한다.
- application 계층에는 텔레그램 템플릿 구조와 직접 매핑되는 일 리포트 prompt v2와 `DailyReportCompositionService`가 추가됐다.
- 현재 일 리포트 prompt 계약은 `telegram_personalized`와 `public_web` audience를 구분한다. 두 경로 모두 같은 structured output JSON을 유지하지만, Telegram은 개인화 리밸런싱 우선순위를, 공개 웹은 비개인화 시장 해석 guardrail을 강제한다.
- worker의 실제 daily report 경로는 `OPENAI_API_KEY`가 있을 때 뉴스 요약뿐 아니라 리포트 본문 조합도 LLM으로 수행하고, 실패 시 기존 렌더러 fallback으로 계속 진행한다.
- application 계층에는 실 Telegram Bot API `getMe`/`sendMessage`를 감싼 provider adapter가 추가됐다.
- telegram-bot 앱에는 `TELEGRAM_TEST_CHAT_ID` 기반 smoke runner가 추가됐고, 로컬 `make test-telegram`과 GitHub Actions `Telegram Smoke Test` workflow로 같은 검증을 실행할 수 있다.
- 기본 거시 시장 카탈로그에는 `코스피`, `코스닥`, `S&P 500`, `국제 유가 (WTI)`, `천연가스 (Henry Hub)`, `구리`가 포함된다.
- `commodity:COPPER`는 FRED `PCOPPUSDM`으로 연결돼 있고 월간 지표로 해석한다.
- 지수성 자산(`S&P500`, `NASDAQ`, `DOW`, `VIX`, `KOSPI`, `KOSDAQ`)은 Yahoo Finance scraping을 우선 사용하고, 금리/환율/원자재는 FRED를 우선 사용한다.
- 텔레그램 개인화 리포트 제목은 세션별로 `오늘의 포트폴리오 프리마켓 브리핑 (YYYY-MM-DD)` 또는 `오늘의 포트폴리오 포스트마켓 브리핑 (YYYY-MM-DD)` 형식을 사용한다.
- `pre_market` 텔레그램 브리핑 구조는 `오늘 한 줄 결론 -> 오늘의 판단 프레임 -> 성향별 대응 -> 포트폴리오 리밸런싱 제안 -> 오늘 반드시 볼 리스크 -> 공개 프리마켓 링크 -> 면책 문구` 순서를 따른다.
- `post_market` 텔레그램 브리핑 구조는 `오늘 해석 요약 -> 오전 프레임 대비 맞은 점/빗나간 점 -> 보유 종목 검증 -> 기준 보정 제안 -> 다음 세션으로 넘길 리스크 -> 공개 포스트마켓 링크 -> 면책 문구` 순서를 따른다.
- 종목별 리밸런싱 가이드는 가능하면 `내재 가치 / 가격·추세 / 미래 기대치 / 포트 적합성 / 제약 요인 / 가이드`를 노출하고, rich payload가 없을 때는 자연스러운 fallback label을 사용한다.
- 시세 스냅샷은 별도 큰 섹션이 아니라 종목별 가이드 문장 안에서 `전일 종가 → 현재가` 형태로 유지된다.
- 텔레그램 요약본은 `hard rule -> final action -> 시장 레짐 -> 3대 관점 -> 기타 사실` 순서의 해석을 우선한다.
- mock telegram report의 기본 포트폴리오는 사용자 제공 예시인 삼성전자, SK하이닉스, 현대차, 에코프로, 현대글로비스, HMM 기준으로 맞춰졌다.
- 텔레그램의 보유 종목 섹션과 퀀트 점수카드 헤더는 회사명만 노출하고, 종목 코드는 사용자 노출에서 제외한다.
- LLM 계층은 이제 `LLM_PROVIDER=openai|google`와 `OPENAI_API_KEY` / `GEMINI_API_KEY`를 통해 OpenAI와 Gemini를 선택할 수 있다.
- Google provider의 현재 기준 모델은 공식 문서 기준 `gemini-3-flash-preview`다.
- GitHub Actions `Daily Report` workflow는 `OPENAI_API_KEY`와 함께 `GEMINI_API_KEY`, `LLM_PROVIDER` env도 주입하도록 갱신돼, secrets 설정만으로 OpenAI와 Gemini를 선택해 운영 경로를 바꿀 수 있다.
- `tsc` 산출물 경로가 `dist/apps/<app>/src/...` 형태이므로, `api`, `telegram-bot`, `worker` 패키지의 `start` 및 `run:daily-report` 스크립트도 이 경로를 직접 가리키도록 수정됐다.
- build된 app runtime이 workspace 내부 패키지를 정상적으로 import하도록 `packages/application`, `packages/database`, `packages/core-types`의 package.json에 `main`/`types`/`exports` entry가 추가됐다.
- 현재 운영용 실행 스크립트는 compiled `dist` 대신 `tsx` source entrypoint를 사용한다. `pnpm build`는 여전히 타입/산출물 검증용으로 유지되지만, Actions와 로컬 런타임은 workspace ESM 해석 이슈를 줄이기 위해 source 실행을 기준으로 삼는다.
- worker의 `readRunDate`는 이제 `REPORT_RUN_DATE`가 비어 있거나 공백만 있어도 오늘 날짜로 폴백한다. 따라서 GitHub Actions `workflow_dispatch` 입력을 비워 둔 경우에도 Postgres `date` 컬럼에 빈 문자열이 들어가지 않는다.
- GitHub Actions workflow에는 `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`가 추가돼 `actions/checkout@v4`, `actions/setup-node@v4`의 Node 20 deprecation 경고를 사전에 흡수하도록 조정됐다.
- 텔레그램 리포트의 현재 기준선은 `거시 시장 스냅샷` 단독 섹션이 아니라 개인화 리밸런싱 구조다. 이전 스냅샷 정렬 규칙은 legacy note로만 유지한다.
- Yahoo Finance daily chart 응답은 같은 거래일의 종가 시점과 후속 메타 시점을 함께 반환할 수 있으므로, 지수성 자산의 전일 대비 계산은 timestamp가 아니라 `asOfDate` 기준으로 중복 제거한 뒤 마지막 두 거래일을 비교하도록 보정됐다.
- live Gemini 검증 경로는 로컬 Docker PostgreSQL에 mock 포트폴리오를 seed한 뒤 worker를 `LLM_PROVIDER=google`로 실행하고, 생성된 `report_runs.report_text`를 Telegram Bot API로 직접 발송하는 방식으로 확인했다.
- 2026-03-21 live Gemini 검증에서는 종목 뉴스 이벤트 추출 단계에서 `Gemini API request failed with status 429`가 발생해 기사 섹션이 fallback 문구로 내려간 사례가 확인됐다.
- 2026-03-20 기준 재검증에서는 Yahoo 중복 거래일 제거 이후 `NASDAQ -2.01%`, `S&P500 -1.51%`, `DOW -0.96%`, `VIX +11.31%`, `KOSPI +0.31%`, `KOSDAQ +1.58%`가 정상 복구됐고, Gemini의 한 줄 요약도 `미국 증시 급락 + 공포지수 급등 -> 반등 시 비중 축소 및 리스크 관리` 방향으로 더 날카롭게 바뀌었다.
- 일 리포트 prompt v4는 데이터가 없는 섹션에 대해 더 엄격하다. `fundFlowBullets`, `holdingTrendBullets`, `articleSummaryBullets`, `eventBullets`는 입력 부재 시 빈 배열만 허용하고, `marketResults.asOfDate`가 다르면 같은 시점의 사건처럼 과장하지 않도록 제한한다.
- 공개 브리핑 채널은 code-first 모델로 정의됐다. legacy fallback 경로는 `/briefings/YYYY-MM-DD/`, archive 경로는 `/briefings/YYYY/MM/DD/`이며, 공개본에서는 `holdings`, `holdingTrendBullets`, `articleSummaryBullets`, `portfolioNewsBriefs`, `personalizedQuantScorecards`를 제외한다.
- 공개 브리핑에는 HTML renderer와 `build-public-briefing` script가 추가돼 canonical/archive 두 경로에 동일한 정적 페이지를 출력할 수 있다.
- managed Postgres free-tier 기본 추천은 현재 `Neon`이다. 이유는 PostgreSQL 전용 구조, branching, scale-to-zero, Vercel 배포와의 궁합 때문이다. 단, 개발 및 테스트 기본 DB는 로컬 Docker PostgreSQL이고 Neon은 모든 구현/검증 완료 후 production 연결 대상으로만 사용한다. `Supabase`는 추후 인증/스토리지/리얼타임이 함께 필요해질 때 재검토한다.
- 텔레그램 그룹 채팅 확장 요구에 따라 `/register`가 MVP 필수 명령으로 올라갔다. 그룹 채팅에서의 `/register`는 계정만 만들고, 개인화 리포트 발송 대상 `preferred_delivery_chat_id`는 DM(`private` chat)에서 다시 `/register`할 때만 저장하는 정책이 기준선이다.
- 텔레그램 실운영 채널 정책은 `채널=공개 브리핑`, `그룹=온보딩/안내`, `DM=개인화 delivery` 3계층을 기본으로 한다.
- 그룹에 새 사용자가 들어오면 봇이 `/register` 안내 메시지를 자동으로 보내고, 미등록 사용자가 그룹에서 일반 메시지를 남기면 1회 등록 안내를 다시 보내는 보조 온보딩 흐름이 추가됐다.
- `users` 스키마에는 `preferred_delivery_chat_id`, `preferred_delivery_chat_type`이 추가됐다.
- telegram-bot은 이제 `/register`, `/portfolio_add`, `/portfolio_list`, `/portfolio_remove`, `/report_settings`를 실제 운영 경로와 연결한다. `/market_add`, `/market_items`는 더 이상 개인화 입력 경로로 사용하지 않고 deprecation 안내만 남긴다.
- 미등록 사용자가 포트폴리오/시장 지표 명령을 호출하면 `/register`를 먼저 요구한다.
- 멀티 사용자 실채널 테스트 체크리스트는 `docs/telegram-multi-user-test-scenarios.md`를 기준으로 사용한다.
- daily report worker는 이제 생성 성공 후 `preferred_delivery_chat_id`가 있는 사용자에게 Telegram DM delivery를 시도한다.
- worker summary 로그에는 `delivered`, `deliverySkipped`, `deliveryFailed` 집계가 추가됐다.
- 현재 공개 브리핑에는 GitHub Pages fallback 경로가 있으나, primary public web은 `Vercel + Next.js App Router + reports read model` 기준으로 이미 전환 구현됐다.
- database 계층에는 공개 브리핑용 `reports` 읽기 모델이 추가됐다. 이 테이블은 `report_date`, `summary`, `market_regime`, `total_score`, `signals`, `indicator_tags`, `content_markdown`, `created_at`을 저장하고, 공개 웹 feed/detail의 조회 모델로만 사용한다.
- database 계층에는 `personal_rebalancing_snapshots` read model이 추가됐다. 이 테이블은 `user_id + effective_report_date + snapshot_version` 키로 개인화 리밸런싱 payload JSONB를 저장하고, 현재는 요청일(KST) 기준 날짜별 cache로 사용된다.
- `run-public-briefing`은 이제 공개 브리핑 JSON 파일만 만드는 것이 아니라, `DATABASE_URL`이 설정된 경우 공개 가능한 브리핑을 `reports`에도 저장한다.
- 공개 브리핑 `public_web` LLM 조합은 cron critical path를 막지 않도록 hard timeout을 사용하며, provider 지연이나 timeout이 발생하면 즉시 rule-based summary로 fallback한다.
- 공개 웹에는 `보유 종목별 최근 동향`과 `종목 관련 핵심 기사 및 이벤트 요약` 같은 개인화 섹션이 포함되지 않는다.
- 정기 세션 cron은 이제 `runPublicBriefing -> runDailyReport` 순서로 실행된다. 공개 브리핑이 `reports` row와 `/reports/[id]` 링크를 먼저 확보한 뒤, 같은 세션의 개인 정기 브리핑이 그 explicit URL을 그대로 주입받아 발송된다.
- 고정 스케줄 정기 Telegram 발송은 공개 브리핑 row가 있으면 그 `summary/signals`를 개인화 데이터와 함께 재사용하고, 공통 시장 해석을 위해 별도의 두 번째 LLM 조합을 다시 호출하지 않는다.
- 공개 상세 브리핑 permalink는 canonical `/briefings/YYYY-MM-DD/`, archive `/briefings/YYYY/MM/DD/`를 함께 유지하고, 같은 `runDate` 재실행 시 동일 경로를 덮어쓰는 방식으로 idempotent하게 운영한다.
- 공개 브리핑 build 스크립트는 legacy fallback용 root `/`를 최신 브리핑 진입점으로, `/briefings/`를 날짜 archive index로 재생성한다.
- GitHub Actions `Daily Report` workflow는 `workflow_dispatch` 기준의 manual reconcile entrypoint다. scheduled/manual 세션 모두 공개 업로드를 최대 3회(`10초 -> 20초`) 재시도한 뒤 링크를 확보하면 본문에 붙이고, 끝내 확보하지 못하면 공개 링크 섹션 자체를 생략한다.
- 저장소 전체의 Node 기준선은 `.nvmrc`와 root/web `engines` 모두 `24.x`다. web lint/build는 root flat ESLint에 연결된 `@next/eslint-plugin-next` 구성을 사용한다.
- `apps/web`는 `apps/web/vercel.json`, `.env.local.example`, Node 24 engine 선언을 포함한 Vercel 배포 준비 상태이며, production에서는 Neon connection string을 `DATABASE_URL`로 주입한다. Neon URL의 `sslmode`/`channel_binding` query는 pool 생성 시 제거하고 SSL 옵션으로 치환해 pg warning을 줄인다.
- `apps/web/eslint.config.mjs`는 app-local `@next/next` plugin sentinel을 먼저 노출해 Next 15 flat-config 감지 로직이 `next build` 중 경고 없이 통과하도록 맞춘다.
- Vercel production build는 `apps/web`의 Next.js 패치 라인이 최신 보안 허용 범위 안에 있어야 하며, 현재 기준선은 `15.5.14`다.
- `apps/web`의 cron/webhook route는 Next.js production runtime에서 env 누락을 피하기 위해 `process.env` 전체 spread 대신 허용된 runtime key를 명시적으로 추출해 worker/bot 계층에 전달한다.
- `apps/web`는 Vercel build에서 stale workspace `dist`를 참조하지 않도록 `@stock-chatbot/application`, `@stock-chatbot/database`, `@stock-chatbot/telegram-bot/build-bot`를 source 경로로 alias한다. 따라서 webhook/cron/public detail에 반영되는 공용 로직 변경은 별도 package build 없이도 Next.js 번들에 직접 포함된다.
- GitHub Actions와 Telegram 링크가 새 공개 웹을 가리키도록 하려면 repository variable `PUBLIC_BRIEFING_BASE_URL`을 실제 Vercel 배포 URL로 맞춰야 한다.
- 사용자 수 10명 이하 가정을 전제로 현재 런타임 기준선은 `Vercel webhook + Vercel Cron primary + GitHub Actions manual reconcile`이다.
- 현재 production public alias는 `https://web-three-tau-58.vercel.app`이고, direct deployment URL은 팀 정책에 따라 401이 걸릴 수 있으므로 Telegram webhook과 공개 링크는 alias를 기준으로 삼는다.
- Neon production branch에는 baseline schema가 이미 적용됐고, Vercel production smoke 기준 `/` empty state, `/api/telegram/webhook` 200, `/api/cron/daily-report` 200, `/api/cron/reconcile` 200, `/admin` 401(Basic Auth gate)까지 확인됐다.
- Telegram webhook은 이미 `https://web-three-tau-58.vercel.app/api/telegram/webhook`로 등록됐다.
- 2026-03-22 기준 Telegram webhook command runtime은 production alias에서 정상 동작하며, production에서는 `TELEGRAM_WEBHOOK_SECRET_TOKEN` header 검증을 필수로 사용한다. Vercel production에서 secret env가 빠지면 webhook route는 fail-closed(500)로 동작해야 한다.
- 실제 Telegram 운영 점검은 `docs/telegram-production-test-scenarios.md`를 기준으로 진행한다.
- 실제 Telegram E2E 자동화는 `docs/telegram-e2e-harness.md`를 기준으로 진행한다. 현재 harness는 inbound는 synthetic webhook update, outbound는 실제 Telegram Bot API `sendMessage`, assertion은 DB side effect + `telegram_outbound_messages` audit log 조합을 사용한다.
- 운영성 변경의 기본 closeout은 `pnpm verify`, 필요한 범위별 추가 검증, push, production 반영, Telegram minimum E2E와 공개 웹/DB smoke까지 포함한다.
- root `AGENTS.md`가 추가됐고, 이 파일은 source-of-truth 문서, 런타임 역할, 검증 규칙, git 마감 단계를 빠르게 찾는 저장소 운영 맵 역할을 한다.
- Telegram command runtime은 webhook으로 전환 가능한 상태이며, `apps/web` 내부 route handler(`/api/telegram/webhook`, `/api/cron/daily-report`, `/api/cron/reconcile`)가 구현됐다.
- `apps/telegram-bot/src/build-bot.ts`는 polling과 webhook 양쪽에서 공통으로 쓰는 command runtime entrypoint로 정리됐다.
- Telegram webhook 운영은 `TELEGRAM_WEBHOOK_URL`, `TELEGRAM_WEBHOOK_SECRET_TOKEN`, `pnpm telegram:webhook:register` 기준으로 활성화한다. webhook 등록 스크립트는 secret 없이 실행되면 실패해야 한다.
- Telegram webhook 경로는 이제 `telegram_processed_updates` 저장 모델로 `update_id`를 dedupe한다. 같은 Telegram update가 재전송돼도 command handler는 한 번만 실행돼야 한다.
- Telegram bot runtime은 이제 outbound reply를 `telegram_outbound_messages`에 기록한다. 이 로그는 production-like E2E harness가 Telegram-visible 응답 문구를 검증하는 read model 역할을 하며, 운영 장애 분석에도 활용할 수 있다.
- `/report` 온디맨드 실행이 duplicate run으로 겹칠 때는 `브리핑을 준비했지만 표시할 내용이 없습니다` 대신 `이미 브리핑을 생성하고 있습니다. 잠시 후 다시 /report 를 실행해 주세요.`를 반환한다.
- GitHub Actions `Daily Report`는 `workflow_dispatch`로만 실행하며, `VERCEL_RECONCILE_URL + CRON_SECRET`이 있으면 Vercel reconcile endpoint를 우선 호출하고, 없을 때만 external worker 또는 local worker fallback으로 동작한다.
- `apps/web`에는 Basic Auth 기반 운영 콘솔 `/admin`이 추가됐다. 이 화면은 최근 공개 브리핑, 최근 24시간 실행 요약, 최근 개인화 리포트 실행 로그, 최근 전략 스냅샷과 간단한 이후 수익률 회고를 보여주고, Telegram user별 등록 상태/차단 상태/오늘 사용량을 조회하며 block/unblock 제어를 제공한다. `ADMIN_DASHBOARD_USERNAME` / `ADMIN_DASHBOARD_PASSWORD`가 설정된 경우에만 접근을 허용한다.
- `/admin`의 사용자 차단 제어는 POST 후 같은 화면으로 redirect되며 결과 배너를 표시한다. 운영자 `telegram_user_id=8606362482`는 Telegram runtime뿐 아니라 admin route/UI에서도 보호되어 수동 block 대상에서 제외된다.
- 공개 웹 feed/detail에는 `/admin` 진입 링크를 노출하지 않고, 운영자는 `/admin` URL 직접 접근 후 Basic Auth로만 들어간다.
- `/admin`은 Postgres `date` 컬럼을 문자열로 정규화해 렌더링하며, 공개 웹 전체 톤은 Pretendard + shadcn/ui 스타일의 흑백 팔레트로 정리됐다.
- GitHub Actions `Daily Report` workflow는 `push`와 `schedule`에서도 안전하게 동작하도록 `REPORT_RUN_DATE`를 빈 문자열 fallback으로 읽고, 필요 시 `DAILY_REPORT_TRIGGER_URL`을 통해 외부 전용 worker를 호출할 수 있다.
- 멀티채널 역할 분리는 `텔레그램=개인화 입력/요약 delivery`, `public web frontend=공개 상세 archive/feed`, `future authenticated web=포트폴리오·히스토리·설정 관리`를 기준선으로 삼는다.
- 현재 `apps/web`는 `Next.js App Router` 기반 공개 웹으로 전환됐고, Vercel 배포를 primary public frontend로 사용한다.
- `apps/web`는 이제 Next.js App Router 기반 공개 웹으로 전환됐고, `/`에서 날짜별 latest-first feed를, `/reports/[id]`에서 markdown detail을 제공한다.
- 공개 웹의 `/`와 `/reports/[id]`는 정적 build snapshot이 아니라 dynamic DB 조회(`force-dynamic + noStore`)를 사용한다. 공개 브리핑이 적재되면 redeploy 없이 feed/detail에 바로 반영되어야 한다.
- `apps/web`는 Pretendard 기반 타이포그래피와 shadcn/ui 스타일 `ui/*` 컴포넌트(`Button`, `Badge`, `Card`, `Separator`)를 사용해 공개 feed/detail을 렌더링한다.
- 계정 확장 전략은 현재 `telegram_user_id` 중심 MVP를 유지하되, 이후 `core user + channel identity` 구조로 확장할 수 있게 `preferred_delivery_chat_id` 같은 채널 delivery 속성을 별도 identity 성격 데이터로 취급하는 방향이다.
- Telegram DM의 기본 UX는 한국어 온보딩 기준으로 유지한다. `/start`와 `/help`는 `등록 -> 종목 추가 -> 목록 확인 -> 브리핑 수신` 흐름과 명령별 짧은 설명을 함께 안내하고, `/register` 성공 후에도 같은 다음 단계가 이어져야 한다. 현재 설정 UX는 `브리핑 켜기`, `브리핑 끄기`, `고정 발송 시각/주말 규칙/역할 설명`을 제공하고, `/report_time`은 시간 변경이 아니라 정책 안내만 반환한다.
- 홈 `종목 추가` 버튼은 이제 바로 `/portfolio_add`를 시작하지 않고 `여러 종목 빠르게 추가 / 한 종목 상세 추가` 2-depth chooser를 띄운다. 기본 CTA는 bulk 추가다.
- Telegram DM에서는 `/report`를 바로 사용할 수 있다. 등록만 완료되어 있으면 보유 종목이 없어도 실행 가능하며, 이 경우 보유 종목 관련 섹션을 제외한 시장 중심 브리핑을 생성한다.
- 온디맨드 `/report`는 여전히 `reports` 조회형 링크 결정을 사용하지만, 공개 row를 찾지 못하면 `확인 필요`를 노출하지 않고 링크 섹션을 제거한다.
- 현재 운영 기준으로 Telegram DM의 온디맨드 `/report`는 webhook 응답 안정성을 위해 fast path를 기본으로 사용한다. 즉, 장시간이 걸릴 수 있는 보유 종목 뉴스 수집과 LLM 조합은 기본적으로 비활성화돼 있고, 규칙 기반 브리핑을 먼저 빠르게 생성한다.
- fast path에서도 `시장/매크로/자금/이벤트/리스크` 섹션과 상세 링크가 비어 있지 않도록 시장 데이터 기반 rule-based fallback 문장을 사용한다.
- `report_runs`는 같은 `userId + runDate + scheduleType` 조합으로 중복을 막지만, `running` 상태가 3분 이상 지속되면 stale run으로 보고 같은 row를 재시작한다. 이 규칙은 webhook timeout이나 중간 종료로 인해 하루 종일 `/report`가 막히는 상황을 방지하기 위한 것이다.
- 사용자별 정기 브리핑 설정은 `daily_report_enabled`, `daily_report_hour`, `daily_report_minute`, `timezone` 기준으로 저장된다. GitHub Actions 스케줄은 매시간 실행되고, worker는 예약 윈도우 안에 들어온 사용자만 실제 발송한다.
- GitHub Actions `Daily Report` workflow는 기본적으로 local worker를 직접 실행하지만, `DAILY_REPORT_TRIGGER_URL` secret이 설정되면 dedicated worker endpoint를 호출하는 전환 경로를 지원한다.
- 그룹 온보딩은 `new_chat_members`와 `chat_member`를 둘 다 구독하되, 같은 사용자와 그룹 조합에는 짧은 시간 안에 한 번만 환영 메시지를 보내도록 dedupe한다.
- legacy note: 과거 텔레그램 `거시 시장 스냅샷` 섹션에서는 `NASDAQ -> S&P500 -> DOW -> VIX -> KOSPI -> KOSDAQ -> 미국 10년물 금리 -> 국제 유가(WTI) -> 천연가스 -> 구리 -> USD/KRW -> 달러인덱스` 순서를 사용했다.
- legacy note: 과거 텔레그램 `거시 시장 스냅샷` 섹션에서는 `USD/KRW`와 `달러인덱스`를 하단에 연속 배치하고 FX 문장을 바로 아래에 붙였다.
- `market-report-composition` prompt는 v3로 올라갔고, `시장 / 매크로 / 자금 / 이벤트` 섹션을 별도 structured output 배열로 반환한다.
- database 계층에는 report_runs 저장 구조와 dedupe용 unique 키가 추가됐다.
- telegram-bot에는 command별 in-memory 대화 상태 저장소와 상태 전이 로직이 추가됐다.
- telegram-bot에는 `/mock_report` 예시 명령이 추가됐다.
- api에는 `/v1/reports/:userId/latest`, `/v1/reports/:userId/history`, `/v1/mock/telegram/daily-report` 초안이 추가됐다.
- `Phase 3`은 정기 브리핑 파이프라인 구현 단계였고, 현재 기준선은 세션별 정기 브리핑 운영으로 확장됐다.
- `Phase 4`는 뉴스 요약 및 퀀트 전략 엔진 구현 단계였고 현재 완료됐다.
- `Phase 5`는 하네스, 평가, 운영 자동화 구축 단계이며 fixture, grader, snapshot 비교 흐름이 이미 들어갔다.
- 하네스는 이제 `harness/suite-contracts.json` 기준의 suite 계약 구조를 사용한다. active/planned suite 상태, 필수 expected key, grader 존재성, snapshot 요구사항을 검증 스크립트에서 기계적으로 강제한다.
- 하네스 세부 운영 기준은 `docs/harness-engineering.md`를 기준으로 삼는다.
- `Phase 7`의 계획 항목과 production deployment smoke는 모두 완료 상태다. 다음 우선순위는 실제 Telegram E2E 운영 점검, 첫 공개 브리핑 저장 확인, 전략 스코어 튜닝이다.
- live Telegram E2E의 `report_with_holdings`는 이제 보유 종목명 노출 여부뿐 아니라 세션별 핵심 가이드 섹션(`포트폴리오 리밸런싱 제안` 또는 `기준 보정 제안`)과 `시세 스냅샷 연결 전입니다` placeholder 부재까지 함께 검증한다.
- live Telegram E2E는 production webhook 경로를 칠 때 `TELEGRAM_E2E_DATABASE_URL`을 우선 읽어 webhook runtime과 동일한 Neon DB를 기준으로 outbound audit log와 side effect를 검증한다. 값이 없으면 기존 `DATABASE_URL`을 fallback으로 사용한다.
- minimum live suite의 `portfolio_bulk_mixed`는 production ticker breadth에 흔들리지 않도록 `005930 + 삼성 + zzzzzz` 조합으로 고정돼 있다. exact success, ambiguous failure, miss failure를 한 번에 확인하는 목적이다.
- Telegram `/report`는 현재 서울 시각 기준으로 세션을 자동 선택한다. `00:00~15:29`는 `pre_market`, `15:30~23:59`는 `post_market`으로 분기한다.
- `packages/application/src/rebalancing-contract.ts`가 개인화 리밸런싱 payload의 현재 source-of-truth contract다. runtime payload에 rich score가 없으면 renderer는 `확인 필요 / 점검 필요 / 데이터 보강 필요` fallback을 사용한다.
- 실제 `/report` 경로에서 rich 3대 관점이 보이려면 `portfolioRebalancing` payload가 오케스트레이터 입력까지 들어와야 하며, 2026-03-22 기준으로 `DailyReportOrchestrator`와 `TelegramReportService`가 이 payload를 renderer/prompt까지 전달하도록 연결됐다.
- Telegram `/report`와 공개 브리핑의 제목 날짜는 요청 시점의 서울 날짜를 사용한다. 시장 데이터는 해당 날짜 이전 마지막 가용 거래일로 fallback하지만, 사용자에게 보이는 리포트 날짜와 공개 `report_date`는 요청일(KST) 기준을 유지한다.
- Telegram `/report`는 이제 사용자별 `portfolioRebalancing` payload가 외부에서 직접 들어오지 않아도, 현재 보유 종목/시장 데이터/퀀트 점수카드로 fallback snapshot을 만들어 `personal_rebalancing_snapshots` cache에 저장한 뒤 새 리밸런싱 템플릿을 렌더링한다.
- Telegram `/report`는 예외가 나더라도 `report_runs`를 `failed`로 정리해 stale `running` 상태를 남기면 안 된다. optional read model(`personal_rebalancing_snapshots`, `reports.indicator_tags`)이 아직 반영되지 않은 환경에서도 개인화 `/report`와 공개 feed 읽기 경로는 graceful fallback으로 계속 응답해야 한다.
- 공개 웹 feed/detail의 우상단 태그는 더 이상 `market_regime + total_score` badge를 사용하지 않는다. 대신 `KOSPI`, `KOSDAQ`, `S&P500`, `NASDAQ`의 indicator chip을 `indicator_tags` 컬럼에서 읽어 보여준다.
- `REPORT_RUN_DATE` override는 worker/manual backfill에만 사용하고, Telegram command runtime `/report`는 항상 현재 서울 날짜를 사용한다.
- 공개 웹 브리핑은 `오늘의 시장 브리핑` 구조로 분리됐고, 개인 포트 용어와 action language는 renderer 단계에서 제외된다.
- `apps/web`는 app-local `eslint.config.mjs`에서 공식 `eslint-config-next/core-web-vitals + typescript` flat 구성을 사용하고, 저장소 공통 lint는 root config가 담당한다. Node 24 전환 이후 남은 web build 경고는 이 경로를 기준으로 줄인다.
- `run:verify-public-week`는 current-week public briefing smoke에서 DB query만 믿지 않고 public feed/detail HTML도 같이 본다. production page fetch는 간헐적으로 partial/stale 응답이 섞일 수 있어 no-cache + retry를 기준선으로 삼는다.
- 고정 스케줄 Telegram 발송은 같은 기준일/세션의 persisted public `summary/signals`를 재사용해 공통 시장 해석용 두 번째 LLM 조합을 건너뛴다. serverless runtime에서 공개 브리핑 JSON artifact를 상대 경로에 쓰지 못하면 `/tmp/public-briefing/...`로 자동 전환한 뒤 DB 적재를 계속 진행해야 한다.
- Telegram DM에는 홈 reply keyboard(`📊 브리핑 보기`, `➕ 종목 추가`, `📁 내 종목`, `⚙️ 설정`)와 설정 inline keyboard가 추가됐다. 기존 slash command semantics는 유지한다.
- Telegram DM `/register`는 같은 private chat에 이미 등록된 사용자를 감지하면 중복 등록 대신 `/report`, `/portfolio_list`, `/unregister` 다음 단계를 안내한다.
- Telegram DM에는 `/unregister`와 `/portfolio_bulk`가 추가됐다. `/unregister`는 보유 종목과 대화 상태, delivery 설정을 비우는 soft reset이며 user identity, request history, block 상태는 유지한다. `/portfolio_bulk`는 여러 종목을 comma, semicolon, newline 기준으로 받아 평균단가/수량/메모 없이 기본 보유 종목을 벌크 추가하고, 인라인 argument가 없으면 대화형 입력도 지원한다.
- 정적 종목 resolver는 이제 현대차(005380), 에코프로(086520), 현대글로비스(086280), HMM(011200)까지 지원한다.
- `ticker_masters` 저장 모델이 추가됐고, CSV 기반 종목 마스터를 PostgreSQL에 적재한 뒤 `exact symbol -> exact name -> prefix -> partial -> fuzzy` ranked search로 종목을 찾는다.
- `삼전`, `현대차`, `app`, `tesl` 같은 colloquial 입력은 curated alias fallback으로 canonical symbol을 먼저 찾고, 최종 표시/저장은 PostgreSQL ticker master 기준으로 처리한다.
- Telegram `/portfolio_add`는 이제 `종목명을 입력해주세요 -> 단건 확인 또는 상위 5개 번호 선택 -> 평균단가 여부 -> 평균단가 -> 수량 여부 -> 수량` 흐름으로 동작한다. note 단계는 제거됐고 `y/n/yes/no/예/아니오`를 대소문자 구분 없이 허용한다.
- Telegram `/portfolio_add`는 동일 사용자·종목 조합이 이미 있으면 중복 row를 만들지 않고 `이미 등록되어 있습니다`로 안내한다.
- Telegram `/portfolio_bulk`는 각 입력을 독립적으로 검색하고 `추가 성공 / 이미 등록 / 실패(후보 없음 또는 후보 다수)` 요약을 반환한다.
- Telegram runtime은 `telegram_request_events` append-only 로그를 기준으로 사용자별 제한을 판단한다. 온디맨드 `/report`는 KST 하루 1회, `/portfolio_add`와 `/portfolio_bulk` 시작은 합산 하루 3회까지만 허용한다.
- 같은 `telegram_user_id`가 1초 3회 초과 또는 10초 10회 초과 요청을 보내면 자동 block 되며, 해제는 `/admin`에서만 가능하다. 운영자 `telegram_user_id=8606362482`는 모든 한도와 block 검사에서 제외된다.
- 시장 데이터 어댑터는 이제 `runDate` 기준 최근 가용일 데이터를 조회한다. 따라서 과거 날짜 backfill이나 manual rerun에서도 항상 해당 날짜 이전 마지막 거래일 스냅샷을 사용해야 한다.
- 공개 웹은 Pretendard + shadcn/ui 스타일 컴포넌트를 유지하되, 현재 기본 배경은 완전한 화이트와 블랙 텍스트 기준으로 고정됐다.
- 공개 웹 디자인 시스템은 이후 soft white/gray 기반의 premium fintech 톤으로 다시 정리됐다. 배경은 `#F8FAFC`, surface는 white, border는 slate gray, accent는 단일 blue를 기준으로 feed/detail/admin 전반의 시각 계층을 맞춘다.
- `Phase 6`은 멀티채널 준비 단계이며 mock delivery와 공통 report query model, API 계약 초안까지 들어간 상태다.
- `Phase 6`은 웹/앱 확장을 위한 멀티채널 준비 단계다.
- `Phase 7`은 온디맨드 `/report` 이후의 공개 웹 전환, 전략 성과 추적, 사용자 설정 고도화 단계다.

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

- 2026-03-23 운영 복구 기준선: production Neon에는 `personal_rebalancing_snapshots`와 `reports.indicator_tags`가 실제 반영돼 있어야 하고, runtime/user 데이터는 초기화 후 공개 브리핑 2026-03-16~2026-03-20 5영업일분이 적재된 상태를 정상 기준으로 본다. Telegram webhook의 `allowed_updates`에는 반드시 `callback_query`가 포함돼야 한다.
- 상세 배경은 change-log를 보면 되지만, 새 스레드는 이 문서를 우선 기준으로 사용한다.
- 이 문서가 오래됐거나 누락이 의심되면 `context-rollup` skill로 먼저 갱신한다.
