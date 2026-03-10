import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // DB에 사용자 등록 (최초 이메일 로그인 시)
  if (data.user) {
    await prisma.user.upsert({
      where:  { id: data.user.id },
      update: { email: data.user.email! },
      create: { id: data.user.id, email: data.user.email!, tier: 'FREE' },
    });
  }

  return NextResponse.json({ ok: true });
}
