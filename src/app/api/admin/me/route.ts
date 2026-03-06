import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ isAdmin: false });
  }

  const adminEmails = (process.env.ADMIN_EMAIL ?? '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);

  return NextResponse.json({ isAdmin: adminEmails.includes(user.email) });
}
