import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import UserPill from '../../components/UserPill'

// ─── Single area row in the sidebar with hover-popover member list ───────────
export default function AreaSidebarItem({ area, count, isSelected, onClick, onHover, users }) {
  const [hover, setHover] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState({ left: 250, top: 12, caretTop: 14 })
  const itemRef = useRef(null)
  const closeTimer = useRef(null)

  const updatePopoverPosition = () => {
    if (!itemRef.current) return

    const margin = 12
    const width = Math.min(280, window.innerWidth - margin * 2)
    const rect = itemRef.current.getBoundingClientRect()
    const left = Math.min(rect.right + 10, window.innerWidth - width - margin)
    const top = Math.min(Math.max(rect.top - 8, margin), Math.max(margin, window.innerHeight - margin - 220))

    setPopoverPosition({
      left: Math.max(left, margin),
      top,
      caretTop: Math.max(14, rect.top - top + 14)
    })
  }

  const handleMouseEnter = () => {
    clearTimeout(closeTimer.current)
    setHover(true)
    updatePopoverPosition()
    onHover()
  }

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setHover(false), 160)
  }

  useEffect(() => {
    if (!hover) return undefined

    const handleReposition = () => updatePopoverPosition()
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)

    return () => {
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [hover])

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  return (
    <div ref={itemRef} style={{ position: 'relative' }}>
      <div
        onClick={onClick}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.48rem 0.85rem', borderRadius: '9px',
          marginBottom: '0.15rem', cursor: 'pointer', fontSize: '0.875rem',
          background: isSelected ? `${area.color}25` : 'transparent',
          borderLeft: `3px solid ${isSelected ? area.color : 'transparent'}`,
          color: isSelected ? area.color : '#94a3b8',
          fontWeight: isSelected ? 600 : 400,
          transition: 'all 0.15s', userSelect: 'none',
        }}
        onMouseEnter={e => {
          handleMouseEnter()
          if (!isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#e2e8f0' }
        }}
        onMouseLeave={e => {
          handleMouseLeave()
          if (!isSelected) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' }
        }}
      >
        <div style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: area.color, flexShrink: 0,
          boxShadow: isSelected ? `0 0 6px ${area.color}` : 'none',
        }} />
        {area.name}
        <span style={{
          marginLeft: 'auto', fontSize: '0.67rem', fontWeight: 600,
          background: 'rgba(255,255,255,0.08)', color: '#64748b',
          padding: '0.1rem 0.42rem', borderRadius: '20px',
        }}>
          {count}
        </span>
      </div>

      {/* Hover popover — stays light for readability against the white background */}
      {hover && createPortal(
        <div
          onMouseEnter={() => clearTimeout(closeTimer.current)}
          onMouseLeave={handleMouseLeave}
          style={{
            position: 'fixed',
            left: popoverPosition.left,
            top: popoverPosition.top,
            background: 'white', border: '1px solid #e8ecf0',
            borderRadius: '14px', boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
            padding: '0.9rem',
            width: 'min(280px, calc(100vw - 24px))',
            maxHeight: 'calc(100vh - 24px)',
            overflowY: 'auto',
            zIndex: 2147483647,
          }}
        >
          {/* Caret */}
          <div style={{
            position: 'absolute', right: '100%', top: `${popoverPosition.caretTop}px`,
            width: 0, height: 0,
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderRight: '6px solid white',
          }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: '22px', height: '22px', borderRadius: '6px',
              background: `${area.color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: area.color }} />
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827' }}>{area.name}</span>
            <span style={{
              fontSize: '0.7rem', color: '#6b7280', marginLeft: 'auto',
              background: '#f1f5f9', padding: '0.1rem 0.45rem', borderRadius: '10px', fontWeight: 500,
            }}>
              {users.length} member{users.length !== 1 ? 's' : ''}
            </span>
          </div>

          {users.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', padding: '0.5rem 0' }}>
              No members assigned
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {users.map(user => (
                <UserPill key={user.id} user={user} />
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
