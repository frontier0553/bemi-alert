import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULTS: Record<string, string> = {
  SCAN_TOP_N: '200',
  SCAN_PUMP_PCT: '5',
  SCAN_DUMP_PCT: '5',
  SCAN_VOLUME_MULT: '2',
  SCAN_COOLDOWN_MINUTES: '30',
};

export async function GET() {
  const rows = await prisma.settings.findMany();
  const result = { ...DEFAULTS };
  for (const row of rows) result[row.key] = row.value;
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as Record<string, string>;

  await Promise.all(
    Object.entries(body).map(([key, value]) =>
      prisma.settings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
