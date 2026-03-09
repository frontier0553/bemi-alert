import Link from 'next/link';
import { Zap, Check } from 'lucide-react';

const FEATURES = [
  '실시간 PUMP/DUMP 대시보드',
  '텔레그램 알림 수신',
  '관심 코인 필터',
  '알림 이력 7일',
  '개인 임계값 설정 (PUMP/DUMP%)',
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#06080d] text-zinc-100">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.05),transparent_25%)]" />

      {/* Header */}
      <header className="relative z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[900px] items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
              <Zap className="h-4 w-4 text-cyan-300" />
            </div>
            <span className="text-base font-bold tracking-tight">Bemi Alert</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-300">← 대시보드</Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-[560px] px-5 py-16 flex flex-col gap-8">

        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">플랜</h1>
          <p className="text-zinc-500 text-sm">현재 모든 기능을 무료로 제공하고 있습니다.</p>
        </div>

        {/* 무료 카드 */}
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-7 flex flex-col gap-6">
          <div>
            <span className="rounded-full bg-emerald-400/15 border border-emerald-400/25 px-3 py-1 text-xs font-semibold text-emerald-300">FREE</span>
            <div className="mt-3 text-4xl font-bold">₩0</div>
            <div className="text-xs text-zinc-500 mt-1">현재 무료 운영 중</div>
          </div>
          <ul className="flex flex-col gap-3">
            {FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2.5 text-sm">
                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                <span className="text-zinc-200">{f}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 text-center">
            ✓ 현재 플랜
          </div>
        </div>

        {/* PRO 준비 중 안내 */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-center">
          <div className="text-xs font-semibold text-zinc-500 mb-1">PRO 플랜 — 준비 중</div>
          <div className="text-xs text-zinc-600">유료 플랜은 추후 공개될 예정입니다. 지금은 모든 기능을 무료로 이용하세요.</div>
        </div>

      </main>
    </div>
  );
}
