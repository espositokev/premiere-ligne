export function getInitials(name = '') {
  return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const AVATAR_COLORS = [
  { bg: '#0B3D2E', color: '#D4FF3A' },
  { bg: '#1D9E75', color: '#fff' },
  { bg: '#533AB7', color: '#fff' },
  { bg: '#BA7517', color: '#fff' },
  { bg: '#D85A30', color: '#fff' },
  { bg: '#2563EB', color: '#fff' },
]

export function getAvatarColor(seed = '') {
  const hash = [...seed].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export const SCORE_LABELS = ['—', 'Non acquis', 'En cours', 'Acquis', 'Maîtrisé', 'Expert']
export const SCORE_STYLES = [
  { bg: 'var(--bg)', color: 'var(--mu)' },
  { bg: '#FEE2E2', color: '#991B1B' },
  { bg: '#FEF9C3', color: '#854D0E' },
  { bg: '#DBEAFE', color: '#1E40AF' },
  { bg: '#DCFCE7', color: '#166534' },
  { bg: '#D4FF3A', color: '#072820' },
]

export function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Demain'
  if (diff < 0) return `Il y a ${Math.abs(diff)}j`
  return `Dans ${diff}j`
}
