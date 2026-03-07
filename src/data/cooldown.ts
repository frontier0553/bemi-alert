import { prisma } from '../lib/prisma';

const COOLDOWN_MS      = 10 * 60 * 1000;  // 10 minutes
const UPGRADE_DELTA    = 2.0;             // +2% stronger than last alert

// ── Pure logic (DB-free, testable) ──────────────────────────

export interface CooldownState {
  lastSentAt:  Date;
  lastMaxMove: number;
}

/**
 * Returns true when a new alert should be sent.
 * Rules:
 *   1. No existing cooldown → allow
 *   2. Cooldown expired (>= 10 min) → allow
 *   3. Within cooldown but new move is >= lastMaxMove + 2.0 → allow (upgrade)
 *   4. Otherwise → block
 */
export function shouldSend(
  existing: CooldownState | null,
  newMaxMove: number,
  nowMs = Date.now(),
): boolean {
  if (!existing) return true;
  const elapsed = nowMs - existing.lastSentAt.getTime();
  if (elapsed >= COOLDOWN_MS) return true;
  if (newMaxMove >= existing.lastMaxMove + UPGRADE_DELTA) return true;
  return false;
}

// ── DB-aware wrappers ────────────────────────────────────────

export async function checkCooldown(symbol: string, newMaxMove: number, type: 'PUMP' | 'DUMP' = 'PUMP'): Promise<boolean> {
  const cd = await prisma.cooldown.findUnique({ where: { symbol_type: { symbol, type } } });
  return shouldSend(cd, newMaxMove);
}

export async function updateCooldown(symbol: string, maxMove: number, type: 'PUMP' | 'DUMP' = 'PUMP'): Promise<void> {
  await prisma.cooldown.upsert({
    where:  { symbol_type: { symbol, type } },
    update: { lastSentAt: new Date(), lastMaxMove: maxMove },
    create: { symbol, type, lastSentAt: new Date(), lastMaxMove: maxMove },
  });
}
