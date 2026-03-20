---
name: implementation-validation
description: Use when making code changes in this stock-chatbot project. Enforces a validation loop with targeted tests, lint, typecheck, and compose checks, and requires explicitly reporting what was verified and what could not be verified.
---

# Implementation Validation

이 skill은 코드 변경 시 검증을 빠뜨리지 않도록 하는 운영용 skill이다.

대상 범위:

- 코드 수정
- 설정 파일 수정
- Docker Compose 수정
- 테스트 추가

## Required Workflow

1. 변경 전 어떤 검증이 필요한지 먼저 식별한다.
2. 가능하면 테스트 가능한 형태로 코드를 먼저 구조화한다.
3. 변경 후 최소한 아래 검증을 실행한다.
   - 대상 범위 테스트
   - `lint`
   - `typecheck`
   - Compose 설정을 건드렸다면 `docker compose config`
4. 넓은 영향이 있거나 작업 단위가 충분히 크면 `make verify`까지 실행한다.
5. 검증 실패 시 실패 내용을 기반으로 수정을 반복한다.
6. 검증을 실행할 수 없었다면 이유와 미실행 범위를 결과에 반드시 남긴다.

## Default Validation Commands

- `make lint`
- `make typecheck`
- `make test`
- `make compose-validate`
- `make verify`

## Validation Rules

- 코드만 바꾸고 테스트를 전혀 추가하지 않는 상태를 기본값으로 두지 않는다.
- 외부 의존성 때문에 전체 실행이 어렵더라도 최소 단위 테스트와 정적 검사는 수행한다.
- Docker나 스케줄러 설정을 수정했다면 Compose 검증을 생략하지 않는다.
- 결과 보고에는 항상 "실행한 검증"과 "실행하지 못한 검증"을 분리해서 적는다.
