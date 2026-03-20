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

## 4. Open Change Notes

- 현재까지 보류 중인 변경 요청 없음
