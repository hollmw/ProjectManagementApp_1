import { useState, useRef } from 'react'
import UserPill from '../../components/UserPill'

// ─── Single area row in the sidebar with hover-popover member list ───────────
export default function AreaSidebarItem({ area, count, isSelected, onClick, onHover, users }) {
  const [hover, setHover] = useState(false)
  const closeTimer = useRef(null)

  const handleMouseEnter = () => {
    clearTimeout(closeTimer.current)
    setHover(true)
    onHover()
  }

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setHover(false), 50)
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.45rem 0.75rem', borderRadius: '8px',
          marginBottom: '0.2rem', cursor: 'pointer', fontSize: '0.875rem',
          background: isSelected ? area.color + '18' : 'transparent',
          fontWeight: isSelected ? 600 : 400,
          color: isSelected ? area.color : '#374151',
          transition: 'background 0.15s',
        }}
      >
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: area.color, flexShrink: 0 }} />
        {area.name}
        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#9ca3af', fontWeight: 500 }}>{count}</span>
      </div>

      {hover && (
        <div
          onMouseEnter={() => clearTimeout(closeTimer.current)}
          onMouseLeave={handleMouseLeave}
          style={{
            position: 'absolute', left: '100%', top: 0,
            background: 'white', border: '1px solid #e5e7eb',
            borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: '0.85rem', minWidth: '210px',
            zIndex: 999, marginLeft: '8px',
          }}
        >
          <div style={{
            position: 'absolute', right: '100%', top: '14px',
            width: 0, height: 0,
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderRight: '6px solid white',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: area.color }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{area.name}</span>
            <span style={{ fontSize: '0.72rem', color: '#9ca3af', marginLeft: 'auto' }}>
              {users.length} member{users.length !== 1 ? 's' : ''}
            </span>
          </div>

          {users.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', padding: '0.5rem' }}>
              No members assigned
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {users.map(user => (
                <UserPill key={user.id} user={user} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
