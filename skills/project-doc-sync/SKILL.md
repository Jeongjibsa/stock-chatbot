---
name: project-doc-sync
description: Use when product scope, PRD, execution plan, implementation approach, task status, or current baseline changes in this stock-chatbot project. Keeps docs/initial-prd.md, docs/phase-plan.md, docs/change-log.md, and docs/context-summary.md synchronized and requires marking completed work as done.
---

# Project Doc Sync

이 skill은 이 프로젝트의 기준 문서 4종을 함께 유지하기 위한 운영용 skill이다.

대상 문서:

- `docs/initial-prd.md`
- `docs/phase-plan.md`
- `docs/change-log.md`
- `docs/context-summary.md`

## Use This Skill When

- 제품 요구사항이 추가/수정/삭제될 때
- 아키텍처나 구현 방식이 바뀔 때
- phase 작업이 새로 생기거나 우선순위가 변할 때
- 어떤 작업이 완료되어 `done` 처리해야 할 때

## Required Workflow

1. 변경 유형을 분류한다.
   - `ADD`
   - `UPDATE`
   - `DELETE`
   - `DECISION`
2. 변경 영향을 받는 문서를 식별한다.
3. `docs/change-log.md`에 새 항목을 추가한다.
4. `docs/initial-prd.md`에 요구사항/범위/설계 변경을 반영한다.
5. `docs/phase-plan.md`에 작업 추가, 우선순위 변경, 상태 변경을 반영한다.
6. 변경이 현재 작업 기준선에 영향을 주면 `docs/context-summary.md`도 갱신한다.
7. 구현이 끝난 항목은 반드시 `[x]` 또는 `done` 상태로 표시한다.
8. 문서 간 충돌이나 누락이 없는지 확인한다.

## Update Rules

- 변경 이력만 남기고 PRD를 안 바꾸는 상태를 만들지 않는다.
- PRD만 바꾸고 실행 계획을 안 바꾸는 상태를 만들지 않는다.
- 큰 결정이 반영됐는데 요약 컨텍스트를 안 바꾸는 상태를 오래 유지하지 않는다.
- 작업 완료 후 상태 업데이트를 다음 턴으로 미루지 않는다.
- 새 요구사항이 구현 범위를 바꾸면 phase에 적절히 재배치한다.
- 사소한 문장 교정이 아니라면 변경 이력에 남긴다.

## Document Contract

### PRD

- 제품 목표, 범위, 사용자 플로우, 데이터 모델, 아키텍처 방향을 담는다.
- 구현 세부 태스크는 최소화하고 제품 기준선 유지에 집중한다.

### Phase Plan

- 실제 작업 순서와 완료 상태를 담는다.
- 새 기능은 적절한 phase에 넣고 완료되면 즉시 `done` 처리한다.

### Change Log

- 무엇이 왜 바뀌었는지 추적 가능해야 한다.
- 각 항목은 한 줄 요약만으로도 의미가 통해야 한다.

### Context Summary

- 새 스레드가 빠르게 시작할 수 있는 압축 기준선이다.
- 최신 MVP 범위, 핵심 결정, 활성 phase, 보류 이슈를 유지한다.

## Completion Behavior

작업 완료 보고 시 아래를 항상 수행한다.

- 완료된 태스크를 `docs/phase-plan.md`에서 `[x]`로 변경
- 구현 방식 변화가 있으면 `docs/initial-prd.md`에 반영
- 변경 사유와 영향 범위를 `docs/change-log.md`에 추가
- 필요한 경우 `docs/context-summary.md`를 새 기준선으로 갱신

## Expected Output

작업 후 응답에는 아래를 간단히 포함한다.

- 어떤 문서를 갱신했는지
- 어떤 항목을 `done` 처리했는지
- 남은 다음 작업이 무엇인지
