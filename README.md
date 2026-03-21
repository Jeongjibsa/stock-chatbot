# Stock Briefing Bot

거시 지표, 시장 이벤트, 퀀트 시그널을 종합해 텔레그램으로 자동 발송하는 주식 브리핑 자동화 시스템

## 문제 정의

시장을 매일 직접 확인하는 일은 단순 조회보다 해석 비용이 더 큽니다.  
미국/한국 지수, 금리, 환율, 원자재, 뉴스, 이벤트, 포트폴리오를 따로 보고 다시 연결해야 하기 때문입니다.

이 프로젝트는 그 과정을 자동화합니다.

- 시장 데이터를 수집합니다.
- 거시/이벤트/추세/자금 신호를 계산합니다.
- LLM은 마지막 브리핑 생성 레이어로만 사용합니다.
- 최종 결과를 텔레그램 요약본과 GitHub Pages 공개 브리핑으로 전달합니다.

핵심은 “뉴스 요약 봇”이 아니라 “시장 브리핑 자동화 시스템”이라는 점입니다.

## 왜 이 프로젝트가 필요한가

- 매일 같은 데이터를 반복 조회하고 해석하는 시간을 줄입니다.
- 사람마다 들쑥날쑥한 해석 대신, 같은 구조의 브리핑을 일관되게 제공합니다.
- 미국/한국 시장을 함께 보는 투자자에게 맞는 입력과 출력 구조를 가집니다.
- 공개 시장 브리핑과 개인화 포트폴리오 브리핑을 분리해 운영할 수 있습니다.

## 핵심 기능

### 1. 시장 상태를 구조화해서 읽기 쉽게 전달

- 미국 지수와 한국 지수를 함께 묶어 봅니다.
- 금리, 환율, 달러 인덱스, 원자재를 같은 브리핑 안에서 해석합니다.
- `전일값 -> 현재값`, 등락률, 리스크 온/오프 신호를 함께 제공합니다.

### 2. 단순 생성이 아니라 해석 가능한 분석 파이프라인

- 데이터 수집과 점수 계산은 코드가 담당합니다.
- LLM은 이미 계산된 입력을 바탕으로 최종 브리핑 문장화만 담당합니다.
- LLM이 실패해도 규칙 기반 fallback으로 공개 브리핑은 계속 생성됩니다.

### 3. 개인화 가능한 텔레그램 delivery

- `/register`, `/portfolio_add`, `/report` 흐름으로 사용자별 입력을 받을 수 있습니다.
- 공개 브리핑은 GitHub Pages에 게시하고, 개인화 브리핑은 Telegram DM으로만 보냅니다.
- 그룹은 온보딩, DM은 개인화 delivery, Pages는 공개 archive 역할로 분리됩니다.

### 4. 스케줄 기반 무인 운영

- GitHub Actions가 CI와 정기 브리핑 스케줄을 담당합니다.
- Daily Report workflow가 공개 브리핑 생성, Pages 배포, 개인화 발송을 순서대로 실행합니다.
- Secrets가 비어 있는 경우에도 workflow 전체는 실패하지 않고 필요한 단계만 skip 처리합니다.

## 주요 시그널 및 분석 항목

| 구분 | 주요 항목 | 해석 목적 |
| --- | --- | --- |
| 미국 시장 | `S&P 500`, `NASDAQ`, `DOW`, `VIX`, `미국 10년물 금리` | 위험 선호, 성장주 압력, 변동성 레짐 |
| 한국 시장 | `KOSPI`, `KOSDAQ`, `USD/KRW`, 향후 `외국인/기관 수급` | 국내 리스크 프리미엄, 환율 부담, 수급 확인 |
| 매크로/원자재 | `WTI`, `천연가스`, `구리`, `달러 인덱스`, `CPI/Fed 일정` | 인플레이션, 달러 강세, 경기 민감도 |
| 이벤트 | 중동 리스크, 실적 일정, AI/반도체/원자재 이슈 | 단기 변동성, 섹터별 촉매 |
| 퀀트 신호 | `Macro`, `Trend`, `Event`, `Flow`, `Total` | `BUY / HOLD / REDUCE` 해석 기반 |

## 시스템 아키텍처

현재 구조는 “수집 / 해석 / 발송” 레이어가 분리된 TypeScript 모놀리식입니다.

```text
[FRED / Yahoo Finance / News Sources]
                  |
                  v
         [Market Data Adapters]
                  |
                  v
     [Quant Signals / Event Extraction]
                  |
                  v
      [LLM Composition Layer (OpenAI/Gemini)]
                  |
        +---------+---------+
        |                   |
        v                   v
[Telegram Summary / DM]   [GitHub Pages Public Briefing]
        |
        v
 [User Delivery / Schedule]
```

운영 플로우는 아래와 같습니다.

```text
GitHub Actions cron / workflow_dispatch
  -> public briefing JSON 생성
  -> GitHub Pages 정적 사이트 빌드/배포
  -> 사용자별 daily report 실행
  -> Telegram DM 발송 또는 skip
```

