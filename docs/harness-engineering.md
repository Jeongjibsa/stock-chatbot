# Harness Engineering Guide

## 목적

이 문서는 이 저장소의 하네스 엔지니어링 기준을 정의합니다. 목표는 프롬프트, 리포트 렌더링, 스케줄 파이프라인, 퀀트 시그널 규칙을 사람이 아닌 에이전트도 안정적으로 검증할 수 있는 구조로 유지하는 것입니다.

현재 기준은 OpenAI의 하네스 엔지니어링 글에서 강조한 3가지 원칙을 이 저장소에 맞게 적용합니다.

- `AGENTS.md`는 백과사전이 아니라 맵 역할만 합니다.
- 세부 기준은 `docs/`와 `harness/`에 구조화해 둡니다.
- 하네스는 느슨한 체크리스트가 아니라 suite 계약과 불변성을 기계적으로 검증해야 합니다.

참고:
- [OpenAI Harness Engineering](https://openai.com/ko-KR/index/harness-engineering/)

## 현재 하네스 구조

```text
harness/
├── fixtures/
├── graders/
├── snapshots/
└── suite-contracts.json

scripts/harness/
├── validate-fixtures.mjs
├── compare-snapshots.mjs
├── fixture-utils.mjs
└── fixture-utils.test.js
```

역할:

- `fixtures/`: 고정 입력과 기대 결과
- `graders/`: 자연어 출력에 대한 구조적 판정 기준
- `snapshots/`: 렌더링 결과의 고정 스냅샷
- `suite-contracts.json`: suite별 필수 expected key, grader, snapshot 규칙
- `validate-fixtures.mjs`: fixture 문서와 suite 계약 검증
- `compare-snapshots.mjs`: 스냅샷 일치 여부 검증

## 핵심 원칙

### 1. Suite 계약이 fixture보다 먼저다

fixture는 자유 형식 JSON이 아닙니다. 모든 fixture는 `harness/suite-contracts.json`에 정의된 suite 계약을 따라야 합니다.

계약에서 강제하는 것:

- suite 활성 여부(`active` / `planned`)
- 필수 expected key
- snapshot 필요 여부
- grader 연결 여부

새 fixture를 추가할 때는 먼저 suite 계약이 이미 존재하는지 확인합니다. 새 suite를 만들면 계약과 grader부터 추가합니다.

### 2. 스냅샷은 구조를 대신 설명하지 않는다

스냅샷은 “같다/다르다”만 알려줍니다. 그래서 이 저장소는 스냅샷만 믿지 않고 grader와 계약을 같이 둡니다.

현재 기준:

- `report_render_cases`는 `snapshotFile + renderedText`가 모두 필요합니다.
- grader는 [harness/graders/report-structure-grader.md](/Users/jisung/Projects/stock-chatbot/harness/graders/report-structure-grader.md)를 사용합니다.

### 3. Active suite는 빈 껍데기로 두지 않는다

`active` suite는 반드시:

- 실제 fixture가 하나 이상 있어야 하고
- 필요한 grader 파일이 존재해야 하며
- snapshot이 요구되면 실제 snapshot 파일이 있어야 합니다.

새 suite를 아직 구현하지 않았다면 `planned`로 둡니다.

### 4. 개인화 데이터는 공개 하네스에 넣지 않는다

하네스 fixture에는 공개 웹에 노출되면 안 되는 개인화 포트폴리오 데이터를 넣지 않습니다. 필요한 경우 mock symbol/company 수준까지만 사용합니다.

## 현재 active suite

- `daily_schedule_cases`
- `portfolio_news_cases`
- `quant_signal_cases`
- `report_render_cases`

`market_snapshot_cases`는 현재 `planned` 상태입니다.

## 검증 명령

하네스 관련 기본 명령:

```bash
COREPACK_HOME=/tmp/corepack pnpm harness:fixtures
COREPACK_HOME=/tmp/corepack pnpm harness:snapshots
COREPACK_HOME=/tmp/corepack pnpm harness:check
```

전체 검증에 포함되는 명령:

```bash
COREPACK_HOME=/tmp/corepack pnpm verify
```

## 변경 규칙

하네스 구조를 바꾸면 다음을 같은 change set에서 같이 갱신합니다.

- `harness/suite-contracts.json`
- 관련 fixture / snapshot / grader
- `docs/initial-prd.md`의 Harness Engineering Strategy 섹션
- `docs/change-log.md`
- 필요 시 `docs/context-summary.md`
- `AGENTS.md`

## 에이전트 작업 기준

에이전트는 하네스를 다룰 때 아래 순서를 지킵니다.

1. suite 계약 확인
2. fixture/expected 구조 확인
3. grader 존재 여부 확인
4. snapshot 존재 여부 확인
5. 코드 수정
6. `pnpm harness:check`
7. `pnpm verify`

하네스를 건드렸는데 계약/문서/검증이 빠져 있으면 완료가 아닙니다.
