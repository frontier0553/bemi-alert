import type { Event, GroupedSymbol } from './types';
import { fmt, timeAgo, volAboveAvg, formatPrice, baseCoin } from './utils';

/* ── Raw event row ─────────────────────────────────────────── */
export function RawEventRow({ ev }: { ev: Event }) {
  const isPump      = ev.type === 'PUMP';
  const borderColor = isPump ? 'border-l-pump' : 'border-l-dump';
  const changeColor = isPump ? 'text-pump'     : 'text-dump';
  const badgeCls    = isPump
    ? 'bg-pump/10 text-pump border-pump/30'
    : 'bg-dump/10 text-dump border-dump/30';

  return (
    <div
      className={`flex items-center gap-4 px-5 py-4 border-b border-white/5 border-l-2 ${borderColor} hover:bg-white/[0.02] transition-colors`}
    >
      {/* Type + Symbol */}
      <div className="flex items-center gap-2.5 w-52 min-w-0 shrink-0">
        <span className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-bold border ${badgeCls}`}>
          {isPump ? '▲ PUMP' : '▼ DUMP'}
        </span>
        <span className="font-bold text-[15px] text-zinc-200 truncate">{baseCoin(ev.symbol)}</span>
      </div>

      {/* Change % */}
      <div className={`text-lg font-semibold tabular-nums w-24 shrink-0 ${changeColor}`}>
        {ev.changePct > 0 ? '+' : ''}{fmt(ev.changePct)}%
      </div>

      {/* Volume */}
      <div className="flex flex-col w-36 shrink-0">
        <span className="text-sm font-semibold text-zinc-200">x{fmt(ev.volumeMult, 1)}</span>
        <span className="text-xs text-zinc-500">{volAboveAvg(ev.volumeMult)}</span>
      </div>

      {/* Price */}
      <div className="text-sm tabular-nums text-zinc-500 w-28 shrink-0">
        {formatPrice(ev.price)}
      </div>

      {/* Time */}
      <div className="text-xs text-zinc-500 ml-auto shrink-0">{timeAgo(ev.detectedAt)}</div>
    </div>
  );
}

/* ── Grouped symbol row ────────────────────────────────────── */
export function GroupedRow({ g }: { g: GroupedSymbol }) {
  const isMix  = g.dominantType === 'BOTH';
  const isPump = g.dominantType === 'PUMP';

  const borderColor = isMix ? 'border-l-mix'  : isPump ? 'border-l-pump'  : 'border-l-dump';
  const changeColor =          g.strongest.type === 'PUMP' ? 'text-pump' : 'text-dump';
  const badgeCls    = isMix
    ? 'bg-mix/10 text-mix border-mix/30'
    : isPump
    ? 'bg-pump/10 text-pump border-pump/30'
    : 'bg-dump/10 text-dump border-dump/30';
  const badgeLabel  = isMix ? '⚡ MIX' : isPump ? '▲ PUMP' : '▼ DUMP';

  return (
    <div
      className={`flex items-center gap-4 px-5 py-4 border-b border-white/5 border-l-2 ${borderColor} hover:bg-white/[0.02] transition-colors`}
    >
      {/* Type + Symbol */}
      <div className="flex items-center gap-2.5 w-52 min-w-0 shrink-0">
        <span className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-bold border ${badgeCls}`}>
          {badgeLabel}
        </span>
        <span className="font-bold text-[15px] text-zinc-200 truncate">{baseCoin(g.symbol)}</span>
      </div>

      {/* Strongest change */}
      <div className={`text-lg font-semibold tabular-nums w-24 shrink-0 ${changeColor}`}>
        {g.strongest.changePct > 0 ? '+' : ''}{fmt(g.strongest.changePct)}%
      </div>

      {/* Volume */}
      <div className="flex flex-col w-36 shrink-0">
        <span className="text-sm font-semibold text-zinc-200">x{fmt(g.latest.volumeMult, 1)}</span>
        <span className="text-xs text-zinc-500">{volAboveAvg(g.latest.volumeMult)}</span>
      </div>

      {/* Price */}
      <div className="text-sm tabular-nums text-zinc-500 w-28 shrink-0">
        {formatPrice(g.latest.price)}
      </div>

      {/* Time + Count */}
      <div className="flex items-center gap-3 ml-auto shrink-0">
        <span className="text-xs text-zinc-500">{timeAgo(g.latest.detectedAt)}</span>
        {g.count > 1 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-signal/10 border border-signal/30 text-signal">
            🔥 {g.count}회
          </span>
        )}
      </div>
    </div>
  );
}
