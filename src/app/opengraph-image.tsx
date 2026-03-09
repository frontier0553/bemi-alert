import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Bemi Alert';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          backgroundColor: '#06080d',
          padding: '60px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* 상단 컬러 바 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1200,
            height: 4,
            background: 'linear-gradient(90deg, #06b6d4, #8b5cf6)',
          }}
        />

        {/* 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              backgroundColor: 'rgba(34,211,238,0.15)',
              border: '1.5px solid rgba(34,211,238,0.4)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: 20, height: 20, backgroundColor: '#22d3ee', borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#d4d4d8' }}>
            Bemi Alert
          </span>
        </div>

        {/* 메인 헤드라인 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 라이브 뱃지 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'rgba(34,211,238,0.08)',
              border: '1px solid rgba(34,211,238,0.25)',
              borderRadius: 999,
              padding: '6px 16px',
              marginBottom: 8,
            }}
          >
            <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#22d3ee' }} />
            <span style={{ fontSize: 14, color: '#67e8f9', fontWeight: 600 }}>
              실시간 암호화폐 이상 감지
            </span>
          </div>

          <span
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: '#f4f4f5',
              letterSpacing: '-2px',
              lineHeight: 1,
            }}
          >
            펌프·덤프 신호를
          </span>
          <span
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: '#22d3ee',
              letterSpacing: '-2px',
              lineHeight: 1,
            }}
          >
            즉시 받아보세요
          </span>

          <span style={{ fontSize: 20, color: '#52525b', marginTop: 8 }}>
            바이낸스 전체 코인 1분 스캔 · 텔레그램 알림 · 무료
          </span>
        </div>

        {/* 하단 신호 카드들 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'PUMP', sub: '+12.4%', borderColor: 'rgba(16,185,129,0.4)', bg: 'rgba(16,185,129,0.1)', color: '#6ee7b7' },
              { label: 'DUMP', sub: '-8.7%',  borderColor: 'rgba(239,68,68,0.4)',  bg: 'rgba(239,68,68,0.1)',  color: '#fca5a5' },
              { label: 'WHALE', sub: '$2.1M', borderColor: 'rgba(34,211,238,0.35)', bg: 'rgba(34,211,238,0.08)', color: '#67e8f9' },
              { label: 'FUTURES', sub: 'OI+4%', borderColor: 'rgba(139,92,246,0.4)', bg: 'rgba(139,92,246,0.1)', color: '#c4b5fd' },
            ].map(({ label, sub, borderColor, bg, color }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  backgroundColor: bg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 10,
                  padding: '10px 18px',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color }}>{label}</span>
                <span style={{ fontSize: 12, color: '#71717a' }}>{sub}</span>
              </div>
            ))}
          </div>
          <span style={{ fontSize: 15, color: '#3f3f46' }}>bemialert.com</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
