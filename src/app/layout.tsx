import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bemi Alert — Crypto Pump/Dump Detection',
  description: '바이낸스 암호화폐 실시간 급등/급락 감지 대시보드',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
