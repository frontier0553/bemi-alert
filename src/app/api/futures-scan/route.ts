import { NextRequest, NextResponse } from 'next/server';
import { fetchTickers }    from '@/data/binance';
import { fetchFundingRates, fetchOiHistory } from '@/data/futures';
import { detectFundingAnomaly, detectOiSpike, formatFundingAlert, formatOiAlert } from '@/domain/futures';
import { sendTelegramAlertToSubscribers } from '@/data/telegram';
import { prisma } from '@/lib/prisma';

const SCAN_TOP_N       = 30;
const BATCH_SIZE       = 5;
const COOLDOWN_MINUTES = 15;  // 펀딩/OI 는 변화가 느려서 쿨타임 길게

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cooldownCutoff = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000);

    // 상위 N개 심볼 추출
    const tickers = await fetchTickers();
    const topSymbols = tickers
      .filter((t: any) => (t.symbol as string).endsWith('USDT'))
      .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, SCAN_TOP_N)
      .map((t: any) => t.symbol as string);

    let savedFunding = 0;
    let savedOi      = 0;

    // ── 1) 펀딩비 감지 ──────────────────────────────────────
    const fundingRates = await fetchFundingRates();
    const topFunding   = fundingRates.filter(f => topSymbols.includes(f.symbol));

    for (const info of topFunding) {
      const signal = detectFundingAnomaly(info);
      if (!signal) continue;

      const recent = await prisma.futuresAlert.findFirst({
        where: { symbol: signal.symbol, alertType: 'FUNDING', detectedAt: { gte: cooldownCutoff } },
      });
      if (recent) continue;

      await prisma.futuresAlert.create({
        data: {
          symbol:    signal.symbol,
          alertType: 'FUNDING',
          value:     signal.fundingRate * 100,   // % 단위로 저장
          markPrice: signal.markPrice,
          note:      signal.direction,
        },
      });
      savedFunding++;

      await sendTelegramAlertToSubscribers(formatFundingAlert(signal));
    }

    // ── 2) OI 급변 감지 ─────────────────────────────────────
    for (let i = 0; i < topSymbols.length; i += BATCH_SIZE) {
      const batch = topSymbols.slice(i, i + BATCH_SIZE);
      const settled = await Promise.allSettled(
        batch.map(async (symbol) => {
          const snapshots = await fetchOiHistory(symbol);
          return detectOiSpike(snapshots);
        }),
      );

      for (const r of settled) {
        if (r.status !== 'fulfilled' || !r.value) continue;
        const signal = r.value;

        const recent = await prisma.futuresAlert.findFirst({
          where: {
            symbol:    signal.symbol,
            alertType: { in: ['OI_SURGE', 'OI_DROP'] },
            detectedAt: { gte: cooldownCutoff },
          },
        });
        if (recent) continue;

        await prisma.futuresAlert.create({
          data: {
            symbol:    signal.symbol,
            alertType: signal.direction === 'SURGE' ? 'OI_SURGE' : 'OI_DROP',
            value:     signal.oiChangePct,
            note:      `$${(signal.oiUsd / 1_000_000).toFixed(1)}M`,
          },
        });
        savedOi++;

        await sendTelegramAlertToSubscribers(formatOiAlert(signal));
      }
    }

    return NextResponse.json({ ok: true, savedFunding, savedOi });
  } catch (err) {
    console.error('[futures-scan] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
