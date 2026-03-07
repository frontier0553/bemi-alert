import type { Kline } from '../data/binance';
import { pumpConfidence } from './confidence';

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

export interface Ticker24h {
  symbol:      string;
  quoteVolume: number;  // 24h quote asset volume (USDT)
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
 * Evaluate whether metrics cross the dump threshold.
 * Rules:
 *   (r3 <= -r3Min OR r5 <= -r5Min) AND volRatio >= volRatioMin
 */
export function evaluateDump(
  metrics: PumpMetrics,
  thresholds: PumpThresholds = DEFAULT_THRESHOLDS,
): PumpResult | null {
  const { r3, r5, volRatio } = metrics;

  const priceTrigger = r3 <= -thresholds.r3Min || r5 <= -thresholds.r5Min;
  if (!priceTrigger || volRatio < thresholds.volRatioMin) return null;

  const changeWindow: '3m' | '5m' = r3 <= -thresholds.r3Min ? '3m' : '5m';
  const changePct  = changeWindow === '3m' ? r3 : r5;
  const maxMove    = Math.abs(Math.min(r3, r5));

  return { maxMove, changeWindow, changePct, volRatio, metrics };
}

const MIN_QUOTE_VOLUME = 5_000_000;   // 24h 거래대금 최소 5백만 USDT
const MIN_GREEN_CANDLES = 2;           // 최근 3 캔들 중 최소 2개 양봉
const MIN_RED_CANDLES   = 2;           // 최근 3 캔들 중 최소 2개 음봉

/**
 * Fake pump filter — returns true when the signal passes both checks:
 *   1. Liquidity: 24h quoteVolume >= 5,000,000 USDT
 *   2. Candle confirmation: at least 2 of the last 3 candles are green (close > open)
 */
export function applyFakePumpFilters(
  _metrics: PumpMetrics,
  ticker24h: Ticker24h,
  klines: Kline[],
): boolean {
  // Filter 1 — liquidity guard
  if (ticker24h.quoteVolume < MIN_QUOTE_VOLUME) return false;

  // Filter 2 — candle confirmation (last 3 candles)
  const last3 = klines.slice(-3);
  const greenCount = last3.filter(k => k.close > k.open).length;
  if (greenCount < MIN_GREEN_CANDLES) return false;

  return true;
}

/**
 * Fake dump filter — liquidity + at least 2 of last 3 candles are red (close < open)
 */
export function applyFakeDumpFilters(
  _metrics: PumpMetrics,
  ticker24h: Ticker24h,
  klines: Kline[],
): boolean {
  if (ticker24h.quoteVolume < MIN_QUOTE_VOLUME) return false;
  const last3 = klines.slice(-3);
  const redCount = last3.filter(k => k.close < k.open).length;
  if (redCount < MIN_RED_CANDLES) return false;
  return true;
}

const QUOTE_RE = /(USDT|USDC|BUSD|FDUSD|TUSD|DAI|BTC|ETH|BNB|XRP|TRX|TRY|EUR|GBP|AUD|BRL|RUB|UAH|PLN|RON|ZAR)$/;

/**
 * Format the Telegram alert message (plain text).
 * type: 'PUMP' → 🚀, 'DUMP' → 📉
 */
export function formatAlert(
  symbol: string,
  result: PumpResult,
  _detectedAt: Date = new Date(),
  type: 'PUMP' | 'DUMP' = 'PUMP',
): string {
  const base     = symbol.replace(QUOTE_RE, '');
  const isPump   = type === 'PUMP';
  const icon     = isPump ? '🚀' : '📉';
  const title    = isPump ? 'Pump Signal' : 'Dump Signal';
  const sign     = isPump ? '+' : '';
  const tag      = isPump ? '#pump' : '#dump';
  const price    = result.metrics.closeNow;
  const priceStr = price >= 1 ? price.toFixed(2) : price.toFixed(4);
  const conf     = pumpConfidence(result.changePct, result.volRatio);

  return `${icon} ${title}

🪙 ${base}

Move
${sign}${result.changePct.toFixed(1)}% (${result.changeWindow})

Volume
x${result.volRatio.toFixed(1)}

Confidence
${conf.score}% (${conf.level})

💰 Price
$${priceStr}

${tag} #${base.toLowerCase()}`.trim();
}
