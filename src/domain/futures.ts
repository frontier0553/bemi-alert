import type { FundingInfo, OiSnapshot } from '../data/futures';
import { fundingConfidence, oiConfidence } from './confidence';
import { confLevelKo } from './pump';

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
export function formatFundingAlert(sig: FundingSignal, lang: 'ko' | 'en' = 'ko'): string {
  const base     = sig.symbol.replace(/USDT$/, '');
  const pct      = (sig.fundingRate * 100).toFixed(4);
  const sign     = sig.fundingRate > 0 ? '+' : '';
  const price    = sig.markPrice;
  const priceStr = price >= 1 ? price.toFixed(2) : price.toFixed(4);
  const conf     = fundingConfidence(sig.fundingRate);

  if (lang === 'ko') {
    const interp = sig.direction === 'LONG_EXTREME' ? '롱 과열' : '숏 과열';
    return `⚠️ 펀딩비율 이상

🪙 ${base}

펀딩비율
${sign}${pct}% (${interp})

신뢰도
${conf.score}% (${confLevelKo(conf.level)})

💰 가격
$${priceStr}

#펀딩 #${base.toLowerCase()}`.trim();
  }

  const interp = sig.direction === 'LONG_EXTREME' ? 'Longs overheated' : 'Shorts overheated';
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

export function formatOiAlert(sig: OiSignal, lang: 'ko' | 'en' = 'ko'): string {
  const base   = sig.symbol.replace(/USDT$/, '');
  const sign   = sig.oiChangePct > 0 ? '+' : '';
  const oiStr  = sig.oiUsd >= 1_000_000
    ? `$${(sig.oiUsd / 1_000_000).toFixed(1)}M`
    : `$${(sig.oiUsd / 1_000).toFixed(0)}K`;
  const conf   = oiConfidence(sig.oiChangePct);

  if (lang === 'ko') {
    const signalLabel = sig.direction === 'SURGE' ? '포지션 증가' : '포지션 감소';
    return `📊 OI 급변

🪙 ${base}

변화율
${sign}${sig.oiChangePct.toFixed(2)}%

OI 규모
${oiStr}

신호
${signalLabel}

신뢰도
${conf.score}% (${confLevelKo(conf.level)})

#oi #${base.toLowerCase()}`.trim();
  }

  const signalLabel = sig.direction === 'SURGE' ? 'Position Buildup' : 'Position Unwind';
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
