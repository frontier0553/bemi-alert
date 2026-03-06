'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CandlestickChart, Settings2, Save } from 'lucide-react';

interface SettingConfig {
  key:         string;
  label:       string;
  description: string;
  unit:        string;
  min:         number;
  max:         number;
  step:        number;
}

const SETTINGS: SettingConfig[] = [
  {
    key:         'SCAN_TOP_N',
    label:       '감시 코인 수',
    description: '바이낸스 24h 거래량 기준 상위 N개 코인을 스캔합니다.',
    unit: '개', min: 10, max: 500, step: 10,
  },
  {
    key:         'SCAN_PUMP_PCT',
    label:       'PUMP 기준',
    description: '가격 변화율이 이 값 이상이면 PUMP로 판정합니다.',
    unit: '%', min: 1, max: 50, step: 0.5,
  },
  {
    key:         'SCAN_DUMP_PCT',
    label:       'DUMP 기준',
    description: '가격 변화율이 이 값 이하(−값)이면 DUMP로 판정합니다.',
    unit: '%', min: 1, max: 50, step: 0.5,
  },
  {
    key:         'SCAN_VOLUME_MULT',
    label:       '거래량 배수 기준',
    description: '거래량이 평균의 N배 이상일 때만 이벤트로 인정합니다.',
    unit: '배', min: 0.5, max: 20, step: 0.5,
  },
  {
    key:         'SCAN_COOLDOWN_MINUTES',
    label:       '중복 감지 쿨타임',
    description: '같은 코인이 재감지되기까지 최소 대기 시간입니다.',
    unit: '분', min: 1, max: 1440, step: 1,
  },
];

