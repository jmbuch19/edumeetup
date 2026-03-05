'use client'

interface ProfileRingProps {
    pct: number
    color?: string
    size?: number
    strokeWidth?: number
}

export function ProfileRing({
    pct,
    color = '#0D9488',
    size = 60,
    strokeWidth = 6,
}: ProfileRingProps) {
    const r = (size - strokeWidth) / 2
    const circ = 2 * Math.PI * r
    const offset = circ - (Math.min(Math.max(pct, 0), 100) / 100) * circ
    const center = size / 2
    const fontSize = size < 50 ? 10 : 13

    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                style={{ transform: 'rotate(-90deg)' }}
            >
                {/* Track */}
                <circle
                    cx={center} cy={center} r={r}
                    fill="none"
                    stroke="var(--border-dash, #D1FAF5)"
                    strokeWidth={strokeWidth}
                />
                {/* Progress */}
                <circle
                    cx={center} cy={center} r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
            </svg>
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize, fontWeight: 700, color: 'var(--navy, #0F2044)',
            }}>
                {pct}%
            </div>
        </div>
    )
}