## 기술 스택

### Application

- `Node.js 24`
- `TypeScript 5.9`
- `pnpm workspace`

선택 이유:
- 봇, worker, 공개 사이트를 하나의 저장소에서 일관되게 관리하기 쉽습니다.
- 타입 기반으로 데이터 계약과 브리핑 구조를 안정적으로 유지할 수 있습니다.

### Data

- `FRED`
- `Yahoo Finance scraping`
- 향후 `ECOS`, 수급/실적 캘린더 데이터 소스 확장 예정

선택 이유:
- 초기 비용을 낮추면서 미국/매크로 지표와 주요 지수를 빠르게 커버할 수 있습니다.

### LLM

- `OpenAI`
- `Google Gemini`
- provider-agnostic client interface

선택 이유:
- 모델 교체와 fallback 전략을 코드 변경 최소화로 처리할 수 있습니다.
- LLM은 해석/요약 레이어에만 사용해 데이터 신뢰성을 유지합니다.

### Bot / Delivery

- `Telegram Bot API`
- `grammY`

선택 이유:
- 명령 기반 UX와 DM delivery가 명확합니다.
- 개인화 입력과 최종 전달 채널을 빠르게 검증할 수 있습니다.

### Infra / Ops

- `GitHub Actions`
- `GitHub Pages`
- `Docker Compose`
- `PostgreSQL`
- `Redis`

선택 이유:
- public repo 기준으로 초기 운영 비용을 낮출 수 있습니다.
- 로컬과 CI의 실행 경로를 비슷하게 유지할 수 있습니다.

## 디렉토리 구조

```text
.
├── apps
│   ├── api
│   ├── telegram-bot
│   ├── web
│   └── worker
├── docs
├── harness
├── packages
│   ├── application
│   ├── core-types
│   └── database
├── scripts
│   ├── harness
│   └── pages
├── docker-compose.yml
├── Makefile
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

구조 역할:

- `apps/api`: 조회/미리보기용 HTTP 엔드포인트
- `apps/telegram-bot`: 텔레그램 명령 처리와 사용자 입력 UX
- `apps/worker`: daily report 실행, 공개 브리핑 생성, 스케줄 처리
- `apps/web`: GitHub Pages에 배포되는 공개 브리핑 웹사이트
- `packages/application`: 시장 데이터, 퀀트, LLM, 렌더링, orchestration
- `packages/database`: Drizzle schema, repository, persistence logic
- `scripts/pages`: 공개 브리핑 정적 사이트 생성 스크립트
- `harness`: snapshot/fixture 기반 검증 자산

## 실행 방법

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 로컬 인프라 실행

```bash
make up
```

### 3. 개발 서버 실행

```bash
make dev-api
make dev-bot
make dev-worker
```

### 4. 전체 검증

```bash
COREPACK_HOME=/tmp/corepack pnpm verify
```

### 5. 공개 브리핑 정적 사이트 생성

```bash
COREPACK_HOME=/tmp/corepack pnpm build
COREPACK_HOME=/tmp/corepack pnpm pages:build artifacts/public-briefing/public-daily-briefing.json /tmp/public-briefing-site
```

## 환경 변수 설정

```bash
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
TELEGRAM_BOT_TOKEN=123456:telegram-bot-token
TELEGRAM_TEST_CHAT_ID=123456789
FRED_API_KEY=fred_api_key
DATABASE_URL=postgresql://user:password@localhost:5432/stock_chatbot
REDIS_URL=redis://localhost:6379
LLM_PROVIDER=google
PUBLIC_BRIEFING_BASE_URL=https://jeongjibsa.github.io/stock-chatbot
REPORT_TIMEZONE=Asia/Seoul
DAILY_REPORT_PATTERN="0 0 9 * * *"
DAILY_REPORT_WINDOW_MINUTES=15
```

현재 저장소는 `ECOS_API_KEY`를 필수로 쓰지 않지만, 한국 거시 데이터 확장 시 같은 방식으로 추가할 수 있게 설계되어 있습니다.

## 스케줄링 / 자동화 방식

현재 기본 자동화는 GitHub Actions입니다.

- `CI`
  - `push`, `pull_request` 시 `pnpm verify`
- `Daily Report`
  - `schedule` 또는 `workflow_dispatch`
  - 공개 브리핑 생성
  - GitHub Pages 배포
  - 사용자별 daily report 실행
- `Daily Report Smoke`
  - seeded mock portfolio 기준 worker 경로 검증
- `Telegram Smoke Test`
  - 실제 Bot API로 `getMe` / `sendMessage` 검증

현재 `Daily Report` workflow는 다음 원칙으로 동작합니다.

- 공개 브리핑 생성은 항상 우선 수행
- Pages 배포는 개인화 발송과 분리
- `DATABASE_URL`이 비어 있으면 개인화 발송 단계는 실패가 아니라 skip
- `DAILY_REPORT_TRIGGER_URL`이 있으면 외부 전용 worker로 전환 가능

## 텔레그램 브리핑 예시

```text
🗞️ 오늘의 브리핑 (2026-03-20 기준)

