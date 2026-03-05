import { describe, it, expect } from 'vitest';
import {
  computeMetrics,
  evaluatePump,
  formatAlert,
  DEFAULT_THRESHOLDS,
  type PumpMetrics,
  type PumpResult,
} from '../domain/pump';
import type { Kline } from '../data/binance';
import { shouldSend, type CooldownState } from '../data/cooldown';

// ── Helpers ──────────────────────────────────────────────────

function makeKlines(n: number, close = 100, volume = 1000): Kline[] {
  return Array.from({ length: n }, (_, i) => ({ openTime: i * 60_000, open: close, close, volume }));
}

const baseMetrics: PumpMetrics = {
  r3: 0, r5: 0, volRatio: 1,
  closeNow: 100, close3mAgo: 100, close5mAgo: 100,
  vol1mNow: 1000, volAvg60m: 1000,
};

// ── computeMetrics ───────────────────────────────────────────

describe('computeMetrics', () => {
  it('returns null when fewer than 10 candles', () => {
    expect(computeMetrics(makeKlines(9))).toBeNull();
  });

  it('returns non-null for 60 candles', () => {
    expect(computeMetrics(makeKlines(60))).not.toBeNull();
  });

  it('computes r3 correctly (klines[n-4] = 3min ago)', () => {
    const klines = makeKlines(60, 100);
    klines[56].close = 97;   // n-4
    klines[59].close = 100;  // n-1 (current)
    const m = computeMetrics(klines)!;
    expect(m.r3).toBeCloseTo((100 / 97 - 1) * 100, 5);
  });

  it('computes r5 correctly (klines[n-6] = 5min ago)', () => {
    const klines = makeKlines(60, 100);
    klines[54].close = 95;   // n-6
    klines[59].close = 100;  // n-1
    const m = computeMetrics(klines)!;
    expect(m.r5).toBeCloseTo((100 / 95 - 1) * 100, 5);
  });

  it('computes volRatio correctly', () => {
    // 59 candles with vol=1000, last candle vol=5000
    const klines = makeKlines(60, 100, 1000);
    klines[59].volume = 5000;
    const m = computeMetrics(klines)!;
    const expectedAvg = (59 * 1000 + 5000) / 60;
    expect(m.volRatio).toBeCloseTo(5000 / expectedAvg, 4);
  });

  it('returns volRatio = 0 when average volume is 0', () => {
    const klines = makeKlines(60, 100, 0);
    const m = computeMetrics(klines)!;
    expect(m.volRatio).toBe(0);
  });

  it('r3 and r5 are 0 when all closes are equal', () => {
    const m = computeMetrics(makeKlines(60, 100))!;
    expect(m.r3).toBe(0);
    expect(m.r5).toBe(0);
  });
});

// ── evaluatePump ─────────────────────────────────────────────

describe('evaluatePump', () => {
  it('triggers when r3 >= 3.0 AND volRatio >= 3.0', () => {
    const m: PumpMetrics = { ...baseMetrics, r3: 3.5, volRatio: 4.0 };
    expect(evaluatePump(m, DEFAULT_THRESHOLDS)).not.toBeNull();
  });

  it('triggers when r5 >= 4.0 AND volRatio >= 3.0', () => {
    const m: PumpMetrics = { ...baseMetrics, r5: 4.5, volRatio: 3.5 };
    expect(evaluatePump(m, DEFAULT_THRESHOLDS)).not.toBeNull();
  });

  it('uses 3m window when r3 triggers (regardless of r5)', () => {
    const m: PumpMetrics = { ...baseMetrics, r3: 3.5, r5: 4.5, volRatio: 4.0 };
    const r = evaluatePump(m, DEFAULT_THRESHOLDS)!;
    expect(r.changeWindow).toBe('3m');
  });

  it('uses 5m window when only r5 triggers', () => {
    const m: PumpMetrics = { ...baseMetrics, r5: 4.5, volRatio: 3.5 };
    const r = evaluatePump(m, DEFAULT_THRESHOLDS)!;
    expect(r.changeWindow).toBe('5m');
  });

  it('maxMove is max(r3, r5)', () => {
    const m: PumpMetrics = { ...baseMetrics, r3: 3.0, r5: 5.5, volRatio: 4.0 };
    const r = evaluatePump(m, DEFAULT_THRESHOLDS)!;
    expect(r.maxMove).toBe(5.5);
  });

  it('does not trigger when price OK but volRatio too low', () => {
    const m: PumpMetrics = { ...baseMetrics, r3: 5.0, volRatio: 2.9 };
    expect(evaluatePump(m, DEFAULT_THRESHOLDS)).toBeNull();
  });

  it('does not trigger when volRatio OK but both r3 and r5 too low', () => {
    const m: PumpMetrics = { ...baseMetrics, r3: 2.9, r5: 3.9, volRatio: 5.0 };
    expect(evaluatePump(m, DEFAULT_THRESHOLDS)).toBeNull();
  });

  it('does not trigger when everything is 0', () => {
    expect(evaluatePump(baseMetrics, DEFAULT_THRESHOLDS)).toBeNull();
  });

  it('changePct equals r3 when 3m window', () => {
    const m: PumpMetrics = { ...baseMetrics, r3: 3.7, volRatio: 4.0 };
    const r = evaluatePump(m, DEFAULT_THRESHOLDS)!;
    expect(r.changePct).toBeCloseTo(3.7);
  });

  it('changePct equals r5 when 5m window', () => {
    const m: PumpMetrics = { ...baseMetrics, r5: 4.8, volRatio: 3.2 };
    const r = evaluatePump(m, DEFAULT_THRESHOLDS)!;
    expect(r.changePct).toBeCloseTo(4.8);
  });
});

