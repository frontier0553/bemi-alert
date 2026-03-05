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
      {/* Filter tab group */}
      <div className="flex bg-surface-card border border-edge-subtle rounded-xl p-1 gap-1">
        {FILTERS.map(({ value, label }) => {
          const isActive = filter === value;
          const activeCls =
            value === 'PUMP' && isActive ? 'bg-pump/10 text-pump' :
            value === 'DUMP' && isActive ? 'bg-dump/10 text-dump' :
            isActive ? 'bg-surface-elevated text-ink-primary' : '';
          return (
            <button
              key={value}
              onClick={() => onFilter(value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? activeCls
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-elevated'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Symbol search */}
      <input
        type="text"
        className="flex-1 min-w-[160px] max-w-xs px-3.5 py-2 rounded-xl border border-edge-subtle bg-surface-card text-ink-primary text-sm placeholder:text-ink-ghost outline-none focus:border-signal transition-colors"
        placeholder="심볼 검색 (BTC, ETH...)"
        value={search}
        onChange={e => onSearch(e.target.value.toUpperCase())}
      />

      {/* Group by symbol toggle */}
      <button
        onClick={() => onGroupBy(!groupBy)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
          groupBy
            ? 'bg-signal/10 border-signal/40 text-signal'
            : 'bg-surface-card border-edge-subtle text-ink-secondary hover:text-ink-primary hover:border-edge-medium'
        }`}
      >
        <span
          className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] font-bold transition-all ${
            groupBy
              ? 'bg-signal border-signal text-surface-base'
              : 'border-edge-medium text-ink-ghost'
          }`}
        >
          {groupBy ? '✓' : ''}
        </span>
        심볼별 묶기
      </button>
    </div>
  );
}
