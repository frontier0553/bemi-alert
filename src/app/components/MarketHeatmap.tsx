'use client';

import { useEffect, useState, useCallback } from 'react';
import { CoinChartModal } from './CoinChartModal';

interface Coin {
  symbol:    string;
  changePct: number;
  volume:    number;
  price:     number;
  marketCap: number | null;
}

/* ── 색상 ─────────────────────────────────────────────────── */
function tileColor(pct: number): { bg: string; color: string } {
  const a = Math.abs(pct);
  if (pct >= 0) {
    if (a >= 10) return { bg: '#059669', color: '#ffffff' };
    if (a >= 7)  return { bg: '#047857', color: '#d1fae5' };
    if (a >= 5)  return { bg: '#065f46', color: '#6ee7b7' };
    if (a >= 3)  return { bg: '#064e3b', color: '#34d399' };
    if (a >= 1)  return { bg: '#022c22', color: '#6ee7b7' };
    return         { bg: '#0a1f15', color: '#4ade80' };
  } else {
    if (a >= 10) return { bg: '#dc2626', color: '#ffffff' };
    if (a >= 7)  return { bg: '#b91c1c', color: '#fee2e2' };
    if (a >= 5)  return { bg: '#991b1b', color: '#fca5a5' };
    if (a >= 3)  return { bg: '#7f1d1d', color: '#fca5a5' };
    if (a >= 1)  return { bg: '#3b0f0f', color: '#fca5a5' };
    return         { bg: '#1a0a0a', color: '#f87171' };
  }
}

/* ── 시총 기반 타일 크기 (로그 정규화) ──────────────────────
   logRatio = (log(mc) - log(min)) / (log(max) - log(min))
   ≈ 0 → 1 사이 값. 상위 코인(BTC, ETH 등)일수록 크게.
   ────────────────────────────────────────────────────────── */
function calcTileSize(
  marketCap: number | null,
  logMax: number,
  logMin: number,
  rank: number,
): { colSpan: number; height: number; nameSize: number; pctSize: number } {
  let ratio = 0;

  if (marketCap && logMax > logMin) {
    const logMc = Math.log(marketCap);
    ratio = Math.max(0, Math.min(1, (logMc - logMin) / (logMax - logMin)));
  } else {
    // 시총 데이터 없으면 순위 기반 폴백
    ratio = rank < 5 ? 0.9 : rank < 20 ? 0.55 : 0.2;
  }

  const colSpan  = ratio >= 0.62 ? 2 : 1;                              // 상위 6~8개 → 2열
  const height   = Math.round(54 + ratio * 42);                        // 54~96px
  const nameSize = colSpan === 2 ? 14 : ratio >= 0.45 ? 12 : 11;
  const pctSize  = colSpan === 2 ? 13 : ratio >= 0.45 ? 11 : 10;

  return { colSpan, height, nameSize, pctSize };
}

function fmtCap(v: number) {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`;
  return `$${(v / 1e3).toFixed(0)}K`;
}

/* ── 컴포넌트 ────────────────────────────────────────────── */
export function MarketHeatmap() {
  const [coins, setCoins]         = useState<Coin[]>([]);
  const [loading, setLoading]     = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [selected, setSelected]   = useState<Coin | null>(null);

  const load = useCallback(async () => {
    try {
      const res  = await fetch('/api/market-heatmap');
      const data = await res.json();
      if (data.coins) {
        setCoins(data.coins);
        setUpdatedAt(new Date());
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  // 로그 정규화 기준값 사전 계산
  const mcList = coins.map(c => c.marketCap).filter(Boolean) as number[];
  const logMax = mcList.length ? Math.log(Math.max(...mcList)) : 0;
  const logMin = mcList.length ? Math.log(Math.min(...mcList)) : 0;

  const up   = coins.filter(c => c.changePct >= 0).length;
  const down = coins.filter(c => c.changePct <  0).length;
  const hasMc = mcList.length > 0;

  return (
    <>
    {selected && (
      <CoinChartModal
        symbol={selected.symbol}
        changePct={selected.changePct}
        price={selected.price}
        marketCap={selected.marketCap}
        onClose={() => setSelected(null)}
      />
    )}
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold">🌐 전체 시황</span>
          <span className="text-xs text-zinc-600">
            {hasMc ? '시총 Top 60 · 24h 변동률' : '바이낸스 Top 60 · 24h 변동률'}
          </span>
          {!loading && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-emerald-400 font-semibold">▲ {up}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-red-400 font-semibold">▼ {down}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5 text-[11px] text-zinc-600">
            {[
              { bg: '#059669', label: '+10%+' },
              { bg: '#064e3b', label: '+3%'   },
              { bg: '#0a1f15', label: '0%'    },
              { bg: '#3b0f0f', label: '-3%'   },
              { bg: '#dc2626', label: '-10%↓' },
            ].map(({ bg, label }) => (
              <span key={label} className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: bg }} />
                {label}
              </span>
            ))}
          </div>
          {updatedAt && (
            <span className="text-[11px] text-zinc-600 tabular-nums">
              {updatedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} 기준
            </span>
          )}
        </div>
      </div>

      {/* 그리드 */}
      <div className="p-3">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-sm text-zinc-600">로딩 중...</div>
        ) : (
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(52px, 12vw, 70px), 1fr))' }}
          >
            {coins.map((coin, rank) => {
              const { bg, color }                          = tileColor(coin.changePct);
              const { colSpan, height, nameSize, pctSize } = calcTileSize(coin.marketCap, logMax, logMin, rank);

              // 긴 심볼명 폰트 크기 축소 (6자 이상)
              const effectiveNameSize = coin.symbol.length > 7
                ? Math.max(8, nameSize - 3)
                : coin.symbol.length > 5
                ? Math.max(9, nameSize - 1)
                : nameSize;

              const tooltip = [
                coin.symbol,
                `${coin.changePct >= 0 ? '+' : ''}${coin.changePct.toFixed(2)}%`,
                coin.marketCap ? `시총 ${fmtCap(coin.marketCap)}` : '',
              ].filter(Boolean).join('  ');

              return (
                <div
                  key={coin.symbol}
                  title={tooltip}
                  onClick={() => setSelected(coin)}
                  style={{
                    background: bg,
                    color,
                    gridColumn: `span ${colSpan}`,
                    minHeight:  `${height}px`,
                  }}
                  className="rounded-lg flex flex-col items-center justify-center gap-0.5 cursor-pointer select-none transition-all hover:scale-[1.04] hover:brightness-125 active:scale-[0.97] overflow-hidden"
                >
                  <span
                    className="font-bold leading-tight w-full text-center px-0.5"
                    style={{ fontSize: effectiveNameSize, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {coin.symbol}
                  </span>
                  <span className="tabular-nums font-semibold" style={{ fontSize: pctSize }}>
                    {coin.changePct >= 0 ? '+' : ''}{coin.changePct.toFixed(2)}%
                  </span>
                  {/* 대형 타일에만 시총 표시 */}
                  {colSpan === 2 && coin.marketCap && (
                    <span className="text-[10px] opacity-60 tabular-nums mt-0.5">
                      {fmtCap(coin.marketCap)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
