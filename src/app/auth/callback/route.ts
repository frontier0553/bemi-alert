import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // 최초 로그인 시 DB에 사용자 등록
      await prisma.user.upsert({
        where:  { id: data.user.id },
        update: { email: data.user.email! },
        create: { id: data.user.id, email: data.user.email!, tier: 'FREE' },
      });
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
  return NextResponse.redirect(`${siteUrl}/dashboard`);
}
