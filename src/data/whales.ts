const BASE_URL = process.env.BINANCE_BASE_URL ?? 'https://api.binance.com';

export interface AggTrade {
  price:        number;
  qty:          number;   // base asset qty
  quoteQty:     number;   // USD value = price × qty
  isBuyerMaker: boolean;  // true = market SELL (seller is taker)
  time:         number;   // ms timestamp
}

/**
 * Fetch aggregated trades for a symbol within the last `windowMs` milliseconds.
 * Uses Binance /api/v3/aggTrades with startTime filter (up to 1000 trades).
 */
export async function fetchAggTrades(
  symbol: string,
  windowMs = 5 * 60 * 1000,
): Promise<AggTrade[]> {
  const startTime = Date.now() - windowMs;
  const url = `${BASE_URL}/api/v3/aggTrades?symbol=${encodeURIComponent(symbol)}&startTime=${startTime}&limit=1000`;

  const res = await fetch(url);
  if (res.status === 429 || res.status === 418) {
    const retryAfter = res.headers.get('Retry-After') ?? '60';
    throw new Error(`Binance rate limited (HTTP ${res.status}), retry after ${retryAfter}s`);
  }
  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data.map((t: any) => {
    const price = parseFloat(t.p);
    const qty   = parseFloat(t.q);
    return {
      price,
      qty,
      quoteQty:     price * qty,
      isBuyerMaker: Boolean(t.m),  // true = buyer was maker = market SELL
      time:         Number(t.T),
    };
  });
}
