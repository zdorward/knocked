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
            height: 160,
            borderRadius: 32,
            backgroundColor: '#1c1400',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {/* Door body */}
          <div
            style={{
              width: 64,
              height: 104,
              borderRadius: 8,
              backgroundColor: '#d97706',
              position: 'relative',
              display: 'flex',
            }}
          >
            {/* Door knob */}
            <div
              style={{
                position: 'absolute',
                right: 10,
                top: 46,
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: '#fde68a',
              }}
            />
          </div>
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
