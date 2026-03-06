import { Bell, Flame, Radar, Siren, TriangleAlert, Zap } from 'lucide-react';
import type { Stats } from './types';
import { fmt, baseCoin } from './utils';

interface SummaryCardProps {
  label: string;
  value: string | number;
  delta: string;
  sub: string;
  tone: 'neutral' | 'up' | 'down' | 'accent';
  icon: React.ElementType;
  pulse?: boolean;
}

function SummaryCard({ label, value, delta, sub, tone, icon: Icon, pulse }: SummaryCardProps) {
  const iconTone: Record<string, string> = {
    up:      'bg-emerald-500/10 text-emerald-300',
    down:    'bg-red-500/10 text-red-300',
    accent:  'bg-cyan-500/10 text-cyan-300',
    neutral: 'bg-white/5 text-zinc-300',
  };
  const deltaTone: Record<string, string> = {
    up:      'bg-emerald-500/10 text-emerald-300',
    down:    'bg-red-500/10 text-red-300',
    accent:  'bg-cyan-500/10 text-cyan-300',
    neutral: 'bg-white/5 text-zinc-400',
  };

  return (
    <div className="rounded-[24px] border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-4 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-zinc-400">{label}</div>
        <div className={`rounded-xl border border-white/10 p-2 ${iconTone[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 text-2xl font-semibold tracking-tight text-zinc-100">{value}</div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-1 flex items-center gap-1 ${deltaTone[tone]}`}>
          {pulse && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse inline-block" />}
          {delta}
        </span>
        <span className="text-zinc-500">{sub}</span>
      </div>
    </div>
  );
}

export function MarketSummaryCards({
  stats,
  liveCount,
}: {
  stats: Stats;
  liveCount: number;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      <SummaryCard
        label="오늘 감지"
        value={stats.todayTotal}
        delta={`총 ${stats.todayTotal}건`}
        sub="이벤트"
        tone="neutral"
        icon={Radar}
      />
      <SummaryCard
        label="PUMP"
        value={stats.todayPumps}
        delta={`+${stats.todayPumps}`}
        sub="실시간 상승 감지"
        tone="up"
        icon={Flame}
      />
      <SummaryCard
        label="DUMP"
        value={stats.todayDumps}
        delta={`+${stats.todayDumps}`}
        sub="실시간 하락 감지"
        tone="down"
        icon={TriangleAlert}
      />
      <SummaryCard
        label="최대 상승"
        value={stats.topPump ? `+${fmt(stats.topPump.changePct)}%` : '없음'}
        delta={stats.topPump ? baseCoin(stats.topPump.symbol) : '—'}
        sub="최고 변동폭"
        tone="up"
        icon={Zap}
      />
      <SummaryCard
        label="최대 하락"
        value={stats.topDump ? `${fmt(stats.topDump.changePct)}%` : '없음'}
        delta={stats.topDump ? baseCoin(stats.topDump.symbol) : '—'}
        sub="최고 변동폭"
        tone="down"
        icon={Siren}
      />
      <SummaryCard
        label="활성 신호"
        value={liveCount}
        delta={liveCount > 0 ? 'LIVE' : 'IDLE'}
        sub="최근 5분"
        tone={liveCount > 0 ? 'accent' : 'neutral'}
        icon={Bell}
        pulse={liveCount > 0}
      />
    </div>
  );
}
