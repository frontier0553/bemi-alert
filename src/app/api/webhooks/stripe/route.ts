import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session    = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const record     = await prisma.stripeCustomer.findUnique({ where: { stripeCustomerId: customerId } });
      if (record) {
        await prisma.user.update({ where: { id: record.userId }, data: { tier: 'PRO' } });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub        = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const record     = await prisma.stripeCustomer.findUnique({ where: { stripeCustomerId: customerId } });
      if (record) {
        await prisma.user.update({ where: { id: record.userId }, data: { tier: 'FREE' } });
      }
    }
  } catch (err) {
    console.error('[stripe-webhook] db update error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
