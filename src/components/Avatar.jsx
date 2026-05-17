import { getInitials, getAvatarColor } from '../lib/utils'

export function Avatar({ name = '', id = '', size = 32, radius = '50%' }) {
  const initials = getInitials(name)
  const { bg, color } = getAvatarColor(id || name)
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: radius,
      background: bg,
      color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.34,
      fontWeight: 600,
      flexShrink: 0,
      boxShadow: '0 1px 4px rgba(0,0,0,.1)',
      letterSpacing: 0.5,
    }}>
      {initials}
    </div>
  )
}
