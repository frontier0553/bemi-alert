// GET /api/billing — 현재 구독 상태 조회
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [dbUser, sub] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id } }),
    prisma.portOneSubscription.findUnique({ where: { userId: user.id } }),
  ]);

  const tier      = dbUser?.tier ?? 'FREE';
  const expiresAt = sub?.expiresAt ?? null;
  const canceled  = !!sub?.canceledAt;

  return NextResponse.json({ tier, expiresAt, canceled });
}
