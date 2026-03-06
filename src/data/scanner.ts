import { fetchTickers, fetchKlines } from './binance';
import {
  computeMetrics,
  evaluatePump,
  applyFakePumpFilters,
  formatAlert,
  DEFAULT_THRESHOLDS,
  type Ticker24h,
} from '../domain/pump';
import { checkCooldown, updateCooldown } from './cooldown';
import { sendTelegramAlertToSubscribers } from './telegram';
import { prisma } from '../lib/prisma';

const SCAN_TOP_N_DEFAULT = 200;
const BATCH_SIZE         = 20;  // max concurrent kline requests

// ── Settings ─────────────────────────────────────────────────

async function getTopN(): Promise<number> {
  const row = await prisma.settings.findUnique({ where: { key: 'SCAN_TOP_N' } });
  return Number(row?.value ?? SCAN_TOP_N_DEFAULT);
}

// ── Per-symbol processing ────────────────────────────────────

async function processSymbol(
  symbol: string,
  ticker: Ticker24h,
  rank: number,
  scanTime: number,
): Promise<string | null> {
  let klines;
  try {
    klines = await fetchKlines(symbol, 60);
  } catch (err: any) {
    if (err.message?.includes('rate limited')) throw err;
    return null;
  }

  const metrics = computeMetrics(klines);
  if (!metrics) return null;

  const result = evaluatePump(metrics, DEFAULT_THRESHOLDS);
  if (!result) return null;

  // Fake pump filter — liquidity + candle confirmation
  const passes = applyFakePumpFilters(metrics, ticker, klines);
  if (!passes) return null;

  const allowed = await checkCooldown(symbol, result.maxMove);
  if (!allowed) return null;

  await prisma.signal.create({
    data: {
      symbol,
      type:         'PUMP',
      changeWindow: result.changeWindow,
      changePct:    result.changePct,
      volRatio:     result.volRatio,
      metaJson:     JSON.stringify({
        r3:         metrics.r3,
        r5:         metrics.r5,
        volRatio:   metrics.volRatio,
        baseVol:    metrics.volAvg60m,
        nowVol:     metrics.vol1mNow,
        closeNow:   metrics.closeNow,
        topRank:    rank,
        scanTime,
      }),
    },
  });

  await updateCooldown(symbol, result.maxMove);

  const alertMsg = formatAlert(symbol, result, new Date());
  await sendTelegramAlertToSubscribers(alertMsg);

  return alertMsg;
}

// ── Batch runner with concurrency cap ────────────────────────

async function runBatches(
  entries: Array<{ symbol: string; ticker: Ticker24h; rank: number }>,
  scanTime: number,
): Promise<string[]> {
  const alerts: string[] = [];
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch   = entries.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map(e => processSymbol(e.symbol, e.ticker, e.rank, scanTime)),
    );
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value) {
        alerts.push(r.value);
      } else if (r.status === 'rejected') {
        if ((r.reason as Error)?.message?.includes('rate limited')) throw r.reason;
        console.error('[scanner] symbol error:', r.reason);
      }
    }
  }
  return alerts;
}

// ── Main entry point ─────────────────────────────────────────

export async function runScanOnce(): Promise<void> {
  const scanTime = Date.now();
  const topN     = await getTopN();
  const tickers  = await fetchTickers();

  const sorted = tickers
    .filter((t: any) => (t.symbol as string).endsWith('USDT'))
    .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
    .slice(0, topN);

  const entries = sorted.map((t: any, i: number) => ({
    symbol: t.symbol as string,
    ticker: { symbol: t.symbol as string, quoteVolume: parseFloat(t.quoteVolume) } as Ticker24h,
    rank:   i + 1,
  }));

  const alerts = await runBatches(entries, scanTime);

  console.log(
    `[scan] ${new Date().toLocaleTimeString('ko-KR')} — ${entries.length}개 스캔, ${alerts.length}개 감지`,
  );
}
