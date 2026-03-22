import type { MarketDataFetchResult } from "./market-data.js";

type RuleBasedBriefing = {
  eventBullets: string[];
  fundFlowBullets: string[];
  keyIndicatorBullets: string[];
  macroBullets: string[];
  marketBullets: string[];
  riskBullets: string[];
  summaryLine: string;
};

export function buildRuleBasedBriefing(
  results: MarketDataFetchResult[]
): RuleBasedBriefing {
  const marketMap = new Map(
    results.flatMap((result) =>
      result.status === "ok" ? [[result.data.itemCode, result.data]] : []
    )
  );
  const summaryLine = buildFallbackSummaryLine(results);
  const keyIndicatorBullets = buildKeyIndicatorBullets(results);
  const marketBullets = buildMarketBullets(marketMap);
  const macroBullets = buildMacroBullets(marketMap);
  const fundFlowBullets = buildFundFlowBullets(marketMap);
  const eventBullets = buildEventBullets(marketMap);
  const riskBullets = buildRiskBullets(marketMap);

  return {
    summaryLine,
    keyIndicatorBullets,
    marketBullets,
    macroBullets,
    fundFlowBullets,
    eventBullets,
    riskBullets
  };
}

function buildFallbackSummaryLine(results: MarketDataFetchResult[]): string {
  const marketMap = new Map(
    results.flatMap((result) =>
      result.status === "ok" ? [[result.data.itemCode, result.data]] : []
    )
  );
  const nasdaqChange = marketMap.get("NASDAQ")?.changePercent ?? 0;
  const sp500Change = marketMap.get("SP500")?.changePercent ?? 0;
  const vixChange = marketMap.get("VIX")?.changePercent ?? 0;
  const dxyChange = marketMap.get("DXY")?.changePercent ?? 0;
  const usdKrwChange = marketMap.get("USD_KRW")?.changePercent ?? 0;

  if (nasdaqChange <= -1.5 && sp500Change <= -1 && vixChange >= 5) {
    return "미국 증시 급락과 변동성 확대가 겹쳐 있어, 신규 매수보다 방어적 대응을 우선하시는 편이 좋습니다.";
  }

  if (nasdaqChange >= 1 && sp500Change >= 0.8 && vixChange <= -5) {
    return "위험 선호가 완화되고 있어, 추격 매수보다 선별적 분할 접근으로 대응하시는 편이 좋습니다.";
  }

  if (dxyChange >= 0.5 || usdKrwChange >= 0.3) {
    return "달러 강세와 환율 부담이 이어지고 있어, 비중 확대보다 관망과 리스크 관리에 집중하시는 편이 좋습니다.";
  }

  return "최근 가용 시장 지표 기준으로 핵심 대응 포인트를 정리했습니다.";
}

function buildKeyIndicatorBullets(results: MarketDataFetchResult[]): string[] {
  const marketMap = new Map(
    results.flatMap((result) =>
      result.status === "ok" ? [[result.data.itemCode, result.data]] : []
    )
  );
  const bullets: string[] = [];

  if ((marketMap.get("VIX")?.changePercent ?? 0) >= 5) {
    bullets.push("VIX 급등으로 변동성 경계가 강화됐습니다.");
  }

  if ((marketMap.get("NASDAQ")?.changePercent ?? 0) <= -1.5) {
    bullets.push("NASDAQ 약세가 커지며 성장주 변동성이 확대됐습니다.");
  }

  if ((marketMap.get("COPPER")?.changePercent ?? 0) >= 5) {
    bullets.push("구리 강세가 이어져 산업 수요 기대는 완전히 꺾이지 않았습니다.");
  }

  if (
    (marketMap.get("USD_KRW")?.changePercent ?? 0) >= 0.3 &&
    (marketMap.get("DXY")?.changePercent ?? 0) >= 0.3
  ) {
    bullets.push("달러 강세와 원화 약세가 함께 나타나 환율 부담을 점검하시는 편이 좋습니다.");
  }

  if (
    (marketMap.get("WTI")?.changePercent ?? 0) <= -4 &&
    (marketMap.get("HENRY_HUB_NATURAL_GAS")?.changePercent ?? 0) <= -4
  ) {
    bullets.push("에너지 가격 급락으로 경기 우려와 인플레이션 완화 신호가 동시에 나타나고 있습니다.");
  }

  return bullets.slice(0, 4);
}