const FLOW_STEPS = [
  {
    icon: '🔄',
    label: '주기적 스캔',
    desc: 'Vercel Cron → /api/scan',
    details: ['60초마다 자동 실행', '바이낸스 현물 전체 티커 조회', 'USDT 페어만 필터링'],
    color: 'border-cyan-500/20 bg-cyan-500/5',
    labelColor: 'text-cyan-300',
  },
  {
    icon: '📊',
    label: '데이터 수집',
    desc: '캔들 + 거래량 병렬 수집',
    details: ['거래량 상위 N개 코인 선별', '1분봉 60개 캔들 수집', '배치 20개씩 병렬 요청'],
    color: 'border-blue-500/20 bg-blue-500/5',
    labelColor: 'text-blue-300',
  },
  {
    icon: '🧮',
    label: '조건 판별',
    desc: '수익률 + 거래량 배수',
    details: ['3분·5분 가격 변화율 계산', '현재 1분 거래량 / 60분 평균', '가짜 펌프 필터 (유동성·캔들)'],
    color: 'border-violet-500/20 bg-violet-500/5',
    labelColor: 'text-violet-300',
  },
  {
    icon: '💾',
    label: '이벤트 저장',
    desc: 'DB 기록 + 텔레그램 발송',
    details: ['쿨다운 중복 차단 (10분)', 'Signal DB 저장', '구독자 개인 필터 적용 후 발송'],
    color: 'border-emerald-500/20 bg-emerald-500/5',
    labelColor: 'text-emerald-300',
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [values, setValues]   = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved]     = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    // 관리자 체크
    fetch('/api/admin/me')
      .then(r => r.json())
      .then(({ isAdmin }) => {
        if (!isAdmin) { router.replace('/'); return; }
        fetch('/api/settings')
          .then(r => r.json())
          .then(data => { setValues(data); setLoading(false); });
      })
      .catch(() => router.replace('/'));
  }, [router]);

  async function handleSave() {
    setSaveError('');
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      const err = await res.json();
      setSaveError(err.error ?? '저장 실패');
    }
  }

  return (
    <div className="min-h-screen bg-[#06080d] text-zinc-100">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.05),transparent_25%)]" />

      {/* Header */}
      <header className="relative z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
              <CandlestickChart className="h-4 w-4 text-cyan-300" />
            </div>
            <span className="text-base font-bold tracking-tight">Bemi Alert</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              대시보드
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              관리자
            </Link>
            <Link
              href="/settings"
              className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-sm text-cyan-300"
            >
              설정
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1400px] px-5 py-6 flex flex-col gap-6">

        {/* 페이지 제목 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Settings2 className="h-5 w-5 text-zinc-400" />
            <h1 className="text-lg font-bold">설정</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={loading}
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

        {/* 작동 방식 */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-300">작동 방식</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FLOW_STEPS.map((step, i) => (
              <div key={step.label} className="relative">
                {/* 단계 번호 */}
                <div className={`rounded-xl border p-4 h-full ${step.color}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{step.icon}</span>
                    <span className={`text-xs font-bold ${step.labelColor}`}>{step.label}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mb-2.5 leading-relaxed">{step.desc}</p>
                  <ul className="space-y-1">
                    {step.details.map(d => (
                      <li key={d} className="flex items-start gap-1.5 text-[10px] text-zinc-400 leading-relaxed">
                        <span className="mt-0.5 text-zinc-600 shrink-0">·</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* 화살표 (마지막 제외) */}
                {i < FLOW_STEPS.length - 1 && (
                  <span className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-zinc-700 text-base">→</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 판별 공식 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-5">
            <div className="mb-3 text-sm font-semibold text-emerald-300">▲ PUMP 감지 조건</div>
            <div className="text-sm leading-loose text-zinc-300">
              3분 수익률 ≥ <span className="font-bold text-emerald-300">+3%</span>
              <span className="text-zinc-600 mx-2">또는</span>
              5분 수익률 ≥ <span className="font-bold text-emerald-300">+4%</span>
              <br />
              <span className="text-zinc-600">AND</span> 거래량 배수 ≥ <span className="font-bold text-emerald-300">3x</span>
            </div>
            <div className="mt-3 rounded-xl bg-black/20 px-3 py-2 text-xs text-zinc-500">
              유동성 $5M 이상 + 최근 3캔들 중 2개 이상 양봉 (가짜 펌프 필터)
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-3 text-sm font-semibold text-zinc-300">⏱ 쿨다운 로직</div>
            <div className="space-y-1.5 text-xs text-zinc-400">
              <div className="flex items-start gap-2"><span className="text-zinc-600">•</span> 같은 코인 <span className="text-zinc-200 font-semibold">10분</span> 내 중복 차단</div>
              <div className="flex items-start gap-2"><span className="text-zinc-600">•</span> 추가 <span className="text-zinc-200 font-semibold">+2%</span> 이상 상승 시 업그레이드 허용</div>
              <div className="flex items-start gap-2"><span className="text-zinc-600">•</span> USDT 페어만 스캔 (상위 200개)</div>
              <div className="flex items-start gap-2"><span className="text-zinc-600">•</span> 가격 변동 기준점: <span className="text-zinc-200 font-semibold">현재 시점 24h 롤링</span></div>
            </div>
          </div>
        </div>

        {/* 파라미터 */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-300">파라미터 설정</h2>
          {saveError && <p className="mb-3 text-sm text-red-400">{saveError}</p>}
          {loading ? (
            <div className="py-8 text-center text-sm text-zinc-600">로딩 중...</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SETTINGS.map(s => (
                <div key={s.key} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-zinc-200">{s.label}</span>
                    <span className="text-[10px] text-zinc-600 font-mono">{s.key}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-3 leading-relaxed">{s.description}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={s.min}
                      max={s.max}
                      step={s.step}
                      value={values[s.key] ?? ''}
                      onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
                      className="w-24 rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-cyan-400/40 tabular-nums"
                    />
                    <span className="text-sm text-zinc-500">{s.unit}</span>
                    <span className="text-xs text-zinc-700 ml-auto">{s.min}~{s.max}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* Toast */}
      {saved && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 shadow-lg backdrop-blur">
          ✓ 설정이 저장되었습니다
        </div>
      )}
    </div>
  );
}
