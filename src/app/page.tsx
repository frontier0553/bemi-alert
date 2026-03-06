'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Bell, CandlestickChart, Filter, Flame, Search, Settings2, TriangleAlert } from 'lucide-react';
import { MarketSummaryCards } from './components/MarketSummaryCards';
import { FiltersBar }         from './components/FiltersBar';
import { HistoryTable }       from './components/HistoryTable';
import { WhalePanel }         from './components/WhalePanel';
import type { WhaleEventRow } from './components/WhalePanel';
import { groupBySymbol, baseCoin, fmt, timeAgo, signalStrength } from './components/utils';
import type { FilterType, Event, Stats } from './components/types';

const LIVE_WINDOW_MS = 5 * 60 * 1000;

const RULES = [
  {
    title: 'Pump Detection',
    desc:  '3분 +3% 또는 5분 +4% · 거래량 3x 이상',
    tone:  'emerald',
  },
  {
    title: 'Fake Pump Filter',
    desc:  '유동성 5M USDT 이상 · 최근 3캔들 중 2개 이상 양봉',
    tone:  'red',
  },
  {
    title: '쿨다운 10분',
    desc:  '같은 코인 10분 내 중복 차단 · +2% 추가 상승 시 재발송',
    tone:  'cyan',
  },
];

const MEMO = [
  'USDT 페어만 스캔 — 상위 200개 거래대금 기준',
  '펌프 감지 즉시 텔레그램 구독자에게 자동 전송',
  '쿨다운으로 같은 코인 도배 방지',
  '텔레그램 /start 로 알림 구독, /stop 으로 해제',
];

