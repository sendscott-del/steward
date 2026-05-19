interface Props {
  size?: number
  variant?: 'mark' | 'inverse'
  className?: string
}

/**
 * Steward brand mark. Matches the v2.19.2 home-screen / PWA icon:
 *   - rounded square in Steward brand blue (#2563EB — the same blue the
 *     Gathered "S" chip uses), or white in `inverse`
 *   - large white checkmark centered, no letter
 *
 * The default treatment is brand color + white glyph (was gold). iOS
 * Tinted / sleep mode auto-renders white-on-color as gold-on-black, which
 * is the appearance the user wants in tinted mode; keeping the source
 * glyph white gives both modes the right color story.
 */
export function StewardLogo({ size = 44, variant = 'mark', className }: Props) {
  const isInverse = variant === 'inverse'
  const containerBg = isInverse ? '#FFFFFF' : '#2563EB'
  // White over the brand-color container; brand color over the inverse white container.
  const accent = isInverse ? '#2563EB' : '#FFFFFF'
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
