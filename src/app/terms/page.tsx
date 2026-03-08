import Link from 'next/link';
import { Zap } from 'lucide-react';

export const metadata = {
  title: '서비스 이용약관 — Bemi Alert',
};

export default function TermsPage() {
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
        <h1 className="text-2xl font-bold mb-2">서비스 이용약관</h1>
        <p className="text-zinc-500 text-sm mb-10">최종 업데이트: 2025년 3월</p>

        <div className="space-y-8 text-sm leading-relaxed text-zinc-300">

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">1. 서비스 소개</h2>
            <p className="text-zinc-400">Bemi Alert는 바이낸스 암호화폐 시장의 급등/급락(PUMP/DUMP), 고래 활동, 선물 지표를 실시간으로 감지하여 텔레그램으로 알림을 제공하는 정보 제공 서비스입니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">2. 투자 면책 조항</h2>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-amber-300">
              본 서비스에서 제공하는 모든 정보는 <strong>투자 참고용</strong>이며, 투자 권유 또는 투자 조언이 아닙니다. 서비스에서 제공하는 신호를 기반으로 한 투자 결정과 그 결과에 대한 책임은 전적으로 이용자 본인에게 있습니다. 암호화폐 투자는 원금 손실 위험이 있습니다.
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">3. 이용 자격</h2>
            <ul className="space-y-1 list-disc list-inside text-zinc-400">
              <li>만 19세 이상 이용 가능합니다.</li>
              <li>Google 계정으로 로그인하여 이용합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">4. 유료 서비스 (PRO)</h2>
            <ul className="space-y-1 list-disc list-inside text-zinc-400">
              <li>PRO 구독은 월 ₩9,900이며 매월 자동 결제됩니다.</li>
              <li>구독 해지는 언제든지 가능하며, 해지 즉시 FREE 플랜으로 전환됩니다.</li>
              <li>이미 결제된 기간에 대한 환불은 제공되지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">5. 서비스 중단 및 변경</h2>
            <p className="text-zinc-400">운영자는 서비스 내용을 변경하거나 중단할 수 있으며, 이에 대해 별도의 보상을 제공하지 않습니다. 중요한 변경 사항은 사전에 공지합니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">6. 금지 행위</h2>
            <ul className="space-y-1 list-disc list-inside text-zinc-400">
              <li>서비스를 이용한 불법 행위</li>
              <li>타인의 계정 도용</li>
              <li>서비스 데이터의 무단 수집 및 재배포</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">7. 문의</h2>
            <p className="text-zinc-400">서비스 관련 문의: <span className="text-cyan-400">frontier0553@gmail.com</span></p>
          </section>

        </div>
      </main>
    </div>
  );
}
