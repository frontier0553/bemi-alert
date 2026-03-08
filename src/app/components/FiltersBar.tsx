import type { FilterType } from './types';

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'ALL',  label: '전체'    },
  { value: 'PUMP', label: '▲ PUMP' },
  { value: 'DUMP', label: '▼ DUMP' },
];

export function FiltersBar({
  filter,
  onFilter,
  search,
  onSearch,
  groupBy,
  onGroupBy,
}: {
  filter: FilterType;
  onFilter: (f: FilterType) => void;
  search: string;
  onSearch: (s: string) => void;
  groupBy: boolean;
  onGroupBy: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* 필터 탭 */}
      <div className="flex items-center gap-1">
        {FILTERS.map(({ value, label }) => {
          const isActive = filter === value;
          const activeCls =
            value === 'PUMP' && isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/25' :
            value === 'DUMP' && isActive ? 'bg-red-500/20 text-red-300 border border-red-500/25' :
            isActive ? 'bg-violet-500/20 text-violet-300 border border-violet-500/25' : '';
          return (
            <button
              key={value}
              onClick={() => onFilter(value)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors border ${
                isActive ? activeCls : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 심볼 검색 */}
      <input
        type="text"
        className="flex-1 min-w-[160px] max-w-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-zinc-200 text-xs placeholder:text-zinc-600 outline-none focus:border-white/20 transition-colors"
        placeholder="심볼 검색 (BTC, ETH...)"
        value={search}
        onChange={e => onSearch(e.target.value.toUpperCase())}
      />

      {/* 심볼별 묶기 토글 */}
      <button
        onClick={() => onGroupBy(!groupBy)}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors border ${
          groupBy
            ? 'bg-violet-500/20 text-violet-300 border-violet-500/25'
            : 'border-transparent text-zinc-500 hover:text-zinc-300'
        }`}
      >
        <span
          className={`w-3 h-3 rounded-sm border flex items-center justify-center text-[8px] font-bold transition-all ${
            groupBy ? 'bg-violet-500 border-violet-400 text-white' : 'border-zinc-600 text-zinc-700'
          }`}
        >
          {groupBy ? '✓' : ''}
        </span>
        심볼별 묶기
      </button>
    </div>
  );
}
