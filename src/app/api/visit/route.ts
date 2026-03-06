import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

function todayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

async function isAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return false;
  const adminEmails = (process.env.ADMIN_EMAIL ?? '').split(',').map(e => e.trim()).filter(Boolean);
  return adminEmails.includes(user.email);
}

/** POST /api/visit — 방문 1회 기록 */
export async function POST() {
  const date = todayStr();
  await prisma.dailyVisit.upsert({
    where:  { date },
    update: { count: { increment: 1 } },
    create: { date, count: 1 },
  });
  return NextResponse.json({ ok: true });
}

/** GET /api/visit — 방문 통계 (admin only) */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await prisma.dailyVisit.findMany({
    orderBy: { date: 'desc' },
    take: 30,
  });

  const today = rows.find(r => r.date === todayStr())?.count ?? 0;
  const total = rows.reduce((s, r) => s + r.count, 0);
  const week  = rows.slice(0, 7).reduce((s, r) => s + r.count, 0);

  return NextResponse.json({ today, week, total, rows });
}
