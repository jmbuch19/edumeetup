/**
 * UniversityAvatar
 * Renders a university logo if available, or a teal→navy gradient circle
 * with the institution's first letter in white DM Sans 700.
 *
 * Usage:
 *   <UniversityAvatar logoUrl={uni.logo} name={uni.institutionName} size={36} />
 */

interface UniversityAvatarProps {
    logoUrl?: string | null
    name?: string | null
    /** Pixel size for width and height. Default 36. */
    size?: number
    className?: string
}

export function UniversityAvatar({ logoUrl, name, size = 36, className = '' }: UniversityAvatarProps) {
    const letter = (name ?? 'U').charAt(0).toUpperCase()
    const px = `${size}px`

    if (logoUrl) {
        return (
            <img
                src={logoUrl}
                alt={name ?? 'University logo'}
                width={size}
                height={size}
                className={className}
                style={{
                    width: px,
                    height: px,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid var(--teal)',
                    flexShrink: 0,
                }}
                onError={(e) => {
                    // Swap to fallback on broken image
                    e.currentTarget.style.display = 'none'
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement | null
                    if (fallback) fallback.style.display = 'flex'
                }}
            />
        )
    }

    return (
        <div
            aria-label={`${name ?? 'University'} avatar`}
            className={className}
            style={{
                width: px,
                height: px,
                borderRadius: '50%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, var(--teal), var(--navy-mid))',
                border: '2px solid var(--teal)',
                color: 'white',
                fontFamily: 'var(--font-display)',  // DM Sans
                fontWeight: 700,
                fontSize: Math.round(size * 0.42),
                lineHeight: 1,
                userSelect: 'none',
            }}
        >
            {letter}
        </div>
    )
}
