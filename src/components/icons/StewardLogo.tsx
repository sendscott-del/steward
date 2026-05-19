interface Props {
  size?: number
  variant?: 'mark' | 'inverse'
  className?: string
}

/**
 * Steward brand mark. Matches the v2.19.1 home-screen / PWA icon:
 *   - rounded square in Steward brand blue (#2563EB — the same blue the
 *     Gathered "S" chip uses), or white in `inverse`
 *   - large gold checkmark centered, no letter
 *
 * The white-"S" letterform that used to live here is gone; the suite-wide
 * convention is now "brand color + per-app gold accent shape," with the
 * "Steward" wordmark appearing as adjacent text wherever the logo is used.
 */
export function StewardLogo({ size = 44, variant = 'mark', className }: Props) {
  const isInverse = variant === 'inverse'
  const containerBg = isInverse ? '#FFFFFF' : '#2563EB'
  const accent = '#C9A84C'
  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.225),
    background: containerBg,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: isInverse ? '1px solid #E5E7EB' : 'none',
    flexShrink: 0,
  }
  // Scale the glyph generously so the check dominates the square — same
  // proportion as the rasterized home-screen icon.
  const glyph = Math.round(size * 0.7)
  return (
    <span style={containerStyle} className={className}>
      <svg
        width={glyph}
        height={glyph}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Steward"
      >
        <path
          d="M14 33 L26 45 L50 18"
          stroke={accent}
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </span>
  )
}
