import type { Stats } from './types';
import { fmt } from './utils';

interface StatCardProps {
  label: string;
  value: string | number;
  sub: string;
  accent: 'pump' | 'dump' | 'signal' | 'neutral';
  pulse?: boolean;
}

function StatCard({ label, value, sub, accent, pulse }: StatCardProps) {
  const borderBg: Record<string, string> = {
    pump:    'border-pump/25 bg-pump/5',
    dump:    'border-dump/25 bg-dump/5',
    signal:  'border-signal/40 bg-signal/10',
    neutral: 'border-edge-subtle',
  };
  const valueColor: Record<string, string> = {
    pump:    'text-pump',
    dump:    'text-dump',
    signal:  'text-signal',
    neutral: 'text-ink-primary',
  };

  return (
    <div className={`bg-surface-card rounded-2xl p-4 border ${borderBg[accent]} flex flex-col gap-1 transition-colors hover:border-edge-medium`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-secondary">
        {pulse && (
          <span className="w-1.5 h-1.5 rounded-full bg-signal animate-blink inline-block shrink-0" />
        )}
        {label}
      </div>
      <div className={`text-[28px] font-bold leading-none tracking-tight mt-1 ${valueColor[accent]}`}>
        {value}
      </div>
      <div className="text-[13px] text-ink-secondary mt-0.5">{sub}</div>
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard
        label="오늘 총 감지"
        value={stats.todayTotal}
        sub="이벤트"
        accent="neutral"
      />
      <StatCard
        label="▲ 급등 PUMP"
        value={stats.todayPumps}
        sub="오늘"
        accent="pump"
      />
      <StatCard
        label="▼ 급락 DUMP"
        value={stats.todayDumps}
        sub="오늘"
        accent="dump"
      />
      <StatCard
        label="🏆 최강 급등"
        value={stats.topPump ? `+${fmt(stats.topPump.changePct)}%` : '없음'}
        sub={stats.topPump?.symbol ?? '—'}
        accent="pump"
      />
      <StatCard
        label="💀 최강 급락"
        value={stats.topDump ? `${fmt(stats.topDump.changePct)}%` : '없음'}
        sub={stats.topDump?.symbol ?? '—'}
        accent="dump"
      />
      <StatCard
        label="현재 활성"
        value={liveCount}
        sub="최근 5분"
        accent={liveCount > 0 ? 'signal' : 'neutral'}
        pulse={liveCount > 0}
      />
    </div>
  );
}
