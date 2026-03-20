---
name: context-rollup
description: Use when change-log entries have accumulated, when major scope or architecture decisions changed, or before handing work to a new thread. Produces and refreshes docs/context-summary.md from docs/change-log.md, docs/initial-prd.md, and docs/phase-plan.md.
---

# Context Rollup

이 skill은 change-log 기반으로 프로젝트의 압축 컨텍스트를 유지하기 위한 운영용 skill이다.

대상 문서:

- `docs/context-summary.md`
- `docs/change-log.md`
- `docs/initial-prd.md`
- `docs/phase-plan.md`

## Use This Skill When

- change-log가 마지막 요약 이후 5개 이상 누적됐을 때
- MVP 범위나 아키텍처 방향이 바뀌었을 때
- 새 스레드로 작업을 넘기기 전
- 긴 구현 작업 전에 기준선을 다시 압축해야 할 때
- 기존 요약 컨텍스트가 오래됐거나 누락이 의심될 때

## Required Workflow

1. `docs/context-summary.md`의 마지막 롤업 상태를 확인한다.
2. `docs/change-log.md`에서 아직 요약되지 않은 변경을 찾는다.
3. `docs/initial-prd.md`와 `docs/phase-plan.md`에서 현재 기준선을 재확인한다.
4. 아래 항목만 남기는 방식으로 `docs/context-summary.md`를 갱신한다.
   - 현재 MVP 범위
   - 최신 아키텍처 방향
   - 현재 시작 phase와 핵심 다음 작업
   - 주요 guardrail
   - 열려 있는 핵심 질문
   - 마지막으로 포함된 change ids
5. 상세한 과거 논의는 넣지 않고 현재 작업에 필요한 기준선만 남긴다.
6. 요약이 바뀐 이유가 있다면 응답에서 간단히 설명한다.

## Compression Rules

- change-log를 그대로 복사하지 않는다.
- 이미 폐기된 결정이나 이전 초안은 현재 기준선 관점으로만 언급한다.
- 숫자, phase, MVP 범위, 후순위 기능은 최대한 명시적으로 유지한다.
- 새 스레드가 이 문서만 읽고도 바로 시작할 수 있어야 한다.

## Expected Output

작업 후 응답에는 아래를 간단히 포함한다.

- 요약에 새로 반영된 change ids
- 현재 활성 기준선이 무엇인지
- 다음 스레드가 어디서 시작하면 되는지
