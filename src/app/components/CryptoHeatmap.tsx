'use client';

import type { Event } from './types';
import { baseCoin } from './utils';

interface Props {
  events: Event[]; // uniqueBySymbol — 1시간 내 코인당 최신 1개
}

function tileStyle(changePct: number): { bg: string; color: string } {
  const abs = Math.abs(changePct);
  if (changePct >= 0) {
    if (abs >= 10) return { bg: '#059669', color: '#ffffff' };
    if (abs >= 7)  return { bg: '#047857', color: '#d1fae5' };
    if (abs >= 5)  return { bg: '#065f46', color: '#6ee7b7' };
    if (abs >= 3)  return { bg: '#064e3b', color: '#34d399' };
    return           { bg: '#022c22', color: '#6ee7b7' };
  } else {
    if (abs >= 10) return { bg: '#dc2626', color: '#ffffff' };
    if (abs >= 7)  return { bg: '#b91c1c', color: '#fee2e2' };
    if (abs >= 5)  return { bg: '#991b1b', color: '#fca5a5' };
    if (abs >= 3)  return { bg: '#7f1d1d', color: '#fca5a5' };
    return           { bg: '#3b0f0f', color: '#fca5a5' };
  }
}

export function CryptoHeatmap({ events }: Props) {
  if (events.length === 0) return null;

  const sorted = [...events].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">🗺 시장 히트맵</span>
          <span className="text-xs text-zinc-600">최근 1시간 감지 종목</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-zinc-600">
          <LegendItem color="#059669" label="강한 펌프" />
          <LegendItem color="#064e3b" label="약한 펌프" />
          <LegendItem color="#7f1d1d" label="약한 덤프" />
          <LegendItem color="#dc2626" label="강한 덤프" />
        </div>
      </div>

      {/* 그리드 */}
      <div className="p-3">
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))' }}
        >
          {sorted.map(ev => {
            const abs        = Math.abs(ev.changePct);
            const { bg, color } = tileStyle(ev.changePct);
            // 변동폭 클수록 타일 2열 차지 + 높이 증가
            const big        = abs >= 8;
            const medium     = abs >= 5;
            const height     = big ? 72 : medium ? 60 : 52;
            const fontSize   = big ? 13 : medium ? 11 : 10;
            const pctSize    = big ? 12 : medium ? 10 : 9;

            return (
              <div
                key={ev.symbol}
                title={`${baseCoin(ev.symbol)}: ${ev.changePct > 0 ? '+' : ''}${ev.changePct.toFixed(2)}%`}
                style={{
                  background: bg,
                  color,
                  gridColumn: big ? 'span 2' : 'span 1',
                  minHeight:  `${height}px`,
                }}
                className="rounded-lg flex flex-col items-center justify-center gap-0.5 cursor-default select-none transition-transform hover:scale-[1.03]"
              >
                <span
                  className="font-bold leading-tight truncate px-1 text-center"
                  style={{ fontSize }}
                >
                  {baseCoin(ev.symbol)}
                </span>
                <span className="tabular-nums font-semibold" style={{ fontSize: pctSize }}>
                  {ev.changePct > 0 ? '+' : ''}{ev.changePct.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
