'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Zap, Bell, TrendingUp, Waves, Filter,
  History, ArrowRight, Bot, BarChart2, ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace('/dashboard');
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) {
    return <div className="min-h-screen bg-[#06080d]" />;
  }

  return (
    <div className="min-h-screen bg-[#06080d] text-zinc-100 overflow-x-hidden">
      {/* 배경 그라디언트 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-violet-500/[0.03] rounded-full blur-3xl" />
      </div>

      {/* ── 헤더 ── */}
      <header className="relative z-50 border-b border-white/5 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
              <Zap className="h-4 w-4 text-cyan-300" />
            </div>
            <span className="text-base font-bold tracking-tight">Bemi Alert</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              로그인
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-xl bg-cyan-500/90 hover:bg-cyan-400 text-black transition-colors"
            >
              무료 시작 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── 히어로 ── */}
      <section className="relative mx-auto max-w-5xl px-5 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-cyan-400/20 bg-cyan-400/5 text-xs text-cyan-300">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          실시간 암호화폐 이상 감지
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight mb-5">
          펌프·덤프 신호를
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-violet-400">
            텔레그램으로 즉시 받아보세요
          </span>
        </h1>

        <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
          바이낸스 전체 코인을 1분마다 스캔합니다.
          급등·급락 감지 시 텔레그램 알림을 즉시 전송합니다.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-colors"
          >
            무료로 시작하기 <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-zinc-300 text-sm transition-colors"
          >
            대시보드 둘러보기
          </Link>
        </div>

        {/* 대시보드 미리보기 */}
        <div className="mt-14 rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden shadow-2xl shadow-black/50">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5 bg-black/20">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
            <span className="ml-3 text-xs text-zinc-600">bemialert.com/dashboard</span>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '감지된 신호', value: '247', color: 'text-cyan-300' },
              { label: '활성 구독자', value: '1,832', color: 'text-violet-300' },
              { label: '오늘 알림', value: '38', color: 'text-emerald-300' },
              { label: '스캔 간격', value: '1분', color: 'text-orange-300' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3 text-center">
                <div className={`text-xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          <div className="px-4 pb-4 space-y-2">
            {[
              { coin: 'PEPE', type: 'PUMP', pct: '+12.4%', color: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
              { coin: 'DOGE', type: 'DUMP', pct: '-8.7%',  color: 'text-red-400',     badge: 'bg-red-500/20 text-red-300' },
              { coin: 'SOL',  type: 'PUMP', pct: '+6.2%',  color: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
            ].map(({ coin, type, pct, color, badge }) => (
              <div key={coin} className="grid grid-cols-[80px_72px_1fr_60px] items-center rounded-lg border border-white/5 bg-white/[0.015] px-3 py-2">
                <span className="text-sm font-semibold text-zinc-200">{coin}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-medium w-fit ${badge}`}>{type}</span>
                <span className={`text-sm font-bold text-right ${color}`}>{pct}</span>
                <span className="text-xs text-zinc-600 text-right">방금 전</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 기능 ── */}
      <section className="relative mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-2xl font-bold text-center mb-2">주요 기능</h2>
        <p className="text-zinc-500 text-center text-sm mb-10">알아야 할 순간, 놓치지 마세요</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: <Bell className="h-5 w-5 text-cyan-300" />,
              title: '텔레그램 실시간 알림',
              desc: '펌프/덤프 감지 즉시 텔레그램으로 알림. 놓치는 신호 없이 어디서나 수신.',
            },
            {
              icon: <TrendingUp className="h-5 w-5 text-emerald-300" />,
              title: '스팟 펌프·덤프 감지',
              desc: '바이낸스 전 종목을 1분마다 스캔. 급등/급락 종목을 즉시 포착합니다.',
            },
            {
              icon: <BarChart2 className="h-5 w-5 text-violet-300" />,
              title: '선물 펀딩률·OI 분석',
              desc: '펀딩률 이상과 미결제약정 급변을 감지해 시장 쏠림을 선제적으로 파악.',
            },
            {
              icon: <Waves className="h-5 w-5 text-blue-300" />,
              title: '웨일 거래 추적',
              desc: '대형 거래자의 대량 매수·매도를 감지해 세력 움직임을 미리 포착.',
            },
            {
              icon: <Filter className="h-5 w-5 text-orange-300" />,
              title: '코인 필터링',
              desc: '관심 코인만 선택해 불필요한 알림 제거. 원하는 종목만 집중 모니터링.',
            },
            {
              icon: <History className="h-5 w-5 text-pink-300" />,
              title: '알림 이력 30일',
              desc: '지난 30일간 발송된 알림 이력을 조회하고 패턴을 분석.',
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 mb-4">
                {icon}
              </div>
              <h3 className="font-semibold text-sm mb-2">{title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 사용 방법 ── */}
      <section className="relative mx-auto max-w-3xl px-5 py-16">
        <h2 className="text-2xl font-bold text-center mb-2">3단계로 시작</h2>
        <p className="text-zinc-500 text-center text-sm mb-10">5분이면 충분합니다</p>

        <div className="space-y-4">
          {[
            {
              step: '01',
              icon: <ShieldCheck className="h-5 w-5 text-cyan-300" />,
              title: '구글 계정으로 가입',
              desc: '별도 가입 절차 없이 구글 소셜 로그인으로 바로 시작합니다.',
            },
            {
              step: '02',
              icon: <Bot className="h-5 w-5 text-violet-300" />,
              title: '텔레그램 봇 연동',
              desc: '@bemialert_bot 에 /start 후 설정 페이지에서 발급된 코드를 입력하면 완료.',
            },
            {
              step: '03',
              icon: <Bell className="h-5 w-5 text-emerald-300" />,
              title: '알림 수신 시작',
              desc: '이후 펌프·덤프·웨일·선물 이상 감지 시 텔레그램으로 즉시 알림이 발송됩니다.',
            },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} className="flex gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <div className="shrink-0 flex flex-col items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  {icon}
                </div>
                <span className="text-xs font-bold text-zinc-700">{step}</span>
              </div>
              <div className="pt-1">
                <h3 className="font-semibold text-sm mb-1">{title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative mx-auto max-w-3xl px-5 py-16 text-center">
        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-10">
          <h2 className="text-2xl font-bold mb-3">지금 무료로 시작하세요</h2>
          <p className="text-zinc-400 text-sm mb-6">모든 기능을 무료로 이용할 수 있습니다.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-colors"
          >
            구글로 시작하기 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── 푸터 ── */}
      <footer className="relative border-t border-white/5 py-8">
        <div className="mx-auto max-w-5xl px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <Zap className="h-3.5 w-3.5 text-cyan-400/50" />
            <span>Bemi Alert</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <Link href="/privacy" className="hover:text-zinc-400 transition-colors">개인정보처리방침</Link>
            <Link href="/terms"   className="hover:text-zinc-400 transition-colors">이용약관</Link>
            <Link href="/help"    className="hover:text-zinc-400 transition-colors">도움말</Link>
            <Link href="/pricing" className="hover:text-zinc-400 transition-colors">요금제</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
