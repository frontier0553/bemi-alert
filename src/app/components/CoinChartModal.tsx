'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';

interface KLine {
  time:  number;
  open:  number;
  high:  number;
  low:   number;
  close: number;
  vol:   number;
}

interface Props {
  symbol:    string;   // e.g. "BTC"
  changePct: number;
  price:     number;
  marketCap: number | null;
  onClose:   () => void;
}

function fmtCap(v: number) {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

function fmtPrice(v: number) {
  if (v >= 1000) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (v >= 1)    return `$${v.toFixed(4)}`;
  return `$${v.toFixed(6)}`;
}

/* ── SVG 라인 차트 ─────────────────────────────────── */
function LineChart({ data, isUp }: { data: KLine[]; isUp: boolean }) {
  if (data.length < 2) return <div className="h-40 flex items-center justify-center text-zinc-600 text-sm">데이터 없음</div>;

  const W = 600;
  const H = 160;
  const PAD = { top: 10, right: 10, bottom: 24, left: 48 };

  const closes = data.map(d => d.close);
  const minC   = Math.min(...closes);
  const maxC   = Math.max(...closes);
  const range  = maxC - minC || 1;

  const xScale = (i: number) => PAD.left + (i / (data.length - 1)) * (W - PAD.left - PAD.right);
  const yScale = (v: number) => PAD.top + (1 - (v - minC) / range) * (H - PAD.top - PAD.bottom);

  const points = data.map((d, i) => `${xScale(i)},${yScale(d.close)}`).join(' ');
  const area   = [
    `M ${xScale(0)},${H - PAD.bottom}`,
    ...data.map((d, i) => `L ${xScale(i)},${yScale(d.close)}`),
    `L ${xScale(data.length - 1)},${H - PAD.bottom}`,
    'Z',
  ].join(' ');

  const color = isUp ? '#10b981' : '#ef4444';
  const gradId = `grad-${isUp ? 'up' : 'dn'}`;

  // x축 레이블 — 6개
  const labelIdxs = Array.from({ length: 6 }, (_, i) => Math.round(i * (data.length - 1) / 5));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* 그리드 */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = PAD.top + t * (H - PAD.top - PAD.bottom);
        const v = maxC - t * range;
        return (
          <g key={t}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#ffffff10" strokeWidth="1" />
            <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#71717a">
              {v >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : v >= 1 ? v.toFixed(2) : v.toFixed(5)}
            </text>
          </g>
        );
      })}
      {/* 면 */}
      <path d={area} fill={`url(#${gradId})`} />
      {/* 라인 */}
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      {/* x축 레이블 */}
      {labelIdxs.map(i => {
        const d = data[i];
        const x = xScale(i);
        const label = new Date(d.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        return (
          <text key={i} x={x} y={H - 4} textAnchor="middle" fontSize="9" fill="#71717a">{label}</text>
        );
      })}
    </svg>
  );
}

/* ── 메인 컴포넌트 ─────────────────────────────────── */
const INTERVALS = [
  { label: '1H',  value: '1m',  limit: 60  },
  { label: '4H',  value: '5m',  limit: 48  },
  { label: '1D',  value: '15m', limit: 96  },
  { label: '1W',  value: '1h',  limit: 168 },
] as const;

type IntervalKey = typeof INTERVALS[number]['label'];

export function CoinChartModal({ symbol, changePct, price, marketCap, onClose }: Props) {
  const [klines, setKlines]     = useState<KLine[]>([]);
  const [loading, setLoading]   = useState(true);
  const [interval, setInterval] = useState<IntervalKey>('1D');

  const iv = INTERVALS.find(i => i.label === interval)!;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=${iv.value}&limit=${iv.limit}`;
      const res  = await fetch(url);
      const raw: [number, string, string, string, string, string][] = await res.json();
      setKlines(raw.map(r => ({
        time:  r[0],
        open:  parseFloat(r[1]),
        high:  parseFloat(r[2]),
        low:   parseFloat(r[3]),
        close: parseFloat(r[4]),
        vol:   parseFloat(r[5]),
      })));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [symbol, iv.value, iv.limit]);

  useEffect(() => { load(); }, [load]);

  // ESC 키로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const isUp      = changePct >= 0;
  const pctColor  = isUp ? 'text-emerald-400' : 'text-red-400';
  const latest    = klines[klines.length - 1];
  const high24    = klines.length ? Math.max(...klines.map(d => d.high))  : null;
  const low24     = klines.length ? Math.min(...klines.map(d => d.low))   : null;
  const totalVol  = klines.reduce((s, d) => s + d.vol, 0);

  return (
    /* 배경 오버레이 */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c0f15] shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-zinc-100">{symbol}</span>
            <span className="text-xs text-zinc-600">/ USDT</span>
            <span className={`flex items-center gap-1 text-sm font-bold ${pctColor}`}>
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {isUp ? '+' : ''}{changePct.toFixed(2)}%
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 가격 + 스탯 */}
        <div className="px-5 pt-4 pb-2 flex flex-wrap items-end gap-x-6 gap-y-1">
          <span className="text-2xl font-bold text-zinc-100 tabular-nums">{fmtPrice(price)}</span>
          <div className="flex gap-4 text-xs text-zinc-500 pb-0.5">
            {high24 && <span>고가 <span className="text-emerald-400 font-medium tabular-nums">{fmtPrice(high24)}</span></span>}
            {low24  && <span>저가 <span className="text-red-400 font-medium tabular-nums">{fmtPrice(low24)}</span></span>}
            {marketCap && <span>시총 <span className="text-zinc-300 font-medium">{fmtCap(marketCap)}</span></span>}
          </div>
        </div>

        {/* 인터벌 탭 */}
        <div className="flex gap-1 px-5 pb-3">
          {INTERVALS.map(iv => (
            <button
              key={iv.label}
              onClick={() => setInterval(iv.label)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                interval === iv.label
                  ? 'bg-white/10 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {iv.label}
            </button>
          ))}
        </div>

        {/* 차트 */}
        <div className="px-3 pb-4">
          {loading ? (
            <div className="h-40 flex items-center justify-center text-sm text-zinc-600">로딩 중...</div>
          ) : (
            <LineChart data={klines} isUp={isUp} />
          )}
        </div>

        {/* 거래량 */}
        {!loading && totalVol > 0 && (
          <div className="px-5 pb-4 text-xs text-zinc-600">
            거래량({iv.label}) <span className="text-zinc-400 tabular-nums font-medium">
              {totalVol >= 1e9 ? `${(totalVol / 1e9).toFixed(2)}B` : totalVol >= 1e6 ? `${(totalVol / 1e6).toFixed(1)}M` : totalVol.toFixed(0)} {symbol}
            </span>
          </div>
        )}

        {/* 바이낸스 링크 */}
        <div className="px-5 pb-4">
          <a
            href={`https://www.binance.com/ko/trade/${symbol}_USDT`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:border-white/20 transition-colors"
          >
            바이낸스에서 거래 →
          </a>
        </div>
      </div>
    </div>
  );
}
