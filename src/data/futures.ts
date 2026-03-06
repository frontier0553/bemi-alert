const FAPI = 'https://fapi.binance.com';

export interface FundingInfo {
  symbol:          string;
  fundingRate:     number;  // e.g. 0.001 = 0.1%
  markPrice:       number;
  nextFundingTime: number;
}

export interface OiSnapshot {
  symbol:            string;
  openInterest:      number;  // base asset
  openInterestValue: number;  // USD
  timestamp:         number;
}

/** 전체 심볼 펀딩비 한 번에 조회 (public) */
export async function fetchFundingRates(): Promise<FundingInfo[]> {
  const res = await fetch(`${FAPI}/fapi/v1/premiumIndex`);
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .filter((d: any) => (d.symbol as string).endsWith('USDT'))
    .map((d: any) => ({
      symbol:          d.symbol,
      fundingRate:     parseFloat(d.lastFundingRate),
      markPrice:       parseFloat(d.markPrice),
      nextFundingTime: d.nextFundingTime,
    }));
}

/** 특정 심볼의 5분봉 OI 히스토리 (최근 3개) */
export async function fetchOiHistory(symbol: string): Promise<OiSnapshot[]> {
  const url = `${FAPI}/futures/data/openInterestHist?symbol=${encodeURIComponent(symbol)}&period=5m&limit=3`;
  const res  = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((d: any) => ({
    symbol,
    openInterest:      parseFloat(d.sumOpenInterest),
    openInterestValue: parseFloat(d.sumOpenInterestValue),
    timestamp:         d.timestamp,
  }));
}
