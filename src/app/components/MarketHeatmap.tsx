'use client';

import { useEffect, useState, useCallback } from 'react';

interface Coin {
  symbol:    string;
  changePct: number;
  volume:    number;
  price:     number;
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
    return         { bg: '#0a1f15', color: '#4ade80' };       // ~0%
  } else {
    if (a >= 10) return { bg: '#dc2626', color: '#ffffff' };
    if (a >= 7)  return { bg: '#b91c1c', color: '#fee2e2' };
    if (a >= 5)  return { bg: '#991b1b', color: '#fca5a5' };
    if (a >= 3)  return { bg: '#7f1d1d', color: '#fca5a5' };
    if (a >= 1)  return { bg: '#3b0f0f', color: '#fca5a5' };
    return         { bg: '#1a0a0a', color: '#f87171' };       // ~0%
  }
}

/* ── 볼륨 순위별 타일 크기 ───────────────────────────────────
   - rank  0~4  (top 5)  → 2열 × 높이 88px
   - rank  5~19 (6~20위) → 1열 × 높이 72px
   - rank 20~   (21위~)  → 1열 × 높이 54px
──────────────────────────────────────────────────────────── */
function tileSize(rank: number): { colSpan: number; height: number; nameSize: number; pctSize: number } {
  if (rank < 5)  return { colSpan: 2, height: 88, nameSize: 14, pctSize: 13 };
  if (rank < 20) return { colSpan: 1, height: 72, nameSize: 12, pctSize: 11 };
  return           { colSpan: 1, height: 54, nameSize: 11, pctSize: 10 };
}

function fmtVol(v: number) {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `$${(v / 1_000_000).toFixed(0)}M`;
  return `$${(v / 1_000).toFixed(0)}K`;
}

/* ── 컴포넌트 ────────────────────────────────────────────── */
export function MarketHeatmap() {
  const [coins, setCoins]       = useState<Coin[]>([]);
  const [loading, setLoading]   = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

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

  const up   = coins.filter(c => c.changePct >= 0).length;
  const down = coins.filter(c => c.changePct <  0).length;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold">🌐 전체 시황</span>
          <span className="text-xs text-zinc-600">바이낸스 거래량 Top 60 · 24h 변동률</span>
          {!loading && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-emerald-400 font-semibold">▲ {up}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-red-400 font-semibold">▼ {down}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* 범례 */}
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
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))' }}
          >
            {coins.map((coin, rank) => {
              const { bg, color }                        = tileColor(coin.changePct);
              const { colSpan, height, nameSize, pctSize } = tileSize(rank);

              return (
                <div
                  key={coin.symbol}
                  title={`${coin.symbol}  ${coin.changePct >= 0 ? '+' : ''}${coin.changePct.toFixed(2)}%  Vol ${fmtVol(coin.volume)}`}
                  style={{
                    background: bg,
                    color,
                    gridColumn: `span ${colSpan}`,
                    minHeight:  `${height}px`,
                  }}
                  className="rounded-lg flex flex-col items-center justify-center gap-0.5 cursor-default select-none transition-transform hover:scale-[1.03]"
                >
                  <span
                    className="font-bold leading-tight truncate px-1 text-center"
                    style={{ fontSize: nameSize }}
                  >
                    {coin.symbol}
                  </span>
                  <span
                    className="tabular-nums font-semibold"
                    style={{ fontSize: pctSize }}
                  >
                    {coin.changePct >= 0 ? '+' : ''}{coin.changePct.toFixed(2)}%
                  </span>
                  {colSpan === 2 && (
                    <span className="text-[10px] opacity-60 tabular-nums mt-0.5">
                      {fmtVol(coin.volume)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
