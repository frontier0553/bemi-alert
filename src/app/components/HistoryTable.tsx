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
    <div>
      {/* 컬럼 헤더 — 모바일 */}
      <div className="block sm:hidden grid grid-cols-[52px_1fr_56px_44px] items-center gap-x-2 border-b border-white/5 bg-black/20 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        <span>타입</span>
        <span>심볼</span>
        <span className="text-right">변동%</span>
        <span className="text-right">{groupBy ? '횟수' : '시각'}</span>
      </div>

      {/* 컬럼 헤더 — 데스크탑만 */}
      <div className="hidden sm:grid grid-cols-[200px_100px_160px_120px_1fr] items-center gap-x-3 border-b border-white/5 bg-black/20 px-4 py-2 text-xs font-semibold tracking-wider text-zinc-400">
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
      <div className="divide-y divide-white/[0.04]">
        {groupBy
          ? grouped.map(g => <GroupedRow key={g.symbol} g={g} />)
          : events.map(ev => <RawEventRow key={ev.id} ev={ev} />)
        }
      </div>
    </div>
  );
}
