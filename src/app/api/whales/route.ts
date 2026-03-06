import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const whales = await prisma.whaleEvent.findMany({
    orderBy: { detectedAt: 'desc' },
    take: 30,
  });
  return NextResponse.json({ whales });
}
