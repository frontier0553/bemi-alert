import { NextRequest, NextResponse } from 'next/server';
import { runScanOnce } from '@/data/scanner';
import { verifyCronSecret } from '@/lib/cron-auth';

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
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
