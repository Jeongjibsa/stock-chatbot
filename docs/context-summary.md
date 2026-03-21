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

- last_rollup_date: 2026-03-20
- included_change_ids: CHG-0001, CHG-0002, CHG-0003, CHG-0004, CHG-0005, CHG-0006, CHG-0007, CHG-0008, CHG-0009, CHG-0010, CHG-0011, CHG-0012, CHG-0013, CHG-0014, CHG-0015, CHG-0016, CHG-0017, CHG-0018, CHG-0019, CHG-0020, CHG-0021, CHG-0022, CHG-0023, CHG-0024, CHG-0025, CHG-0026, CHG-0027, CHG-0028, CHG-0029, CHG-0030
- source_of_truth: PRD + Phase Plan + Change Log

## 4. Current Product Baseline

- 제품은 개인화된 주식 리포트를 제공하는 서비스다.
- 현재 MVP는 텔레그램 기반이며, 매일 오전 9시에 한 번 자동 리포트를 발송한다.
- 초기 MVP에는 온디맨드 `/report`가 포함되지 않는다.
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
- application 계층에는 FRED 기반 market data adapter와 source key 매핑이 추가됐다.
- application 계층에는 daily report orchestrator와 텔레그램 렌더러가 추가됐다.
- application 계층에는 Google News RSS 기반 뉴스 어댑터, 기사 정규화/중복 제거, portfolio news brief 서비스, structured output 뉴스/리포트 계약, 규칙 기반 quant/risk/scenario 엔진이 추가됐다.
- application 계층에는 mock telegram delivery adapter, reusable report preview 템플릿, 공통 report query model이 추가됐다.
- telegram report 렌더러는 이모지, 방향 기호, 섹션 중심 레이아웃으로 개선됐고 실채널 POC 메시지 발송으로 확인됐다.
- worker에는 BullMQ job scheduler 기반 오전 9시 트리거와 env 기반 패턴/타임존 설정이 추가됐다.
- worker에는 뉴스 brief 연동과 prompt/skill version 기록 연결이 추가됐다.
- database 계층에는 report_runs 저장 구조와 dedupe용 unique 키가 추가됐다.
- telegram-bot에는 command별 in-memory 대화 상태 저장소와 상태 전이 로직이 추가됐다.
- telegram-bot에는 `/mock_report` 예시 명령이 추가됐다.
- api에는 `/v1/reports/:userId/latest`, `/v1/reports/:userId/history`, `/v1/mock/telegram/daily-report` 초안이 추가됐다.
- `Phase 3`은 오전 9시 일 배치 리포트 파이프라인 구현이다.
- `Phase 4`는 뉴스 요약 및 퀀트 전략 엔진 구현 단계였고 현재 완료됐다.
- `Phase 5`는 하네스, 평가, 운영 자동화 구축 단계이며 fixture, grader, snapshot 비교 흐름이 이미 들어갔다.
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
