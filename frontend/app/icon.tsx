import { ImageResponse } from 'next/og';

export const size = { width: 192, height: 192 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #8B5CF6 0%, #14B8A6 100%)',
          borderRadius: '20%',
        }}
      >
        <span style={{ fontSize: 80, fontWeight: 800, color: 'white' }}>G</span>
      </div>
    ),
    { ...size },
  );
}
