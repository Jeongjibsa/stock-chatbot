# Report Structure Grader

목적:

- 리포트가 필수 섹션을 빠뜨리지 않았는지 확인
- 숫자/기사/전략/리스크 문장이 서로 충돌하지 않는지 점검

평가 기준:

- `one_line_summary`
  - 첫 두 줄 안에 한 줄 요약이 존재해야 함
- `macro_snapshot`
  - 최소 1개 이상의 시장 항목이 bullet로 존재해야 함
- `portfolio_section`
  - 보유 종목이 없더라도 빈 상태 문구가 있어야 함
- `portfolio_news_section`
  - 뉴스가 없으면 이유가 있어야 하고, 있으면 종목명과 이벤트 headline이 함께 보여야 함
- `strategy_section`
  - 전략 문장은 확정 매수/매도 지시가 아니라 시나리오 제안이어야 함
- `risk_section`
  - 리스크 문장은 구체적 체크포인트 형태여야 함
- `hallucination_guard`
  - fixture input에 없는 숫자나 기사 출처를 새로 만들어내면 fail

판정:

- `pass`
  - 필수 섹션이 모두 있고, 환각 징후가 없으며, 전략/리스크 문장이 구체적임
- `soft_fail`
  - 섹션은 있으나 문장이 지나치게 모호하거나 중복이 심함
- `fail`
  - 필수 섹션 누락, 환각, 사실 충돌, 한국어 가독성 붕괴
