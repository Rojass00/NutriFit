import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

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
          backgroundColor: '#0B0D12',
          borderRadius: '40px',
        }}
      >
        <svg
          viewBox="0 0 96 96"
          width="110"
          height="110"
          style={{ display: 'flex' }}
        >
          <defs>
            <mask id="nf-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="96" height="96">
              <rect width="96" height="96" fill="#fff" />
              <polyline
                points="26,64 40,50 52,57 68,32"
                fill="none"
                stroke="#000"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="68" cy="32" r="5" fill="#000" />
            </mask>
          </defs>
          <path
            d="M16 80V48A32 32 0 0 1 48 16H80V48A32 32 0 0 1 48 80Z"
            fill="#34C759"
            mask="url(#nf-mask)"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
