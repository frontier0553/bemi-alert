import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') as 'PUMP' | 'DUMP' | null;
  const symbol = searchParams.get('symbol');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [events, todayEvents] = await Promise.all([
    prisma.event.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(symbol ? { symbol: { contains: symbol.toUpperCase() } } : {}),
      },
      orderBy: { detectedAt: 'desc' },
      take: limit,
    }),
    prisma.event.findMany({
      where: { detectedAt: { gte: todayStart } },
    }),
  ]);

  const pumps = todayEvents.filter(e => e.type === 'PUMP');
  const dumps = todayEvents.filter(e => e.type === 'DUMP');

  const topPump = pumps.length > 0
    ? pumps.reduce((a, b) => a.changePct > b.changePct ? a : b)
    : null;
  const topDump = dumps.length > 0
    ? dumps.reduce((a, b) => a.changePct < b.changePct ? a : b)
    : null;

  return NextResponse.json({
    events,
    stats: {
      todayTotal: todayEvents.length,
      todayPumps: pumps.length,
      todayDumps: dumps.length,
      topPump,
      topDump,
    },
  });
}
