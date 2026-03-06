import type { FundingInfo, OiSnapshot } from '../data/futures';

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
  const base  = sig.symbol.replace(/USDT$/, '');
  const pct   = (sig.fundingRate * 100).toFixed(4);
  const sign  = sig.fundingRate > 0 ? '+' : '';
  const label = sig.direction === 'LONG_EXTREME' ? '롱 과열 ⚠️' : '숏 과열 ⚠️';

  return `
💸 <b>펀딩비 극단</b>

💰 <b>Symbol</b>: ${base}
📊 <b>펀딩비</b>: ${sign}${pct}% (${label})
💵 <b>Mark Price</b>: $${sig.markPrice.toFixed(4)}

#funding #${base.toLowerCase()}
`.trim();
}

export function formatOiAlert(sig: OiSignal): string {
  const base  = sig.symbol.replace(/USDT$/, '');
  const pct   = sig.oiChangePct.toFixed(2);
  const sign  = sig.oiChangePct > 0 ? '+' : '';
  const icon  = sig.direction === 'SURGE' ? '📈' : '📉';
  const label = sig.direction === 'SURGE' ? '포지션 빌드업' : '포지션 청산';

  return `
${icon} <b>OI 급변</b>

💰 <b>Symbol</b>: ${base}
📊 <b>변화율</b>: ${sign}${pct}%
💵 <b>OI 규모</b>: $${(sig.oiUsd / 1_000_000).toFixed(1)}M
🔖 <b>신호</b>: ${label}

#oi #${base.toLowerCase()}
`.trim();
}
