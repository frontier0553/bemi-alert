import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

async function isAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return false;
  const adminEmails = (process.env.ADMIN_EMAIL ?? '').split(',').map(e => e.trim()).filter(Boolean);
  return adminEmails.includes(user.email);
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    telegramSubscribers,
    linkedUsers,
    signalsToday,
    futuresAlertsToday,
    whaleEventsToday,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.subscriber.count({ where: { isActive: true } }),
    prisma.subscriber.count({ where: { userId: { not: null }, isActive: true } }),
    prisma.signal.count({ where: { detectedAt: { gte: today } } }),
    prisma.futuresAlert.count({ where: { detectedAt: { gte: today } } }),
    prisma.whaleEvent.count({ where: { detectedAt: { gte: today } } }),
  ]);

  return NextResponse.json({
    totalUsers,
    telegramSubscribers,
    linkedUsers,
    signalsToday,
    futuresAlertsToday,
    whaleEventsToday,
  });
}
