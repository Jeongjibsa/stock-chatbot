---
name: git-publish
description: Use when code changes in this stock-chatbot project have passed validation and should be committed and pushed. Enforces checking sensitive files, git status, commit creation, and push when a valid remote/auth setup exists.
---

# Git Publish

이 skill은 검증이 끝난 작업을 git에 안전하게 반영하기 위한 운영용 skill이다.

## Required Workflow

1. `git status`로 변경 파일을 확인한다.
2. `.env`, `.env.*`, 키 파일 등 민감정보가 stage 대상이 아닌지 확인한다.
3. 관련 검증이 통과했는지 확인한다.
4. 의미 있는 작업 단위로 commit한다.
5. 원격 저장소와 인증이 유효하면 push한다.
6. push가 불가능하면 원인을 명시하고 로컬 commit 상태를 유지한다.

이 프로젝트에서는 사용자 승인 기준으로 `git add`, `git commit`, `git push`를 검증 완료 후 기본적으로 수행해도 된다.

## Validation Before Commit

- 최소 기준: `make verify`
- 예외가 있으면 어떤 검증이 왜 빠졌는지 명시한다.

## Safety Rules

- 민감정보가 포함된 파일은 commit하지 않는다.
- 검증이 실패한 상태에서 commit을 기본값으로 두지 않는다.
- 원격 push 실패를 숨기지 않는다.

## Expected Output

- 생성한 commit hash
- push 성공 여부
- 원격 저장소 상태 또는 블로커
