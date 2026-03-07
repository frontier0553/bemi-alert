// POST /api/portone/cancel
// 구독 자진 해지: 빌링키 삭제 + tier = FREE (남은 기간은 유지하지 않음)
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { deleteBillingKey } from '@/lib/portone';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sub = await prisma.portOneSubscription.findUnique({ where: { userId: user.id } });
  if (!sub) return NextResponse.json({ error: '구독 정보가 없습니다' }, { status: 404 });

  // 포트원에서 빌링키 삭제 (추가 결제 차단)
  await deleteBillingKey(sub.billingKey);

  // DB 업데이트
  await prisma.$transaction([
    prisma.portOneSubscription.update({
      where: { userId: user.id },
      data:  { canceledAt: new Date() },
    }),
    prisma.user.update({ where: { id: user.id }, data: { tier: 'FREE' } }),
  ]);

  return NextResponse.json({ ok: true });
}
