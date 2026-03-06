import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const alerts = await prisma.futuresAlert.findMany({
    orderBy: { detectedAt: 'desc' },
    take: 30,
  });
  return NextResponse.json({ alerts });
}
