# Examples And Test Cases

## Telegram Personalized

대표 회귀 케이스:

1. 과열 시장 + 높은 구조 리스크
- 기대 결과: 보수적/중립적 성향에서 확대 톤 약화

2. 종목은 양호하지만 과비중 hard rule 존재
- 기대 결과: `확대 검토` 대신 `유지 우세` 또는 더 보수적 action 유지

3. 데이터 불완전
- 기대 결과: `0.00` raw dump 대신 `확인 필요`, `점검 필요` fallback 사용

## Public Web

대표 회귀 케이스:

1. 공개 브리핑에는 `비중 확대`, `포트 적합성`, `내 포트 기준` 같은 개인화 용어가 나오면 안 된다.
2. 구조는 `오늘의 시장 브리핑 -> 시장 종합 해석 -> 글로벌/국내 시장 스냅샷 -> 리스크 포인트` 순서를 따른다.

## Telegram UX

대표 회귀 케이스:

1. `/start`, `/help`, `/register` 이후 DM 홈 keyboard가 노출된다.
2. 홈 버튼 `📊 브리핑 보기`, `📁 내 종목`, `⚙️ 설정`은 기존 slash command use case를 그대로 호출한다.
3. 기존 slash command semantics는 유지된다.
