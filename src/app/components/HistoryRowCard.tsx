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
    <>
      {/* 모바일 카드 */}
      <div className="block sm:hidden px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
        <div className="grid grid-cols-[52px_1fr_56px_44px] items-center gap-x-2">
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${badgeCls}`}>
            {isPump ? '▲ PUMP' : '▼ DUMP'}
          </span>
          <span className="font-bold text-sm text-zinc-100 truncate">{baseCoin(ev.symbol)}</span>
          <span className={`text-sm font-bold tabular-nums text-right ${changeColor}`}>
            {ev.changePct > 0 ? '+' : ''}{fmt(ev.changePct)}%
          </span>
          <span className="text-xs text-zinc-600 tabular-nums text-right">{timeAgo(ev.detectedAt)}</span>
        </div>
        <div className="mt-0.5 pl-[60px] flex gap-2 text-xs text-zinc-500">
          <span>x{fmt(ev.volumeMult, 1)} · {volAboveAvg(ev.volumeMult)}</span>
          <span className="text-zinc-600">{formatPrice(ev.price)}</span>
        </div>
      </div>

      {/* 데스크탑 테이블 행 */}
      <div className="hidden sm:grid grid-cols-[200px_100px_160px_120px_1fr] items-center gap-x-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold border ${badgeCls}`}>
            {isPump ? '▲ PUMP' : '▼ DUMP'}
          </span>
          <span className="font-bold text-sm text-zinc-100 truncate">{baseCoin(ev.symbol)}</span>
        </div>
        <span className={`text-sm font-bold tabular-nums ${changeColor}`}>
          {ev.changePct > 0 ? '+' : ''}{fmt(ev.changePct)}%
        </span>
        <div className="flex flex-col">
          <span className="text-sm text-zinc-200">x{fmt(ev.volumeMult, 1)}</span>
          <span className="text-[11px] text-zinc-500">{volAboveAvg(ev.volumeMult)}</span>
        </div>
        <span className="text-sm tabular-nums text-zinc-500">{formatPrice(ev.price)}</span>
        <span className="text-xs text-zinc-600 tabular-nums text-right">{timeAgo(ev.detectedAt)}</span>
      </div>
    </>
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
    <>
      {/* 모바일 카드 */}
      <div className="block sm:hidden px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
        <div className="grid grid-cols-[52px_1fr_56px_44px] items-center gap-x-2">
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${badgeCls}`}>
            {badgeLabel}
          </span>
          <span className="font-bold text-sm text-zinc-100 truncate">{baseCoin(g.symbol)}</span>
          <span className={`text-sm font-bold tabular-nums text-right ${changeColor}`}>
            {g.strongest.changePct > 0 ? '+' : ''}{fmt(g.strongest.changePct)}%
          </span>
          <div className="flex flex-col items-end">
            <span className="text-xs text-zinc-600 tabular-nums">{timeAgo(g.latest.detectedAt)}</span>
            {g.count > 1 && (
              <span className="px-1 py-0 rounded-full text-[9px] font-semibold bg-violet-500/10 border border-violet-500/25 text-violet-300">
                🔥{g.count}회
              </span>
            )}
          </div>
        </div>
        <div className="mt-0.5 pl-[60px] flex gap-2 text-xs text-zinc-500">
          <span>x{fmt(g.latest.volumeMult, 1)} · {volAboveAvg(g.latest.volumeMult)}</span>
          <span className="text-zinc-600">{formatPrice(g.latest.price)}</span>
        </div>
      </div>

      {/* 데스크탑 테이블 행 */}
      <div className="hidden sm:grid grid-cols-[200px_100px_160px_120px_1fr] items-center gap-x-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold border ${badgeCls}`}>
            {badgeLabel}
          </span>
          <span className="font-bold text-sm text-zinc-100 truncate">{baseCoin(g.symbol)}</span>
        </div>
        <span className={`text-sm font-bold tabular-nums ${changeColor}`}>
          {g.strongest.changePct > 0 ? '+' : ''}{fmt(g.strongest.changePct)}%
        </span>
        <div className="flex flex-col">
          <span className="text-sm text-zinc-200">x{fmt(g.latest.volumeMult, 1)}</span>
          <span className="text-[11px] text-zinc-500">{volAboveAvg(g.latest.volumeMult)}</span>
        </div>
        <span className="text-sm tabular-nums text-zinc-500">{formatPrice(g.latest.price)}</span>
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-zinc-600 tabular-nums">{timeAgo(g.latest.detectedAt)}</span>
          {g.count > 1 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 border border-violet-500/25 text-violet-300">
              🔥 {g.count}회
            </span>
          )}
        </div>
      </div>
    </>
  );
}
