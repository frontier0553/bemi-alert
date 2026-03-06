'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserRow {
  id: string;
  email: string;
  tier: string;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/me')
      .then(r => r.json())
      .then(({ isAdmin }) => {
        if (!isAdmin) { router.replace('/'); return; }
        return fetch('/api/admin/users').then(r => r.json());
      })
      .then(data => {
        if (data) setUsers(data);
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function toggleTier(user: UserRow) {
    const newTier = user.tier === 'FREE' ? 'PAID' : 'FREE';
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, tier: newTier }),
    });
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, tier: newTier } : u));
  }

  if (loading) return (
    <div className="min-h-screen bg-[#06080d] text-zinc-400 flex items-center justify-center">
      로딩 중...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#06080d] text-zinc-100 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <a href="/" className="text-zinc-500 hover:text-zinc-300 text-sm">← 대시보드</a>
          <h1 className="text-lg font-bold">관리자 패널</h1>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 text-sm font-medium text-zinc-400">
            가입 유저 목록 ({users.length}명)
          </div>
          {users.length === 0 ? (
            <div className="px-4 py-6 text-sm text-zinc-500 text-center">가입 유저 없음</div>
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
                {users.map(u => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-zinc-200">{u.email}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        u.tier === 'PAID'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-zinc-700/50 text-zinc-400'
                      }`}>
                        {u.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggleTier(u)}
                        className="text-xs px-3 py-1 rounded border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        {u.tier === 'FREE' ? 'PAID로 변경' : 'FREE로 변경'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
