import { NextResponse } from 'next/server';

const BASE_URL = process.env.BINANCE_BASE_URL ?? 'https://api.binance.com';
const TOP_N    = 60;

export const revalidate = 60; // Next.js 60초 캐싱

export async function GET() {
  try {
    const res = await fetch(`${BASE_URL}/api/v3/ticker/24hr`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);

    const data: any[] = await res.json();

    const coins = data
      .filter((t: any) => (t.symbol as string).endsWith('USDT'))
      .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, TOP_N)
      .map((t: any) => ({
        symbol:    (t.symbol as string).replace('USDT', ''),
        changePct: parseFloat(t.priceChangePercent),
        volume:    parseFloat(t.quoteVolume),
        price:     parseFloat(t.lastPrice),
      }));

    return NextResponse.json({ coins });
  } catch (err) {
    console.error('[market-heatmap]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