export default function Home() {
  const [events, setEvents]           = useState<Event[]>([]);
  const [stats, setStats]             = useState<Stats | null>(null);
  const [filter, setFilter]           = useState<FilterType>('ALL');
  const [search, setSearch]           = useState('');
  const [groupBy, setGroupBy]         = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading]         = useState(true);
  const [countdown, setCountdown]     = useState(30);
  const [scannerFilter, setScannerFilter] = useState<FilterType>('ALL');
  const [whales, setWhales]           = useState<WhaleEventRow[]>([]);
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  const fetchWhales = useCallback(async () => {
    try {
      const res  = await fetch('/api/whales');
      const data = await res.json();
      setWhales(data.whales ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setWhalesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    fetchWhales();
    const interval = setInterval(fetchWhales, 60000);
    return () => clearInterval(interval);
  }, [fetchWhales]);

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  const now        = Date.now();
  const liveEvents = events.filter(ev => now - new Date(ev.detectedAt).getTime() < LIVE_WINDOW_MS);
  const grouped    = groupBySymbol(events);

  // 심볼별 최신 1개만 — scanner 중복 제거
  const uniqueBySymbol = Array.from(
    events.reduce((map, ev) => {
      if (!map.has(ev.symbol)) map.set(ev.symbol, ev);
      return map;
    }, new Map<string, Event>()).values()
  );
  const scannerEvents = uniqueBySymbol.filter(ev =>
    scannerFilter === 'ALL' ? true : ev.type === scannerFilter,
  );

  return (
    <div className="min-h-screen bg-[#06080d] text-zinc-100">
      {/* bg gradient */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.06),transparent_25%),radial-gradient(circle_at_right,rgba(16,185,129,0.04),transparent_20%)]" />

      {/* ── Header ── */}
      <header className="relative z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6 lg:py-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
              <CandlestickChart className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Crypto Scanner</div>
              <h1 className="text-lg font-semibold leading-tight">Bemi Alert</h1>
            </div>
          </div>

          {/* Center: search */}
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 lg:w-72">
            <Search className="h-4 w-4 shrink-0 text-zinc-500" />
            <input
              className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-500"
              placeholder="코인 검색 (BTC, ETH...)"
              value={search}
              onChange={e => setSearch(e.target.value.toUpperCase())}
            />
          </div>

          {/* Right: nav + actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {lastUpdated && (
              <span className="hidden sm:block text-xs text-zinc-500 tabular-nums">
                {lastUpdated.toLocaleTimeString('ko-KR')} · {countdown}s
              </span>
            )}
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-zinc-300 hover:bg-white/10 transition-colors"
            >
              <Filter className="h-4 w-4" />
              새로고침
            </button>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-zinc-300 hover:bg-white/10 transition-colors"
            >
              <Settings2 className="h-4 w-4" />
              설정
            </Link>
            <a
              href="https://t.me/bemialert_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-2 text-sm text-cyan-300 hover:bg-cyan-400/15 transition-colors"
            >
              <Bell className="h-4 w-4" />
              알림 구독
            </a>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1600px] px-4 py-5 lg:px-6 flex flex-col gap-5">

        {/* ── Summary Cards ── */}
        {stats
          ? <MarketSummaryCards stats={stats} liveCount={liveEvents.length} />
          : <div className="h-28 rounded-[24px] border border-white/10 bg-white/5 animate-pulse" />
        }

        {/* ── 3-Column Layout ── */}
        <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[300px_minmax(0,1fr)_280px]">

          {/* ── Left: Scanner Panel ── */}
          <aside className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
            <div className="border-b border-white/5 px-4 py-4">
              <div>
                <h2 className="text-base font-semibold">실시간 스캐너</h2>
                <p className="mt-1 text-xs text-zinc-500">최근 감지된 신호 목록</p>
              </div>
              {/* Filter tabs */}
              <div className="mt-3 grid grid-cols-3 gap-1.5 text-xs">
                {(['ALL', 'PUMP', 'DUMP'] as FilterType[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setScannerFilter(f)}
                    className={`rounded-xl px-2 py-2 font-medium transition-colors ${
                      scannerFilter === f
                        ? f === 'PUMP' ? 'bg-emerald-500/15 text-emerald-300'
                        : f === 'DUMP' ? 'bg-red-500/15 text-red-300'
                        : 'bg-white/10 text-white'
                        : 'bg-white/5 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {f === 'ALL' ? '전체' : f === 'PUMP' ? '▲ PUMP' : '▼ DUMP'}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[600px] overflow-auto divide-y divide-white/5">
              {loading ? (
                <div className="py-12 text-center text-sm text-zinc-500">로딩 중...</div>
              ) : scannerEvents.length === 0 ? (
                <div className="py-12 text-center text-sm text-zinc-500">감지된 신호 없음</div>
              ) : (
                scannerEvents.map(ev => (
                  <ScannerItem key={ev.id} ev={ev} />
                ))
              )}
            </div>
          </aside>

          {/* ── Center: Alert Log ── */}
          <section className="flex flex-col gap-4">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 lg:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">감지 내역 로그</h2>
                  <p className="mt-1 text-xs text-zinc-500">최근 감지 이벤트 전체 목록</p>
                </div>
                {liveEvents.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-xs font-bold text-red-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                    LIVE {liveEvents.length}
                  </span>
                )}
              </div>

              <FiltersBar
                filter={filter}   onFilter={setFilter}
                search={search}   onSearch={setSearch}
                groupBy={groupBy} onGroupBy={setGroupBy}
              />
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 overflow-hidden">
              {loading ? (
                <div className="py-16 text-center text-sm text-zinc-500">로딩 중...</div>
              ) : events.length === 0 ? (
                <div className="py-16 text-center text-sm text-zinc-500">
                  {search ? `"${search}" 결과 없음` : '감지된 이벤트가 없습니다'}
                </div>
              ) : (
                <HistoryTable events={events} grouped={grouped} groupBy={groupBy} />
              )}
            </div>
          </section>

          {/* ── Right: Rules + Memo ── */}
          <aside className="space-y-4">
            {/* Detection Engine */}
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">감지 엔진</h2>
                  <p className="mt-1 text-xs text-zinc-500">현재 적용 규칙</p>
                </div>
                <Settings2 className="h-4 w-4 text-zinc-500" />
              </div>
              <div className="space-y-2.5">
                {RULES.map(rule => (
                  <div
                    key={rule.title}
                    className={`rounded-[20px] border p-3 text-sm ${
                      rule.tone === 'emerald'
                        ? 'border-emerald-500/15 bg-emerald-500/5 text-emerald-300'
                        : rule.tone === 'red'
                        ? 'border-red-500/15 bg-red-500/5 text-red-300'
                        : 'border-cyan-500/15 bg-cyan-500/5 text-cyan-300'
                    }`}
                  >
                    <div className="font-semibold">{rule.title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-zinc-400">{rule.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategy Memo */}
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <div className="mb-4">
                <h2 className="text-base font-semibold">운영 가이드</h2>
                <p className="mt-1 text-xs text-zinc-500">실전 운영 메모</p>
              </div>
              <div className="space-y-2">
                {MEMO.map(note => (
                  <div key={note} className="rounded-2xl bg-black/20 px-3 py-2.5 text-xs leading-relaxed text-zinc-400">
                    {note}
                  </div>
                ))}
              </div>
            </div>

            {/* Alert Channels */}
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">알림 채널</h2>
                <Bell className="h-4 w-4 text-zinc-500" />
              </div>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Telegram Bot', active: true },
                  { label: 'Web Dashboard', active: true },
                  { label: '이메일', active: false },
                ].map(ch => (
                  <div key={ch.label} className="flex items-center justify-between rounded-2xl bg-black/20 px-3 py-2.5">
                    <span className="text-zinc-300">{ch.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${ch.active ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-700 text-zinc-400'}`}>
                      {ch.active ? '활성' : '준비중'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

        </div>

        {/* ── Whale Flow ── */}
        <WhalePanel whales={whales} loading={whalesLoading} />

      </main>
    </div>
  );
}

/* ── Scanner List Item ─────────────────────────────── */
function ScannerItem({ ev }: { ev: Event }) {
  const isPump  = ev.type === 'PUMP';
  const volMult = ev.volRatio ?? ev.volumeMult ?? 1;
  // 바: volRatio 기준 — 3x=40%, 5x=60%, 10x=80%, 20x=100%
  const score   = Math.min(100, Math.round((volMult / 20) * 100));

  return (
    <div className={`px-4 py-3 transition-colors hover:bg-white/5 cursor-pointer`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-100">{baseCoin(ev.symbol)}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
              isPump
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/25 bg-red-500/10 text-red-300'
            }`}>
              {isPump ? '▲ PUMP' : '▼ DUMP'}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-zinc-500">{timeAgo(ev.detectedAt)}</div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-semibold ${isPump ? 'text-emerald-300' : 'text-red-300'}`}>
            {ev.changePct > 0 ? '+' : ''}{fmt(ev.changePct)}%
          </div>
          <div className="text-xs text-zinc-500">x{fmt(ev.volumeMult ?? ev.volRatio ?? 0, 1)}</div>
        </div>
      </div>
      {/* Score bar */}
      <div className="mt-2.5">
        <div className="h-1 rounded-full bg-white/5">
          <div
            className={`h-1 rounded-full transition-all ${isPump ? 'bg-emerald-400' : 'bg-red-400'}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}
