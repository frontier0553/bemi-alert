// 포트원 V2 REST API 헬퍼
// docs: https://developers.portone.io/api/rest-v2

const PORTONE_API_URL = 'https://api.portone.io';

function authHeader() {
  return { Authorization: `PortOne ${process.env.PORTONE_V2_API_SECRET}` };
}

export type PaymentStatus =
  | 'READY' | 'PENDING' | 'VIRTUAL_ACCOUNT_ISSUED'
  | 'PAID' | 'FAILED' | 'PARTIAL_CANCELLED' | 'CANCELLED';

export interface PortOnePayment {
  id: string;
  status: PaymentStatus;
  amount: { total: number; currency: string };
  customer?: { id?: string; email?: string };
  billingKey?: string;
}

/** 결제 단건 조회 */
export async function getPayment(paymentId: string): Promise<PortOnePayment> {
  const res = await fetch(`${PORTONE_API_URL}/payments/${encodeURIComponent(paymentId)}`, {
    headers: authHeader(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`포트원 결제 조회 실패: ${res.status} ${text}`);
  }
  return res.json();
}

export interface BillingKeyPaymentParams {
  paymentId: string;
  billingKey: string;
  orderName: string;
  amount: number;      // 원(KRW)
  customerId: string;
  customerEmail?: string;
}

/** 빌링키 결제 실행 */
export async function payWithBillingKey(params: BillingKeyPaymentParams) {
  const body = {
    billingKey:  params.billingKey,
    orderName:   params.orderName,
    amount:      { total: params.amount },
    currency:    'KRW',
    customer:    { id: params.customerId, email: params.customerEmail },
  };

  const res = await fetch(
    `${PORTONE_API_URL}/payments/${encodeURIComponent(params.paymentId)}/billing-key`,
    {
      method:  'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`포트원 빌링키 결제 실패: ${res.status} ${text}`);
  }
  return res.json();
}

/** 빌링키 삭제 (카드 해지) */
export async function deleteBillingKey(billingKey: string) {
  const res = await fetch(`${PORTONE_API_URL}/billing-keys/${encodeURIComponent(billingKey)}`, {
    method:  'DELETE',
    headers: authHeader(),
  });
  return res.ok;
}

/** 웹훅 시그니처 검증
 *  X-PortOne-Signature 헤더 값과 raw body로 검증 */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string,
): Promise<boolean> {
  const secret = process.env.PORTONE_WEBHOOK_SECRET;
  if (!secret) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const computed = Buffer.from(signatureBytes).toString('hex');
  return computed === signature;
}
