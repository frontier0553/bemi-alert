import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

async function getSessionUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** GET /api/user/settings — 내 설정 + 글로벌 파라미터 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [userRecord, userSettings, globalRows, subscriber] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id } }),
    prisma.userSettings.findUnique({ where: { userId: user.id } }),
    prisma.settings.findMany(),
    prisma.subscriber.findFirst({ where: { userId: user.id } }),
  ]);

  const tier = userRecord?.tier ?? 'FREE';

  const globalDefaults: Record<string, string> = {
    SCAN_TOP_N: '200', SCAN_PUMP_PCT: '5', SCAN_DUMP_PCT: '5',
    SCAN_VOLUME_MULT: '2', SCAN_COOLDOWN_MINUTES: '30',
  };
  const globalParams = { ...globalDefaults };
  for (const row of globalRows) globalParams[row.key] = row.value;

  return NextResponse.json({
    tier,
    coinFilter: userSettings?.coinFilter ?? null,
    pumpPct:    userSettings?.pumpPct    ?? null,
    dumpPct:    userSettings?.dumpPct    ?? null,
    telegramLinked: !!subscriber,
    telegramUsername: subscriber?.username ?? null,
    globalParams,
  });
}

/** PATCH /api/user/settings — 내 설정 저장 */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { coinFilter, pumpPct, dumpPct } = await req.json();

  // pumpPct/dumpPct 변경은 PRO 전용
  if ((pumpPct != null || dumpPct != null)) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (dbUser?.tier !== 'PRO') {
      return NextResponse.json({ error: 'PRO 플랜 전용 기능입니다' }, { status: 403 });
    }
  }

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {
      coinFilter: coinFilter ?? null,
      pumpPct:    pumpPct != null ? parseFloat(pumpPct) : null,
      dumpPct:    dumpPct != null ? parseFloat(dumpPct) : null,
      updatedAt:  new Date(),
    },
    create: {
      userId:     user.id,
      coinFilter: coinFilter ?? null,
      pumpPct:    pumpPct != null ? parseFloat(pumpPct) : null,
      dumpPct:    dumpPct != null ? parseFloat(dumpPct) : null,
    },
  });

  return NextResponse.json({ ok: true });
}
