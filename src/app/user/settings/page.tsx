'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Bell, Save } from 'lucide-react';

interface UserSettingsData {
  tier:              string;
  coinFilter:        string | null;
  pumpPct:           number | null;
  dumpPct:           number | null;
  telegramLinked:    boolean;
  telegramUsername:  string | null;
  globalParams:      Record<string, string>;
}

export default function UserSettingsPage() {
  const router = useRouter();
  const [data, setData]           = useState<UserSettingsData | null>(null);
  const [coins, setCoins]         = useState('');   // comma-separated input
  const [pumpPct, setPumpPct]     = useState('');
  const [dumpPct, setDumpPct]     = useState('');
  const [saved, setSaved]         = useState(false);
  const [linkCode, setLinkCode]   = useState<string | null>(null);
  const [linkExpiry, setLinkExpiry] = useState<string | null>(null);
  const [linking, setLinking]     = useState(false);

  useEffect(() => {
    fetch('/api/user/settings')
      .then(r => {
        if (r.status === 401) { router.replace('/login'); return null; }
        return r.json();
      })
      .then((d: UserSettingsData | null) => {
        if (!d) return;
        setData(d);
        // coinFilter: ["BTC","ETH"] → "BTC,ETH"
        if (d.coinFilter) {
          try { setCoins(JSON.parse(d.coinFilter).join(',')); } catch {}
        }
        if (d.pumpPct != null) setPumpPct(String(d.pumpPct));
        if (d.dumpPct != null) setDumpPct(String(d.dumpPct));
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  async function handleSave() {
    const coinArr = coins.trim()
      ? coins.split(',').map(c => c.trim().toUpperCase()).filter(Boolean)
      : null;
    await fetch('/api/user/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coinFilter: coinArr ? JSON.stringify(coinArr) : null,
        pumpPct:    pumpPct ? parseFloat(pumpPct) : null,
        dumpPct:    dumpPct ? parseFloat(dumpPct) : null,
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleGenLinkCode() {
    setLinking(true);
    const res = await fetch('/api/user/link-code', { method: 'POST' });
    const json = await res.json();
    setLinkCode(json.code);
    setLinkExpiry(new Date(json.expiresAt).toLocaleTimeString('ko-KR'));
    setLinking(false);
  }

  if (!data) return (
    <div className="min-h-screen bg-[#06080d] text-zinc-400 flex items-center justify-center text-sm">
      로딩 중...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#06080d] text-zinc-100">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.05),transparent_25%)]" />

      {/* Header */}
      <header className="relative z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[900px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
              <Zap className="h-4 w-4 text-cyan-300" />
            </div>
            <span className="text-base font-bold tracking-tight">Bemi Alert</span>
          </div>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">← 대시보드</Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-[900px] px-5 py-6 flex flex-col gap-5">

        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">내 알림 설정</h1>
          <button
            onClick={handleSave}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              saved
                ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10'
            }`}
          >
            <Save className="h-4 w-4" />
            {saved ? '✓ 저장 완료' : '설정 저장'}
          </button>
        </div>

        {/* ── 플랜 상태 ── */}
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-emerald-400/15 border border-emerald-400/25 px-3 py-1 text-xs font-bold text-emerald-300">FREE</span>
            <span className="text-sm text-zinc-300">현재 모든 기능 무료 제공 중</span>
          </div>
          <span className="text-xs text-zinc-600">유료 플랜 준비 중</span>
        </div>

        {/* ── 관심 코인 필터 ── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-1 text-sm font-semibold text-zinc-200">관심 코인 필터</h2>
          <p className="mb-4 text-xs text-zinc-500">비워두면 전체 코인 알림. 쉼표로 구분 (ex: BTC,ETH,SOL)</p>
          <input
            type="text"
            placeholder="BTC,ETH,SOL"
            value={coins}
            onChange={e => setCoins(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-400/40 placeholder:text-zinc-600"
          />
        </div>

        {/* ── 개인 임계값 ── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-semibold text-zinc-200">개인 임계값</h2>
          </div>
          <p className="mb-4 text-xs text-zinc-500">비워두면 글로벌 기본값 사용 (PUMP: {data.globalParams.SCAN_PUMP_PCT}%, DUMP: {data.globalParams.SCAN_DUMP_PCT}%)</p>
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">▲ PUMP 기준 (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min="1" max="50" step="0.5"
                  placeholder={data.globalParams.SCAN_PUMP_PCT}
                  value={pumpPct}
                  onChange={e => setPumpPct(e.target.value)}
                  className="w-24 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400/40 tabular-nums"
                />
                <span className="text-sm text-zinc-500">%</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">▼ DUMP 기준 (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min="1" max="50" step="0.5"
                  placeholder={data.globalParams.SCAN_DUMP_PCT}
                  value={dumpPct}
                  onChange={e => setDumpPct(e.target.value)}
                  className="w-24 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-red-400/40 tabular-nums"
                />
                <span className="text-sm text-zinc-500">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 텔레그램 연동 ── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="h-4 w-4 text-cyan-300" />
            <h2 className="text-sm font-semibold text-zinc-200">텔레그램 연동</h2>
          </div>

          {data.telegramLinked ? (
            <div className="flex items-center gap-2 mt-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
              <span className="text-sm text-emerald-300">
                연동됨 {data.telegramUsername ? `(@${data.telegramUsername})` : ''}
              </span>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-zinc-500">
                텔레그램 알림을 받으려면 봇과 계정을 연동하세요.
              </p>
              <div className="text-xs text-zinc-400 space-y-1">
                <div>1. 아래 코드 생성 버튼 클릭</div>
                <div>2. <a href="https://t.me/bemialert_bot" target="_blank" rel="noopener" className="text-cyan-400 hover:underline">@bemialert_bot</a> 에서 <code className="text-amber-300">/link [코드]</code> 입력</div>
              </div>
              {linkCode ? (
                <div className="flex items-center gap-3 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3">
                  <span className="text-2xl font-bold tracking-[0.2em] tabular-nums text-amber-300">{linkCode}</span>
                  <span className="text-xs text-zinc-500">만료: {linkExpiry}</span>
                </div>
              ) : (
                <button
                  onClick={handleGenLinkCode}
                  disabled={linking}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  {linking ? '생성 중...' : '코드 생성'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── 글로벌 스캔 파라미터 (읽기전용) ── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-400">현재 글로벌 스캔 파라미터 (읽기전용)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(data.globalParams).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                <div className="text-[10px] text-zinc-600 font-mono mb-0.5">{k}</div>
                <div className="text-sm font-semibold text-zinc-300">{v}</div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {saved && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 shadow-lg backdrop-blur">
          ✓ 설정이 저장되었습니다
        </div>
      )}
    </div>
  );
}