function buildMarketBullets(
  marketMap: Map<string, Extract<MarketDataFetchResult, { status: "ok" }>["data"]>
): string[] {
  const bullets: string[] = [];
  const nasdaq = marketMap.get("NASDAQ")?.changePercent;
  const sp500 = marketMap.get("SP500")?.changePercent;
  const dow = marketMap.get("DOW")?.changePercent;
  const vix = marketMap.get("VIX")?.changePercent;
  const kospi = marketMap.get("KOSPI")?.changePercent;
  const kosdaq = marketMap.get("KOSDAQ")?.changePercent;

  if (
    nasdaq !== undefined &&
    sp500 !== undefined &&
    dow !== undefined
  ) {
    bullets.push(
      `미국 주요 지수는 나스닥 ${formatSignedPercent(nasdaq)}, S&P500 ${formatSignedPercent(sp500)}, 다우 ${formatSignedPercent(dow)}로 전반적으로 위험 선호가 약해졌습니다.`
    );
  }

  if (vix !== undefined) {
    bullets.push(
      vix >= 5
        ? "공포지수(VIX) 급등으로 단기 변동성 확대를 전제로 보수적으로 접근하시는 편이 좋습니다."
        : "공포지수(VIX)는 급격한 스트레스 국면까지는 아니지만 방향성 확인이 더 필요합니다."
    );
  }

  if (kospi !== undefined || kosdaq !== undefined) {
    bullets.push(
      `국내 증시는 코스피 ${formatSignedPercent(kospi)}, 코스닥 ${formatSignedPercent(kosdaq)} 수준으로 미국 대비 상대 강도를 확인하되, 대외 변수 반영 여부를 함께 보셔야 합니다.`
    );
  }

  return bullets.slice(0, 4);
}

function buildMacroBullets(
  marketMap: Map<string, Extract<MarketDataFetchResult, { status: "ok" }>["data"]>
): string[] {
  const bullets: string[] = [];
  const us10y = marketMap.get("US10Y");
  const dxy = marketMap.get("DXY")?.changePercent;
  const usdKrw = marketMap.get("USD_KRW")?.changePercent;
  const wti = marketMap.get("WTI")?.changePercent;
  const gas = marketMap.get("HENRY_HUB_NATURAL_GAS")?.changePercent;

  if (us10y?.value !== undefined) {
    bullets.push(
      `미국 10년물 금리는 ${us10y.value.toFixed(2)}% 수준이며, ${formatRateDirection(us10y.changeValue)} 고금리 부담의 완화 여부를 계속 확인하셔야 합니다.`
    );
  }

  if (dxy !== undefined || usdKrw !== undefined) {
    bullets.push(
      `달러 인덱스 ${formatSignedPercent(dxy)}, USD/KRW ${formatSignedPercent(usdKrw)} 흐름으로 외환 압력이 이어지고 있어 원화 자산 변동성을 함께 보셔야 합니다.`
    );
  }

  if (wti !== undefined || gas !== undefined) {
    bullets.push(
      `원자재 가격은 WTI ${formatSignedPercent(wti)}, 천연가스 ${formatSignedPercent(gas)} 수준으로 에너지 가격 변동성이 거시 해석에 계속 영향을 주고 있습니다.`
    );
  }

  return bullets.slice(0, 4);
}

