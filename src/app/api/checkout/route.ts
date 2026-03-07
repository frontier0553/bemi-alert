import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const PRICE_ID  = process.env.STRIPE_PRICE_ID!;
const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Stripe 고객 조회 또는 생성
  let stripeCustomerId: string;
  const existing = await prisma.stripeCustomer.findUnique({ where: { userId: user.id } });

  if (existing) {
    stripeCustomerId = existing.stripeCustomerId;
  } else {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { userId: user.id },
    });
    await prisma.stripeCustomer.create({
      data: { userId: user.id, stripeCustomerId: customer.id },
    });
    stripeCustomerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer:             stripeCustomerId,
    mode:                 'subscription',
    payment_method_types: ['card'],
    line_items:           [{ price: PRICE_ID, quantity: 1 }],
    success_url:          `${SITE_URL}/pricing?success=1`,
    cancel_url:           `${SITE_URL}/pricing?cancel=1`,
  });

  return NextResponse.json({ url: session.url });
}
