import { fetchTickers, fetchKlines } from './binance';
import { computeMetrics, evaluatePump, formatAlert, DEFAULT_THRESHOLDS } from '../domain/pump';
import { checkCooldown, updateCooldown } from './cooldown';
import { prisma } from '../lib/prisma';

const SCAN_TOP_N_DEFAULT = 200;
const BATCH_SIZE         = 20;  // max concurrent kline requests

// ── Settings ─────────────────────────────────────────────────

async function getTopN(): Promise<number> {
  const row = await prisma.settings.findUnique({ where: { key: 'SCAN_TOP_N' } });
  return Number(row?.value ?? SCAN_TOP_N_DEFAULT);
}

// ── Per-symbol processing ────────────────────────────────────

async function processSymbol(symbol: string): Promise<string | null> {
  let klines;
  try {
    klines = await fetchKlines(symbol, 60);
  } catch (err: any) {
    // If rate-limited, re-throw to stop the entire scan; otherwise skip symbol
    if (err.message?.includes('rate limited')) throw err;
    return null;
  }

  const metrics = computeMetrics(klines);
  if (!metrics) return null;

  const result = evaluatePump(metrics, DEFAULT_THRESHOLDS);
  if (!result) return null;

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
        closeNow:   metrics.closeNow,
        close3mAgo: metrics.close3mAgo,
        close5mAgo: metrics.close5mAgo,
        vol1mNow:   metrics.vol1mNow,
        volAvg60m:  metrics.volAvg60m,
      }),
    },
  });

  await updateCooldown(symbol, result.maxMove);

  return formatAlert(symbol, result);
}

// ── Batch runner with concurrency cap ────────────────────────

async function runBatches(symbols: string[]): Promise<string[]> {
  const alerts: string[] = [];
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch   = symbols.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(batch.map(s => processSymbol(s)));
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value) {
        alerts.push(r.value);
      } else if (r.status === 'rejected') {
        // Re-throw rate limit errors; log others
        if ((r.reason as Error)?.message?.includes('rate limited')) throw r.reason;
        console.error('[scanner] symbol error:', r.reason);
      }
    }
  }
  return alerts;
}

// ── Main entry point ─────────────────────────────────────────

export async function runScanOnce(): Promise<void> {
  const topN    = await getTopN();
  const tickers = await fetchTickers();

  const symbols = tickers
    .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
    .slice(0, topN)
    .map((t: any) => t.symbol as string);

  const alerts = await runBatches(symbols);

  console.log(
    `[scan] ${new Date().toLocaleTimeString('ko-KR')} — ${symbols.length}개 스캔, ${alerts.length}개 감지`,
  );
}
