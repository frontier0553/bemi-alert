'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { MarketSummaryCards } from './components/MarketSummaryCards';
import { LiveSignalsPanel }   from './components/LiveSignalsPanel';
import { FiltersBar }         from './components/FiltersBar';
import { HistoryTable }       from './components/HistoryTable';
import { groupBySymbol }      from './components/utils';
import type { FilterType, Event, Stats } from './components/types';

const LIVE_WINDOW_MS = 5 * 60 * 1000;

export default function Home() {
  const [events, setEvents]           = useState<Event[]>([]);
  const [stats, setStats]             = useState<Stats | null>(null);
  const [filter, setFilter]           = useState<FilterType>('ALL');
  const [search, setSearch]           = useState('');
  const [groupBy, setGroupBy]         = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading]         = useState(true);
  const [countdown, setCountdown]     = useState(30);

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

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  const now        = Date.now();
  const liveEvents = events.filter(ev => now - new Date(ev.detectedAt).getTime() < LIVE_WINDOW_MS);
  const grouped    = groupBySymbol(events);

  const hasHistory = groupBy ? grouped.length > 0 : events.length > 0;

  return (
    <div className="min-h-screen bg-surface-base text-ink-primary">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 sm:px-6 h-14 bg-surface-card border-b border-edge-subtle backdrop-blur-sm">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <span>⚡</span>
          <span>Bemi Alert</span>
        </div>

        <nav className="flex gap-1">
          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-lg text-sm font-medium bg-surface-elevated text-ink-primary"
          >
            대시보드
          </Link>
          <Link
            href="/settings"
            className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-ink-secondary hover:bg-surface-elevated hover:text-ink-primary transition-colors"
          >
            설정
          </Link>
          <a
            href="https://t.me/bemialert_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-[#29b6f6] border border-[#29b6f6]/30 hover:bg-[#29b6f6]/10 transition-colors"
          >
            📣 알림 구독
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-ink-secondary hidden sm:block tabular-nums">
              {lastUpdated.toLocaleTimeString('ko-KR')} · {countdown}s 후 갱신
            </span>
          )}
          <button
            onClick={fetchData}
            className="px-3.5 py-1.5 rounded-lg border border-edge-medium bg-surface-elevated text-sm text-ink-primary hover:bg-surface-hover hover:border-signal transition-all"
          >
            ↻ 새로고침
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-7 flex flex-col gap-8">

        {/* ── Section 1: Market Summary ── */}
        <section className="flex flex-col gap-4">
          <SectionTitle>📊 마켓 현황</SectionTitle>
          {stats
            ? <MarketSummaryCards stats={stats} liveCount={liveEvents.length} />
            : <PlaceholderBlock />
          }
        </section>

        {/* ── Section 2: Live Signals ── */}
        <section className="flex flex-col gap-4">
          <SectionTitle>
            🚨 실시간 신호
            {liveEvents.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-dump/15 border border-dump/40 text-dump animate-blink">
                ● LIVE {liveEvents.length}
              </span>
            )}
          </SectionTitle>
          <LiveSignalsPanel
            events={liveEvents}
            countdown={countdown}
            loading={loading}
          />
        </section>

        {/* ── Section 3: History ── */}
        <section className="flex flex-col gap-4">
          <SectionTitle>📋 최근 감지 내역</SectionTitle>
          <FiltersBar
            filter={filter}   onFilter={setFilter}
            search={search}   onSearch={setSearch}
            groupBy={groupBy} onGroupBy={setGroupBy}
          />
          {loading ? (
            <PlaceholderBlock />
          ) : !hasHistory ? (
            <PlaceholderBlock
              message={search ? `"${search}" 결과 없음` : '감지된 이벤트가 없습니다'}
            />
          ) : (
            <HistoryTable events={events} grouped={grouped} groupBy={groupBy} />
          )}
        </section>

      </main>
    </div>
  );
}

/* ── Small helpers ─────────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-[15px] font-bold tracking-tight text-ink-primary">
      {children}
    </h2>
  );
}

function PlaceholderBlock({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-16 bg-surface-card rounded-2xl border border-edge-subtle text-ink-secondary text-sm">
      {message ?? '로딩 중...'}
    </div>
  );
}
