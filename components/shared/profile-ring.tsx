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
                <defs>
                    <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="var(--navy)" />
                        <stop offset="100%" stopColor="var(--gold)" />
                    </linearGradient>
                </defs>
                {/* Track */}
                <circle
                    cx={center} cy={center} r={r}
                    fill="none"
                    stroke="var(--surface-alt)"
                    strokeWidth={strokeWidth}
                />
                {/* Progress */}
                <circle
                    cx={center} cy={center} r={r}
                    fill="none"
                    stroke="url(#ring-grad)"
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
