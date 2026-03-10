'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Bell, Zap, RefreshCw, Settings2, Waves, TrendingUp, LogIn, LogOut, HelpCircle, ShieldCheck, ChevronDown, ChevronUp, ChevronsUpDown, History } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { MarketSummaryCards } from '../components/MarketSummaryCards';
import { FiltersBar }         from '../components/FiltersBar';
import { HistoryTable }       from '../components/HistoryTable';
import { CryptoHeatmap }      from '../components/CryptoHeatmap';
import { MarketHeatmap }      from '../components/MarketHeatmap';
import type { WhaleEventRow } from '../components/WhalePanel';
import { groupBySymbol, baseCoin, fmt, timeAgo } from '../components/utils';
import type { FilterType, Event, Stats } from '../components/types';

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
  const [userChecked, setUserChecked]     = useState(false);
  const [menuOpen, setMenuOpen]           = useState(false);
  const menuRef                           = useRef<HTMLDivElement>(null);
  const [telegramLinked, setTelegramLinked] = useState<boolean | null>(null);
  const [whaleSortKey, setWhaleSortKey]   = useState<'symbol'|'direction'|'tradeSize'|'score'>('score');
  const [whaleSortDir, setWhaleSortDir]   = useState<'asc'|'desc'>('desc');
  const [futuresFilter, setFuturesFilter] = useState<'ALL'|'FUNDING'|'OI'>('ALL');
  const [heatmapTab, setHeatmapTab]       = useState<'market'|'alert'>('market');

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
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setUserChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    // 텔레그램 연동 여부 확인
    fetch('/api/user/settings')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setTelegramLinked(d.telegramLinked ?? false))
      .catch(() => {});

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

  function handleWhaleSort(key: typeof whaleSortKey) {
    if (whaleSortKey === key) setWhaleSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setWhaleSortKey(key); setWhaleSortDir(key === 'symbol' || key === 'direction' ? 'asc' : 'desc'); }
  }
  const sortedWhales = [...whales].sort((a, b) => {
    let cmp = 0;
    if (whaleSortKey === 'symbol')    cmp = a.symbol.localeCompare(b.symbol);
    if (whaleSortKey === 'direction') cmp = a.direction.localeCompare(b.direction);
    if (whaleSortKey === 'tradeSize') cmp = a.tradeSize - b.tradeSize;
    if (whaleSortKey === 'score')     cmp = a.score - b.score;
    return whaleSortDir === 'asc' ? cmp : -cmp;
  });

  function WhaleSortIcon({ col }: { col: typeof whaleSortKey }) {
    if (col !== whaleSortKey) return <ChevronsUpDown className="inline h-3 w-3 ml-0.5 opacity-30" />;
    return whaleSortDir === 'asc'
      ? <ChevronUp className="inline h-3 w-3 ml-0.5 text-cyan-300" />
      : <ChevronDown className="inline h-3 w-3 ml-0.5 text-cyan-300" />;
  }

  const filteredFutures = futuresFilter === 'ALL'
    ? futures
    : futures.filter(f => futuresFilter === 'OI' ? f.alertType !== 'FUNDING' : f.alertType === 'FUNDING');

  // 인증 확인 전 빈 화면
  if (!userChecked) return (
    <div className="min-h-screen bg-[#06080d]" />
  );

  // 비로그인 → 랜딩 페이지
  if (!user) return <LandingPage stats={stats} />;

  return (
    <div className="min-h-screen bg-[#06080d] text-zinc-100">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.05),transparent_25%)]" />


      {/* ── Header ── */}
      <header className="relative z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
              <Zap className="h-4 w-4 text-cyan-300" />
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
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            {/* 텔레그램 알림 버튼 */}
            <a
              href="https://t.me/bemialert_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/20 transition-colors"
            >
              <Bell className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">텔레그램 알림</span>
            </a>

            {/* 로그인 상태 */}
            {user ? (
              <div className="relative" ref={menuRef}>
                {/* 아바타 버튼 */}
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full p-0 hover:ring-2 hover:ring-white/20 transition-all"
                >
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="프로필"
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full object-cover block"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-cyan-400/15 text-[11px] font-bold text-cyan-300">
                      {user.email?.[0].toUpperCase()}
                    </span>
                  )}
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
                      <Link href="/user/settings" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 transition-colors">
                        <Settings2 className="h-3.5 w-3.5 text-zinc-500" /> 내 설정
                      </Link>
                      {isAdmin && (
                        <>
                          <Link href="/settings" onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 transition-colors">
                            <Settings2 className="h-3.5 w-3.5 text-zinc-500" /> 글로벌 설정
                          </Link>
                          <Link href="/admin" onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-amber-300 hover:bg-white/5 transition-colors">
                            <ShieldCheck className="h-3.5 w-3.5 text-amber-500" /> 관리자
                          </Link>
                        </>
                      )}
                      <Link href="/user/alerts" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 transition-colors">
                        <History className="h-3.5 w-3.5 text-zinc-500" /> 알림 이력
                      </Link>
                      <Link href="/pricing" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-cyan-400 hover:bg-white/5 transition-colors">
                        <Bell className="h-3.5 w-3.5 text-cyan-500" /> 플랜 / PRO
                      </Link>
                      <Link href="/blog" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 transition-colors">
                        <span className="h-3.5 w-3.5 text-zinc-500 flex items-center justify-center text-xs">✏️</span> 블로그
                      </Link>
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

        {/* ── 텔레그램 미연동 온보딩 카드 ── */}
        {telegramLinked === false && (
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* 아이콘 */}
                <div className="shrink-0 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-2xl">
                  📱
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-100 mb-1">
                    텔레그램으로 실시간 알림 받기
                  </p>
                  <p className="text-xs text-zinc-400 mb-3">
                    신호 감지 즉시 텔레그램 메시지로 전달됩니다. 연동하지 않으면 대시보드에서만 확인 가능합니다.
                  </p>
                  {/* 2단계 안내 */}
                  <div className="flex flex-col sm:flex-row gap-2 text-xs">
                    <a
                      href="https://t.me/bemialert_bot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-cyan-300 hover:bg-cyan-400/20 transition-colors"
                    >
                      <Bell className="h-3.5 w-3.5 shrink-0" />
                      <span><span className="font-bold">① </span>@bemialert_bot → /start 전송</span>
                    </a>
                    <Link
                      href="/user/settings"
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-zinc-300 hover:bg-white/10 transition-colors"
                    >
                      <span className="h-3.5 w-3.5 shrink-0 flex items-center justify-center text-[10px] font-bold">②</span>
                      <span>설정 페이지에서 링크 코드 입력</span>
                    </Link>
                  </div>
                </div>
              </div>
              <Link
                href="/user/settings"
                className="shrink-0 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-bold px-5 py-2.5 transition-colors"
              >
                지금 연동하기 →
              </Link>
            </div>
          </div>
        )}

        {/* ── 히트맵 (탭 전환) ── */}
        <div>
          {/* 탭 버튼 */}
          <div className="flex gap-1 mb-0">
            {([
              { key: 'market', label: '🌐 전체 시황' },
              { key: 'alert',  label: '📡 알림 종목' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setHeatmapTab(key)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
                  heatmapTab === key
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25'
                    : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* 전체 시황: 항상 마운트해서 데이터 유지, hidden으로 토글 */}
          <div className={heatmapTab === 'market' ? '' : 'hidden'}>
            <MarketHeatmap />
          </div>
          <div className={heatmapTab === 'alert' ? '' : 'hidden'}>
            <CryptoHeatmap events={uniqueBySymbol} />
          </div>
        </div>

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

            {/* 컬럼 헤더 — 데스크탑만 */}
            <div className="hidden sm:grid grid-cols-[16px_84px_72px_1fr_80px_52px] items-center gap-x-3 border-b border-white/5 bg-black/20 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <span />
              <button onClick={() => handleWhaleSort('symbol')} className="flex items-center gap-0.5 hover:text-zinc-200 transition-colors text-left">
                심볼<WhaleSortIcon col="symbol" />
              </button>
              <button onClick={() => handleWhaleSort('direction')} className="flex items-center gap-0.5 hover:text-zinc-200 transition-colors text-left">
                방향<WhaleSortIcon col="direction" />
              </button>
              <button onClick={() => handleWhaleSort('tradeSize')} className="flex items-center justify-end gap-0.5 hover:text-zinc-200 transition-colors w-full">
                거래규모<WhaleSortIcon col="tradeSize" />
              </button>
              <button onClick={() => handleWhaleSort('score')} className="group relative flex items-center justify-end gap-0.5 hover:text-zinc-200 transition-colors w-full">
                압력지수<WhaleSortIcon col="score" />
                <span className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 w-52 rounded-xl border border-white/10 bg-[#0e1117] p-3 text-left text-[11px] font-normal normal-case tracking-normal text-zinc-300 opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                  <span className="block font-semibold text-zinc-100 mb-1.5">고래 압력 지수 (-100 ~ +100)</span>
                  <span className="block text-zinc-400 leading-relaxed">(매수건 × 2) − (매도건 × 2) + 거래량 스파이크</span>
                  <span className="mt-2 block space-y-1">
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]" />+40 이상: 강한 매집</span>
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_4px_rgba(248,113,113,0.8)]" />−40 이하: 강한 매도</span>
                    <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />그 외: 중립</span>
                  </span>
                </span>
              </button>
              <span className="text-right">시각</span>
            </div>
            {/* 컬럼 헤더 — 모바일 */}
            <div className="block sm:hidden grid grid-cols-[12px_72px_52px_1fr_44px] items-center gap-x-2 border-b border-white/5 bg-black/20 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              <span />
              <span>심볼</span>
              <span>방향</span>
              <span className="text-right">압력</span>
              <span className="text-right">시각</span>
            </div>
            <div className="divide-y divide-white/[0.04] max-h-[400px] overflow-y-auto">
              {whalesLoading ? (
                <div className="py-10 text-center text-sm text-zinc-600">로딩 중...</div>
              ) : whales.length === 0 ? (
                <div className="py-10 text-center text-sm text-zinc-600">고래 활동 없음</div>
              ) : (
                sortedWhales.map(w => <WhaleRow key={w.id} w={w} />)
              )}
            </div>
          </div>
        </div>

        {/* ── 선물 신호 (펀딩비 + OI) ── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04]">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="h-4 w-4 text-violet-400" />
              <span className="text-sm font-semibold">선물 신호</span>
            </div>
            <div className="flex items-center gap-1">
              {(['ALL', 'FUNDING', 'OI'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFuturesFilter(tab)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    futuresFilter === tab
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/25'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          {/* 컬럼 헤더 — 데스크탑만 */}
          <div className="hidden sm:grid grid-cols-[88px_84px_90px_100px_52px] items-center gap-x-3 border-b border-white/5 bg-black/20 px-4 py-2 text-xs font-semibold tracking-wider text-zinc-400">
            <span>심볼</span>
            <span>이벤트</span>
            <span className="text-right">비율</span>
            <span>상태</span>
            <span className="text-right">시간</span>
          </div>
          {/* 컬럼 헤더 — 모바일 */}
          <div className="block sm:hidden grid grid-cols-[72px_60px_1fr_44px] items-center gap-x-2 border-b border-white/5 bg-black/20 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <span>심볼</span>
            <span>이벤트</span>
            <span className="text-right">비율</span>
            <span className="text-right">시각</span>
          </div>
          <div className="divide-y divide-white/[0.04] max-h-[280px] overflow-y-auto">
            {futuresLoading ? (
              <div className="py-10 text-center text-sm text-zinc-600">로딩 중...</div>
            ) : filteredFutures.length === 0 ? (
              <div className="py-10 text-center text-sm text-zinc-600">감지된 선물 신호 없음</div>
            ) : (
              filteredFutures.map(f => <FuturesRow key={f.id} f={f} />)
            )}
          </div>
        </div>

        {/* ── Full-width: 감지 내역 ── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04]">
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
  const dirBadge   = isBuy
    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
    : isMix ? 'border-amber-500/25 bg-amber-500/10 text-amber-300'
    : 'border-red-500/25 bg-red-500/10 text-red-300';

  function fmtUsd(v: number) {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    return `$${(v / 1_000).toFixed(0)}K`;
  }

  return (
    <>
      {/* 모바일 카드 */}
      <div className="block sm:hidden px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
        <div className="grid grid-cols-[12px_72px_52px_1fr_44px] items-center gap-x-2">
          <span className={`h-2 w-2 rounded-full ${heat}`} />
          <span className="font-semibold text-sm text-zinc-100 truncate">{w.symbol.replace(QUOTE_RE, '')}</span>
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${dirBadge}`}>
            {w.direction}
          </span>
          <span className={`text-sm font-bold tabular-nums text-right ${scoreColor}`}>
            {w.score > 0 ? '+' : ''}{w.score}
          </span>
          <span className="text-xs text-zinc-600 tabular-nums">{timeAgo(w.detectedAt)}</span>
        </div>
        <div className="mt-0.5 pl-5 text-xs text-zinc-500">
          거래규모 {fmtUsd(w.tradeSize)}
        </div>
      </div>

      {/* 데스크탑 테이블 행 */}
      <div className="hidden sm:grid grid-cols-[16px_84px_72px_1fr_80px_52px] items-center gap-x-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
        <span className={`h-2 w-2 rounded-full ${heat}`} />
        <span className="font-semibold text-sm text-zinc-100 truncate">
          {w.symbol.replace(QUOTE_RE, '')}
        </span>
        <span className={`w-fit rounded-md px-2 py-0.5 text-[10px] font-bold border ${dirBadge}`}>
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
    </>
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

  const eventStyle = isFunding
    ? 'border-violet-500/25 bg-violet-500/10 text-violet-300'
    : isOiSurge
    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
    : 'border-red-500/25 bg-red-500/10 text-red-300';

  const eventLabel = isFunding ? 'FUNDING' : 'OI';

  const valueStr = isFunding
    ? `${f.value > 0 ? '+' : ''}${f.value.toFixed(4)}%`
    : `${f.value > 0 ? '+' : ''}${f.value.toFixed(2)}%`;
  const valueColor = f.value > 0 ? 'text-emerald-300' : 'text-red-300';

  const statusLabel = isFunding
    ? (f.value > 0 ? 'Long Hot' : 'Short Hot')
    : (isOiSurge ? 'OI Rising' : 'OI Falling');
  const statusStyle = (isFunding ? f.value > 0 : isOiSurge)
    ? 'bg-emerald-500/10 text-emerald-300'
    : 'bg-red-500/10 text-red-300';

  return (
    <>
      {/* 모바일 카드 */}
      <div className="block sm:hidden px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
        <div className="grid grid-cols-[72px_60px_1fr_44px] items-center gap-x-2">
          <span className="font-bold text-sm text-zinc-100 truncate">
            {f.symbol.replace(QUOTE_RE, '')}
          </span>
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${eventStyle}`}>
            {eventLabel}
          </span>
          <span className={`text-sm font-bold tabular-nums text-right ${valueColor}`}>{valueStr}</span>
          <span className="text-xs text-zinc-600 tabular-nums">{timeAgo(f.detectedAt)}</span>
        </div>
        <div className="mt-0.5">
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${statusStyle}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* 데스크탑 테이블 행 */}
      <div className="hidden sm:grid grid-cols-[88px_84px_90px_100px_52px] items-center gap-x-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
        <span className="font-bold text-sm text-zinc-100 truncate">
          {f.symbol.replace(QUOTE_RE, '')}
        </span>
        <span className={`w-fit rounded-md px-2 py-0.5 text-[10px] font-bold border ${eventStyle}`}>
          {eventLabel}
        </span>
        <span className={`text-sm font-bold tabular-nums text-right ${valueColor}`}>
          {valueStr}
        </span>
        <span className={`w-fit rounded-md px-2 py-0.5 text-[10px] font-semibold ${statusStyle}`}>
          {statusLabel}
        </span>
        <span className="text-xs text-zinc-600 tabular-nums text-right">{timeAgo(f.detectedAt)}</span>
      </div>
    </>
  );
}

