import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../supabase'
import { getRoleColors } from '../utils/colors'

// Tooltip always appears above or below — never to the side.
// Horizontally centred on the pill, clamped within the viewport.
// Content scrolls if taller than available space.
function calcPosition(pillRef) {
  if (!pillRef.current) return null

  const MARGIN = 10
  const GAP = 6
  const TIP_W = Math.min(280, window.innerWidth - MARGIN * 2)

  const rect = pillRef.current.getBoundingClientRect()
  const placement = 'bottom'

  const pillCX = rect.left + rect.width / 2
  let left = pillCX - TIP_W / 2
  left = Math.min(Math.max(left, MARGIN), window.innerWidth - TIP_W - MARGIN)

  const preferredTop = rect.bottom + GAP
  const top = Math.min(
    preferredTop,
    Math.max(MARGIN, window.innerHeight - MARGIN - 96),
  )
  const tipH = Math.max(96, window.innerHeight - top - MARGIN)

  const arrowLeft = Math.min(
    Math.max(pillCX - left - 6, 14),
    TIP_W - 26,
  )

  return { left, top, tipH, TIP_W, arrowLeft, placement }
}

export default function UserPill({ user, isAssigned, onClick, showAssignState = false }) {
  const [hover,    setHover]    = useState(false)
  const [pos,      setPos]      = useState(null)
  const [workload, setWorkload] = useState(null)
  const [userAreas, setUserAreas] = useState([])
  const [lastFetched, setLastFetched] = useState(null)

  const pillRef    = useRef(null)
  const hideTimer  = useRef(null)

  const reposition = () => setPos(calcPosition(pillRef))

  const showTooltip = () => {
    clearTimeout(hideTimer.current)
    setHover(true)
    reposition()
    loadWorkload()
  }

  const hideTooltip = () => {
    hideTimer.current = window.setTimeout(() => setHover(false), 250)
  }

  const keepOpen = () => clearTimeout(hideTimer.current)

  useEffect(() => {
    if (!hover) return
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [hover])

  useEffect(() => () => clearTimeout(hideTimer.current), [])

  const loadWorkload = async () => {
    const now = Date.now()
    if (lastFetched && now - lastFetched < 3000) return

    const [{ data: taskData }, { data: areaData }] = await Promise.all([
      supabase
        .from('task_assignments')
        .select('tasks(id, title, areas(name, color), breakdowns(*))')
        .eq('user_id', user.id),
      supabase
        .from('user_areas')
        .select('areas(name, color)')
        .eq('user_id', user.id),
    ])

    const incomplete = (taskData || []).filter(a => {
      const t = a.tasks
      if (!t) return false
      const total   = t.breakdowns?.length || 0
      const checked = t.breakdowns?.filter(b => b.is_checked).length || 0
      return total === 0 || checked < total
    })

    setWorkload(incomplete)
    setUserAreas((areaData || []).map(d => d.areas).filter(Boolean))
    setLastFetched(now)
  }

  const { color: roleColor, bg: roleBg } = getRoleColors(user.role)

  return (
    <div
      ref={pillRef}
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {/* ── Pill chip ── */}
      <div
        onClick={onClick}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.3rem 0.6rem', borderRadius: '20px',
          cursor: onClick ? 'pointer' : 'default',
          fontSize: '0.78rem', fontWeight: 500,
          border: showAssignState
            ? `2px solid ${isAssigned ? '#6366f1' : '#e5e7eb'}`
            : `1px solid ${roleColor}30`,
          background: showAssignState ? (isAssigned ? '#eef2ff' : 'white') : roleBg,
          color:      showAssignState ? (isAssigned ? '#6366f1' : '#6b7280') : roleColor,
          transition: 'all 0.15s',
        }}
      >
        <div style={{
          width: '18px', height: '18px', borderRadius: '50%',
          background: showAssignState ? (isAssigned ? '#6366f1' : '#e5e7eb') : roleColor,
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.6rem', fontWeight: 700, flexShrink: 0,
        }}>
          {user.full_name?.charAt(0).toUpperCase() || '?'}
        </div>
        {user.full_name}
      </div>

      {/* ── Workload tooltip ── */}
      {hover && pos && createPortal(
        <div
          onMouseEnter={keepOpen}
          onMouseLeave={hideTooltip}
          style={{
            position: 'fixed',
            left:  pos.left,
            top:   pos.top,
            width: pos.TIP_W,
            maxHeight: pos.tipH,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '14px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.16)',
            padding: '0.85rem',
            zIndex: 2147483647,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',  // outer container clips; inner list scrolls
          }}
        >
          {/* Arrow — points toward the pill */}
          <div style={{
            position: 'absolute',
            // bottom of tooltip when placement=top, top when placement=bottom
            ...(pos.placement === 'top'
              ? { bottom: -6, borderTop: '6px solid white', borderBottom: 'none' }
              : { top:    -6, borderBottom: '6px solid white', borderTop: 'none' }),
            left:   pos.arrowLeft,
            width:  0, height: 0,
            borderLeft:  '6px solid transparent',
            borderRight: '6px solid transparent',
          }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.7rem', flexShrink: 0 }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: roleColor, color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 600, flexShrink: 0,
            }}>
              {user.full_name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.full_name}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                {workload == null ? 'Loading…' : `${workload.length} active task${workload.length !== 1 ? 's' : ''}`}
              </div>
            </div>
            {userAreas.length > 0 && (
              <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                {userAreas.map(area => (
                  <div key={area.name} title={area.name} style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: area.color, border: '1px solid white',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  }} />
                ))}
              </div>
            )}
          </div>

          {/* Task list — scrollable */}
          <div style={{
            flex: 1, overflowY: 'auto', overscrollBehavior: 'contain',
            display: 'flex', flexDirection: 'column', gap: '0.45rem',
            paddingRight: '2px',  // room for scrollbar
          }}>
            {workload == null ? (
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', padding: '0.5rem 0' }}>
                Loading…
              </div>
            ) : workload.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', padding: '0.5rem 0' }}>
                No active tasks
              </div>
            ) : (
              workload.map(a => {
                const task = a.tasks
                if (!task) return null
                const total   = task.breakdowns?.length || 0
                const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
                const percent = total > 0 ? Math.round((checked / total) * 100) : 0
                const color   = task.areas?.color || '#6366f1'
                return (
                  <div key={task.id} style={{
                    padding: '0.45rem 0.55rem', background: '#f9fafb',
                    borderRadius: '8px', borderLeft: `3px solid ${color}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem', marginBottom: total > 0 ? '0.3rem' : 0 }}>
                      <span style={{
                        fontSize: '0.78rem', fontWeight: 500, color: '#111827',
                        minWidth: 0, overflowWrap: 'anywhere', flex: 1,
                      }}>
                        {task.title}
                      </span>
                      {task.areas?.name && (
                        <span style={{
                          fontSize: '0.66rem', padding: '0.1rem 0.35rem',
                          background: color + '20', color,
                          borderRadius: '8px', fontWeight: 600, flexShrink: 0,
                          maxWidth: '90px', overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {task.areas.name}
                        </span>
                      )}
                    </div>
                    {total > 0 && (
                      <>
                        <div style={{ height: '3px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: '2px',
                            background: percent === 100 ? '#10b981' : color,
                            width: `${percent}%`, transition: 'width 0.3s',
                          }} />
                        </div>
                        <div style={{ fontSize: '0.66rem', color: '#9ca3af', marginTop: '0.15rem' }}>
                          {checked}/{total} steps · {percent}%
                        </div>
                      </>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
