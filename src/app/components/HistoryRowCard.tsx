import type { Event, GroupedSymbol } from './types';
import { fmt, timeAgo, volAboveAvg, formatPrice, baseCoin } from './utils';

/* ── Raw event row ─────────────────────────────────────────── */
export function RawEventRow({ ev }: { ev: Event }) {
  const isPump      = ev.type === 'PUMP';
  const changeColor = isPump ? 'text-emerald-300' : 'text-red-300';
  const badgeCls    = isPump
    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
    : 'border-red-500/25 bg-red-500/10 text-red-300';

  return (
    <div className="grid grid-cols-[200px_100px_160px_120px_1fr] items-center gap-x-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
      {/* Type + Symbol */}
      <div className="flex items-center gap-2 min-w-0">
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold border ${badgeCls}`}>
          {isPump ? '▲ PUMP' : '▼ DUMP'}
        </span>
        <span className="font-bold text-sm text-zinc-100 truncate">{baseCoin(ev.symbol)}</span>
      </div>

      {/* Change % */}
      <span className={`text-sm font-bold tabular-nums ${changeColor}`}>
        {ev.changePct > 0 ? '+' : ''}{fmt(ev.changePct)}%
      </span>

      {/* Volume */}
      <div className="flex flex-col">
        <span className="text-sm text-zinc-200">x{fmt(ev.volumeMult, 1)}</span>
        <span className="text-[11px] text-zinc-500">{volAboveAvg(ev.volumeMult)}</span>
      </div>

      {/* Price */}
      <span className="text-sm tabular-nums text-zinc-500">{formatPrice(ev.price)}</span>

      {/* Time */}
      <span className="text-xs text-zinc-600 tabular-nums text-right">{timeAgo(ev.detectedAt)}</span>
    </div>
  );
}

/* ── Grouped symbol row ────────────────────────────────────── */
export function GroupedRow({ g }: { g: GroupedSymbol }) {
  const isMix  = g.dominantType === 'BOTH';
  const isPump = g.dominantType === 'PUMP';

  const changeColor = g.strongest.type === 'PUMP' ? 'text-emerald-300' : 'text-red-300';
  const badgeCls    = isMix
    ? 'border-amber-500/25 bg-amber-500/10 text-amber-300'
    : isPump
    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
    : 'border-red-500/25 bg-red-500/10 text-red-300';
  const badgeLabel  = isMix ? '⚡ MIX' : isPump ? '▲ PUMP' : '▼ DUMP';

  return (
    <div className="grid grid-cols-[200px_100px_160px_120px_1fr] items-center gap-x-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
      {/* Type + Symbol */}
      <div className="flex items-center gap-2 min-w-0">
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold border ${badgeCls}`}>
          {badgeLabel}
        </span>
        <span className="font-bold text-sm text-zinc-100 truncate">{baseCoin(g.symbol)}</span>
      </div>

      {/* Strongest change */}
      <span className={`text-sm font-bold tabular-nums ${changeColor}`}>
        {g.strongest.changePct > 0 ? '+' : ''}{fmt(g.strongest.changePct)}%
      </span>

      {/* Volume */}
      <div className="flex flex-col">
        <span className="text-sm text-zinc-200">x{fmt(g.latest.volumeMult, 1)}</span>
        <span className="text-[11px] text-zinc-500">{volAboveAvg(g.latest.volumeMult)}</span>
      </div>

      {/* Price */}
      <span className="text-sm tabular-nums text-zinc-500">{formatPrice(g.latest.price)}</span>

      {/* Time + Count */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-zinc-600 tabular-nums">{timeAgo(g.latest.detectedAt)}</span>
        {g.count > 1 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 border border-violet-500/25 text-violet-300">
            🔥 {g.count}회
          </span>
        )}
      </div>
    </div>
  );
}
