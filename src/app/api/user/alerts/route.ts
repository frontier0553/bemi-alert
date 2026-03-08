import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';

const LIMIT = 100;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 분당 30회 제한
  if (!rateLimit(`alerts:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
  }

  const [, settings] = await Promise.all([
    Promise.resolve(null),
    prisma.userSettings.findUnique({ where: { userId: user.id } }),
  ]);
  const days = 30;
  const tier = 'FREE';
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  let coinFilter: string[] | null = null;
  if (settings?.coinFilter) {
    try {
      const parsed = JSON.parse(settings.coinFilter);
      coinFilter = Array.isArray(parsed) ? parsed.filter(c => typeof c === 'string') : null;
    } catch {
      coinFilter = null;
    }
  }

  // 코인 필터 조건 헬퍼
  function symbolFilter(field: string) {
    if (!coinFilter || coinFilter.length === 0) return {};
    return {
      OR: coinFilter.map(coin => ({
        [field]: { startsWith: coin },
      })),
    };
  }

  // 세 테이블 병렬 조회
  const [signals, whales, futures] = await Promise.all([
    prisma.signal.findMany({
      where: { detectedAt: { gte: since }, ...symbolFilter('symbol') },
      orderBy: { detectedAt: 'desc' },
      take: LIMIT,
    }),
    prisma.whaleEvent.findMany({
      where: {
        detectedAt: { gte: since },
        score: { gte: 40 },        // 알림 기준 이상만
        ...symbolFilter('symbol'),
      },
      orderBy: { detectedAt: 'desc' },
      take: LIMIT,
    }),
    prisma.futuresAlert.findMany({
      where: { detectedAt: { gte: since }, ...symbolFilter('symbol') },
      orderBy: { detectedAt: 'desc' },
      take: LIMIT,
    }),
  ]);

  // 통합 타임라인으로 변환
  const timeline = [
    ...signals.map(s => ({
      id:         s.id,
      kind:       'signal' as const,
      type:       s.type,          // "PUMP" | "DUMP"
      symbol:     s.symbol,
      changePct:  s.changePct,
      volRatio:   s.volRatio,
      changeWindow: s.changeWindow,
      detectedAt: s.detectedAt,
    })),
    ...whales.map(w => ({
      id:         w.id,
      kind:       'whale' as const,
      type:       w.direction,     // "BUY" | "SELL" | "MIXED"
      symbol:     w.symbol,
      score:      w.score,
      tradeSize:  w.tradeSize,
      detectedAt: w.detectedAt,
    })),
    ...futures.map(f => ({
      id:         f.id,
      kind:       'futures' as const,
      type:       f.alertType,     // "FUNDING" | "OI_SURGE" | "OI_DROP"
      symbol:     f.symbol,
      value:      f.value,
      note:       f.note,
      detectedAt: f.detectedAt,
    })),
  ].sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
   .slice(0, LIMIT);

  return NextResponse.json({ timeline, coinFilter, tier, days });
}
