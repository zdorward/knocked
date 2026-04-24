import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Knocked — Door-to-door sales tracker'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#0f172a',
          paddingLeft: 120,
          paddingRight: 120,
          gap: 64,
        }}
      >
        {/* Door icon — div-based for satori compatibility */}
        <div
          style={{
            width: 160,
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {/* Door panel — no frame, floats on background */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: '#d97706',
              borderRadius: 10,
            }}
          />
          {/* Knob */}
          <div
            style={{
              position: 'absolute',
              right: 22,
              top: 98,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: '#fde68a',
            }}
          />
        </div>

        {/* Text block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span
            style={{
              color: '#f8fafc',
              fontSize: 96,
              fontWeight: 900,
              letterSpacing: '-3px',
              lineHeight: 1,
            }}
          >
            Knocked
          </span>
          <span
            style={{
              color: '#94a3b8',
              fontSize: 36,
              fontWeight: 400,
            }}
          >
            Door-to-door sales tracker
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
