import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Bemi Alert — 실시간 암호화폐 펌프·덤프 감지';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          background: '#06080d',
          padding: '64px 72px',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 배경 글로우 */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 900,
            height: 500,
            background: 'radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -100,
            right: -100,
            width: 500,
            height: 500,
            background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* 헤더 — 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              background: 'rgba(34,211,238,0.12)',
              border: '1.5px solid rgba(34,211,238,0.3)',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
            }}
          >
            ⚡
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#e4e4e7', letterSpacing: '-0.5px' }}>
            Bemi Alert
          </span>
        </div>

        {/* 메인 텍스트 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, justifyContent: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(34,211,238,0.08)',
              border: '1px solid rgba(34,211,238,0.2)',
              borderRadius: 999,
              padding: '6px 16px',
              width: 'fit-content',
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22d3ee' }} />
            <span style={{ fontSize: 14, color: '#67e8f9', fontWeight: 600 }}>실시간 암호화폐 이상 감지</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 58, fontWeight: 800, color: '#f4f4f5', letterSpacing: '-2px', lineHeight: 1.1 }}>
              펌프·덤프 신호를
            </span>
            <span
              style={{
                fontSize: 58,
                fontWeight: 800,
                letterSpacing: '-2px',
                lineHeight: 1.1,
                background: 'linear-gradient(90deg, #67e8f9, #a78bfa)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              즉시 받아보세요
            </span>
          </div>

          <span style={{ fontSize: 20, color: '#71717a', marginTop: 4, lineHeight: 1.5 }}>
            바이낸스 전체 코인 1분 스캔 · 텔레그램 즉시 알림 · 무료
          </span>
        </div>

        {/* 하단 — 신호 뱃지들 + URL */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: '▲ PUMP', sub: '+12.4%', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', color: '#6ee7b7' },
              { label: '▼ DUMP', sub: '-8.7%',  bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  color: '#fca5a5' },
              { label: '🐋 웨일',  sub: '$2.1M',  bg: 'rgba(34,211,238,0.1)',  border: 'rgba(34,211,238,0.25)', color: '#67e8f9' },
              { label: '📊 선물',  sub: 'OI +4%', bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.3)', color: '#c4b5fd' },
            ].map(({ label, sub, bg, border, color }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: 12,
                  padding: '10px 18px',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color }}>{label}</span>
                <span style={{ fontSize: 12, color: '#a1a1aa' }}>{sub}</span>
              </div>
            ))}
          </div>

          <span style={{ fontSize: 16, color: '#3f3f46', fontWeight: 500 }}>bemialert.com</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
