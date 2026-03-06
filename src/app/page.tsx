'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Bell, CandlestickChart, RefreshCw, Settings2, Waves } from 'lucide-react';
import { MarketSummaryCards } from './components/MarketSummaryCards';
import { FiltersBar }         from './components/FiltersBar';
import { HistoryTable }       from './components/HistoryTable';
import type { WhaleEventRow } from './components/WhalePanel';
import { groupBySymbol, baseCoin, fmt, timeAgo } from './components/utils';
import type { FilterType, Event, Stats } from './components/types';

const LIVE_WINDOW_MS = 5 * 60 * 1000;

const QUOTE_RE = /(USDT|USDC|BUSD|FDUSD|TUSD)$/;

export default function Home() {
  const [events, setEvents]               = useState<Event[]>([]);
  const [stats, setStats]                 = useState<Stats | null>(null);
  const [filter, setFilter]               = useState<FilterType>('ALL');
  const [search, setSearch]               = useState('');
  const [groupBy, setGroupBy]             = useState(true);
  const [lastUpdated, setLastUpdated]     = useState<Date | null>(null);
  const [loading, setLoading]             = useState(true);
  const [countdown, setCountdown]         = useState(30);
  const [scannerFilter, setScannerFilter] = useState<FilterType>('ALL');
  const [whales, setWhales]               = useState<WhaleEventRow[]>([]);
  const [whalesLoading, setWhalesLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (filter !== 'ALL') params.set('type', filter);
      if (search.trim()) params.set('symbol', search.trim());
      const res  = await fetch(`/api/events?${params}`);
      const data = await res.json();
      setEvents(data.events ?? []);
      setStats(data.stats ?? null);
      setLastUpdated(new Date());
      setCountdown(30);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filter, search]);

  const fetchWhales = useCallback(async () => {
    try {
      const res  = await fetch('/api/whales');
      const data = await res.json();
      setWhales(data.whales ?? []);
    } catch (e) { console.error(e); }
    finally { setWhalesLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 30000);
    return () => clearInterval(t);
  }, [fetchData]);

  useEffect(() => {
    fetchWhales();
    const t = setInterval(fetchWhales, 60000);
    return () => clearInterval(t);
  }, [fetchWhales]);

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 0), 1000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  const now        = Date.now();
  const liveEvents = events.filter(ev => now - new Date(ev.detectedAt).getTime() < LIVE_WINDOW_MS);
  const grouped    = groupBySymbol(events);

  const uniqueBySymbol = Array.from(
    events.reduce((map, ev) => {
      if (!map.has(ev.symbol)) map.set(ev.symbol, ev);
      return map;
    }, new Map<string, Event>()).values(),
  );
  const scannerEvents = uniqueBySymbol.filter(ev =>
    scannerFilter === 'ALL' ? true : ev.type === scannerFilter,
  );

  return (
    <div className="min-h-screen bg-[#06080d] text-zinc-100">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.05),transparent_25%)]" />

      {/* ── Header ── */}
      <header className="relative z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
              <CandlestickChart className="h-4 w-4 text-cyan-300" />
            </div>
            <span className="text-base font-bold tracking-tight">Bemi Alert</span>
            {lastUpdated && (
              <span className="hidden sm:block text-xs text-zinc-600 tabular-nums">
                {lastUpdated.toLocaleTimeString('ko-KR')} · {countdown}s
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              새로고침
            </button>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <Settings2 className="h-3.5 w-3.5" />
              설정
            </Link>
            <a
              href="https://t.me/bemialert_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-sm text-cyan-300 hover:bg-cyan-400/15 transition-colors"
            >
              <Bell className="h-3.5 w-3.5" />
              알림 구독
            </a>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1400px] px-5 py-5 flex flex-col gap-5">

        {/* ── KPI Cards ── */}
        {stats
          ? <MarketSummaryCards stats={stats} liveCount={liveEvents.length} />
          : <div className="h-24 rounded-2xl border border-white/5 bg-white/5 animate-pulse" />
        }

        {/* ── 2-Column: 신호 + 고래 ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_2fr]">

          {/* ── Left: 실시간 신호 ── */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
            {/* 헤더 + 탭 */}
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-semibold">📡 실시간 신호</span>
                {liveEvents.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 text-[10px] font-bold text-red-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                    LIVE {liveEvents.length}
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                {(['ALL', 'PUMP', 'DUMP'] as FilterType[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setScannerFilter(f)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      scannerFilter === f
                        ? f === 'PUMP' ? 'bg-emerald-500/15 text-emerald-300'
                        : f === 'DUMP' ? 'bg-red-500/15 text-red-300'
                        : 'bg-white/10 text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {f === 'ALL' ? '전체' : f === 'PUMP' ? '▲ PUMP' : '▼ DUMP'}
                  </button>
                ))}
              </div>
            </div>

            {/* 목록 */}
            <div className="divide-y divide-white/[0.04] max-h-[420px] overflow-y-auto">
              {loading ? (
                <div className="py-10 text-center text-sm text-zinc-600">로딩 중...</div>
              ) : scannerEvents.length === 0 ? (
                <div className="py-10 text-center text-sm text-zinc-600">감지된 신호 없음</div>
              ) : (
                scannerEvents.map(ev => <ScannerRow key={ev.id} ev={ev} />)
              )}
            </div>
          </div>

          {/* ── Right: Whale Flow ── */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
            <div className="flex items-center gap-2.5 border-b border-white/5 px-4 py-3">
              <Waves className="h-4 w-4 text-cyan-300" />
              <span className="text-sm font-semibold">Whale Flow</span>
              <span className="text-xs text-zinc-600">상위 30 코인</span>
            </div>

            <div className="divide-y divide-white/[0.04] max-h-[420px] overflow-y-auto">
              {whalesLoading ? (
                <div className="py-10 text-center text-sm text-zinc-600">로딩 중...</div>
              ) : whales.length === 0 ? (
                <div className="py-10 text-center text-sm text-zinc-600">고래 활동 없음</div>
              ) : (
                whales.map(w => <WhaleRow key={w.id} w={w} />)
              )}
            </div>
          </div>
        </div>

        {/* ── Full-width: 감지 내역 ── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <span className="text-sm font-semibold">📋 감지 내역</span>
          </div>
          <div className="px-4 py-3 border-b border-white/5">
            <FiltersBar
              filter={filter}   onFilter={setFilter}
              search={search}   onSearch={setSearch}
              groupBy={groupBy} onGroupBy={setGroupBy}
            />
          </div>
          {loading ? (
            <div className="py-16 text-center text-sm text-zinc-600">로딩 중...</div>
          ) : events.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-600">
              {search ? `"${search}" 결과 없음` : '감지된 이벤트가 없습니다'}
            </div>
          ) : (
            <HistoryTable events={events} grouped={grouped} groupBy={groupBy} />
          )}
        </div>

      </main>
    </div>
  );
}

/* ── Signal Row ─────────────────────────────────────── */
function ScannerRow({ ev }: { ev: Event }) {
  const isPump  = ev.type === 'PUMP';
  const volMult = ev.volRatio ?? ev.volumeMult ?? 1;
  const bar     = Math.min(100, Math.round((volMult / 20) * 100));

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
      <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold border ${
        isPump
          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
          : 'border-red-500/25 bg-red-500/10 text-red-300'
      }`}>
        {isPump ? '▲' : '▼'}
      </span>
      <span className="w-16 shrink-0 font-semibold text-sm">{baseCoin(ev.symbol)}</span>
      <div className="flex-1 min-w-0">
        <div className="h-1 rounded-full bg-white/5">
          <div
            className={`h-1 rounded-full ${isPump ? 'bg-emerald-400' : 'bg-red-400'}`}
            style={{ width: `${bar}%` }}
          />
        </div>
      </div>
      <span className={`shrink-0 text-sm font-semibold tabular-nums ${isPump ? 'text-emerald-300' : 'text-red-300'}`}>
        {ev.changePct > 0 ? '+' : ''}{fmt(ev.changePct)}%
      </span>
      <span className="shrink-0 text-xs text-zinc-600 tabular-nums w-14 text-right">
        x{fmt(volMult, 1)}
      </span>
      <span className="shrink-0 text-xs text-zinc-600 w-14 text-right">{timeAgo(ev.detectedAt)}</span>
    </div>
  );
}

/* ── Whale Row ──────────────────────────────────────── */
function WhaleRow({ w }: { w: WhaleEventRow }) {
  const isBuy  = w.direction === 'BUY';
  const isMix  = w.direction === 'MIXED';
  const absScore = Math.abs(w.score);
  const heat =
    absScore >= 40 ? (isBuy ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]' : 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.7)]')
    : 'bg-amber-400';

  function fmtUsd(v: number) {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    return `$${(v / 1_000).toFixed(0)}K`;
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
      <span className={`shrink-0 h-2 w-2 rounded-full ${heat}`} />
      <span className="w-14 shrink-0 font-semibold text-sm">
        {w.symbol.replace(QUOTE_RE, '')}
      </span>
      <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold border ${
        isBuy ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
        : isMix ? 'border-amber-500/25 bg-amber-500/10 text-amber-300'
        : 'border-red-500/25 bg-red-500/10 text-red-300'
      }`}>
        {w.direction}
      </span>
      <span className="flex-1 text-sm font-semibold text-zinc-300 tabular-nums">
        {fmtUsd(w.tradeSize)}
      </span>
      <span className={`shrink-0 text-sm font-bold tabular-nums ${
        w.score > 0 ? 'text-emerald-300' : w.score < 0 ? 'text-red-300' : 'text-zinc-400'
      }`}>
        {w.score > 0 ? '+' : ''}{w.score}
      </span>
      <span className="shrink-0 text-xs text-zinc-600 w-14 text-right">{timeAgo(w.detectedAt)}</span>
    </div>
  );
}
