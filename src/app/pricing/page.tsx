'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CandlestickChart, Check, X, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

const FREE_FEATURES = [
  { label: '실시간 PUMP/DUMP 대시보드', ok: true },
  { label: '텔레그램 알림 수신', ok: true },
  { label: '관심 코인 필터', ok: true },
  { label: '알림 이력 7일', ok: true },
  { label: '개인 임계값 설정', ok: false },
  { label: '알림 이력 30일', ok: false },
];

const PRO_FEATURES = [
  { label: '실시간 PUMP/DUMP 대시보드', ok: true },
  { label: '텔레그램 알림 수신', ok: true },
  { label: '관심 코인 필터', ok: true },
  { label: '알림 이력 30일', ok: true },
  { label: '개인 임계값 설정 (PUMP/DUMP%)', ok: true },
  { label: 'PRO 뱃지', ok: true },
];

export default function PricingPage() {
  const [user, setUser]       = useState<User | null>(null);
  const [tier, setTier]       = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams          = useSearchParams();
  const success               = searchParams.get('success') === '1';
  const cancelled             = searchParams.get('cancel')  === '1';

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch('/api/billing').then(r => r.json()).then(d => setTier(d.tier)).catch(() => {});
  }, [user]);

  async function handleUpgrade() {
    if (!user) { window.location.href = '/login'; return; }
    setLoading(true);
    const res  = await fetch('/api/checkout', { method: 'POST' });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(false);
  }

  async function handleManage() {
    const res  = await fetch('/api/billing');
    const data = await res.json();
    if (data.portalUrl) window.location.href = data.portalUrl;
  }

  return (
    <div className="min-h-screen bg-[#06080d] text-zinc-100">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.05),transparent_25%)]" />

      {/* Header */}
      <header className="relative z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[900px] items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
              <CandlestickChart className="h-4 w-4 text-cyan-300" />
            </div>
            <span className="text-base font-bold tracking-tight">Bemi Alert</span>
          </Link>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">← 대시보드</Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-[900px] px-5 py-12 flex flex-col gap-10">

        {/* 성공/취소 배너 */}
        {success && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300 text-center">
            🎉 PRO 구독이 활성화됐습니다! 모든 기능을 이용하실 수 있습니다.
          </div>
        )}
        {cancelled && (
          <div className="rounded-xl border border-zinc-700 bg-zinc-800/30 px-5 py-4 text-sm text-zinc-400 text-center">
            결제가 취소됐습니다. 언제든지 다시 시작할 수 있습니다.
          </div>
        )}

        {/* 타이틀 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">플랜 선택</h1>
          <p className="text-zinc-500 text-sm">지금 바로 시작하고, 필요할 때 업그레이드하세요.</p>
        </div>

        {/* 카드 */}
        <div className="grid sm:grid-cols-2 gap-5">

          {/* FREE */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 flex flex-col gap-5">
            <div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-zinc-300">FREE</span>
              <div className="mt-3 text-3xl font-bold">$0</div>
              <div className="text-xs text-zinc-500 mt-1">영원히 무료</div>
            </div>
            <ul className="flex flex-col gap-2.5">
              {FREE_FEATURES.map(f => (
                <li key={f.label} className="flex items-center gap-2.5 text-sm">
                  {f.ok
                    ? <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                    : <X    className="h-4 w-4 shrink-0 text-zinc-600" />}
                  <span className={f.ok ? 'text-zinc-200' : 'text-zinc-600'}>{f.label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-2">
              {tier === 'FREE' || !tier ? (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-center text-zinc-500">
                  현재 플랜
                </div>
              ) : null}
            </div>
          </div>

          {/* PRO */}
          <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/5 p-6 flex flex-col gap-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 rounded-bl-2xl bg-cyan-400/15 px-3 py-1 text-[11px] font-bold text-cyan-300">
              RECOMMENDED
            </div>
            <div>
              <span className="rounded-full bg-cyan-400/15 border border-cyan-400/25 px-3 py-1 text-xs font-semibold text-cyan-300">PRO</span>
              <div className="mt-3 text-3xl font-bold">$9<span className="text-base font-normal text-zinc-400">/mo</span></div>
              <div className="text-xs text-zinc-500 mt-1">언제든지 취소 가능</div>
            </div>
            <ul className="flex flex-col gap-2.5">
              {PRO_FEATURES.map(f => (
                <li key={f.label} className="flex items-center gap-2.5 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-cyan-400" />
                  <span className="text-zinc-200">{f.label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-2">
              {tier === 'PRO' ? (
                <button
                  onClick={handleManage}
                  className="w-full rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/15 transition-colors"
                >
                  구독 관리
                </button>
              ) : (
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-black hover:bg-cyan-300 transition-colors disabled:opacity-50"
                >
                  <Zap className="h-4 w-4" />
                  {loading ? '처리 중...' : 'PRO 시작하기'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">자주 묻는 질문</h2>
          <div className="space-y-4 text-sm">
            <div>
              <div className="font-medium text-zinc-200 mb-1">언제든지 취소할 수 있나요?</div>
              <div className="text-zinc-500">네, 구독 관리 페이지에서 언제든지 취소할 수 있으며 남은 기간은 유지됩니다.</div>
            </div>
            <div>
              <div className="font-medium text-zinc-200 mb-1">결제는 어떻게 이루어지나요?</div>
              <div className="text-zinc-500">Stripe를 통해 안전하게 처리됩니다. 카드 정보는 Stripe에서만 보관됩니다.</div>
            </div>
            <div>
              <div className="font-medium text-zinc-200 mb-1">FREE 플랜에서도 텔레그램 알림을 받을 수 있나요?</div>
              <div className="text-zinc-500">네, 텔레그램 알림은 FREE 플랜에서도 제한 없이 받을 수 있습니다.</div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
