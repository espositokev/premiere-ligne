export function Logo({ scale = 1 }) {
  const s = scale
  return (
    <div style={{ position: 'relative', width: 34 * s, height: 30 * s, flexShrink: 0 }}>
      <div style={{
        position: 'absolute', width: 12 * s, height: 12 * s,
        background: '#0B3D2E', borderRadius: 2,
        left: 0, top: 10 * s, opacity: 0.3,
      }} />
      <div style={{
        position: 'absolute', width: 15 * s, height: 15 * s,
        background: '#0B3D2E', borderRadius: 2,
        left: 7 * s, top: 5 * s, opacity: 0.6,
      }} />
      <div style={{
        position: 'absolute', width: 19 * s, height: 19 * s,
        background: '#D4FF3A', borderRadius: 2,
        left: 14 * s, top: 0,
        border: `${2 * s}px solid #0B3D2E`,
      }} />
    </div>
  )
}