📌 한 줄 요약
→ 미국 증시 약세와 변동성 확대가 겹쳐 신규 매수는 보수적으로 접근하시는 편이 좋습니다.

━━━━━━━━━━━━━━━
🌍 거시 시장 스냅샷
• NASDAQ: 22,090.69 → 21,647.61  🔵▼ 2.01%
• S&P 500: 6,606.49 → 6,506.48  🔵▼ 1.51%
• DOW: 46,021.43 → 45,577.47  🔵▼ 0.96%
• VIX: 24.06 → 26.78  🔴▲ 11.31%

• KOSPI: 5,763.22 → 5,781.20  🔴▲ 0.31%
• KOSDAQ: 1,143.48 → 1,161.52  🔴▲ 1.58%

• 미국 10년물 금리: 4.26% → 4.25%  🔵▼ 0.01%p
• 국제 유가(WTI): 98.48 → 93.39  🔵▼ 5.17%
• 천연가스: 3.20 → 3.03  🔵▼ 5.31%
• 구리: 11,790.96 → 12,986.61  🔴▲ 10.14%

• USD/KRW 환율: 1,491.81 → 1,498.88  🔴▲ 0.47%
• 달러인덱스: 119.82 → 120.55  🔴▲ 0.61%

━━━━━━━━━━━━━━━
📍 주요 지표 변동 요약
• VIX 급등 → 변동성 경계 강화
• NASDAQ -2% → 성장주 압력 확대
• 달러 강세 → 환율 부담 점검 필요

━━━━━━━━━━━━━━━
🧠 퀀트 시그널 및 매매 아이디어
• Macro: -0.6 / Trend: -0.4 / Event: +0.2 / Flow: -0.3
→ Total: -0.42 → REDUCE

❗ 이 리포트는 정보 제공용이며, 투자 판단과 책임은 본인에게 있습니다.
```

## 퀀트 스코어링 아이디어 요약

현재 스코어링은 설명 가능한 규칙 기반 구조입니다.

| 축 | 의미 | 예시 |
| --- | --- | --- |
| `Macro` | 금리, 달러, 변동성, 원자재 | 강달러, VIX 급등, 금리 급등 |
| `Trend` | 지수/종목 가격 추세 | 이동평균 훼손, 최근 수익률 둔화 |
| `Event` | 뉴스와 이벤트 | 지정학 리스크, AI/실적 촉매 |
| `Flow` | 수급/ETF/자금 흐름 | 외국인/기관 수급, 테마 자금 쏠림 |

최종 해석:

- `BUY`: 우호적 조건이 겹치고 리스크가 제한적
- `HOLD`: 방향성은 있으나 확신이 부족
- `REDUCE`: 방어 우선, 신규 매수 제한 또는 비중 축소 검토

향후에는 레짐 판단도 더 명확하게 분리할 계획입니다.

- `Risk-On`
- `Neutral`
- `Risk-Off`

## 운영 시 고려사항 / 리스크

### 비용

- LLM 호출은 브리핑 생성 레이어에만 제한해야 합니다.
- 공개 브리핑과 개인화 브리핑을 분리해 호출 수를 줄이는 구조가 유리합니다.

### Rate Limit

- Gemini/OpenAI는 호출 제한이 있습니다.
- 현재 공개 브리핑 경로는 LLM이 실패해도 fallback으로 계속 진행합니다.
- 뉴스/종목별 enrichment는 429 대응이 특히 중요합니다.

### 데이터 품질

- 미국/한국/매크로 데이터의 기준 시점이 다를 수 있습니다.
- `asOfDate`가 다르면 같은 시점의 사건처럼 과장하지 않아야 합니다.
- Yahoo Finance scraping은 응답 형식 변화 리스크가 있습니다.

### 장애 대응

- Pages 배포와 개인화 발송을 분리해 한쪽 실패가 전체를 막지 않게 해야 합니다.
- secret이 없을 때는 실패보다 skip으로 처리하는 편이 운영상 낫습니다.
- 공개 브리핑은 항상 생성하고, 개인화 발송은 준비된 환경에서만 실행하는 구조가 안전합니다.

## 향후 개선 계획

- 포트폴리오별 맞춤 브리핑 고도화
- 종목별 이벤트 분석 강화
- 외국인/기관 수급, ETF flow, 실적 캘린더 실데이터 연결
- 점수 기반 전략의 백테스트 및 튜닝
- 다중 LLM fallback 정책 강화
- GitHub Pages feed를 날짜별 최신순 공개 브리핑 허브로 확장
- 필요 시 공개 웹사이트를 `Next.js` 기반 feed/ISR 구조로 이관
- 모바일 앱은 후속 phase에서 별도 진행

## 라이선스

현재 별도 라이선스 파일이 없습니다. 외부 공개/배포 전에 라이선스 정책을 먼저 확정하는 것을 권장합니다.
