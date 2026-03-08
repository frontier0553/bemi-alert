import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const adminEmails = (process.env.ADMIN_EMAIL ?? '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);

  return adminEmails.includes(user.email) ? user : null;
}

/** GET /api/admin/users ???꾩껜 ?좎? 紐⑸줉 */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users);
}

/** PATCH /api/admin/users ???좎? tier 蹂寃?*/
export async function PATCH(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { id, tier } = body;
  if (typeof id !== 'string' || !id || !['FREE', 'PRO'].includes(String(tier))) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  }

  const updated = await prisma.user.update({ where: { id }, data: { tier: String(tier) } });
  return NextResponse.json(updated);
}
