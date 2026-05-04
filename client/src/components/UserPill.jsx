import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../supabase'

export default function UserPill({ user, isAssigned, onClick, showAssignState = false }) {
  const [hover, setHover] = useState(false)
  const [workload, setWorkload] = useState(null)
  const [userAreas, setUserAreas] = useState([])
  const [lastFetched, setLastFetched] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({
    left: 12,
    top: 12,
    arrowLeft: 16,
    placement: 'top'
  })
  const pillRef = useRef(null)
  const hideTimerRef = useRef(null)

  const updateTooltipPosition = () => {
    if (!pillRef.current) return

    const margin = 12
    const tooltipWidth = Math.min(280, window.innerWidth - margin * 2)
    const rect = pillRef.current.getBoundingClientRect()
    const left = Math.min(
      Math.max(rect.left, margin),
      Math.max(margin, window.innerWidth - tooltipWidth - margin)
    )
    const hasRoomAbove = rect.top > 220
    const arrowLeft = Math.min(Math.max(rect.left - left + 16, 16), tooltipWidth - 28)

    setTooltipPosition({
      left,
      top: hasRoomAbove ? rect.top - margin : rect.bottom + margin,
      arrowLeft,
      placement: hasRoomAbove ? 'top' : 'bottom'
    })
  }

  const showTooltip = () => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    setHover(true)
    updateTooltipPosition()
    loadWorkload()
  }

  const scheduleHideTooltip = () => {
    hideTimerRef.current = window.setTimeout(() => setHover(false), 300)
  }

  useEffect(() => {
    if (!hover) return undefined

    const handleReposition = () => updateTooltipPosition()
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)

    return () => {
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [hover])

  useEffect(() => () => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
  }, [])

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
        .eq('user_id', user.id)
    ])

    const incomplete = (taskData || []).filter(a => {
      const task = a.tasks
      if (!task) return false
      const total = task.breakdowns?.length || 0
      const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
      if (total === 0) return true
      return checked < total
    })

    setWorkload(incomplete)
    setUserAreas((areaData || []).map(d => d.areas).filter(Boolean))
    setLastFetched(now)
  }

  const roleColor = user.role === 'admin' ? '#7c3aed' : user.role === 'member' ? '#1d4ed8' : '#6b7280'
  const roleBg = user.role === 'admin' ? '#ede9fe' : user.role === 'member' ? '#dbeafe' : '#f3f4f6'

  return (
    <div
      ref={pillRef}
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={showTooltip}
      onMouseLeave={scheduleHideTooltip}
    >
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
          background: showAssignState
            ? (isAssigned ? '#eef2ff' : 'white')
            : roleBg,
          color: showAssignState
            ? (isAssigned ? '#6366f1' : '#6b7280')
            : roleColor,
          transition: 'all 0.15s',
          position: 'relative'
        }}
      >
        <div style={{
          width: '18px', height: '18px', borderRadius: '50%',
          background: showAssignState ? (isAssigned ? '#6366f1' : '#e5e7eb') : roleColor,
          color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.6rem', fontWeight: 700, flexShrink: 0
        }}>
          {user.full_name?.charAt(0).toUpperCase() || '?'}
        </div>
        {user.full_name}
      </div>

      {/* Workload tooltip */}
      {hover && createPortal(
        <div
          onMouseEnter={() => {
            if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
          }}
          onMouseLeave={scheduleHideTooltip}
          style={{
            position: 'fixed',
            left: tooltipPosition.left,
            top: tooltipPosition.top,
            transform: tooltipPosition.placement === 'top' ? 'translateY(-100%)' : 'none',
            background: 'white', border: '1px solid #e5e7eb',
            borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: '0.85rem',
            width: 'min(280px, calc(100vw - 24px))',
            minWidth: 'min(220px, calc(100vw - 24px))',
            maxHeight: 'calc(100vh - 24px)',
            zIndex: 2147483647
          }}>
          <div style={{
            position: 'absolute',
            top: tooltipPosition.placement === 'top' ? '100%' : 'auto',
            bottom: tooltipPosition.placement === 'bottom' ? '100%' : 'auto',
            left: `${tooltipPosition.arrowLeft}px`,
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: tooltipPosition.placement === 'top' ? '6px solid white' : 0,
            borderBottom: tooltipPosition.placement === 'bottom' ? '6px solid white' : 0
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: roleColor, color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 600, flexShrink: 0
            }}>
              {user.full_name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{user.full_name}</div>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                {workload ? `${workload.length} task${workload.length !== 1 ? 's' : ''}` : 'Loading...'}
              </div>
            </div>
            {userAreas.length > 0 && (
              <div style={{ display: 'flex', gap: '3px', alignSelf: 'flex-start' }}>
                {userAreas.map(area => (
                  <div
                    key={area.name}
                    title={area.name}
                    style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: area.color,
                      border: '1px solid white',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {!workload ? (
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center' }}>Loading...</div>
          ) : workload.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center' }}>No active tasks</div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              maxHeight: 'min(320px, calc(100vh - 150px))',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              paddingRight: '0.25rem'
            }}>
              {workload.map(a => {
                const task = a.tasks
                if (!task) return null
                const total = task.breakdowns?.length || 0
                const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
                const percent = total > 0 ? Math.round((checked / total) * 100) : 0
                const color = task.areas?.color || '#6366f1'
                return (
                  <div key={task.id} style={{
                    padding: '0.5rem 0.6rem', background: '#f9fafb',
                    borderRadius: '8px', borderLeft: `3px solid ${color}`,
                    overflow: 'hidden'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        color: '#111827',
                        minWidth: 0,
                        overflowWrap: 'anywhere'
                      }}>{task.title}</span>
                      <span style={{
                        fontSize: '0.7rem', padding: '0.1rem 0.4rem',
                        background: color + '20', color,
                        borderRadius: '10px', fontWeight: 600, flexShrink: 0,
                        maxWidth: '45%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {task.areas?.name}
                      </span>
                    </div>
                    {total > 0 && (
                      <div>
                        <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: '2px',
                            background: percent === 100 ? '#10b981' : color,
                            width: `${percent}%`, transition: 'width 0.3s'
                          }} />
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                          {percent}% complete
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
