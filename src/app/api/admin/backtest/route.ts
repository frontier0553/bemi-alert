import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

async function isAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return false;
  const adminEmails = (process.env.ADMIN_EMAIL ?? '').split(',').map(e => e.trim()).filter(Boolean);
  return adminEmails.includes(user.email);
}

/** Binance 5분봉 7개 (=30분) 가져오기 */
async function fetchCandles(symbol: string, startTs: number) {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=5m&startTime=${startTs}&limit=7`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data: string[][] = await res.json();
    if (!Array.isArray(data) || data.length < 2) return null;
    return data.map(c => ({ open: parseFloat(c[1]), close: parseFloat(c[4]) }));
  } catch {
    return null;
  }
}

function pct(entry: number, close: number) {
  return ((close - entry) / entry) * 100;
}

/** 5개씩 병렬 처리 (Binance rate limit 대응) */
async function processInChunks<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  size = 5
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const settled = await Promise.allSettled(chunk.map(fn));
    settled.forEach(r => results.push(r.status === 'fulfilled' ? r.value : null as R));
  }
  return results;
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const days = Math.min(parseInt(req.nextUrl.searchParams.get('days') ?? '3'), 14);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const signals = await prisma.signal.findMany({
    where: { detectedAt: { gte: since } },
    orderBy: { detectedAt: 'desc' },
  });

  const rows = await processInChunks(signals, async sig => {
    const sym = sig.symbol.endsWith('USDT') ? sig.symbol : sig.symbol + 'USDT';
    const candles = await fetchCandles(sym, sig.detectedAt.getTime());

    const isPump = sig.changePct >= 0;

    if (!candles) {
      return {
        id: sig.id, symbol: sym, type: isPump ? 'PUMP' : 'DUMP',
        changePct: sig.changePct, volRatio: sig.volRatio,
        detectedAt: sig.detectedAt.toISOString(),
        at5m: null, at15m: null, at30m: null,
      };
    }

    const entry = candles[0].open;
    const at5m  = candles[1] ? pct(entry, candles[1].close) : null;
    const at15m = candles[3] ? pct(entry, candles[3].close) : null;
    const at30m = candles[6] ? pct(entry, candles[6].close) : null;

    return {
      id: sig.id, symbol: sym, type: isPump ? 'PUMP' : 'DUMP',
      changePct: sig.changePct, volRatio: sig.volRatio,
      detectedAt: sig.detectedAt.toISOString(),
      at5m, at15m, at30m,
    };
  });

  // 적중률 계산 (데이터 있는 것만)
  const withData = rows.filter(r => r.at15m !== null);
  const hit = (field: 'at5m' | 'at15m' | 'at30m') =>
    rows.filter(r => {
      const v = r[field];
      if (v === null) return false;
      return r.type === 'PUMP' ? v > 0 : v < 0;
    }).length;

  return NextResponse.json({
    days,
    summary: {
      total: withData.length,
      hit5:  hit('at5m'),
      hit15: hit('at15m'),
      hit30: hit('at30m'),
    },
    rows,
  });
}
