import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

const DEFAULTS: Record<string, string> = {
  SCAN_TOP_N: '200',
  SCAN_PUMP_PCT: '5',
  SCAN_DUMP_PCT: '5',
  SCAN_VOLUME_MULT: '2',
  SCAN_COOLDOWN_MINUTES: '30',
};

// 허용된 키와 유효 범위
const BOUNDS: Record<string, [number, number]> = {
  SCAN_TOP_N:            [10,  500],
  SCAN_PUMP_PCT:         [1,   50],
  SCAN_DUMP_PCT:         [1,   50],
  SCAN_VOLUME_MULT:      [0.5, 20],
  SCAN_COOLDOWN_MINUTES: [1,   1440],
};

async function isAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return false;
  const adminEmails = (process.env.ADMIN_EMAIL ?? '').split(',').map(e => e.trim()).filter(Boolean);
  return adminEmails.includes(user.email);
}

export async function GET() {
  const rows = await prisma.settings.findMany();
  const result = { ...DEFAULTS };
  for (const row of rows) result[row.key] = row.value;
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as Record<string, unknown>;

  // 허용된 키만, 범위 내 값만 통과
  const validated: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(body)) {
    if (!BOUNDS[key]) continue;
    const num = parseFloat(String(rawValue));
    if (isNaN(num)) continue;
    const [min, max] = BOUNDS[key];
    validated[key] = String(Math.min(Math.max(num, min), max));
  }

  if (Object.keys(validated).length === 0) {
    return NextResponse.json({ error: 'No valid parameters' }, { status: 400 });
  }

  await Promise.all(
    Object.entries(validated).map(([key, value]) =>
      prisma.settings.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