// ── formatAlert ──────────────────────────────────────────────

describe('formatAlert', () => {
  const makeResult = (changePct: number, changeWindow: '3m' | '5m', volRatio: number): PumpResult => ({
    maxMove: changePct, changeWindow, changePct, volRatio, metrics: baseMetrics,
  });

  it('formats the canonical example correctly', () => {
    const msg = formatAlert('ETHUSDT', makeResult(4.2, '5m', 3.6));
    expect(msg).toContain('ETHUSDT');
    expect(msg).toContain('+4.2%');
    expect(msg).toContain('5m');
    expect(msg).toContain('x3.6');
    expect(msg).toContain('BEMI ALERT');
  });

  it('formats 3m window correctly', () => {
    const msg = formatAlert('BTCUSDT', makeResult(3.1, '3m', 5.0));
    expect(msg).toContain('BTCUSDT');
    expect(msg).toContain('+3.1%');
    expect(msg).toContain('3m');
    expect(msg).toContain('x5.0');
  });
});

// ── shouldSend (cooldown pure logic) ─────────────────────────

describe('shouldSend', () => {
  const COOLDOWN_MS   = 10 * 60 * 1000;
  const UPGRADE_DELTA = 2.0;

  it('allows when no existing cooldown', () => {
    expect(shouldSend(null, 5.0)).toBe(true);
  });

  it('allows when cooldown has expired', () => {
    const old: CooldownState = {
      lastSentAt:  new Date(Date.now() - COOLDOWN_MS - 1000),
      lastMaxMove: 4.0,
    };
    expect(shouldSend(old, 3.0)).toBe(true);
  });

  it('blocks within cooldown when move is not stronger enough', () => {
    const recent: CooldownState = {
      lastSentAt:  new Date(Date.now() - 5 * 60 * 1000),  // 5 min ago
      lastMaxMove: 4.0,
    };
    // newMaxMove = 5.9 → delta = 1.9 < 2.0 → block
    expect(shouldSend(recent, 5.9)).toBe(false);
  });

  it('allows upgrade within cooldown when move is >= lastMaxMove + 2.0', () => {
    const recent: CooldownState = {
      lastSentAt:  new Date(Date.now() - 5 * 60 * 1000),
      lastMaxMove: 4.0,
    };
    // newMaxMove = 6.0 → delta = 2.0 exactly → allow
    expect(shouldSend(recent, 6.0)).toBe(true);
  });

  it('allows upgrade strictly above threshold', () => {
    const recent: CooldownState = {
      lastSentAt:  new Date(Date.now() - 1 * 60 * 1000),  // 1 min ago
      lastMaxMove: 3.5,
    };
    expect(shouldSend(recent, 5.6)).toBe(true);  // 5.6 >= 3.5 + 2.0
  });

  it('nowMs parameter allows deterministic time control', () => {
    const base = 1_700_000_000_000;
    const cd: CooldownState = {
      lastSentAt:  new Date(base - 5 * 60 * 1000),
      lastMaxMove: 4.0,
    };
    // Still within cooldown, no upgrade
    expect(shouldSend(cd, 4.0, base)).toBe(false);
    // Exactly at expiry
    expect(shouldSend(cd, 4.0, base + COOLDOWN_MS - 5 * 60 * 1000 + 1)).toBe(true);
  });
});
