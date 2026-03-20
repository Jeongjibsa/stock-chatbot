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
| Phase 3 | 오전 9시 일 배치 리포트 파이프라인 구현 | not started |
| Phase 4 | 뉴스 요약 및 퀀트 전략 엔진 구현 | not started |
| Phase 5 | 하네스, 평가, 운영 자동화 구축 | not started |
| Phase 6 | 멀티채널 확장 준비 | backlog |
| Phase 7 | 선택형 확장 기능 구축 | backlog |

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
- [x] 명령별 대화 상태 관리 구조 구현

### Phase 3. Daily Scheduled Report Pipeline

- [ ] 시장 데이터 수집 어댑터 구현
- [ ] 오전 9시 스케줄 트리거 구현
- [ ] 일 배치 보고서 실행 orchestration 구현
- [ ] OpenAI Responses API 클라이언트 wrapper 초안 구현
- [ ] 중복 실행 방지 및 재시도 규칙 구현
- [ ] 텔레그램 메시지 렌더링 포맷 구현
- [ ] 실패/부분 성공 응답 규칙 구현
- [ ] 실행 로그 저장 구조 구현

### Phase 4. News and Quant Intelligence

- [ ] 종목별 뉴스 수집 어댑터 구현
- [ ] 뉴스 정규화 및 중복 제거 구현
- [ ] 이벤트 추출 및 요약 흐름 구현
- [ ] structured output 기반 뉴스/리포트 prompt 계약 구현
- [ ] 규칙 기반 퀀트 시그널 엔진 구현
- [ ] 전략 시나리오 생성 규칙 구현
- [ ] 리스크 체크포인트 생성 규칙 구현

### Phase 5. Harness and Automation

- [ ] 일 배치 스케줄 fixture 포맷 정의
- [ ] 정상 실행/중복 실행 방지/부분 실패 케이스 작성
- [ ] 하네스 fixture 포맷 정의
- [ ] 시장/뉴스/퀀트/report 케이스 fixture 작성
- [ ] grader 기준 정의
- [ ] 스냅샷 비교 흐름 구축
- [ ] prompt/skill 버전 기록 체계 구축
- [ ] 주기 보고서 자동화 설계 고도화
- [ ] change-log 기반 컨텍스트 요약 및 롤업 흐름 구축

### Phase 6. Multi-Channel Readiness

- [ ] 텔레그램 adapter와 core application service 경계 고정
- [ ] future web/app API 계약 초안 정의
- [ ] 사용자 계정 확장 전략 초안 정의
- [ ] 공통 리포트 조회 모델과 히스토리 모델 정의

### Phase 7. Optional Expansion

- [ ] 온디맨드 `/report` 요청 처리 추가
- [ ] 사용자별 예약 리포트 전송
- [ ] 웹 클라이언트 구현
- [ ] 모바일 앱 구현
- [ ] 웹 관리 콘솔
- [ ] 전략 성과 추적 및 백테스트
- [ ] 사용자 설정 고도화

## 5. Immediate Next Work

현재 권장 시작점은 `Phase 3`다.

우선순위:

1. 시장 데이터 수집 어댑터 구현
2. 오전 9시 스케줄 트리거 구현
3. 일 배치 보고서 실행 orchestration 구현

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
