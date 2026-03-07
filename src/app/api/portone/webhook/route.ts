// POST /api/portone/webhook
// 포트원 → 서버 웹훅 수신 (결제 상태 변경 알림)
// 포트원 콘솔에서 Webhook URL을 https://your-domain/api/portone/webhook 으로 설정
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPayment, verifyWebhookSignature } from '@/lib/portone';

export async function POST(req: NextRequest) {
  const rawBody  = await req.text();
  const signature = req.headers.get('x-portone-signature') ?? '';

  // 시그니처 검증 (PORTONE_WEBHOOK_SECRET 설정 시에만)
  if (process.env.PORTONE_WEBHOOK_SECRET) {
    const valid = await verifyWebhookSignature(rawBody, signature);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  }

  let payload: { type: string; data?: { paymentId?: string; billingKey?: string } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, data } = payload;
  console.log('[portone-webhook]', type, data);

  try {
    // 결제 완료: tier = PRO (confirm API와 중복될 수 있으므로 멱등성 처리)
    if (type === 'Transaction.Paid' && data?.paymentId) {
      const payment = await getPayment(data.paymentId);
      if (payment.status === 'PAID' && payment.customer?.id) {
        await prisma.user.updateMany({
          where: { id: payment.customer.id },
          data:  { tier: 'PRO' },
        });
      }
    }

    // 결제 실패 / 취소: tier = FREE
    if ((type === 'Transaction.Failed' || type === 'Transaction.Cancelled') && data?.paymentId) {
      const payment = await getPayment(data.paymentId);
      if (payment.customer?.id) {
        // 해당 구독 기록이 있으면 canceledAt 설정
        await prisma.portOneSubscription.updateMany({
          where: { userId: payment.customer.id, canceledAt: null },
          data:  { canceledAt: new Date() },
        });
        await prisma.user.updateMany({
          where: { id: payment.customer.id },
          data:  { tier: 'FREE' },
        });
      }
    }
  } catch (err) {
    console.error('[portone-webhook] DB 처리 오류:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
