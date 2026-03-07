'use client';

import { useState } from 'react';
import { Waves, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface WhaleEventRow {
  id:         string;
  symbol:     string;
  direction:  string;  // "BUY" | "SELL" | "MIXED"
  tradeSize:  number;
  price:      number;
  score:      number;
  whaleBuys:  number;
  whaleSells: number;
  type:       string;
  detectedAt: string;
}

const QUOTE_RE = /(USDT|USDC|BUSD|FDUSD|TUSD)$/;
const baseCoin = (s: string) => s.replace(QUOTE_RE, '');

function timeStr(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatUsd(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function ScoreBar({ score }: { score: number }) {
  const isPositive = score >= 0;
  const pct = Math.abs(score);
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-16 rounded-full bg-white/5">
        {isPositive ? (
          <div
            className="absolute left-1/2 h-1.5 rounded-full bg-emerald-400 transition-all"
            style={{ width: `${pct / 2}%` }}
          />
        ) : (
          <div
            className="absolute right-1/2 h-1.5 rounded-full bg-red-400 transition-all"
            style={{ width: `${pct / 2}%` }}
          />
        )}
      </div>
      <span className={`text-xs font-semibold tabular-nums w-8 text-right ${
        isPositive ? 'text-emerald-300' : 'text-red-300'
      }`}>
        {score > 0 ? '+' : ''}{score}
      </span>
    </div>
  );
}

function HeatDot({ score }: { score: number }) {
  if (score >= 40)  return <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />;
  if (score <= -40) return <span className="inline-block h-2 w-2 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)]" />;
  return <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />;
}

type SortKey = 'symbol' | 'direction' | 'tradeSize' | 'score' | 'detectedAt';
type SortDir = 'asc' | 'desc';

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="inline h-3 w-3 ml-0.5 opacity-30" />;
  return sortDir === 'asc'
    ? <ChevronUp className="inline h-3 w-3 ml-0.5 text-cyan-300" />
    : <ChevronDown className="inline h-3 w-3 ml-0.5 text-cyan-300" />;
}

export function WhalePanel({
  whales,
  loading,
}: {
  whales: WhaleEventRow[];
  loading: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('detectedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'symbol' || key === 'direction' ? 'asc' : 'desc');
    }
  }

  const sorted = [...whales].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'symbol')    cmp = a.symbol.localeCompare(b.symbol);
    if (sortKey === 'direction') cmp = a.direction.localeCompare(b.direction);
    if (sortKey === 'tradeSize') cmp = a.tradeSize - b.tradeSize;
    if (sortKey === 'score')     cmp = a.score - b.score;
    if (sortKey === 'detectedAt') cmp = new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime();
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
            <Waves className="h-4 w-4 text-cyan-300" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Whale Flow</h2>
            <p className="text-xs text-zinc-500">대형 거래 감지 — 상위 30개 코인</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> 매집
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-400" /> 매도
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> 중립
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[100px_80px_100px_100px_110px_130px_80px] gap-x-2 border-b border-white/5 bg-black/20 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {([
          ['symbol',    '심볼'],
          ['direction', '방향'],
          ['tradeSize', '거래규모'],
          [null,        '가격'],
          [null,        '시각'],
          ['score',     '압력지수'],
          [null,        '타입'],
        ] as [SortKey | null, string][]).map(([key, label]) =>
          key ? (
            <button
              key={key}
              onClick={() => handleSort(key)}
              className="flex items-center gap-0.5 hover:text-zinc-300 transition-colors cursor-pointer text-left"
            >
              {label}<SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
            </button>
          ) : (
            <span key={label}>{label}</span>
          )
        )}
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/[0.04]">
        {loading ? (
          <div className="py-12 text-center text-sm text-zinc-500">로딩 중...</div>
        ) : whales.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-500">
            감지된 고래 활동 없음
            <div className="mt-1 text-xs text-zinc-600">cron-job.org에서 /api/whale-scan 등록 필요</div>
          </div>
        ) : (
          sorted.map(w => {
            const isPump = w.direction === 'BUY';
            const isMix  = w.direction === 'MIXED';
            return (
              <div
                key={w.id}
                className="grid grid-cols-[100px_80px_100px_100px_110px_130px_80px] gap-x-2 items-center px-5 py-3 text-sm transition-colors hover:bg-white/[0.03]"
              >
                {/* Symbol */}
                <div className="flex items-center gap-2">
                  <HeatDot score={w.score} />
                  <span className="font-semibold text-zinc-100">{baseCoin(w.symbol)}</span>
                </div>

                {/* Direction */}
                <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                  isPump ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                  : isMix ? 'border-amber-500/25 bg-amber-500/10 text-amber-300'
                  : 'border-red-500/25 bg-red-500/10 text-red-300'
                }`}>
                  {w.direction}
                </span>

                {/* Trade Size */}
                <span className="font-semibold text-zinc-200 tabular-nums">
                  {formatUsd(w.tradeSize)}
                </span>

                {/* Price */}
                <span className="text-zinc-400 tabular-nums">
                  ${w.price < 1 ? w.price.toFixed(6) : w.price.toFixed(2)}
                </span>

                {/* Time */}
                <span className="text-zinc-500 tabular-nums text-xs">
                  {timeStr(w.detectedAt)}
                </span>

                {/* Score bar */}
                <ScoreBar score={w.score} />

                {/* Type badge */}
                <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  w.type === 'ACCUMULATION' ? 'bg-emerald-500/10 text-emerald-300'
                  : w.type === 'DUMP'       ? 'bg-red-500/10 text-red-300'
                  : 'bg-zinc-700 text-zinc-400'
                }`}>
                  {w.type === 'ACCUMULATION' ? '매집' : w.type === 'DUMP' ? '매도' : '중립'}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
