'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Bell } from 'lucide-react';

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

// ── 유틸 ────────────────────────────────────────────────────
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

// ── 포맷팅 / 해석 유틸 ──────────────────────────────────────

/** 분류 배지: 선물(보라) / 고래(청록) / 급등락(타입에 따라 분기) */
function categoryBadge(item: AlertItem): { label: string; style: string } {
  if (item.kind === 'futures') {
    return { label: '선물', style: 'border-violet-500/25 bg-violet-500/10 text-violet-300' };
  }
  if (item.kind === 'whale') {
    return { label: '고래', style: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300' };
  }
  return item.type === 'PUMP'
    ? { label: '급등락', style: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' }
    : { label: '급등락', style: 'border-red-500/25 bg-red-500/10 text-red-300' };
}

/** 신호 배지: 항목 종류별 핵심 신호명 */
function signalBadge(item: AlertItem): { label: string; style: string } {
  if (item.kind === 'futures') {
    if (item.type === 'FUNDING')  return { label: '펀딩비',    style: 'border-violet-500/20 bg-violet-500/5 text-violet-400' };
    if (item.type === 'OI_SURGE') return { label: '미결제약정', style: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' };
    if (item.type === 'OI_DROP')  return { label: '미결제약정', style: 'border-red-500/20 bg-red-500/5 text-red-400' };
    return                               { label: '청산',      style: 'border-orange-500/20 bg-orange-500/5 text-orange-400' };
  }
  if (item.kind === 'whale') {
    if (item.type === 'BUY')   return { label: '매수 우세', style: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' };
    if (item.type === 'SELL')  return { label: '매도 우세', style: 'border-red-500/20 bg-red-500/5 text-red-400' };
    return                            { label: '혼조',     style: 'border-amber-500/20 bg-amber-500/5 text-amber-400' };
  }
  return item.type === 'PUMP'
    ? { label: '급등', style: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' }
    : { label: '급락', style: 'border-red-500/20 bg-red-500/5 text-red-400' };
}

/** 수치 포맷 */
function formatValue(item: AlertItem): { text: string; color: string } {
  if (item.kind === 'futures') {
    const v = item.value;
    const text = `${v > 0 ? '+' : ''}${item.type === 'FUNDING' ? v.toFixed(4) : v.toFixed(2)}%`;
    return { text, color: v > 0 ? 'text-emerald-300' : 'text-red-300' };
  }
  if (item.kind === 'whale') {
    return {
      text:  `${item.score > 0 ? '+' : ''}${item.score} 압력`,
      color: item.score > 0 ? 'text-emerald-300' : 'text-red-300',
    };
  }
  return {
    text:  `${item.changePct > 0 ? '+' : ''}${fmt(item.changePct)}%`,
    color: item.changePct > 0 ? 'text-emerald-300' : 'text-red-300',
  };
}

/** 해석 문구 (영문 코드 → 한국어) */
function formatNote(item: AlertItem): string {
  if (item.kind === 'futures') {
    if (item.type === 'OI_SURGE') return '약정 급증';
    if (item.type === 'OI_DROP')  return '약정 감소';
    if (item.type === 'LIQUIDATION') {
      const raw = (item.note ?? '').toUpperCase();
      if (raw.includes('LONG'))  return '롱 청산 급증';
      if (raw.includes('SHORT')) return '숏 청산 급증';
      return '청산 급증';
    }
    // FUNDING
    const raw = (item.note ?? '').toUpperCase().replace(/\s+/g, '_');
    const map: Record<string, string> = {
      SHORT_EXTREME: '숏 과열', LONG_EXTREME: '롱 과열',
      SHORT_HOT:     '숏 과열', LONG_HOT:     '롱 과열',
      NEUTRAL:       '중립',
    };
    return map[raw] ?? item.note ?? '—';
  }
  if (item.kind === 'whale') {
    const s = fmtUsd(item.tradeSize);
    if (item.type === 'BUY')  return `${s} 매수`;
    if (item.type === 'SELL') return `${s} 매도`;
    return `${s} 혼조`;
  }
  // signal
  const isPump = item.type === 'PUMP';
  if (item.volRatio >= 3) return isPump ? '거래량 동반 급등' : '거래량 동반 급락';
  return isPump ? '단기 급등' : '단기 급락';
}

/** 해석 텍스트 색상 */
function noteColor(item: AlertItem): string {
  if (item.kind === 'futures') {
    const raw = (item.note ?? item.type ?? '').toUpperCase();
    if (raw.includes('SHORT') || raw.includes('DROP') || raw.includes('LONG_LIQ')) return 'text-red-400';
    if (raw.includes('LONG') || raw.includes('SURGE') || raw.includes('SHORT_LIQ')) return 'text-emerald-400';
    return 'text-zinc-400';
  }
  if (item.kind === 'whale') {
    if (item.type === 'BUY')  return 'text-emerald-400';
    if (item.type === 'SELL') return 'text-red-400';
    return 'text-amber-400';
  }
  return item.type === 'PUMP' ? 'text-emerald-400' : 'text-red-400';
}

// ── 공통 그리드 ──────────────────────────────────────────────
const GRID = 'grid grid-cols-[52px_56px_76px_80px_1fr_60px] sm:grid-cols-[60px_72px_90px_90px_1fr_68px]';

// ── 행 컴포넌트 ──────────────────────────────────────────────
function AlertRow({ item }: { item: AlertItem }) {
  const cat  = categoryBadge(item);
  const sig  = signalBadge(item);
  const val  = formatValue(item);
  const note = formatNote(item);
  const nc   = noteColor(item);

  return (
    <div className={`${GRID} items-center gap-x-3 px-4 py-3 hover:bg-white/[0.03] transition-colors border-b border-white/[0.04] last:border-0`}>
      <span className={`w-fit rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${cat.style}`}>
        {cat.label}
      </span>
      <span className="font-bold text-sm text-zinc-100 truncate">
        {baseCoin(item.symbol)}
      </span>
      <span className={`w-fit rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${sig.style}`}>
        {sig.label}
      </span>
      <span className={`text-sm font-bold tabular-nums ${val.color}`}>
        {val.text}
      </span>
      <span className={`text-xs truncate ${nc}`}>
        {note}
      </span>
      <span className="text-[10px] text-zinc-600 tabular-nums text-right whitespace-nowrap">
        {timeAgo(item.detectedAt)}
      </span>
    </div>
  );
}

// ── 탭 정의 ──────────────────────────────────────────────────
type KindFilter = 'ALL' | 'signal' | 'whale' | 'futures';
const TABS: { key: KindFilter; label: string }[] = [
  { key: 'ALL',     label: '전체'    },
  { key: 'signal',  label: '급등락'  },
  { key: 'whale',   label: '고래 흐름' },
  { key: 'futures', label: '선물 신호' },
];

// ── 페이지 ───────────────────────────────────────────────────
export default function UserAlertsPage() {
  const router = useRouter();
  const [timeline, setTimeline] = useState<AlertItem[]>([]);
  const [coinFilter, setCoinFilter] = useState<string[] | null>(null);
  const [tier, setTier]  = useState<string>('FREE');
  const [days, setDays]  = useState<number>(7);
  const [loading, setLoading] = useState(true);
  const [kind, setKind]  = useState<KindFilter>('ALL');

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

  const stats = [
    { label: '전체',     count: timeline.length,                                    color: 'text-zinc-300'   },
    { label: '급등락',   count: timeline.filter(t => t.kind === 'signal').length,   color: 'text-emerald-300' },
    { label: '고래 흐름', count: timeline.filter(t => t.kind === 'whale').length,   color: 'text-cyan-300'   },
    { label: '선물 신호', count: timeline.filter(t => t.kind === 'futures').length, color: 'text-violet-300' },
  ];

  return (
    <div className="min-h-screen bg-[#06080d] text-zinc-100">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.05),transparent_25%)]" />

      <header className="relative z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[900px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
              <Zap className="h-4 w-4 text-cyan-300" />
            </div>
            <span className="text-base font-bold tracking-tight">Bemi Alert</span>
          </div>
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-300">← 대시보드</Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-[900px] px-5 py-6 flex flex-col gap-5">

        {/* 타이틀 + 탭 */}
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
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setKind(tab.key)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  kind === tab.key
                    ? 'bg-white/10 text-zinc-100 border border-white/15'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 통계 카드 */}
        {!loading && (
          <div className="grid grid-cols-4 gap-3">
            {stats.map(s => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
                <div className={`text-xl font-bold ${s.color}`}>{s.count}</div>
                <div className="text-xs text-zinc-600 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* 타임라인 테이블 */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
          <div className={`${GRID} items-center gap-x-3 border-b border-white/5 bg-black/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500`}>
            <span>분류</span>
            <span>코인</span>
            <span>신호</span>
            <span>수치</span>
            <span>해석</span>
            <span className="text-right whitespace-nowrap">감지 시각</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-zinc-600">로딩 중...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-600">
              최근 {days}일 내 알림 없음
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
          <p className="text-xs text-zinc-500">
            관심 코인 필터나 임계값을 조정하면 표시되는 이력이 달라집니다.
          </p>
          <Link href="/user/settings" className="text-xs text-cyan-400 hover:underline shrink-0 ml-4">
            내 설정 →
          </Link>
        </div>

      </main>
    </div>
  );
}
