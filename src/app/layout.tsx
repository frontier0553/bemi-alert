import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bemi Alert — 실시간 암호화폐 펌프·덤프 감지',
  description: '바이낸스 전체 코인을 1분마다 스캔합니다. 급등·급락 감지 시 텔레그램 알림을 즉시 전송합니다.',
  openGraph: {
    title: 'Bemi Alert — 실시간 암호화폐 펌프·덤프 감지',
    description: '바이낸스 전체 코인을 1분마다 스캔합니다. 급등·급락 감지 시 텔레그램 알림을 즉시 전송합니다.',
    url: 'https://bemialert.com',
    siteName: 'Bemi Alert',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bemi Alert — 실시간 암호화폐 펌프·덤프 감지',
    description: '바이낸스 전체 코인을 1분마다 스캔합니다. 급등·급락 감지 시 텔레그램 알림을 즉시 전송합니다.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
