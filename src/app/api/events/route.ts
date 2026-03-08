import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type   = searchParams.get('type');
  const symbol = searchParams.get('symbol');
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const where = {
    ...(type && type !== 'ALL' ? { type } : {}),
    ...(symbol ? { symbol: { contains: symbol.toUpperCase() } } : {}),
  };

  const [signals, todaySignals] = await Promise.all([
    prisma.signal.findMany({
      where,
      orderBy: { detectedAt: 'desc' },
      take: limit,
    }),
    prisma.signal.findMany({
      where: { detectedAt: { gte: todayStart } },
    }),
  ]);

  const todayPumps = todaySignals.filter(s => s.type === 'PUMP');

  const topPump = todayPumps.length > 0
    ? todayPumps.reduce((a, b) => a.changePct > b.changePct ? a : b)
    : null;

  const toEvent = (s: (typeof signals)[number]) => ({
    id:           s.id,
    symbol:       s.symbol,
    type:         s.type as 'PUMP' | 'DUMP',
    changePct:    s.changePct,
    volumeMult:   s.volRatio,
    price:        s.metaJson ? (() => { try { return (JSON.parse(s.metaJson) as { closeNow?: number }).closeNow ?? 0; } catch { return 0; } })() : 0,
    detectedAt:   s.detectedAt.toISOString(),
    changeWindow: s.changeWindow,
    volRatio:     s.volRatio,
  });

  return NextResponse.json({
    events: signals.map(toEvent),
    stats: {
      todayTotal: todaySignals.length,
      todayPumps: todayPumps.length,
      todayDumps: 0,
      topPump:    topPump ? toEvent(topPump) : null,
      topDump:    null,
    },
  });
}
