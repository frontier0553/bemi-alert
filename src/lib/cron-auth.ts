import { NextRequest } from 'next/server';

/**
 * Vercel Cron: Authorization: Bearer {CRON_SECRET}
 * 수동 호출: x-cron-secret: {CRON_SECRET}
 */
export function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  // Vercel Cron 방식
  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${secret}`) return true;

  // 수동 호출 방식 (기존 호환)
  const xSecret = req.headers.get('x-cron-secret');
  if (xSecret === secret) return true;

  return false;
}
