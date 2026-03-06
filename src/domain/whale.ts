import type { AggTrade } from '../data/whales';

// ── Thresholds ───────────────────────────────────────────────
const WHALE_USD_MIN     = 100_000;    // $100K absolute minimum
const WHALE_AVG_MULT    = 20;         // OR 20× average trade size
const ACCUMULATION_N    = 5;          // 5+ whale buys in window
const DUMP_N            = 5;          // 5+ whale sells in window
const MIN_LIQUIDITY     = 1_000_000;  // 24h volume 최소 $1M (유동성 없는 코인 제외)

export interface WhaleResult {
  symbol:       string;
  score:        number;         // -100..+100
  whaleBuys:    number;
  whaleSells:   number;
  totalBuyVol:  number;         // USD
  totalSellVol: number;         // USD
  type:         'ACCUMULATION' | 'DUMP' | 'NEUTRAL';
  direction:    'BUY' | 'SELL' | 'MIXED';
  topTradeSize: number;         // largest single whale trade (USD)
  topTradePrice: number;
}

export function detectWhaleActivity(
  symbol:       string,
  trades:       AggTrade[],
  quoteVolume24h: number,       // 24h volume in USDT
): WhaleResult | null {
  if (trades.length === 0) return null;
  // 유동성 없는 코인 제외 (fake whale filter)
  if (quoteVolume24h < MIN_LIQUIDITY) return null;

  const totalQty  = trades.reduce((s, t) => s + t.quoteQty, 0);
  const avgSize   = totalQty / trades.length;

  // Whale trade: ≥$100K 절대값 OR 평균 거래의 20배 이상
  const isWhale = (t: AggTrade) =>
    t.quoteQty >= WHALE_USD_MIN || t.quoteQty >= avgSize * WHALE_AVG_MULT;

  const whaleTrades = trades.filter(isWhale);
  if (whaleTrades.length === 0) return null;

  // isBuyerMaker=false → buyer is taker → market BUY
  // isBuyerMaker=true  → seller is taker → market SELL
  const buys  = whaleTrades.filter(t => !t.isBuyerMaker);
  const sells = whaleTrades.filter(t => t.isBuyerMaker);

  const totalBuyVol  = buys.reduce((s, t)  => s + t.quoteQty, 0);
  const totalSellVol = sells.reduce((s, t) => s + t.quoteQty, 0);

  // Volume spike contribution (0..20 points)
  const totalWhaleVol = totalBuyVol + totalSellVol;
  const volSpike = avgSize > 0
    ? Math.min(20, Math.floor(totalWhaleVol / avgSize / 10))
    : 0;

  // Score: buy pressure − sell pressure + volume spike
  const raw   = (buys.length * 2) - (sells.length * 2) + volSpike;
  const score = Math.max(-100, Math.min(100, raw));

  const type: WhaleResult['type'] =
    buys.length  >= ACCUMULATION_N ? 'ACCUMULATION' :
    sells.length >= DUMP_N         ? 'DUMP' :
    'NEUTRAL';

  const direction: WhaleResult['direction'] =
    buys.length > sells.length   ? 'BUY'  :
    sells.length > buys.length   ? 'SELL' :
    'MIXED';

  // Largest single whale trade
  const top = whaleTrades.reduce((a, b) => a.quoteQty > b.quoteQty ? a : b);

  return {
    symbol,
    score,
    whaleBuys:     buys.length,
    whaleSells:    sells.length,
    totalBuyVol,
    totalSellVol,
    type,
    direction,
    topTradeSize:  top.quoteQty,
    topTradePrice: top.price,
  };
}

export function formatWhaleAlert(result: WhaleResult): string {
  const base  = result.symbol.replace(/USDT$/, '');
  const isAcc = result.type === 'ACCUMULATION';
  const isDump = result.type === 'DUMP';
  const icon  = isAcc ? '🐋' : isDump ? '🔴' : '🟡';
  const label = isAcc ? '고래 매집' : isDump ? '고래 매도' : '고래 활동';
  const sign  = result.score > 0 ? '+' : '';

  return `
${icon} <b>${label}</b>

💰 <b>Symbol</b>: ${base}
📊 <b>Score</b>: ${sign}${result.score}
🟢 <b>Buy</b>: ${result.whaleBuys}건 ($${(result.totalBuyVol / 1000).toFixed(0)}K)
🔴 <b>Sell</b>: ${result.whaleSells}건 ($${(result.totalSellVol / 1000).toFixed(0)}K)
💵 <b>최대 단건</b>: $${(result.topTradeSize / 1000).toFixed(0)}K @ $${result.topTradePrice}

#whale #${base.toLowerCase()}
`.trim();
}
