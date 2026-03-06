import { NextRequest, NextResponse } from 'next/server';
import { fetchTickers } from '@/data/binance';
import { fetchAggTrades } from '@/data/whales';
import { detectWhaleActivity, formatWhaleAlert } from '@/domain/whale';
import { sendTelegramAlertToSubscribers } from '@/data/telegram';
import { prisma } from '@/lib/prisma';

const SCAN_TOP_N       = 30;   // Top 30 symbols by 24h volume
const BATCH_SIZE       = 5;    // Concurrent aggTrades requests
const SAVE_THRESHOLD   = 5;    // |score| ≥ 5 → save to DB
const ALERT_THRESHOLD  = 40;   // |score| ≥ 40 → telegram alert
const COOLDOWN_MINUTES = 10;   // 같은 코인 재감지 최소 대기 시간

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tickers = await fetchTickers();
    const top = tickers
      .filter((t: any) => (t.symbol as string).endsWith('USDT'))
      .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, SCAN_TOP_N);

    const results = [];

    for (let i = 0; i < top.length; i += BATCH_SIZE) {
      const batch = top.slice(i, i + BATCH_SIZE);
      const settled = await Promise.allSettled(
        batch.map(async (t: any) => {
          const trades = await fetchAggTrades(t.symbol);
          return detectWhaleActivity(t.symbol, trades, parseFloat(t.quoteVolume));
        }),
      );
      for (const r of settled) {
        if (r.status === 'fulfilled' && r.value) results.push(r.value);
      }
    }

    // Save + alert significant events
    const cooldownCutoff = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000);
    let saved = 0;
    for (const w of results) {
      if (Math.abs(w.score) < SAVE_THRESHOLD) continue;

      // 쿨다운: 같은 코인이 최근 COOLDOWN_MINUTES 내에 이미 저장됐으면 스킵
      const recent = await prisma.whaleEvent.findFirst({
        where: { symbol: w.symbol, detectedAt: { gte: cooldownCutoff } },
      });
      if (recent) continue;

      await prisma.whaleEvent.create({
        data: {
          symbol:     w.symbol,
          direction:  w.direction,
          tradeSize:  w.topTradeSize,
          price:      w.topTradePrice,
          score:      w.score,
          whaleBuys:  w.whaleBuys,
          whaleSells: w.whaleSells,
          type:       w.type,
        },
      });
      saved++;

      if (Math.abs(w.score) >= ALERT_THRESHOLD) {
        const msg = formatWhaleAlert(w);
        await sendTelegramAlertToSubscribers(msg, {
          symbol:    w.symbol,
          changePct: w.score,
          alertType: 'WHALE',
        });
      }
    }

    return NextResponse.json({ ok: true, scanned: top.length, saved });
  } catch (err) {
    console.error('[whale-scan] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
