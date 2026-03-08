import type { Event, GroupedSymbol } from './types';
import { RawEventRow, GroupedRow } from './HistoryRowCard';

export function HistoryTable({
  events,
  grouped,
  groupBy,
}: {
  events: Event[];
  grouped: GroupedSymbol[];
  groupBy: boolean;
}) {
  return (
    <div className="bg-[#06080d] border border-white/10 rounded-2xl overflow-hidden overflow-x-auto">
      {/* Column headers */}
      <div className="flex items-center gap-4 px-5 py-2 border-b border-white/5 bg-black/20">
        <div className="w-52 shrink-0 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          타입 / 심볼
        </div>
        <div className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          최대 가격 변동
          <div className="text-[11px] normal-case tracking-normal text-zinc-600 font-normal mt-0.5">
            현재 시점 기준 24h 롤링
          </div>
        </div>
        <div className="w-36 shrink-0 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          거래량 증가
        </div>
        <div className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          현재가
        </div>
        <div className="ml-auto text-xs font-semibold uppercase tracking-wider text-zinc-400 text-right">
          {groupBy ? '마지막 감지 / 횟수' : '감지 시각'}
        </div>
      </div>

      {/* Rows */}
      {groupBy
        ? grouped.map(g => <GroupedRow key={g.symbol} g={g} />)
        : events.map(ev => <RawEventRow key={ev.id} ev={ev} />)
      }
    </div>
  );
}
