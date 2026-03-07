import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY!);
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  const tier   = dbUser?.tier ?? 'FREE';

  let portalUrl: string | null = null;
  if (tier === 'PRO') {
    const sc = await prisma.stripeCustomer.findUnique({ where: { userId: user.id } });
    if (sc) {
      const session = await stripe.billingPortal.sessions.create({
        customer:   sc.stripeCustomerId,
        return_url: `${SITE_URL}/user/settings`,
      });
      portalUrl = session.url;
    }
  }

  return NextResponse.json({ tier, portalUrl });
}
