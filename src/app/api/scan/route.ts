import { NextRequest, NextResponse } from 'next/server';
import { runScanOnce } from '@/data/scanner';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await runScanOnce();
    return NextResponse.json({ ok: true, time: new Date().toISOString() });
  } catch (e) {
    console.error('[scan] error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
