import Link from 'next/link';
import { Zap } from 'lucide-react';

export const metadata = {
  title: '개인정보처리방침 — Bemi Alert',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#06080d] text-zinc-100">
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[800px] items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
              <Zap className="h-4 w-4 text-cyan-300" />
            </div>
            <span className="text-base font-bold tracking-tight">Bemi Alert</span>
          </Link>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">← 홈으로</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[800px] px-5 py-12">
        <h1 className="text-2xl font-bold mb-2">개인정보처리방침</h1>
        <p className="text-zinc-500 text-sm mb-10">최종 업데이트: 2025년 3월</p>

        <div className="space-y-8 text-sm leading-relaxed text-zinc-300">

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">1. 수집하는 개인정보</h2>
            <p>Bemi Alert(이하 "서비스")는 다음 정보를 수집합니다.</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-zinc-400">
              <li>이메일 주소 (Google OAuth 로그인 시)</li>
              <li>텔레그램 Chat ID (알림 연동 시)</li>
              <li>서비스 이용 기록 (알림 설정, 관심 코인 등)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">2. 개인정보 수집 및 이용 목적</h2>
            <ul className="space-y-1 list-disc list-inside text-zinc-400">
              <li>회원 식별 및 로그인 서비스 제공</li>
              <li>텔레그램 알림 발송</li>
              <li>개인화된 알림 설정 저장</li>
              <li>서비스 품질 개선</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">3. 개인정보 보유 및 이용 기간</h2>
            <p className="text-zinc-400">회원 탈퇴 시 즉시 파기합니다. 단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관됩니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">4. 제3자 제공</h2>
            <p className="text-zinc-400 mb-2">수집한 개인정보는 원칙적으로 제3자에게 제공하지 않습니다. 다만, 서비스 운영을 위해 아래 업체에 처리를 위탁합니다.</p>
            <ul className="space-y-1 list-disc list-inside text-zinc-400">
              <li>Supabase — 인증 및 데이터베이스 (미국)</li>
              <li>Vercel — 웹 서비스 호스팅 (미국)</li>
              <li>Telegram — 알림 메시지 발송</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">5. 이용자 권리</h2>
            <p className="text-zinc-400">이용자는 언제든지 개인정보 열람, 수정, 삭제를 요청할 수 있습니다. 문의는 아래 이메일로 연락해주세요.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">6. 문의</h2>
            <p className="text-zinc-400">개인정보 관련 문의: <span className="text-cyan-400">frontier0553@gmail.com</span></p>
          </section>

        </div>
      </main>
    </div>
  );
}
