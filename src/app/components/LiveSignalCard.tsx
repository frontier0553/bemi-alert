import type { Event } from './types';
import { fmt, timeAgo, signalStrength, volAboveAvg, formatPrice } from './utils';

export function LiveSignalCard({ ev }: { ev: Event }) {
  const isPump = ev.type === 'PUMP';
  const stars = signalStrength(ev.volumeMult, ev.changePct);

  const cardBorder  = isPump ? 'border-pump/30'  : 'border-dump/30';
  const cardGrad    = isPump
    ? 'bg-gradient-to-br from-surface-card to-[rgba(0,230,118,0.04)]'
    : 'bg-gradient-to-br from-surface-card to-[rgba(255,71,87,0.04)]';
  const changeColor = isPump ? 'text-pump' : 'text-dump';
  const badgeCls    = isPump
    ? 'bg-pump/10 text-pump border border-pump/30'
    : 'bg-dump/10 text-dump border border-dump/30';
  const starColor   = isPump ? 'text-pump' : 'text-dump';
  const fillColor   = isPump ? 'bg-pump'   : 'bg-dump';

  return (
    <div
      className={`rounded-2xl p-5 border ${cardBorder} ${cardGrad} flex flex-col gap-3.5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30`}
    >
      {/* Top row: badge + time */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${badgeCls}`}>
          {isPump ? '▲ PUMP 신호' : '▼ DUMP 신호'}
        </span>
        <span className="text-xs text-ink-secondary">{timeAgo(ev.detectedAt)}</span>
      </div>

      {/* Symbol + Change % */}
      <div>
        <div className="text-[22px] font-extrabold tracking-tight text-ink-primary leading-none mb-1">
          {ev.symbol}
        </div>
        <div className={`text-[38px] font-extrabold tracking-tighter leading-tight ${changeColor}`}>
          {ev.changePct > 0 ? '+' : ''}{fmt(ev.changePct)}%
        </div>
      </div>

      {/* Stats block */}
      <div className="grid grid-cols-2 gap-3 p-3.5 bg-surface-elevated rounded-xl border border-edge-subtle">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-ghost">
            거래량 급증
          </span>
          <span className="text-base font-bold text-ink-primary">
            x{fmt(ev.volumeMult, 1)}
          </span>
          <span className="text-[11px] text-ink-secondary">{volAboveAvg(ev.volumeMult)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-ghost">
            현재가
          </span>
          <span className="text-base font-bold text-ink-primary">{formatPrice(ev.price)}</span>
        </div>
      </div>

      {/* Strength bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-ghost">
            신호 강도
          </span>
          <span className={`text-[15px] tracking-wider ${starColor}`}>
            {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
          </span>
        </div>
        <div className="h-1 bg-edge-subtle rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${fillColor}`}
            style={{ width: `${(stars / 5) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
