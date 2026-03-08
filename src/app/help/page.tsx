'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Zap, TrendingUp, TrendingDown, Waves,
  ChevronDown, BarChart2, Clock, AlertTriangle,
} from 'lucide-react';

/* ── FAQ 아코디언 ────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm text-zinc-200 hover:text-zinc-100 transition-colors"
      >
        <span>{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed text-zinc-400">{a}</p>
      )}
    </div>
  );
}

/* ── 조건 배지 ───────────────────────────────────────────── */
function Cond({ children, color = 'zinc' }: { children: React.ReactNode; color?: 'emerald' | 'red' | 'cyan' | 'amber' | 'zinc' }) {
  const map = {
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    red:     'border-red-500/30 bg-red-500/10 text-red-300',
    cyan:    'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    amber:   'border-amber-500/30 bg-amber-500/10 text-amber-300',
    zinc:    'border-white/10 bg-white/5 text-zinc-300',
  };
  return (
    <span className={`inline-block rounded-lg border px-2.5 py-1 text-xs font-mono font-semibold ${map[color]}`}>
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────── */
export default function HelpPage() {
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

      <main className="relative mx-auto max-w-[900px] px-5 py-8 flex flex-col gap-8">

        {/* 타이틀 */}
        <div>
          <h1 className="text-2xl font-bold mb-1">사용 가이드</h1>
          <p className="text-sm text-zinc-500">신호 해석 방법과 각 지표의 의미를 설명합니다.</p>
        </div>

        {/* ── 1. 신호 한눈에 보기 ── */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-4 text-sm font-bold text-zinc-200 flex items-center gap-2">
            <Zap className="h-4 w-4 text-cyan-300" /> 신호 종류 한눈에 보기
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-300">PUMP</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                단기 급등 감지. 가격 상승과 거래량 폭증이 동시에 발생할 때 생성됩니다.
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-600">3분 수익률</span>
                  <Cond color="emerald">≥ +3%</Cond>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-600">또는 5분</span>
                  <Cond color="emerald">≥ +4%</Cond>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-600">거래량 배수</span>
                  <Cond color="emerald">≥ 3×</Cond>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <span className="text-sm font-bold text-red-300">DUMP</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                단기 급락 감지. 대량 매도 또는 청산 압력이 집중될 때 생성됩니다.
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-600">3분 하락률</span>
                  <Cond color="red">≤ −3%</Cond>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-600">또는 5분</span>
                  <Cond color="red">≤ −4%</Cond>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-600">거래량 배수</span>
                  <Cond color="red">≥ 3×</Cond>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Waves className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-bold text-cyan-300">WHALE</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                고래(대형 자금) 거래 감지. 대규모 단일 체결 흐름이 집중될 때 표시됩니다.
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-600">압력 지수 BUY</span>
                  <Cond color="cyan">≥ +40</Cond>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-600">압력 지수 SELL</span>
                  <Cond color="red">≤ −40</Cond>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-600">범위</span>
                  <Cond>−100 ~ +100</Cond>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── 2. 수치 읽는 법 ── */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-4 text-sm font-bold text-zinc-200 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-cyan-300" /> 수치 읽는 법
          </h2>

          {/* 예시 카드 */}
          <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
            <p className="text-[11px] text-zinc-600 mb-2 uppercase tracking-wider">실제 신호 예시</p>
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-lg font-bold text-emerald-300">BTCUSDT</span>
              <span className="rounded-lg bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300">▲ PUMP</span>
              <span className="text-sm font-mono text-zinc-200">+5.4% <span className="text-zinc-600 text-xs">(3m)</span></span>
              <span className="text-sm font-mono text-zinc-200">vol <span className="text-amber-300">×3.2</span></span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-3">
              <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
                <div className="text-xs font-semibold text-zinc-300 mb-1">변동폭 — <code className="text-amber-300">+5.4% (3m)</code></div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  최근 <strong className="text-zinc-300">3분</strong> 동안 가격이 <strong className="text-emerald-300">+5.4%</strong> 상승했다는 의미.<br />
                  숫자가 클수록 빠르고 강한 움직임입니다.
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
                <div className="text-xs font-semibold text-zinc-300 mb-1">거래량 — <code className="text-amber-300">×3.2</code></div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  직전 60분 평균 대비 현재 거래량이 <strong className="text-amber-300">3.2배</strong>.<br />
                  평소보다 거래가 3배 이상 몰렸다는 신호입니다.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
                <div className="text-xs font-semibold text-zinc-300 mb-1">압력 지수 — <code className="text-amber-300">+22</code></div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  고래 매수 건수 vs 매도 건수의 균형 지수.<br />
                  <span className="text-emerald-300">+40 이상</span>: 강한 매집 /
                  <span className="text-red-300"> −40 이하</span>: 강한 매도 /
                  그 외: 중립
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
                <div className="text-xs font-semibold text-zinc-300 mb-1">펀딩비 — <code className="text-amber-300">−0.12%</code></div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  선물 롱/숏 포지션이 지불하는 비용.<br />
                  <span className="text-emerald-300">양수</span>: 롱 우세 /
                  <span className="text-red-300"> 음수</span>: 숏 우세.<br />
                  극단값(±0.1% 이상)은 과열/역배팅 신호.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. 쿨다운 & 중복 차단 ── */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-3 text-sm font-bold text-zinc-200 flex items-center gap-2">
            <Clock className="h-4 w-4 text-cyan-300" /> 쿨다운 — 중복 알림 차단 방식
          </h2>
          <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
            같은 코인이 짧은 시간 안에 연속으로 감지되면, 의미 없는 중복 알림이 쌓입니다.
            Bemi Alert는 아래 쿨다운 규칙으로 이를 차단합니다.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'PUMP / DUMP', cool: '10분', upgrade: '+2% 이상 추가 상승 시 재발송', color: 'emerald' },
              { label: 'Whale Flow', cool: '10분', upgrade: '동일 코인 재감지 차단', color: 'cyan' },
              { label: '선물 (펀딩·OI)', cool: '15분', upgrade: '변화 속도가 느려 쿨타임 김', color: 'amber' },
            ].map(r => (
              <div key={r.label} className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
                <div className="text-xs font-semibold text-zinc-200 mb-1">{r.label}</div>
                <div className="text-lg font-bold text-zinc-100 mb-1">{r.cool}</div>
                <div className="text-[11px] text-zinc-600 leading-relaxed">{r.upgrade}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. 개인 설정 ── */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-3 text-sm font-bold text-zinc-200">개인 알림 설정 (로그인 필요)</h2>
          <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
            로그인 후 <Link href="/user/settings" className="text-cyan-400 hover:underline">내 설정</Link>에서 아래를 직접 조정할 수 있습니다.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { title: '관심 코인 필터', desc: '원하는 코인만 알림 수신. 비워두면 전체 코인 알림.', ex: 'BTC, ETH, SOL' },
              { title: '개인 임계값', desc: 'PUMP/DUMP 기준을 직접 설정. 글로벌값보다 높거나 낮게 조정 가능.', ex: 'PUMP ≥ 5%, DUMP ≤ −5%' },
              { title: '텔레그램 연동', desc: '봇에서 /link CODE 입력 시 개인화된 알림을 텔레그램으로 수신.', ex: '@bemialert_bot' },
            ].map(c => (
              <div key={c.title} className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
                <div className="text-xs font-semibold text-zinc-200 mb-1">{c.title}</div>
                <p className="text-[11px] text-zinc-500 mb-2 leading-relaxed">{c.desc}</p>
                <code className="text-[11px] text-cyan-400">{c.ex}</code>
              </div>
            ))}
          </div>
        </section>

        {/* ── 5. FAQ ── */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-2 text-sm font-bold text-zinc-200">자주 묻는 질문</h2>
          <div>
            {[
              {
                q: '신호가 나왔다고 바로 매수해도 되나요?',
                a: 'Bemi Alert 신호는 단순 데이터 기반 감지입니다. 시장 조건, 매크로 이벤트, 유동성 등 다양한 요소를 함께 고려해야 합니다. 모든 투자 판단과 책임은 본인에게 있습니다.',
              },
              {
                q: '실시간 신호가 비어있어요.',
                a: '실시간 신호는 최근 1시간 이내 감지된 것만 표시됩니다. 시장이 조용하거나 설정된 임계값에 도달한 코인이 없으면 비어 보일 수 있습니다.',
              },
              {
                q: '거래량 배수(×)는 어떻게 계산되나요?',
                a: '현재 1분봉 거래량 ÷ 직전 60분봉 평균 거래량입니다. ×3이면 평소보다 3배 많은 자금이 단시간에 집중됐다는 의미입니다.',
              },
              {
                q: '텔레그램 알림은 어떻게 받나요?',
                a: '로그인 후 [내 설정] → 텔레그램 연동 섹션에서 코드를 생성하세요. 그 다음 @bemialert_bot 에서 /link [코드] 를 입력하면 개인화 알림이 활성화됩니다.',
              },
              {
                q: '고래 압력 지수는 무엇인가요?',
                a: '(매수 대형 체결 건수 × 2) − (매도 대형 체결 건수 × 2) + 거래량 스파이크 보정으로 계산됩니다. +40 이상이면 강한 매집, −40 이하면 강한 매도 압력으로 봅니다.',
              },
              {
                q: '펀딩비가 음수면 좋은 건가요?',
                a: '펀딩비 음수는 숏 포지션이 많다는 의미입니다. 숏 스퀴즈가 발생하면 급격한 상승이 나올 수 있습니다. 다만 시장 방향을 단독으로 예측하기는 어렵습니다.',
              },
            ].map(item => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </section>

        {/* ── 6. 면책 조항 ── */}
        <section className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-amber-300 mb-1">투자 위험 고지</div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                본 서비스는 시장 데이터 분석 도구이며 <strong className="text-zinc-200">투자 조언이 아닙니다.</strong>{' '}
                제공되는 모든 신호와 수치는 참고용으로만 사용하시고,
                투자 결정에 대한 책임은 전적으로 사용자 본인에게 있습니다.
                암호화폐 시장은 고위험 자산으로 원금 손실이 발생할 수 있습니다.
              </p>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
