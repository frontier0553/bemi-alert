'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Bell, CandlestickChart, RefreshCw, Settings2, Waves, TrendingUp, LogIn, LogOut, HelpCircle, ShieldCheck, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { MarketSummaryCards } from './components/MarketSummaryCards';
import { FiltersBar }         from './components/FiltersBar';
import { HistoryTable }       from './components/HistoryTable';
import type { WhaleEventRow } from './components/WhalePanel';
import { groupBySymbol, baseCoin, fmt, timeAgo } from './components/utils';
import type { FilterType, Event, Stats } from './components/types';

const LIVE_WINDOW_MS    = 5 * 60 * 1000;
const SCANNER_WINDOW_MS = 60 * 60 * 1000; // 실시간 신호: 최근 1시간

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
  const [futures, setFutures]             = useState<FuturesAlertRow[]>([]);
  const [futuresLoading, setFuturesLoading] = useState(true);
  const [isAdmin, setIsAdmin]             = useState(false);
  const [visitStats, setVisitStats]       = useState<{ today: number; total: number } | null>(null);
  const [user, setUser]                   = useState<User | null>(null);
  const [menuOpen, setMenuOpen]           = useState(false);
  const menuRef                           = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const fetchFutures = useCallback(async () => {
    try {
      const res  = await fetch('/api/futures-alerts');
      const data = await res.json();
      setFutures(data.alerts ?? []);
    } catch (e) { console.error(e); }
    finally { setFuturesLoading(false); }
  }, []);

  useEffect(() => {
    fetchFutures();
    const t = setInterval(fetchFutures, 60000);
    return () => clearInterval(t);
  }, [fetchFutures]);

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 0), 1000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  // 방문 기록 + 관리자 체크 + 로그인 상태
  useEffect(() => {
    fetch('/api/visit', { method: 'POST' }).catch(() => {});
    fetch('/api/admin/me')
      .then(r => r.json())
      .then(({ isAdmin: admin }) => {
        setIsAdmin(admin);
        if (admin) {
          fetch('/api/visit')
            .then(r => r.ok ? r.json() : null)
            .then(d => d && setVisitStats({ today: d.today, total: d.total }))
            .catch(() => {});
        }
      })
      .catch(() => {});
    // 로그인 상태 확인
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const now        = Date.now();
  const liveEvents = events.filter(ev => now - new Date(ev.detectedAt).getTime() < LIVE_WINDOW_MS);
  const grouped    = groupBySymbol(events);

  const recentEvents = events.filter(ev =>
    now - new Date(ev.detectedAt).getTime() < SCANNER_WINDOW_MS,
  );
  const uniqueBySymbol = Array.from(
    recentEvents.reduce((map, ev) => {
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
            {visitStats && (
              <span className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/5 px-2.5 py-1 text-[11px] tabular-nums text-zinc-500">
                👁 오늘 <span className="text-zinc-300 font-semibold">{visitStats.today.toLocaleString()}</span>
                <span className="text-zinc-700">·</span>
                누적 <span className="text-zinc-300 font-semibold">{visitStats.total.toLocaleString()}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* 새로고침 — 아이콘만 */}
            <button
              onClick={fetchData}
              title="새로고침"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            {/* 텔레그램 — 아이콘만 */}
            <a
              href="https://t.me/bemialert_bot"
              target="_blank"
              rel="noopener noreferrer"
              title="텔레그램 알림 봇"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/15 transition-colors"
            >
              <Bell className="h-3.5 w-3.5" />
            </a>

            {/* 로그인 상태 */}
            {user ? (
              <div className="relative" ref={menuRef}>
                {/* 아바타 버튼 */}
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="flex h-8 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 pl-1.5 pr-2.5 text-zinc-300 hover:text-zinc-100 transition-colors"
                >
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="프로필"
                      className="h-5 w-5 rounded-lg object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-cyan-400/15 text-[11px] font-bold text-cyan-300">
                      {user.email?.[0].toUpperCase()}
                    </span>
                  )}
                  <ChevronDown className={`h-3 w-3 text-zinc-600 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* 드롭다운 */}
                {menuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#0e1117] shadow-2xl">
                    {/* 이메일 */}
                    <div className="border-b border-white/5 px-4 py-3">
                      <p className="truncate text-xs text-zinc-500">{user.email}</p>
                    </div>
                    {/* 메뉴 */}
                    <div className="py-1">
                      {isAdmin ? (
                        <>
                          <Link href="/settings" onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 transition-colors">
                            <Settings2 className="h-3.5 w-3.5 text-zinc-500" /> 설정
                          </Link>
                          <Link href="/admin" onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-amber-300 hover:bg-white/5 transition-colors">
                            <ShieldCheck className="h-3.5 w-3.5 text-amber-500" /> 관리자
                          </Link>
                        </>
                      ) : (
                        <Link href="/user/settings" onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 transition-colors">
                          <Settings2 className="h-3.5 w-3.5 text-zinc-500" /> 내 설정
                        </Link>
                      )}
                      <Link href="/help" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 transition-colors">
                        <HelpCircle className="h-3.5 w-3.5 text-zinc-500" /> 도움말
                      </Link>
                    </div>
                    {/* 로그아웃 */}
                    <div className="border-t border-white/5 py-1">
                      <form action="/api/auth/signout" method="POST">
                        <button type="submit"
                          className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors">
                          <LogOut className="h-3.5 w-3.5" /> 로그아웃
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex h-8 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <LogIn className="h-3.5 w-3.5" />
                로그인
              </Link>
            )}
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
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">📡 실시간 PUMP / DUMP</span>
                  <span className="text-[10px] text-zinc-600">단기 급등·급락 감지 (최근 1시간)</span>
                </div>
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

            {/* 컬럼 헤더 */}
            <div className="grid grid-cols-[80px_1fr_68px_56px_52px] items-center gap-x-3 border-b border-white/5 bg-black/20 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <span>유형</span>
              <span>심볼</span>
              <span className="text-right">변동폭</span>
              <span className="text-right">거래량</span>
              <span className="text-right">시각</span>
            </div>
            {/* 목록 */}
            <div className="divide-y divide-white/[0.04] max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="py-10 text-center text-sm text-zinc-600">로딩 중...</div>
              ) : scannerEvents.length === 0 ? (
                <div className="py-10 text-center text-sm text-zinc-600">최근 1시간 내 감지 없음</div>
              ) : (
                scannerEvents.map(ev => <ScannerRow key={ev.id} ev={ev} />)
              )}
            </div>
          </div>

          {/* ── Right: Whale Flow ── */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04]">
            <div className="flex items-center gap-2.5 border-b border-white/5 px-4 py-3">
              <Waves className="h-4 w-4 text-cyan-300" />
              <span className="text-sm font-semibold">Whale Flow</span>
              <span className="text-xs text-zinc-600">상위 30 코인</span>
            </div>

            {/* 컬럼 헤더 */}
            <div className="grid grid-cols-[16px_84px_72px_1fr_80px_52px] items-center gap-x-3 border-b border-white/5 bg-black/20 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <span />
              <span>심볼</span>
              <span>방향</span>
              <span className="text-right">거래규모</span>
              <span className="group relative text-right cursor-help">
                압력지수
                <span className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 w-52 rounded-xl border border-white/10 bg-[#0e1117] p-3 text-left text-[11px] font-normal normal-case tracking-normal text-zinc-300 opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                  <span className="block font-semibold text-zinc-100 mb-1.5">고래 압력 지수 (-100 ~ +100)</span>
                  <span className="block text-zinc-400 leading-relaxed">
                    (매수건 × 2) − (매도건 × 2) + 거래량 스파이크
                  </span>
                  <span className="mt-2 block space-y-1">
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]" />+40 이상: 강한 매집</span>
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_4px_rgba(248,113,113,0.8)]" />−40 이하: 강한 매도</span>
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />그 외: 중립</span>
                  </span>
                </span>
              </span>
              <span className="text-right">시각</span>
            </div>
            <div className="divide-y divide-white/[0.04] max-h-[400px] overflow-y-auto">
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

        {/* ── 선물 신호 (펀딩비 + OI) ── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-white/5 px-4 py-3">
            <TrendingUp className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-semibold">선물 신호</span>
            <span className="text-xs text-zinc-600">펀딩비 극단 · OI 급변</span>
          </div>
          {/* 컬럼 헤더 */}
          <div className="grid grid-cols-[100px_84px_1fr_90px_52px] items-center gap-x-3 border-b border-white/5 bg-black/20 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <span>유형</span>
            <span>심볼</span>
            <span>상세</span>
            <span className="text-right">수치</span>
            <span className="text-right">시각</span>
          </div>
          <div className="divide-y divide-white/[0.04] max-h-[280px] overflow-y-auto">
            {futuresLoading ? (
              <div className="py-10 text-center text-sm text-zinc-600">로딩 중...</div>
            ) : futures.length === 0 ? (
              <div className="py-10 text-center text-sm text-zinc-600">감지된 선물 신호 없음</div>
            ) : (
              futures.map(f => <FuturesRow key={f.id} f={f} />)
            )}
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
    <div className="grid grid-cols-[80px_1fr_68px_56px_52px] items-center gap-x-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
      {/* 유형 뱃지 */}
      <span className={`w-fit rounded-md px-2.5 py-1 text-[11px] font-bold border ${
        isPump
          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
          : 'border-red-500/25 bg-red-500/10 text-red-300'
      }`}>
        {isPump ? '▲ PUMP' : '▼ DUMP'}
      </span>
      {/* 심볼 */}
      <span className="font-bold text-sm text-zinc-100 truncate">{baseCoin(ev.symbol)}</span>
      {/* 변동폭 */}
      <span className={`text-sm font-bold tabular-nums text-right ${isPump ? 'text-emerald-300' : 'text-red-300'}`}>
        {ev.changePct > 0 ? '+' : ''}{fmt(ev.changePct)}%
      </span>
      {/* 거래량 배수 + 미니 바 */}
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs font-semibold tabular-nums text-zinc-400">x{fmt(volMult, 1)}</span>
        <div className="h-0.5 w-full rounded-full bg-white/5">
          <div className={`h-0.5 rounded-full ${isPump ? 'bg-emerald-400' : 'bg-red-400'}`} style={{ width: `${bar}%` }} />
        </div>
      </div>
      {/* 시각 */}
      <span className="text-xs text-zinc-600 tabular-nums text-right">{timeAgo(ev.detectedAt)}</span>
    </div>
  );
}

/* ── Whale Row ──────────────────────────────────────── */
function WhaleRow({ w }: { w: WhaleEventRow }) {
  const isBuy    = w.direction === 'BUY';
  const isMix    = w.direction === 'MIXED';
  const absScore = Math.abs(w.score);
  const heat =
    absScore >= 40 ? (isBuy ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]' : 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.7)]')
    : 'bg-amber-400';
  const scoreColor = w.score > 0 ? 'text-emerald-300' : w.score < 0 ? 'text-red-300' : 'text-zinc-400';
  const barColor   = w.score > 0 ? 'bg-emerald-400' : w.score < 0 ? 'bg-red-400' : 'bg-amber-400';

  function fmtUsd(v: number) {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    return `$${(v / 1_000).toFixed(0)}K`;
  }

  return (
    <div className="grid grid-cols-[16px_84px_72px_1fr_80px_52px] items-center gap-x-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
      <span className={`h-2 w-2 rounded-full ${heat}`} />
      <span className="font-semibold text-sm text-zinc-100 truncate">
        {w.symbol.replace(QUOTE_RE, '')}
      </span>
      <span className={`w-fit rounded-md px-2 py-0.5 text-[10px] font-bold border ${
        isBuy ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
        : isMix ? 'border-amber-500/25 bg-amber-500/10 text-amber-300'
        : 'border-red-500/25 bg-red-500/10 text-red-300'
      }`}>
        {w.direction}
      </span>
      <span className="text-sm font-semibold text-zinc-200 tabular-nums text-right">
        {fmtUsd(w.tradeSize)}
      </span>
      <div className="flex flex-col items-end gap-1">
        <span className={`text-sm font-bold tabular-nums leading-none ${scoreColor}`}>
          {w.score > 0 ? '+' : ''}{w.score}
        </span>
        <div className="h-0.5 w-full rounded-full bg-white/5">
          <div className={`h-0.5 rounded-full ${barColor}`} style={{ width: `${absScore}%` }} />
        </div>
      </div>
      <span className="text-xs text-zinc-600 tabular-nums text-right">{timeAgo(w.detectedAt)}</span>
    </div>
  );
}

/* ── Futures Alert Row ───────────────────────────────── */
interface FuturesAlertRow {
  id:         string;
  symbol:     string;
  alertType:  string;   // "FUNDING" | "OI_SURGE" | "OI_DROP"
  value:      number;
  markPrice?: number | null;
  note?:      string | null;
  detectedAt: string;
}

function FuturesRow({ f }: { f: FuturesAlertRow }) {
  const isFunding = f.alertType === 'FUNDING';
  const isOiSurge = f.alertType === 'OI_SURGE';
  const isOiDrop  = f.alertType === 'OI_DROP';

  const badgeStyle = isFunding
    ? 'border-violet-500/25 bg-violet-500/10 text-violet-300'
    : isOiSurge
    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
    : 'border-red-500/25 bg-red-500/10 text-red-300';

  const badgeLabel = isFunding ? '💸 펀딩비' : isOiSurge ? '📈 OI 급증' : '📉 OI 급감';

  const isLong   = f.note === 'LONG_EXTREME';
  const valueStr = isFunding
    ? `${f.value > 0 ? '+' : ''}${f.value.toFixed(4)}%`
    : `${f.value > 0 ? '+' : ''}${f.value.toFixed(2)}%`;
  const valueColor = f.value > 0 ? 'text-emerald-300' : 'text-red-300';

  return (
    <div className="grid grid-cols-[100px_84px_1fr_90px_52px] items-center gap-x-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
      <span className={`w-fit rounded-md px-2 py-0.5 text-[10px] font-bold border ${badgeStyle}`}>
        {badgeLabel}
      </span>
      <span className="font-bold text-sm text-zinc-100 truncate">
        {f.symbol.replace(QUOTE_RE, '')}
      </span>

      {/* 상세 컬럼 */}
      {isFunding ? (
        <div className="flex items-center gap-2 min-w-0">
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold border ${
            isLong
              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/25 bg-red-500/10 text-red-300'
          }`}>
            {isLong ? '롱 과열' : '숏 과열'}
          </span>
          {f.markPrice != null && (
            <span className="text-xs text-zinc-500 tabular-nums truncate">
              mark <span className="text-zinc-300">${f.markPrice < 1 ? f.markPrice.toFixed(4) : f.markPrice.toFixed(2)}</span>
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 min-w-0">
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold border ${
            isOiSurge
              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/25 bg-red-500/10 text-red-300'
          }`}>
            {isOiSurge ? '포지션 증가' : '포지션 감소'}
          </span>
          {f.note && (
            <span className="text-xs text-zinc-400 font-mono truncate">{f.note}</span>
          )}
        </div>
      )}

      <span className={`text-sm font-bold tabular-nums text-right ${valueColor}`}>
        {valueStr}
      </span>
      <span className="text-xs text-zinc-600 tabular-nums text-right">{timeAgo(f.detectedAt)}</span>
    </div>
  );
}
