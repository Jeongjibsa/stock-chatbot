# FRED Series Audit

## 1. Purpose

이 문서는 현재 시장 데이터 리포트에 사용 중인 FRED series 매핑을 점검하고, 환율과 달러 강도 해석 기준을 고정하기 위한 참고 문서다.

## 2. Current Mapping Audit

| Product Item | Source Key | FRED Series | Audit Result | Notes |
| --- | --- | --- | --- | --- |
| Nasdaq Composite | `index:NASDAQ:IXIC` | `NASDAQCOM` | valid | 나스닥 종합 지수 대용 series로 사용 가능 |
| S&P 500 | `index:SP:SPX` | `SP500` | valid | 대표 broad market 지표로 적절 |
| Dow Jones Industrial Average | `index:DJI` | `DJIA` | valid | 대표 구경제/대형주 흐름 지표로 적절 |
| VIX | `index:CBOE:VIX` | `VIXCLS` | valid | 변동성 지표로 적절 |
| U.S. 10Y Treasury | `rate:US10Y` | `DGS10` | valid | 금리 방향 확인용으로 적절 |
| WTI Crude Oil | `commodity:WTI` | `DCOILWTICO` | valid | 에너지/중동 리스크 해석용으로 적절 |
| Henry Hub Natural Gas | `commodity:HENRY_HUB_NATURAL_GAS` | `DHHNGSP` | valid | 천연가스 흐름 확인용으로 적절 |
| USD/KRW | `fx:USDKRW` | `DEXKOUS` | valid | FRED 설명상 `South Korean Won to One U.S. Dollar`; 현재 `USD/KRW` 해석이 맞다 |
| Broad Dollar Index Proxy | `fx:DXY` | `DTWEXBGS` | valid with caveat | ICE DXY 자체는 아니고 broad goods/services dollar index proxy다 |

## 3. Interpretation Notes

- `DEXKOUS`는 원화 기준 1달러당 환율로 해석하는 현재 구현이 맞다.
- `DTWEXBGS`는 널리 알려진 ICE DXY와 동일한 지수는 아니지만, 달러 전반 강도 proxy로는 충분히 쓸 수 있다.
- 따라서 `USD/KRW`와 `DTWEXBGS`를 함께 보면, 원화만의 상대 약세인지 광범위한 달러 강세인지 분리 해석할 수 있다.

## 4. Known Gaps

- FRED는 개별 보유 종목 시세 source로 쓰지 않는다.
- FRED에는 KOSPI, KOSDAQ를 안정적으로 동일 기준으로 대체할 기본 series가 없어 현재 기본 시장 카탈로그와 어댑터 지원 범위 사이에 차이가 있다.
- 향후 KRX 지수와 개별 종목 시세는 별도 source adapter가 필요하다.
