'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, TrendingUp, TrendingDown, Waves, Bell } from 'lucide-react';

// ── 타입 ────────────────────────────────────────────────────
type SignalItem = {
  id: string; kind: 'signal'; type: string;
  symbol: string; changePct: number; volRatio: number;
  changeWindow: string; detectedAt: string;
};
type WhaleItem = {
  id: string; kind: 'whale'; type: string;
  symbol: string; score: number; tradeSize: number; detectedAt: string;
};
type FuturesItem = {
  id: string; kind: 'futures'; type: string;
  symbol: string; value: number; note?: string | null; detectedAt: string;
};
type AlertItem = SignalItem | WhaleItem | FuturesItem;

const QUOTE_RE = /(USDT|USDC|BUSD|FDUSD|TUSD)$/;
function baseCoin(s: string) { return s.replace(QUOTE_RE, ''); }
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}
function fmt(n: number, d = 2) { return n.toFixed(d); }
function fmtUsd(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  return `$${(v / 1_000).toFixed(0)}K`;
}

// ── 행 컴포넌트 ──────────────────────────────────────────────
function AlertRow({ item }: { item: AlertItem }) {
  if (item.kind === 'signal') {
    const isPump = item.type === 'PUMP';
    return (
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors border-b border-white/[0.04] last:border-0">
        <span className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-bold border ${
          isPump ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                 : 'border-red-500/25 bg-red-500/10 text-red-300'
        }`}>
          {isPump ? '▲ PUMP' : '▼ DUMP'}
        </span>
        <span className="w-20 shrink-0 font-bold text-sm text-zinc-100">{baseCoin(item.symbol)}</span>
        <span className={`w-20 shrink-0 text-sm font-bold tabular-nums ${isPump ? 'text-emerald-300' : 'text-red-300'}`}>
          {item.changePct > 0 ? '+' : ''}{fmt(item.changePct)}%
          <span className="ml-1 text-[10px] text-zinc-600">({item.changeWindow})</span>
        </span>
        <span className="text-xs text-zinc-500 tabular-nums">vol ×{fmt(item.volRatio, 1)}</span>
        <span className="ml-auto text-xs text-zinc-600 tabular-nums">{timeAgo(item.detectedAt)}</span>
      </div>
    );
  }

  if (item.kind === 'whale') {
    const isBuy = item.type === 'BUY';
    const scoreColor = item.score > 0 ? 'text-emerald-300' : 'text-red-300';
    return (
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors border-b border-white/[0.04] last:border-0">
        <span className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-bold border ${
          isBuy ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
               : item.type === 'MIXED' ? 'border-amber-500/25 bg-amber-500/10 text-amber-300'
               : 'border-red-500/25 bg-red-500/10 text-red-300'
        }`}>
          🐋 {item.type}
        </span>
        <span className="w-20 shrink-0 font-bold text-sm text-zinc-100">{baseCoin(item.symbol)}</span>
        <span className={`w-20 shrink-0 text-sm font-bold tabular-nums ${scoreColor}`}>
          {item.score > 0 ? '+' : ''}{item.score}
          <span className="ml-1 text-[10px] text-zinc-600">압력</span>
        </span>
        <span className="text-xs text-zinc-500">{fmtUsd(item.tradeSize)}</span>
        <span className="ml-auto text-xs text-zinc-600 tabular-nums">{timeAgo(item.detectedAt)}</span>
      </div>
    );
  }

  // futures
  const isFunding = item.type === 'FUNDING';
  const isOiSurge = item.type === 'OI_SURGE';
  const valueColor = item.value > 0 ? 'text-emerald-300' : 'text-red-300';
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors border-b border-white/[0.04] last:border-0">
      <span className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-bold border ${
        isFunding ? 'border-violet-500/25 bg-violet-500/10 text-violet-300'
          : isOiSurge ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
          : 'border-red-500/25 bg-red-500/10 text-red-300'
      }`}>
        {isFunding ? '💸 펀딩비' : isOiSurge ? '📈 OI↑' : '📉 OI↓'}
      </span>
      <span className="w-20 shrink-0 font-bold text-sm text-zinc-100">{baseCoin(item.symbol)}</span>
      <span className={`w-20 shrink-0 text-sm font-bold tabular-nums ${valueColor}`}>
        {item.value > 0 ? '+' : ''}{isFunding ? item.value.toFixed(4) : item.value.toFixed(2)}%
      </span>
      {item.note && <span className="text-xs text-zinc-500">{item.note}</span>}
      <span className="ml-auto text-xs text-zinc-600 tabular-nums">{timeAgo(item.detectedAt)}</span>
    </div>
  );
}

// ── 페이지 ───────────────────────────────────────────────────
type KindFilter = 'ALL' | 'signal' | 'whale' | 'futures';

export default function UserAlertsPage() {
  const router = useRouter();
  const [timeline, setTimeline] = useState<AlertItem[]>([]);
  const [coinFilter, setCoinFilter] = useState<string[] | null>(null);
  const [tier, setTier]         = useState<string>('FREE');
  const [days, setDays]         = useState<number>(7);
  const [loading, setLoading]   = useState(true);
  const [kind, setKind]         = useState<KindFilter>('ALL');

  useEffect(() => {
    fetch('/api/user/alerts')
      .then(r => {
        if (r.status === 401) { router.replace('/login'); return null; }
        return r.json();
      })
      .then(d => {
        if (!d) return;
        setTimeline(d.timeline);
        setCoinFilter(d.coinFilter);
        setTier(d.tier ?? 'FREE');
        setDays(d.days ?? 7);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = kind === 'ALL' ? timeline : timeline.filter(t => t.kind === kind);

  return (
    <div className="min-h-screen bg-[#06080d] text-zinc-100">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.05),transparent_25%)]" />

      {/* Header */}
      <header className="relative z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[900px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
              <Zap className="h-4 w-4 text-cyan-300" />
            </div>
            <span className="text-base font-bold tracking-tight">Bemi Alert</span>
          </div>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">← 대시보드</Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-[900px] px-5 py-6 flex flex-col gap-5">

        {/* 타이틀 */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bell className="h-5 w-5 text-cyan-300" /> 내 알림 이력
              </h1>
              {tier === 'PRO' && (
                <span className="rounded-full bg-cyan-400/15 border border-cyan-400/25 px-2.5 py-0.5 text-[11px] font-bold text-cyan-300">PRO</span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              최근 {days}일 · {coinFilter ? `코인 필터: ${coinFilter.join(', ')}` : '전체 코인'}
              {tier !== 'PRO' && (
                <a href="/pricing" className="ml-2 text-cyan-600 hover:text-cyan-400">PRO로 30일 연장 →</a>
              )}
            </p>
          </div>
          {/* 종류 필터 */}
          <div className="flex gap-1">
            {(['ALL', 'signal', 'whale', 'futures'] as KindFilter[]).map(k => (
              <button key={k} onClick={() => setKind(k)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  kind === k
                    ? 'bg-white/10 text-zinc-100 border border-white/15'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}>
                {k === 'ALL' ? '전체' : k === 'signal' ? 'PUMP/DUMP' : k === 'whale' ? '고래' : '선물'}
              </button>
            ))}
          </div>
        </div>

        {/* 통계 */}
        {!loading && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: '전체',      count: timeline.length,                                  color: 'text-zinc-300' },
              { label: 'PUMP/DUMP', count: timeline.filter(t => t.kind === 'signal').length, color: 'text-emerald-300' },
              { label: '고래',      count: timeline.filter(t => t.kind === 'whale').length,  color: 'text-cyan-300' },
              { label: '선물',      count: timeline.filter(t => t.kind === 'futures').length,color: 'text-violet-300' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
                <div className={`text-xl font-bold ${s.color}`}>{s.count}</div>
                <div className="text-xs text-zinc-600 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* 타임라인 */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
          {/* 컬럼 헤더 */}
          <div className="flex items-center gap-3 border-b border-white/5 bg-black/20 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <span className="w-20 shrink-0">유형</span>
            <span className="w-20 shrink-0">심볼</span>
            <span className="w-20 shrink-0">수치</span>
            <span>상세</span>
            <span className="ml-auto">시각</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-zinc-600">로딩 중...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-600">
              최근 7일 내 알림 없음
              {coinFilter && (
                <div className="mt-1 text-xs text-zinc-700">
                  코인 필터 적용 중: {coinFilter.join(', ')}
                  <Link href="/user/settings" className="ml-2 text-cyan-600 hover:underline">설정 변경</Link>
                </div>
              )}
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              {filtered.map(item => <AlertRow key={item.id} item={item} />)}
            </div>
          )}
        </div>

        {/* 설정 안내 */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 flex items-center justify-between">
          <div className="text-xs text-zinc-500">
            관심 코인 필터나 임계값을 조정하면 표시되는 이력이 달라집니다.
          </div>
          <Link href="/user/settings" className="text-xs text-cyan-400 hover:underline shrink-0 ml-4">
            내 설정 →
          </Link>
        </div>

      </main>
    </div>
  );
}
