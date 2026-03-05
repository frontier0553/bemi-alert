const BASE_URL = process.env.BINANCE_BASE_URL ?? 'https://api.binance.com';

export interface Kline {
  openTime: number;
  open:     number;
  close:    number;
  volume:   number;
}

/** Fetch 1-minute klines for a symbol. Default limit = 60 (last 60 minutes). */
export async function fetchKlines(symbol: string, limit = 60): Promise<Kline[]> {
  const url = `${BASE_URL}/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=1m&limit=${limit}`;
  const res = await fetch(url);

  if (res.status === 429 || res.status === 418) {
    const retryAfter = res.headers.get('Retry-After') ?? '60';
    throw new Error(`Binance rate limited (HTTP ${res.status}), retry after ${retryAfter}s`);
  }
  if (!res.ok) throw new Error(`Binance klines HTTP ${res.status}: ${symbol}`);

  const data = await res.json();
  if (!Array.isArray(data)) throw new Error(`Klines API error for ${symbol}: ${JSON.stringify(data)}`);

  // Binance kline row: [openTime, open, high, low, close, volume, ...]
  return (data as any[][]).map(row => ({
    openTime: row[0] as number,
    open:     parseFloat(row[1]),
    close:    parseFloat(row[4]),
    volume:   parseFloat(row[5]),
  }));
}

export async function fetchTickers(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/api/v3/ticker/24hr`);

  // 레이트리밋: 즉시 중단 + Retry-After 로깅
  if (res.status === 429 || res.status === 418) {
    const retryAfter = res.headers.get('Retry-After') ?? '60';
    throw new Error(
      `Binance rate limited (HTTP ${res.status}), retry after ${retryAfter}s`
    );
  }

  if (!res.ok) throw new Error(`Binance HTTP error: ${res.status}`);

  // 사용량 경고 (1200 weight/min 중 80% 초과 시)
  const usedWeight = res.headers.get('X-MBX-USED-WEIGHT-1M');
  if (usedWeight && parseInt(usedWeight) > 960) {
    console.warn(`[binance] High API weight: ${usedWeight}/1200`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) throw new Error(`Binance API error: ${JSON.stringify(data)}`);
  return data;
}
