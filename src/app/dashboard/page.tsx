'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Bell, Zap, RefreshCw, Settings2, Waves, TrendingUp, LogIn, LogOut, HelpCircle, ShieldCheck, History } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { MarketHeatmap }      from '../components/MarketHeatmap';
import type { WhaleEventRow } from '../components/WhalePanel';
import { baseCoin, fmt, timeAgo } from '../components/utils';
import type { FilterType, Event, Stats } from '../components/types';

const LIVE_WINDOW_MS    = 5 * 60 * 1000;
const SCANNER_WINDOW_MS = 60 * 60 * 1000; // 실시간 신호: 최근 1시간

const QUOTE_RE = /(USDT|USDC|BUSD|FDUSD|TUSD)$/;

export default function Home() {
  const [events, setEvents]               = useState<Event[]>([]);
  const [stats, setStats]                 = useState<Stats | null>(null);
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
      const res  = await fetch('/api/events?limit=200');
      const data = await res.json();
      setEvents(data.events ?? []);
      setStats(data.stats ?? null);
      setLastUpdated(new Date());
      setCountdown(30);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

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

      <main className="relative mx-auto max-w-[1400px] px-5 py-5 flex flex-col gap-4">

        {/* ── KPI 칩 ── */}
        <div className="flex flex-wrap items-center gap-2">
          {stats ? (
            <>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                ▲ {stats.todayPumps} PUMP
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
                ▼ {stats.todayDumps} DUMP
              </span>
              {liveEvents.length > 0 ? (
                <span className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  LIVE {liveEvents.length}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-500">
                  IDLE
                </span>
              )}
              <span className="text-xs text-zinc-600 tabular-nums">오늘 총 {stats.todayTotal}건 감지</span>
            </>
          ) : (
            <div className="h-7 w-56 rounded-full bg-white/5 animate-pulse" />
          )}
        </div>

        {/* ── 텔레그램 미연동 배너 ── */}
        {telegramLinked === false && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] px-4 py-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <Bell className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
              <span className="text-xs text-zinc-400 truncate">
                텔레그램 미연동 — 신호 감지 시 알림을 받으려면 봇을 연결하세요
              </span>
            </div>
            <Link
              href="/user/settings"
              className="shrink-0 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/20 transition-colors"
            >
              연동하기 →
            </Link>
          </div>
        )}

        {/* ── 메인 2컬럼: 좌(신호) / 우(시황+고래+선물) ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr] lg:items-stretch">

          {/* ── Left: 실시간 신호 ── */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
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
            <div className="flex items-center justify-between border-b border-white/5 bg-black/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              <span>유형 · 심볼</span>
              <div className="flex items-center gap-4">
                <span>변동폭</span>
                <span>거래량</span>
                <span className="w-10 text-right">시각</span>
              </div>
            </div>
            <div className="flex-1 divide-y divide-white/[0.04] overflow-y-auto">
              {loading ? (
                <div className="py-10 text-center text-sm text-zinc-600">로딩 중...</div>
              ) : scannerEvents.length === 0 ? (
                <Scanner24hSummary events={events} />
              ) : (
                scannerEvents.map(ev => <ScannerRow key={ev.id} ev={ev} />)
              )}
            </div>
          </div>

          {/* ── Right: 사이드 패널 ── */}
          <div className="flex flex-col gap-4">

            {/* 전체 시황 히트맵 */}
            <MarketHeatmap />

            {/* Whale Flow */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
              <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
                <Waves className="h-3.5 w-3.5 text-cyan-300" />
                <span className="text-sm font-semibold">Whale Flow</span>
                <span className="text-xs text-zinc-600">상위 30 코인</span>
              </div>
              {/* 컬럼 헤더 */}
              <div className="grid grid-cols-[10px_1fr_52px_56px_44px_36px] items-center gap-x-2 border-b border-white/5 bg-black/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                <span />
                <span>심볼</span>
                <span>방향</span>
                <span className="text-right">거래규모</span>
                <span className="text-right">압력</span>
                <span className="text-right">시각</span>
              </div>
              <div className="divide-y divide-white/[0.04] max-h-[300px] overflow-y-auto">
                {whalesLoading ? (
                  <div className="py-6 text-center text-sm text-zinc-600">로딩 중...</div>
                ) : whales.length === 0 ? (
                  <div className="py-6 text-center text-sm text-zinc-600">고래 활동 없음</div>
                ) : (
                  [...whales]
                    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
                    .map(w => <WhaleCompactRow key={w.id} w={w} />)
                )}
              </div>
            </div>

            {/* 선물 신호 */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
              <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
                <TrendingUp className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-sm font-semibold">선물 신호</span>
              </div>
              {/* 컬럼 헤더 */}
              <div className="grid grid-cols-[1fr_48px_72px_60px_36px] items-center gap-x-2 border-b border-white/5 bg-black/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                <span>심볼</span>
                <span>이벤트</span>
                <span className="text-right">비율</span>
                <span>상태</span>
                <span className="text-right">시각</span>
              </div>
              <div className="divide-y divide-white/[0.04] max-h-[240px] overflow-y-auto">
                {futuresLoading ? (
                  <div className="py-6 text-center text-sm text-zinc-600">로딩 중...</div>
                ) : futures.length === 0 ? (
                  <div className="py-6 text-center text-sm text-zinc-600">감지된 선물 신호 없음</div>
                ) : (
                  futures.map(f => <FuturesCompactRow key={f.id} f={f} />)
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── 감지 이력 링크 배너 ── */}
        <Link
          href="/user/alerts"
          className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 text-sm text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <History className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            <span>알림 이력 전체 보기</span>
            <span className="hidden sm:inline text-xs text-zinc-700">— 최근 7일 감지 내역</span>
          </div>
          <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors text-base">→</span>
        </Link>

      </main>
    </div>
  );
}

/* ── 24h 요약 (신호 없을 때) ─────────────────────────── */
function Scanner24hSummary({ events }: { events: Event[] }) {
  const now  = Date.now();
  const DAY  = 24 * 60 * 60 * 1000;
  const day  = events.filter(ev => now - new Date(ev.detectedAt).getTime() < DAY);

  if (day.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <span className="text-2xl">🔍</span>
        <p className="text-sm text-zinc-600">최근 1시간 내 감지된 신호 없음</p>
      </div>
    );
  }

  const pumps = day.filter(e => e.type === 'PUMP');
  const dumps = day.filter(e => e.type === 'DUMP');

  // 변동폭 기준 Top 3
  const topPump = [...pumps].sort((a, b) => b.changePct - a.changePct).slice(0, 3);
  const topDump = [...dumps].sort((a, b) => a.changePct - b.changePct).slice(0, 3);

  return (
    <div className="px-4 py-5 space-y-4">
      {/* 요약 헤더 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">최근 1시간 감지 없음 ·</span>
        <span className="text-xs font-semibold text-zinc-300">최근 24시간 요약</span>
      </div>

      {/* 카운트 */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-xl bg-emerald-500/8 border border-emerald-500/15 px-3 py-2.5 text-center">
          <div className="text-lg font-bold text-emerald-400 tabular-nums">{pumps.length}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">PUMP 감지</div>
        </div>
        <div className="flex-1 rounded-xl bg-red-500/8 border border-red-500/15 px-3 py-2.5 text-center">
          <div className="text-lg font-bold text-red-400 tabular-nums">{dumps.length}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">DUMP 감지</div>
        </div>
        <div className="flex-1 rounded-xl bg-white/[0.04] border border-white/8 px-3 py-2.5 text-center">
          <div className="text-lg font-bold text-zinc-300 tabular-nums">{day.length}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">총 이벤트</div>
        </div>
      </div>

      {/* Top movers */}
      {(topPump.length > 0 || topDump.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {topPump.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-emerald-500 mb-1.5 uppercase tracking-wider">Top PUMP</div>
              <div className="space-y-1">
                {topPump.map(ev => (
                  <div key={ev.id} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-300">{baseCoin(ev.symbol)}</span>
                    <span className="text-emerald-400 font-semibold tabular-nums">+{fmt(ev.changePct)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {topDump.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-red-500 mb-1.5 uppercase tracking-wider">Top DUMP</div>
              <div className="space-y-1">
                {topDump.map(ev => (
                  <div key={ev.id} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-300">{baseCoin(ev.symbol)}</span>
                    <span className="text-red-400 font-semibold tabular-nums">{fmt(ev.changePct)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Signal Row ─────────────────────────────────────── */
function ScannerRow({ ev }: { ev: Event }) {
  const isPump  = ev.type === 'PUMP';
  const volMult = ev.volRatio ?? ev.volumeMult ?? 1;

  return (
    <div className={`flex items-center justify-between gap-3 border-l-2 px-4 py-3 transition-colors ${
      isPump
        ? 'border-emerald-500/50 hover:bg-emerald-500/[0.03]'
        : 'border-red-500/50 hover:bg-red-500/[0.03]'
    }`}>
      {/* 왼쪽: 유형 뱃지 + 심볼 */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold border ${
          isPump
            ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
            : 'border-red-500/25 bg-red-500/10 text-red-300'
        }`}>
          {isPump ? '▲ PUMP' : '▼ DUMP'}
        </span>
        <span className="font-bold text-sm text-zinc-100 truncate">{baseCoin(ev.symbol)}</span>
      </div>

      {/* 오른쪽: 변동폭 + 거래량 배수 + 시각 */}
      <div className="flex items-center gap-4 shrink-0">
        <span className={`text-sm font-bold tabular-nums w-16 text-right ${isPump ? 'text-emerald-300' : 'text-red-300'}`}>
          {ev.changePct > 0 ? '+' : ''}{fmt(ev.changePct)}%
        </span>
        <span className="text-xs font-semibold tabular-nums text-zinc-500 w-12 text-right">
          x{fmt(volMult, 1)}
        </span>
        <span className="text-xs text-zinc-600 tabular-nums w-10 text-right">{timeAgo(ev.detectedAt)}</span>
      </div>
    </div>
  );
}

/* ── Whale Compact Row ───────────────────────────────── */
function WhaleCompactRow({ w }: { w: WhaleEventRow }) {
  const isBuy  = w.direction === 'BUY';
  const isMix  = w.direction === 'MIXED';
  const absScore = Math.abs(w.score);
  const heat =
    absScore >= 40
      ? (isBuy ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.7)]' : 'bg-red-400 shadow-[0_0_5px_rgba(248,113,113,0.7)]')
      : 'bg-amber-400';
  const scoreColor = w.score > 0 ? 'text-emerald-300' : w.score < 0 ? 'text-red-300' : 'text-zinc-400';
  const dirBadge   = isBuy
    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
    : isMix ? 'border-amber-500/25 bg-amber-500/10 text-amber-300'
    : 'border-red-500/25 bg-red-500/10 text-red-300';

  function fmtUsd(v: number) {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    return `$${(v / 1_000).toFixed(0)}K`;
  }

  return (
    <div className="grid grid-cols-[10px_1fr_52px_56px_44px_36px] items-center gap-x-2 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
      <span className={`h-2 w-2 rounded-full ${heat}`} />
      <span className="font-semibold text-sm text-zinc-100 truncate">
        {w.symbol.replace(QUOTE_RE, '')}
      </span>
      <span className={`w-fit rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${dirBadge}`}>
        {w.direction}
      </span>
      <span className="text-xs font-semibold tabular-nums text-right text-zinc-300">
        {fmtUsd(w.tradeSize)}
      </span>
      <span className={`text-xs font-bold tabular-nums text-right ${scoreColor}`}>
        {w.score > 0 ? '+' : ''}{w.score}
      </span>
      <span className="text-[10px] text-zinc-600 tabular-nums text-right">{timeAgo(w.detectedAt)}</span>
    </div>
  );
}

/* ── Futures Compact Row ─────────────────────────────── */
interface FuturesAlertRow {
  id:         string;
  symbol:     string;
  alertType:  string;
  value:      number;
  markPrice?: number | null;
  note?:      string | null;
  detectedAt: string;
}

function FuturesCompactRow({ f }: { f: FuturesAlertRow }) {
  const isFunding = f.alertType === 'FUNDING';
  const isOiSurge = f.alertType === 'OI_SURGE';

  const eventStyle = isFunding
    ? 'border-violet-500/25 bg-violet-500/10 text-violet-300'
    : isOiSurge
    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
    : 'border-red-500/25 bg-red-500/10 text-red-300';

  const eventLabel = isFunding ? 'FUND' : 'OI';
  const valueStr   = isFunding
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
    <div className="grid grid-cols-[1fr_48px_72px_60px_36px] items-center gap-x-2 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
      <span className="font-bold text-sm text-zinc-100 truncate">
        {f.symbol.replace(QUOTE_RE, '')}
      </span>
      <span className={`w-fit rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${eventStyle}`}>
        {eventLabel}
      </span>
      <span className={`text-xs font-bold tabular-nums text-right ${valueColor}`}>
        {valueStr}
      </span>
      <span className={`w-fit rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${statusStyle}`}>
        {statusLabel}
      </span>
      <span className="text-[10px] text-zinc-600 tabular-nums text-right">{timeAgo(f.detectedAt)}</span>
    </div>
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
