export function Logo({ size = 32, variant = 'dark' }) {
  const src = variant === 'light'
    ? '/logo_icon_white.png'
    : variant === 'transparent'
    ? '/logo_icon_transparent.svg'
    : '/logo_icon_dark.png'
  return (
    <img
      src={src}
      alt="Première Ligne"
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
    />
  )
}