function buildFundFlowBullets(
  marketMap: Map<string, Extract<MarketDataFetchResult, { status: "ok" }>["data"]>
): string[] {
  const kospi = marketMap.get("KOSPI")?.changePercent ?? 0;
  const kosdaq = marketMap.get("KOSDAQ")?.changePercent ?? 0;
  const usdKrw = marketMap.get("USD_KRW")?.changePercent ?? 0;
  const domesticStrength = kospi * 0.55 + kosdaq * 0.45;

  if (domesticStrength === 0 && usdKrw === 0) {
    return [
      "외국인·기관 순매수와 ETF flow 실데이터는 아직 별도 연결이 필요합니다."
    ];
  }

  if (domesticStrength >= 0.6 && usdKrw <= 0.3) {
    return [
      "국내 지수 반등과 환율 안정 조합을 보면 수급 proxy는 방어적 유입 쪽에 가깝지만, 실제 외국인·기관 순매수는 별도 확인이 필요합니다."
    ];
  }

  if (domesticStrength <= -0.6 && usdKrw >= 0.3) {
    return [
      "국내 지수 약세와 환율 부담을 함께 보면 수급 proxy는 방어적 이탈 쪽에 가깝지만, 실제 외국인·기관 순매수는 별도 확인이 필요합니다."
    ];
  }

  return [
    "외국인·기관 순매수와 ETF flow 실데이터는 아직 별도 연결이 필요하며, 현재는 지수와 환율을 통한 proxy만 확인하고 있습니다."
  ];
}

function buildEventBullets(
  marketMap: Map<string, Extract<MarketDataFetchResult, { status: "ok" }>["data"]>
): string[] {
  const bullets: string[] = [];
  const vix = marketMap.get("VIX")?.changePercent ?? 0;
  const copper = marketMap.get("COPPER")?.changePercent ?? 0;
  const wti = marketMap.get("WTI")?.changePercent ?? 0;

  if (vix >= 5) {
    bullets.push("변동성 급등이 이어져 지정학 리스크와 대외 이벤트 headline에 민감한 장세로 보셔야 합니다.");
  }

  if (copper >= 5) {
    bullets.push("구리 강세가 이어지고 있어 AI·반도체·산업재 수요 기대가 아직 완전히 꺾이지는 않았습니다.");
  }

  if (wti <= -4) {
    bullets.push("유가 급락이 이어져 원자재 테마와 인플레이션 기대의 재조정 가능성을 함께 보셔야 합니다.");
  }

  bullets.push("예정 실적 발표 일정과 세부 경제 캘린더 데이터는 아직 별도 연결이 필요합니다.");

  return bullets.slice(0, 4);
}

function buildRiskBullets(
  marketMap: Map<string, Extract<MarketDataFetchResult, { status: "ok" }>["data"]>
): string[] {
  const bullets: string[] = [];
  const vix = marketMap.get("VIX")?.changePercent ?? 0;
  const dxy = marketMap.get("DXY")?.changePercent ?? 0;
  const usdKrw = marketMap.get("USD_KRW")?.changePercent ?? 0;
  const nasdaq = marketMap.get("NASDAQ")?.changePercent ?? 0;

  if (vix >= 5) {
    bullets.push("변동성 급등 구간에서는 추격 매수보다 현금 비중과 손절 기준을 먼저 점검하시는 편이 좋습니다.");
  }

  if (dxy >= 0.5 || usdKrw >= 0.3) {
    bullets.push("달러 강세와 환율 변동성 확대로 외국인 수급과 성장주 밸류에이션 부담을 함께 확인하셔야 합니다.");
  }

  if (nasdaq <= -1.5) {
    bullets.push("미국 기술주 약세가 이어질 경우 국내 반도체와 성장주 변동성이 추가 확대될 수 있습니다.");
  }

  if (bullets.length === 0) {
    bullets.push("단기 방향성이 뚜렷하지 않아 지수 반등 시 추격 매수보다 확인 매매가 적절합니다.");
  }

  return bullets.slice(0, 3);
}

function formatSignedPercent(value?: number): string {
  if (value === undefined) {
    return "변화 없음";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatRateDirection(changeValue?: number): string {
  if (changeValue === undefined) {
    return "방향성 확인이 더 필요해";
  }

  if (changeValue > 0) {
    return "상승해";
  }

  if (changeValue < 0) {
    return "하락해";
  }

  return "보합권이라";
}
