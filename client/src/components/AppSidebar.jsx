import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const PRIMARY_NAV = [
  { label: 'Task Board',   path: '/dashboard',  icon: '📋' },
  { label: 'Leaderboard', path: '/leaderboard', icon: '🏆' },
  { label: 'Gantt Chart', path: '/gantt',       icon: '📅' },
]

const ADMIN_NAV = [
  { label: 'User Management',  path: '/users',            icon: '👥' },
  { label: 'Intern Timeline',  path: '/intern-timeline',  icon: '🗓' },
  { label: 'Activity Log',     path: '/activity',         icon: '📜' },
  { label: 'User Analytics',   path: '/analytics',        icon: '📊' },
]

function NavItem({ item, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.65rem',
        padding: '0.52rem 0.85rem', borderRadius: '9px',
        marginBottom: '0.15rem', cursor: 'pointer',
        background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
        borderLeft: `3px solid ${active ? '#818cf8' : 'transparent'}`,
        color: active ? '#a5b4fc' : '#94a3b8',
        fontWeight: active ? 600 : 400, fontSize: '0.875rem',
        transition: 'all 0.15s',
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
          e.currentTarget.style.color = '#e2e8f0'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = '#94a3b8'
        }
      }}
    >
      <span style={{ fontSize: '0.95rem', lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
      <span style={{ letterSpacing: '-0.01em' }}>{item.label}</span>
      {active && (
        <div style={{
          marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%',
          background: '#818cf8', boxShadow: '0 0 6px #818cf8',
        }} />
      )}
    </div>
  )
}

export function SidebarSection({ title, children }) {
  return (
    <div style={{ marginTop: '0.5rem' }}>
      {title && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.6rem 0.85rem 0.35rem',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
          <span style={{
            fontSize: '0.6rem', fontWeight: 700, color: '#475569',
            textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap',
          }}>
            {title}
          </span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
        </div>
      )}
      {children}
    </div>
  )
}

export default function AppSidebar({ profile, children }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const isAdmin   = profile?.role !== 'intern'
  const isAdminRoute = ADMIN_NAV.some(item => item.path === location.pathname)
  const [adminOpen, setAdminOpen] = useState(isAdminRoute)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div style={{
      width: '240px', flexShrink: 0,
      background: 'linear-gradient(180deg, #0f172a 0%, #1a1040 100%)',
      display: 'flex', flexDirection: 'column',
      boxShadow: '2px 0 20px rgba(0,0,0,0.3)',
      position: 'relative', zIndex: 10,
    }}>

      {/* ── Logo ── */}
      <div style={{
        padding: '1.4rem 1.25rem 1.2rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '11px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99,102,241,0.45)',
            flexShrink: 0, overflow: 'hidden',
          }}>
            <img
              src="/logo.png" alt="DRESIO"
              style={{ width: '38px', height: '38px', objectFit: 'cover' }}
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          </div>
          <div>
            <div style={{
              fontSize: '1rem', fontWeight: 800, color: 'white',
              letterSpacing: '-0.02em', lineHeight: 1.1,
            }}>
              DRESIO
            </div>
            <div style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 500, marginTop: '0.1rem' }}>
              Workspace
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <div style={{ padding: '0.85rem 0.75rem', flex: 1, overflowY: 'auto' }}>
        {PRIMARY_NAV.map(item => (
          <NavItem
            key={item.path}
            item={item}
            active={location.pathname === item.path}
            onClick={() => navigate(item.path)}
          />
        ))}

        {isAdmin && (
          <div style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              aria-expanded={adminOpen}
              onClick={() => setAdminOpen(open => !open)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.52rem 0.85rem',
                borderRadius: '9px',
                marginBottom: adminOpen ? '0.2rem' : '0.15rem',
                cursor: 'pointer',
                background: isAdminRoute ? 'rgba(99,102,241,0.14)' : 'transparent',
                border: 'none',
                color: isAdminRoute ? '#c4b5fd' : '#94a3b8',
                fontWeight: isAdminRoute ? 600 : 500,
                fontSize: '0.875rem',
                textAlign: 'left',
                transition: 'all 0.15s',
                userSelect: 'none',
              }}
              onMouseEnter={e => {
                if (!isAdminRoute) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.color = '#e2e8f0'
                }
              }}
              onMouseLeave={e => {
                if (!isAdminRoute) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#94a3b8'
                }
              }}
            >
              <span style={{ fontSize: '0.95rem', lineHeight: 1, flexShrink: 0 }}>⚙</span>
              <span style={{ letterSpacing: '-0.01em' }}>Admin</span>
              <span style={{
                marginLeft: 'auto',
                fontSize: '0.75rem',
                transform: adminOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s',
              }}>
                ▾
              </span>
            </button>

            {adminOpen && (
              <div style={{
                marginLeft: '0.5rem',
                paddingLeft: '0.5rem',
                borderLeft: '1px solid rgba(255,255,255,0.08)',
              }}>
            {ADMIN_NAV.map(item => (
              <NavItem
                key={item.path}
                item={item}
                active={location.pathname === item.path}
                onClick={() => navigate(item.path)}
              />
            ))}
              </div>
            )}
          </div>
        )}

        {children}
      </div>

      {/* ── User footer ── */}
      {profile && (
        <div style={{
          padding: '0.85rem 1rem',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.6rem' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.85rem', fontWeight: 700,
              boxShadow: '0 0 12px rgba(99,102,241,0.4)',
            }}>
              {profile.full_name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {profile.full_name}
              </div>
              <div style={{
                fontSize: '0.65rem', color: '#64748b', textTransform: 'capitalize',
                display: 'flex', alignItems: 'center', gap: '0.3rem',
              }}>
                <div style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: profile.role === 'admin' ? '#818cf8' : profile.role === 'intern' ? '#fbbf24' : '#34d399',
                }} />
                {profile.role}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '0.42rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '8px', fontSize: '0.78rem',
              cursor: 'pointer', color: '#64748b',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.14)'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'
              e.currentTarget.style.color = '#fca5a5'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'
              e.currentTarget.style.color = '#64748b'
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
