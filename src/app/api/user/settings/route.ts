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

  const [userSettings, globalRows, subscriber] = await Promise.all([
    prisma.userSettings.findUnique({ where: { userId: user.id } }),
    prisma.settings.findMany(),
    prisma.subscriber.findFirst({ where: { userId: user.id } }),
  ]);

  const globalDefaults: Record<string, string> = {
    SCAN_TOP_N: '200', SCAN_PUMP_PCT: '5', SCAN_DUMP_PCT: '5',
    SCAN_VOLUME_MULT: '2', SCAN_COOLDOWN_MINUTES: '30',
  };
  const globalParams = { ...globalDefaults };
  for (const row of globalRows) globalParams[row.key] = row.value;

  return NextResponse.json({
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
