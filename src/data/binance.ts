export async function fetchTickers(): Promise<any[]> {
  const res = await fetch("https://api.binance.com/api/v3/ticker/24hr");

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
