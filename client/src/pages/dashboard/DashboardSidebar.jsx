import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'
import AreaSidebarItem from './AreaSidebarItem'
import { AREAS } from './constants'

// ─── Left sidebar for the Task Board ─────────────────────────────────────────
// Areas filter, secondary nav, and signed-in user footer.
export default function DashboardSidebar({
  profile, tasks, filterArea, setFilterArea,
  areaUsers, fetchAreaUsers,
}) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div style={{
      width: '260px', background: 'white',
      borderRight: '1px solid #f1f5f9',
      display: 'flex', flexDirection: 'column',
      padding: '1.5rem 1rem',
      boxShadow: '2px 0 8px rgba(0,0,0,0.03)',
    }}>
      {/* Logo */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' }}>
      <img 
        src="/logo.png"
        alt="DRESIO"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          objectFit: 'cover',
        }}
      />
      <div>
        <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>WorkSpace</div>
        <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Project Management</div>
      </div>
    </div>

      <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Business Areas
      </p>

      {/* All */}
      <div
        onClick={() => setFilterArea('All')}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.45rem 0.75rem', borderRadius: '8px',
          marginBottom: '0.2rem', cursor: 'pointer', fontSize: '0.875rem',
          background: filterArea === 'All' ? '#f3f4f6' : 'transparent',
          fontWeight: filterArea === 'All' ? 600 : 400,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (filterArea !== 'All') e.currentTarget.style.background = '#f9fafb' }}
        onMouseLeave={e => { if (filterArea !== 'All') e.currentTarget.style.background = 'transparent' }}
      >
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9ca3af', flexShrink: 0 }} />
        All
        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#9ca3af', fontWeight: 500 }}>
          {tasks.length}
        </span>
      </div>

      {AREAS.map(area => (
        <AreaSidebarItem
          key={area.name}
          area={area}
          count={tasks.filter(t => t.areas?.name === area.name).length}
          isSelected={filterArea === area.name}
          onClick={() => setFilterArea(area.name)}
          onHover={() => fetchAreaUsers(area.name)}
          users={areaUsers[area.name] || []}
        />
      ))}

      {/* Visible to all */}
      {[
        { label: '🏆 Leaderboard', path: '/leaderboard' },
        { label: '📅 Gantt Chart', path: '/gantt' },
      ].map(item => (
        <div
          key={item.path}
          onClick={() => navigate(item.path)}
          style={{
            padding: '0.45rem 0.75rem', borderRadius: '8px',
            marginBottom: '0.2rem', cursor: 'pointer', fontSize: '0.875rem',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {item.label}
        </div>
      ))}

      {/* Admin only */}
      {profile.role !== 'intern' && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Admin
          </p>
          {[
            { label: 'User Management', path: '/users' },
            { label: 'Activity Log', path: '/activity' },
          ].map(item => (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                padding: '0.45rem 0.75rem', borderRadius: '8px',
                marginBottom: '0.2rem', cursor: 'pointer', fontSize: '0.875rem',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}

      {/* User footer */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '0.85rem', fontWeight: 600, flexShrink: 0,
          }}>
            {profile.full_name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{profile.full_name}</div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'capitalize' }}>{profile.role}</div>
          </div>
        </div>
        <button onClick={handleLogout} style={{
          width: '100%', padding: '0.45rem',
          background: 'transparent', border: '1px solid #e5e7eb',
          borderRadius: '8px', fontSize: '0.82rem',
          cursor: 'pointer', color: '#6b7280',
          transition: 'background 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
