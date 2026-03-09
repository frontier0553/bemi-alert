'use client';

import { createClient } from '@/lib/supabase/client';
import { Zap, AlertTriangle, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';

function isWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/KAKAOTALK|Instagram|FBAN|FBAV|Line\/|MicroMessenger|NaverApp|DaumApps/.test(ua)) return true;
  if (/iPhone|iPod|iPad/.test(ua) && !/Safari\//.test(ua) && /AppleWebKit/.test(ua)) return true;
  return false;
}

type Mode = 'signin' | 'signup' | 'reset';

export default function LoginPage() {
  const [webView, setWebView]     = useState(false);
  const [mode, setMode]           = useState<Mode>('signin');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  useEffect(() => { setWebView(isWebView()); }, []);

  const supabase = createClient();

  async function handleGoogleLogin() {
    setError('');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback`,
        });
        if (error) throw error;
        setSuccess('비밀번호 재설정 이메일을 발송했습니다. 받은편지함을 확인해주세요.');
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        setSuccess('가입 확인 이메일을 발송했습니다. 받은편지함에서 링크를 클릭해 가입을 완료하세요.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      if (msg.includes('Invalid login credentials'))  setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      else if (msg.includes('Email not confirmed'))   setError('이메일 인증이 필요합니다. 받은편지함을 확인해주세요.');
      else if (msg.includes('User already registered')) setError('이미 가입된 이메일입니다. 로그인해주세요.');
      else if (msg.includes('Password should be'))    setError('비밀번호는 6자 이상이어야 합니다.');
      else setError(msg || '오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  const title   = mode === 'signup' ? '회원가입' : mode === 'reset' ? '비밀번호 재설정' : '로그인';
  const btnText = mode === 'signup' ? '가입하기' : mode === 'reset' ? '재설정 이메일 발송' : '로그인';

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

        {/* WebView 경고 배너 */}
        {webView && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-300">인앱 브라우저에서는 구글 로그인이 차단됩니다</p>
              <p className="mt-0.5 text-xs text-amber-400/80">
                Chrome 또는 Safari로 여시거나, 아래 이메일 로그인을 이용해주세요.
              </p>
            </div>
          </div>
        )}

        {/* 로그인 카드 */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="mb-5 text-base font-semibold">{title}</h2>

          {/* 이메일/비밀번호 폼 */}
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-cyan-400/40"
              />
            </div>

            {mode !== 'reset' && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="비밀번호 (6자 이상)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-9 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-cyan-400/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            )}

            {error   && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
            {success && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">{success}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-xl border border-cyan-400/30 bg-cyan-500/20 py-2.5 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/30 disabled:opacity-50"
            >
              {loading ? '처리 중...' : btnText}
            </button>
          </form>

          {/* 모드 전환 링크 */}
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-600">
            {mode === 'signin' && (
              <>
                <button onClick={() => { setMode('signup'); setError(''); setSuccess(''); }} className="hover:text-zinc-400">
                  계정이 없으신가요? 회원가입
                </button>
                <button onClick={() => { setMode('reset'); setError(''); setSuccess(''); }} className="hover:text-zinc-400">
                  비밀번호 찾기
                </button>
              </>
            )}
            {(mode === 'signup' || mode === 'reset') && (
              <button onClick={() => { setMode('signin'); setError(''); setSuccess(''); }} className="hover:text-zinc-400">
                ← 로그인으로 돌아가기
              </button>
            )}
          </div>

          {/* 구분선 — 비밀번호 재설정 시 숨김 */}
          {mode !== 'reset' && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/8" />
                <span className="text-xs text-zinc-600">또는</span>
                <div className="h-px flex-1 bg-white/8" />
              </div>

              {/* Google 로그인 */}
              <button
                onClick={handleGoogleLogin}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/10 active:scale-[0.98]"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Google로 계속하기
              </button>
            </>
          )}

          <p className="mt-4 text-center text-xs text-zinc-600">
            로그인하면 서비스 이용약관에 동의하게 됩니다
          </p>
        </div>
      </div>
    </div>
  );
}
