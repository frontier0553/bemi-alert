import type { FundingInfo, OiSnapshot } from '../data/futures';
import { fundingConfidence, oiConfidence } from './confidence';

// ── 임계값 ────────────────────────────────────────────────────
export const FUNDING_THRESHOLD = 0.001;  // |rate| ≥ 0.1% per 8h → 극단
export const OI_CHANGE_PCT     = 3;      // |변화율| ≥ 3% / 5분 → 급변

// ── 결과 타입 ─────────────────────────────────────────────────
export interface FundingSignal {
  symbol:      string;
  fundingRate: number;
  markPrice:   number;
  direction:   'LONG_EXTREME' | 'SHORT_EXTREME';
}

export interface OiSignal {
  symbol:      string;
  oiUsd:       number;
  oiChangePct: number;
  direction:   'SURGE' | 'DROP';
}

// ── 감지 함수 ─────────────────────────────────────────────────
export function detectFundingAnomaly(info: FundingInfo): FundingSignal | null {
  if (Math.abs(info.fundingRate) < FUNDING_THRESHOLD) return null;
  return {
    symbol:      info.symbol,
    fundingRate: info.fundingRate,
    markPrice:   info.markPrice,
    direction:   info.fundingRate > 0 ? 'LONG_EXTREME' : 'SHORT_EXTREME',
  };
}

export function detectOiSpike(snapshots: OiSnapshot[]): OiSignal | null {
  if (snapshots.length < 2) return null;
  const latest = snapshots[snapshots.length - 1];
  const prev   = snapshots[snapshots.length - 2];
  if (prev.openInterestValue === 0) return null;

  const changePct = ((latest.openInterestValue - prev.openInterestValue) / prev.openInterestValue) * 100;
  if (Math.abs(changePct) < OI_CHANGE_PCT) return null;

  return {
    symbol:      latest.symbol,
    oiUsd:       latest.openInterestValue,
    oiChangePct: changePct,
    direction:   changePct > 0 ? 'SURGE' : 'DROP',
  };
}

// ── 텔레그램 메시지 포맷 ──────────────────────────────────────
export function formatFundingAlert(sig: FundingSignal): string {
  const base     = sig.symbol.replace(/USDT$/, '');
  const pct      = (sig.fundingRate * 100).toFixed(4);
  const sign     = sig.fundingRate > 0 ? '+' : '';
  const interp   = sig.direction === 'LONG_EXTREME' ? 'Longs overheated' : 'Shorts overheated';
  const price    = sig.markPrice;
  const priceStr = price >= 1 ? price.toFixed(2) : price.toFixed(4);
  const conf     = fundingConfidence(sig.fundingRate);

  return `⚠️ Funding Extreme

🪙 ${base}

Funding
${sign}${pct}% (${interp})

Confidence
${conf.score}% (${conf.level})

💰 Price
$${priceStr}

#funding #${base.toLowerCase()}`.trim();
}

export function formatOiAlert(sig: OiSignal): string {
  const base        = sig.symbol.replace(/USDT$/, '');
  const sign        = sig.oiChangePct > 0 ? '+' : '';
  const oiStr       = sig.oiUsd >= 1_000_000
    ? `$${(sig.oiUsd / 1_000_000).toFixed(1)}M`
    : `$${(sig.oiUsd / 1_000).toFixed(0)}K`;
  const signalLabel = sig.direction === 'SURGE' ? 'Position Buildup' : 'Position Unwind';
  const conf        = oiConfidence(sig.oiChangePct);

  return `📊 OI Alert

🪙 ${base}

OI Change
${sign}${sig.oiChangePct.toFixed(2)}%

OI Size
${oiStr}

Signal
${signalLabel}

Confidence
${conf.score}% (${conf.level})

#oi #${base.toLowerCase()}`.trim();
}
