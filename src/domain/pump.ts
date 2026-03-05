import type { Kline } from '../data/binance';

// ── Types ────────────────────────────────────────────────────

export interface PumpMetrics {
  r3:         number;  // 3-minute return (%)
  r5:         number;  // 5-minute return (%)
  volRatio:   number;  // vol_1m_now / avg_vol_60m
  closeNow:   number;
  close3mAgo: number;
  close5mAgo: number;
  vol1mNow:   number;
  volAvg60m:  number;
}

export interface PumpThresholds {
  r3Min:       number;  // default 3.0
  r5Min:       number;  // default 4.0
  volRatioMin: number;  // default 3.0
}

export interface PumpResult {
  maxMove:      number;
  changeWindow: '3m' | '5m';
  changePct:    number;
  volRatio:     number;
  metrics:      PumpMetrics;
}

// ── Defaults ─────────────────────────────────────────────────

export const DEFAULT_THRESHOLDS: PumpThresholds = {
  r3Min:       3.0,
  r5Min:       4.0,
  volRatioMin: 3.0,
};

// ── Core functions ───────────────────────────────────────────

/**
 * Compute r3, r5, and vol_ratio from the last 60 1m klines.
 * Returns null when there aren't enough candles (< 10).
 *
 * Index layout (n = klines.length):
 *   klines[n-1]  = current minute
 *   klines[n-4]  = 3 minutes ago
 *   klines[n-6]  = 5 minutes ago
 */
export function computeMetrics(klines: Kline[]): PumpMetrics | null {
  if (klines.length < 10) return null;

  const n          = klines.length;
  const closeNow   = klines[n - 1].close;
  const close3mAgo = klines[n - 4].close;
  const close5mAgo = klines[n - 6].close;
  const vol1mNow   = klines[n - 1].volume;

  const r3 = (closeNow / close3mAgo - 1) * 100;
  const r5 = (closeNow / close5mAgo - 1) * 100;

  const volSum  = klines.reduce((s, k) => s + k.volume, 0);
  const volAvg60m = volSum / klines.length;
  const volRatio  = volAvg60m > 0 ? vol1mNow / volAvg60m : 0;

  return { r3, r5, volRatio, closeNow, close3mAgo, close5mAgo, vol1mNow, volAvg60m };
}

/**
 * Evaluate whether metrics cross the pump threshold.
 * Rules:
 *   (r3 >= r3Min OR r5 >= r5Min) AND volRatio >= volRatioMin
 */
export function evaluatePump(
  metrics: PumpMetrics,
  thresholds: PumpThresholds = DEFAULT_THRESHOLDS,
): PumpResult | null {
  const { r3, r5, volRatio } = metrics;

  const priceTrigger = r3 >= thresholds.r3Min || r5 >= thresholds.r5Min;
  if (!priceTrigger || volRatio < thresholds.volRatioMin) return null;

  // Prefer the 3m window if it triggers; use 5m otherwise
  const changeWindow: '3m' | '5m' = r3 >= thresholds.r3Min ? '3m' : '5m';
  const changePct  = changeWindow === '3m' ? r3 : r5;
  const maxMove    = Math.max(r3, r5);

  return { maxMove, changeWindow, changePct, volRatio, metrics };
}

/**
 * Format the push-ready alert string.
 * "🚨 PUMP ETHUSDT +4.2% (5m) | Vol x3.6"
 */
export function formatAlert(symbol: string, result: PumpResult): string {
  return `🚨 PUMP ${symbol} +${result.changePct.toFixed(1)}% (${result.changeWindow}) | Vol x${result.volRatio.toFixed(1)}`;
}