// ── 랜딩 페이지 ──────────────────────────────────────────────────

function LandingPage({ stats }: { stats: Stats | null }) {
  const supabase = createClient();

  async function handleLogin() {
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}/auth/callback` },
    });
  }

  const features = [
    {
      icon: '📈',
      title: 'PUMP / DUMP 감지',
      desc: '3분·5분 가격 변동 +3% 이상, 거래량 3배 이상 조건으로 과매수·과매도 신호를 실시간 포착합니다.',
      color: 'border-emerald-500/20 bg-emerald-500/5',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      icon: '🐋',
      title: '고래 거래 추적',
      desc: '대량 매수·매도를 탐지해 스마트머니 방향을 파악합니다. 압력 스코어로 강도를 수치화합니다.',
      color: 'border-cyan-500/20 bg-cyan-500/5',
      iconBg: 'bg-cyan-500/10 border-cyan-500/20',
    },
    {
      icon: '📊',
      title: '선물 시장 신호',
      desc: '펀딩비 이상과 OI 급변을 모니터링해 롱·숏 과열 구간을 조기에 감지합니다.',
      color: 'border-violet-500/20 bg-violet-500/5',
      iconBg: 'bg-violet-500/10 border-violet-500/20',
    },
    {
      icon: '🔔',
      title: '텔레그램 실시간 알림',
      desc: '감지 즉시 텔레그램 메시지로 발송. 관심 코인만 필터링해 원하는 알림만 받을 수 있습니다.',
      color: 'border-amber-500/20 bg-amber-500/5',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
    },
  ];

  const steps = [
    { num: '1', label: '구글 로그인', desc: '소셜 계정으로 즉시 시작' },
    { num: '2', label: '코인 필터 설정', desc: '관심 코인만 골라서 구독' },
    { num: '3', label: '텔레그램 연동', desc: '봇에서 /link CODE 입력' },
    { num: '4', label: '알림 수신', desc: '신호 발생 즉시 메시지 도착' },
  ];

  return (
    <div className="min-h-screen bg-[#06080d] text-zinc-100">
      {/* 배경 글로우 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-500/5 blur-[100px] rounded-full" />
      </div>

      {/* 헤더 */}
      <header className="relative z-10 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
              <Zap className="h-4 w-4 text-cyan-300" />
            </div>
            <span className="font-bold tracking-tight">Bemi Alert</span>
          </div>
          <button
            onClick={handleLogin}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            구글로 시작하기
          </button>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1100px] px-5">

        {/* Hero */}
        <section className="py-20 text-center flex flex-col items-center gap-6">
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1.5 text-xs font-semibold text-cyan-300 tracking-wider uppercase">
            실시간 암호화폐 모니터링
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight max-w-3xl">
            펌프·덤프를{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-violet-400">
              3분 만에
            </span>{' '}
            포착하세요
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl leading-relaxed">
            바이낸스 상위 200개 코인을 30초마다 스캔합니다.
            고래 거래, 선물 시장 이상 신호까지 텔레그램으로 즉시 전달합니다.
          </p>
          <button
            onClick={handleLogin}
            className="mt-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 px-8 py-3.5 text-base font-bold text-white shadow-lg hover:opacity-90 transition-opacity"
          >
            무료로 시작하기 →
          </button>

          {/* 실시간 통계 */}
          {stats && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2 flex items-center gap-2">
                <span className="text-zinc-500">오늘 감지</span>
                <span className="font-bold text-zinc-100">{stats.todayTotal}건</span>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-2 flex items-center gap-2">
                <span className="text-zinc-500">PUMP</span>
                <span className="font-bold text-emerald-300">{stats.todayPumps}건</span>
              </div>
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-2 flex items-center gap-2">
                <span className="text-zinc-500">DUMP</span>
                <span className="font-bold text-red-300">{stats.todayDumps}건</span>
              </div>
            </div>
          )}
        </section>

        {/* 기능 카드 */}
        <section className="py-12">
          <h2 className="text-center text-2xl font-bold mb-8 text-zinc-100">주요 기능</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map(f => (
              <div key={f.title} className={`rounded-2xl border p-6 ${f.color}`}>
                <div className={`mb-4 w-11 h-11 rounded-xl border flex items-center justify-center text-xl ${f.iconBg}`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-zinc-100 mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="py-12">
          <h2 className="text-center text-2xl font-bold mb-10 text-zinc-100">이용 방법</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {steps.map((s, i) => (
              <div key={s.num} className="relative flex flex-col items-center text-center gap-3">
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-5 left-[calc(50%+20px)] w-[calc(100%-40px)] h-px border-t border-dashed border-white/10" />
                )}
                <div className="w-10 h-10 rounded-full border border-cyan-400/30 bg-cyan-400/10 flex items-center justify-center text-sm font-bold text-cyan-300">
                  {s.num}
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-100">{s.label}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 text-center">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-12 flex flex-col items-center gap-5">
            <h2 className="text-3xl font-extrabold text-zinc-100">지금 바로 시작하세요</h2>
            <p className="text-zinc-400 max-w-md">
              구글 계정 하나로 즉시 이용 가능합니다. 별도 설치 없이 브라우저와 텔레그램만 있으면 됩니다.
            </p>
            <button
              onClick={handleLogin}
              className="rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 px-10 py-3.5 text-base font-bold text-white shadow-lg hover:opacity-90 transition-opacity"
            >
              구글로 무료 시작하기
            </button>
          </div>
        </section>

      </main>

      {/* 푸터 */}
      <footer className="relative border-t border-white/5 py-6 text-center text-xs text-zinc-600">
        © 2025 Bemi Alert · 본 서비스는 투자 조언을 제공하지 않습니다.
      </footer>
    </div>
  );
}
