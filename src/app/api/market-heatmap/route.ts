import { NextResponse } from 'next/server';

const BINANCE_BASE   = process.env.BINANCE_BASE_URL ?? 'https://api.binance.com';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const TOP_N          = 60;

export async function GET() {
  try {
    // Binance 24h 티커 + CoinGecko 시총 병렬 fetch
    const [binanceRes, geckoRes] = await Promise.all([
      fetch(`${BINANCE_BASE}/api/v3/ticker/24hr`, {
        next: { revalidate: 60 },   // 60초 캐시
      }),
      fetch(
        `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false`,
        { next: { revalidate: 300 } }, // 시총은 5분 캐시로 충분
      ),
    ]);

    if (!binanceRes.ok) throw new Error(`Binance HTTP ${binanceRes.status}`);

    const binanceData: any[] = await binanceRes.json();

    // CoinGecko 실패해도 graceful degradation (시총 없이 폴백)
    const geckoMap = new Map<string, number>(); // symbol(대문자) → marketCap
    if (geckoRes.ok) {
      const geckoData: any[] = await geckoRes.json();
      for (const g of geckoData) {
        const sym = (g.symbol as string).toUpperCase();
        // 같은 심볼 중 처음(시총 높은 것)만 저장
        if (!geckoMap.has(sym)) geckoMap.set(sym, g.market_cap ?? 0);
      }
    }

    // Binance 상위 TOP_N (거래량 기준 → 실제로 거래 가능한 코인 필터링)
    const binanceTop = binanceData
      .filter((t: any) => (t.symbol as string).endsWith('USDT'))
      .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, TOP_N);

    const coins = binanceTop.map((t: any) => {
      const sym = (t.symbol as string).replace('USDT', '');
      return {
        symbol:    sym,
        changePct: parseFloat(t.priceChangePercent),
        volume:    parseFloat(t.quoteVolume),
        price:     parseFloat(t.lastPrice),
        marketCap: geckoMap.get(sym) ?? null,
      };
    });

    // 시총 있는 코인은 시총 내림차순, 없는 코인은 거래량 순 뒤에 추가
    const withMc    = coins.filter(c => c.marketCap !== null).sort((a, b) => (b.marketCap! - a.marketCap!));
    const withoutMc = coins.filter(c => c.marketCap === null);
    const sorted    = [...withMc, ...withoutMc];

    return NextResponse.json({ coins: sorted });
  } catch (err) {
    console.error('[market-heatmap]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
