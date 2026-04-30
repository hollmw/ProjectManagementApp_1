import { useNavigate } from 'react-router-dom'
import { AREA_COLORS } from './constants'

const PRIMARY_NAV = [
  { label: '📋 Task Board', path: '/dashboard' },
  { label: '🏆 Leaderboard', path: '/leaderboard' },
  { label: '📅 Gantt Chart', path: '/gantt', active: true },
]

const ADMIN_NAV = [
  { label: '👥 User Management', path: '/users' },
  { label: '📊 Activity Log', path: '/activity' },
]

function NavItem({ item, navigate }) {
  return (
    <div
      onClick={() => navigate(item.path)}
      style={{
        padding: '0.5rem 0.75rem', borderRadius: '8px',
        marginBottom: '0.2rem', cursor: 'pointer', fontSize: '0.875rem',
        background: item.active ? '#ede9fe' : 'transparent',
        color: item.active ? '#7c3aed' : '#374151',
        fontWeight: item.active ? 600 : 400,
      }}
      onMouseEnter={e => { if (!item.active) e.currentTarget.style.background = '#f3f4f6' }}
      onMouseLeave={e => { if (!item.active) e.currentTarget.style.background = 'transparent' }}
    >
      {item.label}
    </div>
  )
}

// ─── Left navigation sidebar for the Gantt page ───────────────────────────────
export default function GanttSidebar({ profile }) {
  const navigate = useNavigate()

  return (
    <div style={{
      width: '260px', background: 'white',
      borderRight: '1px solid #f1f5f9',
      display: 'flex', flexDirection: 'column',
      padding: '1.5rem 1rem',
      boxShadow: '2px 0 8px rgba(0,0,0,0.03)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
        }}>📋</div>
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>WorkSpace</div>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Project Management</div>
        </div>
      </div>

      {PRIMARY_NAV.map(item => <NavItem key={item.path} item={item} navigate={navigate} />)}

      {profile?.role !== 'intern' &&
        ADMIN_NAV.map(item => <NavItem key={item.path} item={item} navigate={navigate} />)}

      <div style={{ marginTop: '2rem' }}>
        <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Areas
        </p>
        {Object.entries(AREA_COLORS).map(([name, color]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.8rem', color: '#374151' }}>{name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
