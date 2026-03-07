// ── Confidence Score Utility ─────────────────────────────────
// Converts raw signal strength into a 0–100 score + Low/Medium/High label.

export interface ConfidenceResult {
  score: number;
  level: 'Low' | 'Medium' | 'High';
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function toLevel(score: number): 'Low' | 'Medium' | 'High' {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

/**
 * PUMP / DUMP confidence
 * Price move  : 3% = 0 pts, 10% = 60 pts  (weight 60%)
 * Volume ratio: 3× = 0 pts, 10× = 40 pts  (weight 40%)
 */
export function pumpConfidence(changePct: number, volRatio: number): ConfidenceResult {
  const priceScore = clamp((Math.abs(changePct) - 3) / 7 * 60, 0, 60);
  const volScore   = clamp((volRatio - 3) / 7 * 40, 0, 40);
  const score      = Math.round(priceScore + volScore);
  return { score, level: toLevel(score) };
}

/**
 * Whale confidence — raw score is already −100..+100,
 * map absolute value directly to 0–100.
 */
export function whaleConfidence(rawScore: number): ConfidenceResult {
  const score = Math.min(Math.round(Math.abs(rawScore)), 100);
  return { score, level: toLevel(score) };
}

/**
 * Funding rate confidence
 * Threshold = 0.1% (0.001). At threshold → 50 pts, at 2× threshold → 100 pts.
 */
export function fundingConfidence(fundingRate: number): ConfidenceResult {
  const score = Math.round(clamp(Math.abs(fundingRate) / 0.001 * 50, 0, 100));
  return { score, level: toLevel(score) };
}

/**
 * OI change confidence
 * Threshold = 3%. At threshold → 50 pts, at 6% → 100 pts.
 */
export function oiConfidence(oiChangePct: number): ConfidenceResult {
  const score = Math.round(clamp(Math.abs(oiChangePct) / 3 * 50, 0, 100));
  return { score, level: toLevel(score) };
}
