import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function isAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return false;
  const adminEmails = (process.env.ADMIN_EMAIL ?? '').split(',').map(e => e.trim()).filter(Boolean);
  return adminEmails.includes(user.email);
}

const SCAN_PATHS: Record<string, string> = {
  spot:    '/api/scan',
  futures: '/api/futures-scan',
  whale:   '/api/whale-scan',
};

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { type?: unknown };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type } = body;
  if (!type || !SCAN_PATHS[String(type)]) {
    return NextResponse.json({ error: 'Invalid type. Use: spot | futures | whale' }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bemialert.com';
  const path = SCAN_PATHS[String(type)];

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'x-cron-secret': process.env.CRON_SECRET ?? '' },
    });
    const data = await res.json();
    return NextResponse.json({ ok: res.ok, status: res.status, data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
