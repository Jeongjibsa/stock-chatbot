# Dedicated Worker Migration Plan

## Purpose

GitHub Actions 기반 일 배치 실행에서 전용 worker/queue 인프라로 넘어갈 시점과 전환 방식을 정의합니다.

## Migration Triggers

아래 중 하나라도 반복되면 전용 worker 이관을 우선 검토합니다.

- GitHub Actions 1회 실행 시간이 10분을 자주 넘깁니다.
- 정시 지연으로 사용자 체감이 커집니다.
- 일간 발송 사용자 수가 100명을 넘기기 시작합니다.
- 외부 API 재시도와 부분 실패 복구가 Actions 로그만으로 부족합니다.
- 시간대별 사용자 예약 발송이 늘어나 hourly workflow 비용이 부담됩니다.

## Target Runtime

- scheduler:
  - 초기: GitHub Actions hourly schedule
  - 이관 후: dedicated worker or managed scheduler
- queue:
  - BullMQ + Redis
- trigger:
  - GitHub Actions에서 직접 worker를 돌리는 대신 HTTP trigger endpoint 호출

## Trigger Contract

GitHub Actions가 외부 worker에 POST 요청을 보내는 최소 계약은 아래와 같습니다.

- URL: `DAILY_REPORT_TRIGGER_URL`
- Auth header: `Authorization: Bearer <DAILY_REPORT_TRIGGER_TOKEN>`
- Body:
  - `triggerType`
  - `reportRunDate`
  - `source`

## Cutover Strategy

1. `DAILY_REPORT_TRIGGER_URL`과 `DAILY_REPORT_TRIGGER_TOKEN`을 secret으로 등록합니다.
2. GitHub Actions는 local worker 실행 대신 external trigger endpoint를 호출합니다.
3. worker는 기존 `process-daily-report` orchestration을 재사용합니다.
4. 안정화 후 GitHub Actions는 공개 브리핑 build/deploy만 담당합니다.

## Rollback

- `DAILY_REPORT_TRIGGER_URL` secret을 비우면 GitHub Actions는 다시 local worker를 직접 실행합니다.
