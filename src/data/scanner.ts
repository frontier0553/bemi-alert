import { fetchTickers } from './binance';
import { evaluatePumpDump } from '../domain/rules';
import { prisma } from '../lib/prisma';

const DEFAULTS = {
  SCAN_TOP_N: 200,
  SCAN_PUMP_PCT: 5,
  SCAN_DUMP_PCT: 5,
  SCAN_VOLUME_MULT: 2,
  SCAN_COOLDOWN_MINUTES: 30,
};

async function getSettings() {
  const rows = await prisma.settings.findMany();
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;

  const get = (key: keyof typeof DEFAULTS) =>
    Number(map[key] ?? process.env[key] ?? DEFAULTS[key]);

  return {
    topN: get('SCAN_TOP_N'),
    pumpPct: get('SCAN_PUMP_PCT'),
    dumpPct: get('SCAN_DUMP_PCT'),
    volMult: get('SCAN_VOLUME_MULT'),
    cooldown: get('SCAN_COOLDOWN_MINUTES'),
  };
}

export async function runScanOnce() {
  const settings = await getSettings();
  const tickers = await fetchTickers();
  const top = tickers.slice(0, settings.topN);

  // 평균 거래량 계산 (거래량 배수 기준선)
  const volumes = top.map((t: any) => parseFloat(t.quoteVolume));
  const avgVolume = volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length;

  const cooldownMs = settings.cooldown * 60 * 1000;
  const cutoff = new Date(Date.now() - cooldownMs);

  let detected = 0;

  for (const t of top) {
    const change = parseFloat(t.priceChangePercent);
    const volume = parseFloat(t.quoteVolume);
    const volMult = avgVolume > 0 ? volume / avgVolume : 1;

    const result = evaluatePumpDump(change, volMult, settings.pumpPct, settings.dumpPct, settings.volMult);
    if (!result) continue;

    // 쿨타임 체크 (같은 코인 중복 감지 방지)
    const recent = await prisma.event.findFirst({
      where: { symbol: t.symbol, type: result, detectedAt: { gte: cutoff } },
    });
    if (recent) continue;

    await prisma.event.create({
      data: {
        symbol: t.symbol,
        type: result,
        changePct: change,
        volumeMult: volMult,
        price: parseFloat(t.lastPrice),
      },
    });

    console.log(`[${result}] ${t.symbol} ${change > 0 ? '+' : ''}${change.toFixed(2)}% | vol x${volMult.toFixed(1)}`);
    detected++;
  }

  console.log(`[scan] ${new Date().toLocaleTimeString('ko-KR')} — ${top.length}개 스캔, ${detected}개 감지`);
}
