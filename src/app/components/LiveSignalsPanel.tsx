import type { Event } from './types';
import { LiveSignalCard } from './LiveSignalCard';

const LIVE_WINDOW_MINS = 5;

export function LiveSignalsPanel({
  events,
  countdown,
  loading,
}: {
  events: Event[];
  countdown: number;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 bg-surface-card rounded-2xl border border-edge-subtle">
        <span className="text-ink-secondary text-sm">로딩 중...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 bg-surface-card border border-dashed border-edge-medium rounded-2xl">
        <div className="w-10 h-10 rounded-full bg-surface-elevated border border-edge-medium flex items-center justify-center text-xl">
          🔍
        </div>
        <p className="text-sm font-medium text-ink-secondary">
          마켓 조용 — 최근 {LIVE_WINDOW_MINS}분간 감지된 신호 없음
        </p>
        <div className="flex items-center gap-2 text-xs text-ink-ghost">
          <span className="w-1.5 h-1.5 rounded-full bg-signal animate-blink inline-block" />
          다음 스캔까지{' '}
          <span className="tabular-nums font-semibold text-ink-secondary">{countdown}s</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {events.map(ev => (
        <LiveSignalCard key={ev.id} ev={ev} />
      ))}
    </div>
  );
}
