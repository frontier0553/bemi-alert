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
          padding: '60px 72px',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 배경 글로우 — linear-gradient 사용 (radial 미지원) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, #06b6d4, #8b5cf6)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: -300,
            left: 200,
            width: 700,
            height: 600,
            background: 'linear-gradient(180deg, rgba(34,211,238,0.07) 0%, transparent 100%)',
            borderRadius: '50%',
          }}
        />

        {/* 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 46,
              height: 46,
              background: 'rgba(34,211,238,0.12)',
              border: '1.5px solid rgba(34,211,238,0.3)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            ⚡
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#d4d4d8', letterSpacing: '-0.3px' }}>
            Bemi Alert
          </span>
        </div>

        {/* 메인 카피 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 뱃지 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(34,211,238,0.08)',
              border: '1px solid rgba(34,211,238,0.2)',
              borderRadius: 999,
              padding: '5px 14px',
              width: 'fit-content',
            }}
          >
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22d3ee' }} />
            <span style={{ fontSize: 13, color: '#67e8f9', fontWeight: 600 }}>실시간 암호화폐 이상 감지</span>
          </div>

          {/* 헤드라인 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 62, fontWeight: 800, color: '#f4f4f5', letterSpacing: '-2.5px', lineHeight: 1.05 }}>
              펌프·덤프 신호를
            </span>
            <span style={{ fontSize: 62, fontWeight: 800, color: '#22d3ee', letterSpacing: '-2.5px', lineHeight: 1.05 }}>
              즉시 받아보세요
            </span>
          </div>

          {/* 서브텍스트 */}
          <span style={{ fontSize: 19, color: '#52525b', marginTop: 4 }}>
            바이낸스 전체 코인 1분 스캔 · 텔레그램 즉시 알림 · 완전 무료
          </span>
        </div>

        {/* 하단 — 신호 뱃지 + URL */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: '▲ PUMP', sub: '+12.4%', borderColor: 'rgba(16,185,129,0.35)', bg: 'rgba(16,185,129,0.1)',  textColor: '#6ee7b7' },
              { label: '▼ DUMP', sub: '-8.7%',  borderColor: 'rgba(239,68,68,0.35)',  bg: 'rgba(239,68,68,0.1)',   textColor: '#fca5a5' },
              { label: '🐋 Whale', sub: '$2.1M', borderColor: 'rgba(34,211,238,0.3)',  bg: 'rgba(34,211,238,0.08)', textColor: '#67e8f9' },
              { label: '📊 선물',  sub: 'OI +4%', borderColor: 'rgba(139,92,246,0.35)', bg: 'rgba(139,92,246,0.1)', textColor: '#c4b5fd' },
            ].map(({ label, sub, borderColor, bg, textColor }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  background: bg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 10,
                  padding: '9px 16px',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: textColor }}>{label}</span>
                <span style={{ fontSize: 12, color: '#71717a' }}>{sub}</span>
              </div>
            ))}
          </div>

          <span style={{ fontSize: 15, color: '#3f3f46' }}>bemialert.com</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
