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
    <div className="overflow-x-auto">
      {/* 컬럼 헤더 */}
      <div className="grid grid-cols-[200px_100px_160px_120px_1fr] items-center gap-x-3 border-b border-white/5 bg-black/20 px-4 py-2 text-xs font-semibold tracking-wider text-zinc-400 min-w-[640px]">
        <span>타입 / 심볼</span>
        <span>
          최대 변동
          <span className="block text-[10px] font-normal text-zinc-600 normal-case tracking-normal">24h 롤링</span>
        </span>
        <span>거래량 증가</span>
        <span>현재가</span>
        <span className="text-right">{groupBy ? '마지막 감지 / 횟수' : '감지 시각'}</span>
      </div>

      {/* 행 */}
      <div className="divide-y divide-white/[0.04] min-w-[640px]">
        {groupBy
          ? grouped.map(g => <GroupedRow key={g.symbol} g={g} />)
          : events.map(ev => <RawEventRow key={ev.id} ev={ev} />)
        }
      </div>
    </div>
  );
}
