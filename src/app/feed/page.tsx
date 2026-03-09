'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Zap, ArrowRight, RefreshCw } from 'lucide-react';

const QUOTE_RE = /(USDT|USDC|BUSD|FDUSD|TUSD)$/;
function baseCoin(symbol: string) { return symbol.replace(QUOTE_RE, ''); }
function timeAgo(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return `${s}초 전`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 전`;
  return `${Math.floor(m / 60)}시간 전`;
}

interface Signal {
  id: string;
  symbol: string;
  type: 'PUMP' | 'DUMP';
  changePct: number;
  volumeMult: number;
  price: number;
  detectedAt: string;
}

interface Stats {
  todayTotal: number;
  todayPumps: number;
  todayDumps: number;
}

export default function FeedPage() {
  const [signals, setSignals]   = useState<Signal[]>([]);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [spinning, setSpinning] = useState(false);

  const fetchData = useCallback(async () => {
    setSpinning(true);
    try {
      const res  = await fetch('/api/events?limit=50');
      const data = await res.json();
      setSignals(data.events ?? []);
      setStats(data.stats ?? null);
      setLastUpdated(new Date());
    } finally {
      setTimeout(() => setSpinning(false), 500);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-[#06080d] text-zinc-100">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.04),transparent_30%)]" />

      {/* 헤더 */}
      <header className="relative z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
              <Zap className="h-3.5 w-3.5 text-cyan-300" />
            </div>
            <span className="text-sm font-bold tracking-tight">Bemi Alert</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${spinning ? 'animate-spin' : ''}`} />
              {lastUpdated ? lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
            </button>
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/90 hover:bg-cyan-400 text-black text-xs font-semibold transition-colors"
            >
              텔레그램 알림 받기 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-4xl px-5 py-8">

        {/* 통계 */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: '오늘 감지', value: stats.todayTotal, color: 'text-cyan-300' },
              { label: 'PUMP', value: stats.todayPumps, color: 'text-emerald-300' },
              { label: 'DUMP', value: stats.todayDumps, color: 'text-red-300' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-center">
                <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* 타이틀 */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-sm font-semibold text-zinc-200">실시간 감지 신호</h1>
            <p className="text-[11px] text-zinc-600 mt-0.5">30초마다 자동 갱신 · 최근 50건</p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-cyan-400">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            LIVE
          </div>
        </div>

        {/* 테이블 */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] overflow-hidden">
          <div className="overflow-x-auto">
            {/* 헤더 */}
            <div className="grid grid-cols-[160px_80px_80px_88px_80px] items-center gap-x-2 border-b border-white/5 bg-black/20 px-4 py-2 text-[11px] font-semibold tracking-wider text-zinc-500 min-w-[488px]">
              <span>타입 / 심볼</span>
              <span>변동폭</span>
              <span>거래량</span>
              <span>현재가</span>
              <span className="text-right">시각</span>
            </div>

            {/* 행 */}
            <div className="divide-y divide-white/[0.04]">
              {signals.length === 0 ? (
                <div className="py-16 text-center text-sm text-zinc-600">감지된 신호가 없습니다</div>
              ) : signals.map(s => {
                const isPump = s.type === 'PUMP';
                const badgeCls = isPump
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                  : 'border-red-500/25 bg-red-500/10 text-red-300';
                const coin = baseCoin(s.symbol);
                const tvUrl = `https://www.tradingview.com/chart/?symbol=BINANCE:${s.symbol}`;
                return (
                  <div key={s.id} className="grid grid-cols-[160px_80px_80px_88px_80px] items-center gap-x-2 px-4 py-2.5 hover:bg-white/[0.03] transition-colors min-w-[488px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold border ${badgeCls}`}>
                        {isPump ? '▲ PUMP' : '▼ DUMP'}
                      </span>
                      <a
                        href={tvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-sm text-zinc-100 truncate hover:text-cyan-300 transition-colors"
                      >
                        {coin}
                      </a>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${isPump ? 'text-emerald-300' : 'text-red-300'}`}>
                      {isPump ? '+' : ''}{s.changePct.toFixed(1)}%
                    </span>
                    <span className="text-sm text-zinc-300">x{s.volumeMult.toFixed(1)}</span>
                    <span className="text-sm tabular-nums text-zinc-500">
                      ${s.price >= 1 ? s.price.toFixed(2) : s.price.toFixed(4)}
                    </span>
                    <span className="text-xs text-zinc-600 tabular-nums text-right">{timeAgo(s.detectedAt)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CTA 배너 */}
        <div className="mt-6 rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">텔레그램으로 즉시 알림 받기</div>
            <div className="text-xs text-zinc-500 mt-0.5">신호 감지 즉시 텔레그램으로 전송됩니다. 무료.</div>
          </div>
          <Link
            href="/login"
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-semibold transition-colors"
          >
            무료 시작 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

      </main>
    </div>
  );
}
