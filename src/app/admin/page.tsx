'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/* ───── 타입 ───── */
interface UserRow {
  id: string;
  email: string;
  tier: string;
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  telegramSubscribers: number;
  linkedUsers: number;
  signalsToday: number;
  futuresAlertsToday: number;
  whaleEventsToday: number;
}

interface ScanSettings {
  SCAN_TOP_N: string;
  SCAN_PUMP_PCT: string;
  SCAN_DUMP_PCT: string;
  SCAN_VOLUME_MULT: string;
  SCAN_COOLDOWN_MINUTES: string;
}

/* ───── 작은 컴포넌트 ───── */
function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4">
      <div className="text-2xl font-bold text-zinc-100">{value.toLocaleString()}</div>
      <div className="mt-1 text-xs text-zinc-400">{label}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-600">{sub}</div>}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 border-b border-white/10 text-sm font-medium text-zinc-400">
      {children}
    </div>
  );
}

/* ───── 메인 ───── */
export default function AdminPage() {
  const router = useRouter();

  /* 상태 */
  const [users, setUsers]         = useState<UserRow[]>([]);
  const [stats, setStats]         = useState<Stats | null>(null);
  const [settings, setSettings]   = useState<ScanSettings | null>(null);
  const [loading, setLoading]     = useState(true);

  const [search, setSearch]       = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'FREE' | 'PRO'>('ALL');

  const [scanLoading, setScanLoading] = useState<Record<string, boolean>>({});
  const [scanResult,  setScanResult]  = useState<Record<string, string>>({});

  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg,    setSettingsMsg]    = useState('');
  const [draftSettings,  setDraftSettings] = useState<ScanSettings | null>(null);

  /* 데이터 로드 */
  const load = useCallback(async () => {
    const meRes = await fetch('/api/admin/me').then(r => r.json());
    if (!meRes.isAdmin) { router.replace('/'); return; }

    const [usersData, statsData, settingsData] = await Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/stats').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ]);

    setUsers(usersData);
    setStats(statsData);
    setSettings(settingsData);
    setDraftSettings(settingsData);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  /* tier 변경 */
  async function toggleTier(user: UserRow) {
    const newTier = user.tier === 'FREE' ? 'PRO' : 'FREE';
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, tier: newTier }),
    });
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, tier: newTier } : u));
  }

  /* 수동 스캔 트리거 */
  async function triggerScan(type: 'spot' | 'futures' | 'whale') {
    setScanLoading(p => ({ ...p, [type]: true }));
    setScanResult(p => ({ ...p, [type]: '' }));
    try {
      const res = await fetch('/api/admin/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      setScanResult(p => ({ ...p, [type]: data.ok ? '완료' : `오류: ${data.data?.error ?? data.error}` }));
      if (data.ok) {
        // 통계 갱신
        fetch('/api/admin/stats').then(r => r.json()).then(setStats);
      }
    } catch (e) {
      setScanResult(p => ({ ...p, [type]: `오류: ${String(e)}` }));
    } finally {
      setScanLoading(p => ({ ...p, [type]: false }));
    }
  }

  /* 설정 저장 */
  async function saveSettings() {
    if (!draftSettings) return;
    setSettingsSaving(true);
    setSettingsMsg('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          SCAN_TOP_N:            parseFloat(draftSettings.SCAN_TOP_N),
          SCAN_PUMP_PCT:         parseFloat(draftSettings.SCAN_PUMP_PCT),
          SCAN_DUMP_PCT:         parseFloat(draftSettings.SCAN_DUMP_PCT),
          SCAN_VOLUME_MULT:      parseFloat(draftSettings.SCAN_VOLUME_MULT),
          SCAN_COOLDOWN_MINUTES: parseFloat(draftSettings.SCAN_COOLDOWN_MINUTES),
        }),
      });
      const data = await res.json();
      setSettingsMsg(data.ok ? '저장되었습니다' : `오류: ${data.error}`);
      if (data.ok) setSettings(draftSettings);
    } catch (e) {
      setSettingsMsg(`오류: ${String(e)}`);
    } finally {
      setSettingsSaving(false);
      setTimeout(() => setSettingsMsg(''), 3000);
    }
  }

  /* 유저 필터 */
  const filteredUsers = users.filter(u => {
    const matchEmail = u.email.toLowerCase().includes(search.toLowerCase());
    const tierNorm = (t: string) => (t === 'PAID' ? 'PRO' : t);
    const matchTier  = tierFilter === 'ALL' || tierNorm(u.tier) === tierFilter;
    return matchEmail && matchTier;
  });

  if (loading) return (
    <div className="min-h-screen bg-[#06080d] text-zinc-400 flex items-center justify-center">
      로딩 중...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#06080d] text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <a href="/" className="text-zinc-500 hover:text-zinc-300 text-sm">← 대시보드</a>
          <h1 className="text-lg font-bold">관리자 패널</h1>
        </div>

        {/* ── 1. 통계 ── */}
        {stats && (
          <section>
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">통계 (오늘)</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard label="총 가입 유저"        value={stats.totalUsers} />
              <StatCard label="텔레그램 구독자"     value={stats.telegramSubscribers} sub={`연동 ${stats.linkedUsers}명`} />
              <StatCard label="스팟 신호"           value={stats.signalsToday} sub="오늘" />
              <StatCard label="선물 알림"           value={stats.futuresAlertsToday} sub="오늘" />
              <StatCard label="웨일 이벤트"         value={stats.whaleEventsToday} sub="오늘" />
            </div>
          </section>
        )}

        {/* ── 2. 스캔 설정 ── */}
        {draftSettings && (
          <section>
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">스캔 설정</div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <SectionHeader>글로벌 파라미터</SectionHeader>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  { key: 'SCAN_TOP_N',            label: '스캔 종목 수 (Top N)',  unit: '개', min: 10,  max: 500  },
                  { key: 'SCAN_PUMP_PCT',          label: '펌프 감지 임계값',      unit: '%',  min: 1,   max: 50   },
                  { key: 'SCAN_DUMP_PCT',          label: '덤프 감지 임계값',      unit: '%',  min: 1,   max: 50   },
                  { key: 'SCAN_VOLUME_MULT',       label: '거래량 배수',           unit: 'x',  min: 0.5, max: 20   },
                  { key: 'SCAN_COOLDOWN_MINUTES',  label: '쿨다운 (분)',           unit: '분', min: 1,   max: 1440 },
                ] as const).map(({ key, label, unit, min, max }) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-xs text-zinc-400">{label}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={min}
                        max={max}
                        step={key === 'SCAN_VOLUME_MULT' ? 0.1 : 1}
                        value={draftSettings[key]}
                        onChange={e => setDraftSettings(p => p ? { ...p, [key]: e.target.value } : p)}
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-cyan-500/50"
                      />
                      <span className="text-xs text-zinc-500 w-6 shrink-0">{unit}</span>
                    </div>
                  </label>
                ))}
              </div>
              <div className="px-4 pb-4 flex items-center gap-3">
                <button
                  onClick={saveSettings}
                  disabled={settingsSaving}
                  className="px-4 py-1.5 text-sm rounded-lg bg-cyan-600/80 hover:bg-cyan-600 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {settingsSaving ? '저장 중...' : '설정 저장'}
                </button>
                <button
                  onClick={() => setDraftSettings(settings)}
                  className="px-4 py-1.5 text-sm rounded-lg border border-white/10 hover:bg-white/10 text-zinc-400 transition-colors"
                >
                  초기화
                </button>
                {settingsMsg && (
                  <span className={`text-xs ${settingsMsg.startsWith('오류') ? 'text-red-400' : 'text-emerald-400'}`}>
                    {settingsMsg}
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── 3. 수동 스캔 트리거 ── */}
        <section>
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">수동 스캔 트리거</div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <SectionHeader>지금 즉시 스캔 실행</SectionHeader>
            <div className="p-4 flex flex-wrap gap-3">
              {([
                { type: 'spot',    label: '스팟 스캔',   desc: '펌프/덤프 감지' },
                { type: 'futures', label: '선물 스캔',   desc: '펀딩률/OI 감지' },
                { type: 'whale',   label: '웨일 스캔',   desc: '대형 거래 감지' },
              ] as const).map(({ type, label, desc }) => (
                <div key={type} className="flex flex-col gap-1">
                  <button
                    onClick={() => triggerScan(type)}
                    disabled={scanLoading[type]}
                    className="px-4 py-2 text-sm rounded-lg border border-white/10 hover:bg-white/10 text-zinc-300 hover:text-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-wait"
                  >
                    {scanLoading[type] ? '실행 중...' : label}
                  </button>
                  <span className="text-xs text-zinc-600 text-center">{desc}</span>
                  {scanResult[type] && (
                    <span className={`text-xs text-center ${scanResult[type].startsWith('오류') ? 'text-red-400' : 'text-emerald-400'}`}>
                      {scanResult[type]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. 유저 목록 ── */}
        <section>
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">유저 관리</div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
            {/* 검색/필터 */}
            <div className="px-4 py-3 border-b border-white/10 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="이메일 검색..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
              />
              <div className="flex gap-1">
                {(['ALL', 'FREE', 'PRO'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTierFilter(t)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      tierFilter === t
                        ? 'bg-cyan-600/80 text-white'
                        : 'border border-white/10 text-zinc-400 hover:bg-white/10'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-4 py-2 text-xs text-zinc-500 border-b border-white/5">
              {filteredUsers.length}명 / 전체 {users.length}명
            </div>

            {filteredUsers.length === 0 ? (
              <div className="px-4 py-6 text-sm text-zinc-500 text-center">검색 결과 없음</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 text-xs border-b border-white/10">
                    <th className="text-left px-4 py-2">이메일</th>
                    <th className="text-left px-4 py-2">가입일</th>
                    <th className="text-center px-4 py-2">Tier</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-zinc-200">{u.email}</td>
                      <td className="px-4 py-3 text-zinc-500">
                        {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          u.tier !== 'FREE'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'bg-zinc-700/50 text-zinc-400'
                        }`}>
                          {u.tier === 'PAID' ? 'PRO' : u.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => toggleTier(u)}
                          className="text-xs px-3 py-1 rounded border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          {u.tier === 'FREE' ? 'PRO로 변경' : 'FREE로 변경 (현재: PRO)'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
