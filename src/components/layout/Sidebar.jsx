import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Logo } from '../Logo'
import { Avatar } from '../Avatar'
import {
  IconLayoutDashboard, IconUsers, IconGridDots, IconTarget,
  IconBolt, IconTrophy, IconSettings, IconHome, IconBook2,
  IconMedal, IconChevronDown,
} from '@tabler/icons-react'

const MANAGER_NAV = [
  {
    label: 'Principal',
    items: [
      { icon: IconLayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: IconUsers, label: 'Mon équipe', path: '/equipe' },
      { icon: IconGridDots, label: 'Matrice & Dojos', path: '/matrice' },
      { icon: IconTarget, label: 'Plans de montée', path: '/plans' },
    ],
  },
  {
    label: 'Gamification',
    items: [
      { icon: IconBolt, label: 'Défis équipe', path: '/defis' },
      { icon: IconTrophy, label: 'Classement', path: '/classement' },
    ],
  },
  {
    label: 'Compte',
    items: [
      { icon: IconSettings, label: 'Paramètres', path: '/parametres' },
    ],
  },
]

const VENDEUR_NAV = [
  {
    label: 'Mon espace',
    items: [
      { icon: IconHome, label: 'Accueil', path: '/mon-espace' },
      { icon: IconGridDots, label: 'Mon évaluation', path: '/mon-evaluation' },
      { icon: IconTarget, label: 'Mon plan', path: '/mon-plan' },
      { icon: IconBook2, label: 'Mes Dojos', path: '/mes-dojos' },
      { icon: IconMedal, label: 'Badges', path: '/mes-badges' },
    ],
  },
  {
    label: 'Équipe',
    items: [
      { icon: IconTrophy, label: 'Classement', path: '/classement-equipe' },
      { icon: IconBolt, label: 'Défi semaine', path: '/defi-semaine' },
    ],
  },
]

export function Sidebar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isManager = profile?.role === 'manager'
  const defaultView = isManager ? 'manager' : 'vendeur'
  const [viewRole, setViewRole] = useState(defaultView)

  const nav = viewRole === 'manager' ? MANAGER_NAV : VENDEUR_NAV
  const structureName = profile?.structures?.name || 'Ma structure'
  const structureInitials = structureName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  function handleNav(path) {
    navigate(path)
  }

  function switchView(role) {
    setViewRole(role)
    if (role === 'manager') navigate('/dashboard')
    else navigate('/mon-espace')
  }

  return (
    <aside style={{
      width: 220,
      flexShrink: 0,
      background: '#fff',
      boxShadow: '2px 0 8px rgba(7,40,32,.05)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      zIndex: 2,
    }}>
      {/* Top */}
      <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--ln)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Logo variant="transparent" />
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fi)', lineHeight: 1.25 }}>
            PREMIÈRE LIGNE
            <small style={{ fontSize: 10, fontWeight: 400, color: 'var(--mu)', display: 'block' }}>
              {structureName}
            </small>
          </div>
        </div>
        <div style={{
          background: 'var(--bg)', borderRadius: 8, padding: '7px 10px',
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        }}>
          <div style={{
            width: 22, height: 22, background: 'var(--forest)', borderRadius: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 600, color: 'var(--fluo)', flexShrink: 0,
          }}>
            {structureInitials}
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fi)', flex: 1 }}>
            {structureName}
          </div>
          <IconChevronDown size={13} color="var(--mu)" />
        </div>
      </div>

      {/* Role switcher — visible only for managers */}
      {isManager && (
        <div style={{
          display: 'flex', background: 'var(--bg)', borderRadius: 10,
          padding: 3, margin: '10px 12px 0', gap: 2,
        }}>
          {['manager', 'vendeur'].map(role => (
            <button
              key={role}
              onClick={() => switchView(role)}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 12, fontWeight: 500,
                cursor: 'pointer', border: 'none', textAlign: 'center', transition: 'all .2s',
                background: viewRole === role ? 'var(--forest)' : 'transparent',
                color: viewRole === role ? 'var(--fluo)' : 'var(--mu)',
                boxShadow: viewRole === role ? '0 2px 6px rgba(11,61,46,.25)' : 'none',
              }}
            >
              {role === 'manager' ? 'Manager' : 'Vendeur'}
            </button>
          ))}
        </div>
      )}

      {/* Navigation */}
      {nav.map(section => (
        <div key={section.label} style={{ padding: '10px 10px 2px' }}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: 'var(--mu)',
            padding: '2px 8px 5px', letterSpacing: '.7px', textTransform: 'uppercase',
          }}>
            {section.label}
          </div>
          {section.items.map(item => {
            const active = location.pathname === item.path
            return (
              <NavItem
                key={item.path}
                icon={item.icon}
                label={item.label}
                badge={item.badge}
                active={active}
                onClick={() => handleNav(item.path)}
              />
            )
          })}
        </div>
      ))}

      <div style={{ flex: 1 }} />

      {/* User footer */}
      <div style={{ padding: '10px 12px 14px', borderTop: '1px solid var(--ln)' }}>
        <div
          onClick={signOut}
          title="Se déconnecter"
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '6px 8px', borderRadius: 9, cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <Avatar name={profile?.full_name} id={profile?.id} size={30} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fi)' }}>
              {profile?.full_name}
            </div>
            <div style={{ fontSize: 10, color: 'var(--mu)' }}>
              {profile?.role === 'manager' ? 'Manager' : 'Vendeur'}
            </div>
          </div>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#22C55E', flexShrink: 0, marginLeft: 'auto',
          }} />
        </div>
      </div>
    </aside>
  )
}

function NavItem({ icon: Icon, label, badge, active, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '8px 10px', borderRadius: 9, cursor: 'pointer',
        fontSize: 13, margin: '1px 0', transition: 'all .15s',
        background: active ? 'var(--forest)' : hover ? 'var(--bg)' : 'transparent',
        color: active ? '#fff' : hover ? 'var(--fi)' : 'var(--mu)',
        fontWeight: active ? 500 : 400,
      }}
    >
      <Icon size={17} color={active ? 'var(--fluo)' : 'currentColor'} style={{ flexShrink: 0 }} />
      {label}
      {badge !== undefined && (
        <span style={{
          marginLeft: 'auto',
          background: active ? 'rgba(255,255,255,.2)' : 'var(--fluo)',
          color: active ? '#fff' : 'var(--fi)',
          fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 8,
        }}>
          {badge}
        </span>
      )}
    </div>
  )
}
