import type { Event, GroupedSymbol } from './types';

const QUOTE_RE = /(USDT|USDC|BUSD|FDUSD|TUSD|DAI|BTC|ETH|BNB|XRP|TRX|TRY|EUR|GBP|AUD|BRL|RUB|UAH|PLN|RON|ZAR)$/;

export function baseCoin(symbol: string): string {
  return symbol.replace(QUOTE_RE, '');
}

export function fmt(v: number, digits = 2): string {
  return v.toFixed(digits);
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}초 전`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

export function signalStrength(volumeMult: number, changePct: number): number {
  const volScore = volumeMult >= 10 ? 3 : volumeMult >= 5 ? 2 : volumeMult >= 2 ? 1 : 0;
  const chgScore = Math.abs(changePct) >= 15 ? 2 : Math.abs(changePct) >= 7 ? 1 : 0;
  return Math.max(1, Math.min(5, volScore + chgScore));
}

export function volAboveAvg(volumeMult: number): string {
  const pct = Math.round((volumeMult - 1) * 100);
  return `평균 대비 +${pct}%`;
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(price < 1 ? 6 : 2)}`;
}

export function groupBySymbol(events: Event[]): GroupedSymbol[] {
  const map = new Map<string, GroupedSymbol>();
  for (const ev of events) {
    const g = map.get(ev.symbol);
    if (!g) {
      map.set(ev.symbol, {
        symbol: ev.symbol,
        dominantType: ev.type,
        count: 1,
        pumpCount: ev.type === 'PUMP' ? 1 : 0,
        dumpCount: ev.type === 'DUMP' ? 1 : 0,
        latest: ev,
        strongest: ev,
      });
    } else {
      g.count++;
      if (ev.type === 'PUMP') g.pumpCount++;
      else g.dumpCount++;
      if (Math.abs(ev.changePct) > Math.abs(g.strongest.changePct)) g.strongest = ev;
      g.dominantType =
        g.pumpCount > 0 && g.dumpCount > 0 ? 'BOTH' :
        g.pumpCount > g.dumpCount ? 'PUMP' : 'DUMP';
    }
  }
  return Array.from(map.values());
}
