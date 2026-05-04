import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const PRIMARY_NAV = [
  { label: 'Task Board', path: '/dashboard' },
  { label: 'Leaderboard', path: '/leaderboard' },
  { label: 'Gantt Chart', path: '/gantt' },
]

const ADMIN_NAV = [
  { label: 'User Management', path: '/users' },
  { label: 'Activity Log', path: '/activity' },
  { label: 'User Analytics', path: '/analytics' },
]

function NavItem({ item, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '0.5rem 0.75rem',
        borderRadius: '8px',
        marginBottom: '0.2rem',
        cursor: 'pointer',
        fontSize: '0.875rem',
        background: active ? '#ede9fe' : 'transparent',
        color: active ? '#7c3aed' : '#374151',
        fontWeight: active ? 600 : 400,
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f3f4f6' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {item.label}
    </div>
  )
}

export function SidebarSection({ title, children }) {
  return (
    <div style={{ marginTop: '1.25rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
      {title && (
        <p style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          color: '#9ca3af',
          marginBottom: '0.5rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          {title}
        </p>
      )}
      {children}
    </div>
  )
}

export default function AppSidebar({ profile, children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isAdmin = profile?.role !== 'intern'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div style={{
      width: '260px',
      flexShrink: 0,
      background: 'white',
      borderRight: '1px solid #f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem 1rem',
      boxShadow: '2px 0 8px rgba(0,0,0,0.03)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' }}>
        <img
          src="/logo.png"
          alt="DRESIO"
          style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }}
        />
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>WorkSpace</div>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Project Management</div>
        </div>
      </div>

      <div>
        {PRIMARY_NAV.map(item => (
          <NavItem
            key={item.path}
            item={item}
            active={location.pathname === item.path}
            onClick={() => navigate(item.path)}
          />
        ))}
      </div>

      {isAdmin && (
        <SidebarSection title="Admin">
          {ADMIN_NAV.map(item => (
            <NavItem
              key={item.path}
              item={item}
              active={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            />
          ))}
        </SidebarSection>
      )}

      {children}

      {profile && (
        <div style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              fontWeight: 600,
              flexShrink: 0,
            }}>
              {profile.full_name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#111827',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {profile.full_name}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'capitalize' }}>
                {profile.role}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.45rem',
              background: 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '0.82rem',
              cursor: 'pointer',
              color: '#6b7280',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
