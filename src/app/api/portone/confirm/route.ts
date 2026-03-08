// POST /api/portone/confirm
// 클라이언트에서 빌링키 발급 완료 후 호출 → 즉시 결제 실행 + tier = PRO
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { getPayment, payWithBillingKey } from '@/lib/portone';

const PLAN_AMOUNT   = 9_900;   // 월 구독 금액 (KRW)
const PLAN_MONTHS   = 1;       // 결제 주기 (개월)

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { billingKey?: unknown; paymentId?: unknown; pgProvider?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { billingKey, paymentId, pgProvider } = body;
  if (typeof billingKey !== 'string' || typeof paymentId !== 'string' || !billingKey || !paymentId) {
    return NextResponse.json({ error: 'billingKey, paymentId 필요' }, { status: 400 });
  }
  if (!/^[A-Za-z0-9_\-]{4,200}$/.test(paymentId)) {
    return NextResponse.json({ error: '잘못된 paymentId 형식' }, { status: 400 });
  }

  // 이미 PRO인 경우 결제 불필요
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser?.tier === 'PRO') {
    return NextResponse.json({ ok: true, already: true });
  }

  // 빌링키로 즉시 결제
  try {
    await payWithBillingKey({
      paymentId,
      billingKey,
      orderName:     'Bemi Alert PRO 구독',
      amount:        PLAN_AMOUNT,
      customerId:    user.id,
      customerEmail: user.email ?? undefined,
    });
  } catch (err) {
    console.error('[portone/confirm] 결제 실패:', err);
    return NextResponse.json({ error: '결제 처리 중 오류가 발생했습니다' }, { status: 402 });
  }

  // 결제 상태 검증
  const payment = await getPayment(paymentId);
  if (payment.status !== 'PAID') {
    return NextResponse.json({ error: `결제 미완료: ${payment.status}` }, { status: 402 });
  }

  // 만료일 = 오늘 + 1개월
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + PLAN_MONTHS);

  // 구독 정보 저장 + tier 업데이트
  await prisma.$transaction([
    prisma.portOneSubscription.upsert({
      where:  { userId: user.id },
      update: { billingKey, pgProvider: typeof pgProvider === 'string' ? pgProvider : null, expiresAt, canceledAt: null, startedAt: new Date() },
      create: { userId: user.id, billingKey, pgProvider: typeof pgProvider === 'string' ? pgProvider : null, expiresAt },
    }),
    prisma.user.update({ where: { id: user.id }, data: { tier: 'PRO' } }),
  ]);

  return NextResponse.json({ ok: true, expiresAt });
}
