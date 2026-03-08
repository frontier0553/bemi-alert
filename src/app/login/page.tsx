'use client';

import { createClient } from '@/lib/supabase/client';
import { Zap } from 'lucide-react';

export default function LoginPage() {
  async function handleGoogleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="min-h-screen bg-[#06080d] text-zinc-100 flex items-center justify-center">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.05),transparent_25%)]" />

      <div className="relative w-full max-w-sm px-5">
        {/* 로고 */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
            <Zap className="h-7 w-7 text-cyan-300" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">Bemi Alert</h1>
            <p className="mt-1 text-sm text-zinc-500">실시간 암호화폐 이상 신호 감지</p>
          </div>
        </div>

        {/* 로그인 카드 */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="mb-1 text-base font-semibold">로그인</h2>
          <p className="mb-6 text-sm text-zinc-500">Google 계정으로 계속하세요</p>

          <button
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/10 active:scale-[0.98]"
          >
            {/* Google 로고 SVG */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Google로 계속하기
          </button>

          <p className="mt-4 text-center text-xs text-zinc-600">
            로그인하면 서비스 이용약관에 동의하게 됩니다
          </p>
        </div>
      </div>
    </div>
  );
}
