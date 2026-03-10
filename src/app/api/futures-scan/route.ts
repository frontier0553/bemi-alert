import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron-auth';
import { fetchTickers }    from '@/data/binance';
import { fetchFundingRates, fetchOiHistory } from '@/data/futures';
import { detectFundingAnomaly, detectOiSpike, formatFundingAlert, formatOiAlert } from '@/domain/futures';
import { sendTelegramAlertToSubscribers } from '@/data/telegram';
import { prisma } from '@/lib/prisma';

const SCAN_TOP_N       = 30;
const BATCH_SIZE       = 5;
const COOLDOWN_MINUTES = 15;  // ???OI ??蹂?붽? ?먮젮??荑⑦???湲멸쾶

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cooldownCutoff = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000);

    // ?곸쐞 N媛??щ낵 異붿텧
    const tickers = await fetchTickers();
    const topSymbols = tickers
      .filter((t: any) => (t.symbol as string).endsWith('USDT'))
      .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, SCAN_TOP_N)
      .map((t: any) => t.symbol as string);

    let savedFunding = 0;
    let savedOi      = 0;

    // ?? 1) ??⑸퉬 媛먯? ??????????????????????????????????????
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
          value:     signal.fundingRate * 100,   // % ?⑥쐞濡????          markPrice: signal.markPrice,
          note:      signal.direction,
        },
      });
      savedFunding++;

      await sendTelegramAlertToSubscribers({
        ko: formatFundingAlert(signal, 'ko'),
        en: formatFundingAlert(signal, 'en'),
      }, {
        symbol:    signal.symbol,
        changePct: signal.fundingRate * 100,
        alertType: 'FUTURES',
      });
    }

    // ?? 2) OI 湲됰? 媛먯? ?????????????????????????????????????
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

        await sendTelegramAlertToSubscribers({
          ko: formatOiAlert(signal, 'ko'),
          en: formatOiAlert(signal, 'en'),
        }, {
          symbol:    signal.symbol,
          changePct: signal.oiChangePct,
          alertType: 'FUTURES',
        });
      }
    }

    return NextResponse.json({ ok: true, savedFunding, savedOi });
  } catch (err) {
    console.error('[futures-scan] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
