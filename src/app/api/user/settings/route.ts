import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';

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
    coinFilter:  userSettings?.coinFilter  ?? null,
    pumpPct:     userSettings?.pumpPct     ?? null,
    dumpPct:     userSettings?.dumpPct     ?? null,
    alertTypes:  userSettings?.alertTypes  ?? null,
    telegramLinked: !!subscriber,
    telegramUsername: subscriber?.username ?? null,
    globalParams,
  });
}

/** PATCH /api/user/settings — 내 설정 저장 */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 분당 10회 제한
  if (!rateLimit(`settings:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
  }

  let coinFilter: string | null, pumpPct: number | null, dumpPct: number | null, alertTypes: string | null;
  try {
    ({ coinFilter, pumpPct, dumpPct, alertTypes } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // alertTypes 유효성 검증
  const VALID_ALERT_TYPES = ['PUMP', 'DUMP', 'WHALE', 'FUTURES'];
  if (alertTypes != null) {
    let parsed: unknown;
    try { parsed = JSON.parse(alertTypes); } catch { parsed = null; }
    if (
      !Array.isArray(parsed) ||
      parsed.some(t => !VALID_ALERT_TYPES.includes(t as string))
    ) {
      return NextResponse.json({ error: 'alertTypes 형식이 올바르지 않습니다' }, { status: 400 });
    }
  }

  // coinFilter 유효성 검증: JSON 배열 of 문자열, 최대 50개
  if (coinFilter != null) {
    let parsed: unknown;
    try { parsed = JSON.parse(coinFilter); } catch { parsed = null; }
    if (
      !Array.isArray(parsed) ||
      parsed.length > 50 ||
      parsed.some(c => typeof c !== 'string' || !/^[A-Z0-9]{1,20}$/.test(c))
    ) {
      return NextResponse.json({ error: 'coinFilter 형식이 올바르지 않습니다' }, { status: 400 });
    }
  }

  if (pumpPct != null && (typeof pumpPct !== 'number' || pumpPct < 0.5 || pumpPct > 50)) {
    return NextResponse.json({ error: 'pumpPct는 0.5~50 범위여야 합니다' }, { status: 400 });
  }
  if (dumpPct != null && (typeof dumpPct !== 'number' || dumpPct < 0.5 || dumpPct > 50)) {
    return NextResponse.json({ error: 'dumpPct는 0.5~50 범위여야 합니다' }, { status: 400 });
  }

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {
      coinFilter:  coinFilter  ?? null,
      pumpPct:     pumpPct     ?? null,
      dumpPct:     dumpPct     ?? null,
      alertTypes:  alertTypes  ?? null,
      updatedAt:   new Date(),
    },
    create: {
      userId:      user.id,
      coinFilter:  coinFilter  ?? null,
      pumpPct:     pumpPct     ?? null,
      dumpPct:     dumpPct     ?? null,
      alertTypes:  alertTypes  ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
