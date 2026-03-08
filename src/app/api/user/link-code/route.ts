import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

/** POST /api/user/link-code — 텔레그램 연동 코드 생성 (10분 유효) */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 1분 이내 재발급 제한
  const existing = await prisma.user.findUnique({ where: { id: user.id }, select: { linkCodeExp: true } });
  if (existing?.linkCodeExp && existing.linkCodeExp > new Date(Date.now() + 9 * 60 * 1000)) {
    return NextResponse.json({ error: '1분 후 다시 시도해주세요' }, { status: 429 });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6자리
  const exp  = new Date(Date.now() + 10 * 60 * 1000); // 10분 후

  await prisma.user.update({
    where: { id: user.id },
    data: { linkCode: code, linkCodeExp: exp },
  });

  return NextResponse.json({ code, expiresAt: exp.toISOString() });
}
