import { ImageResponse } from 'next/og';

export const size        = { width: 32, height: 32 };
export const contentType = 'image/png';

/**
 * Next.js App Router 아이콘 — 브라우저 탭·파비콘·구글 검색 결과에 사용
 * 번개 모양 + 다크 배경
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background:     '#06080d',
          width:          '100%',
          height:         '100%',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          borderRadius:   7,
        }}
      >
        {/* 번개 SVG — Satori/ImageResponse에서 svg 지원 */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          width="28"
          height="28"
        >
          {/* 번개: 굵고 단순한 단일 패스 */}
          <path
            d="M19 2 L6 18 L15 18 L13 30 L27 14 L18 14 Z"
            fill="#22d3ee"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
