import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

const AREA_COLORS = {
  'Tech': '#6366f1',
  'Business': '#f59e0b',
  'Marketing': '#ec4899',
  'Science': '#10b981',
  'Clinical': '#3b82f6',
  'Design': '#8b5cf6',
}

// ─── Mini Calendar Breakdown Scheduler ────────────────────────────────────────
function BreakdownScheduler({ task, onClose, onSave }) {
  const taskStart = task.start_date ? new Date(task.start_date) : new Date()
  const taskEnd = task.due_date ? new Date(task.due_date) : new Date(taskStart.getTime() + 14 * 86400000)

  const totalMs = taskEnd - taskStart
  const totalDays = Math.max(Math.ceil(totalMs / 86400000), 1)
  const DAY_PX = Math.max(28, Math.min(48, Math.floor(680 / totalDays)))

  const [breakdowns, setBreakdowns] = useState(() =>
    [...(task.breakdowns || [])]
      .sort((a, b) => a.order_index - b.order_index)
      .map(b => ({
        ...b,
        start_date: b.start_date || null,
        end_date: b.end_date || null,
      }))
  )

  const [dragging, setDragging] = useState(null) // { id, type: 'move'|'resize-left'|'resize-right', startX, origStartDay, origEndDay }
  const timelineRef = useRef(null)
  const [saving, setSaving] = useState(false)

  const dateToDay = (dateStr) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    return Math.round((d - taskStart) / 86400000)
  }

  const dayToDate = (day) => {
    const d = new Date(taskStart)
    d.setDate(d.getDate() + Math.max(0, Math.min(day, totalDays)))
    return d.toISOString().split('T')[0]
  }

  const getBreakdownDays = (b) => {
    const start = b.start_date ? dateToDay(b.start_date) : null
    const end = b.end_date ? dateToDay(b.end_date) : null
    return { start, end }
  }

  // Days array for header
  const days = []
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(taskStart)
    d.setDate(d.getDate() + i)
    days.push(d)
  }

  const handleMouseDown = (e, bdId, type) => {
    e.preventDefault()
    e.stopPropagation()
    const b = breakdowns.find(x => x.id === bdId)
    const { start, end } = getBreakdownDays(b)
    setDragging({
      id: bdId,
      type,
      startX: e.clientX,
      origStart: start ?? 0,
      origEnd: end ?? (start !== null ? start + 1 : 1),
    })
  }

  const handleTimelineClick = useCallback((e, bdId) => {
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const day = Math.floor(x / DAY_PX)
    const clampedDay = Math.max(0, Math.min(day, totalDays - 1))
    setBreakdowns(prev => prev.map(b =>
      b.id === bdId
        ? { ...b, start_date: dayToDate(clampedDay), end_date: dayToDate(clampedDay + 1) }
        : b
    ))
  }, [DAY_PX, totalDays, taskStart])

  useEffect(() => {
    if (!dragging) return

    const onMove = (e) => {
      const dx = e.clientX - dragging.startX
      const dayDelta = Math.round(dx / DAY_PX)

      setBreakdowns(prev => prev.map(b => {
        if (b.id !== dragging.id) return b
        let newStart = dragging.origStart
        let newEnd = dragging.origEnd

        if (dragging.type === 'move') {
          newStart = Math.max(0, Math.min(dragging.origStart + dayDelta, totalDays - 1))
          newEnd = Math.max(newStart + 1, Math.min(dragging.origEnd + dayDelta, totalDays))
        } else if (dragging.type === 'resize-left') {
          newStart = Math.max(0, Math.min(dragging.origStart + dayDelta, dragging.origEnd - 1))
          newEnd = dragging.origEnd
        } else if (dragging.type === 'resize-right') {
          newStart = dragging.origStart
          newEnd = Math.max(dragging.origStart + 1, Math.min(dragging.origEnd + dayDelta, totalDays))
        }

        return {
          ...b,
          start_date: dayToDate(newStart),
          end_date: dayToDate(newEnd),
        }
      }))
    }

    const onUp = () => setDragging(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, DAY_PX, totalDays])

  const handleSave = async () => {
    setSaving(true)
    for (const b of breakdowns) {
      await supabase.from('breakdowns').update({
        start_date: b.start_date || null,
        end_date: b.end_date || null,
      }).eq('id', b.id)
    }
    onSave(task.id, breakdowns)
    setSaving(false)
    onClose()
  }

  const color = task.areas?.color || '#6366f1'

  // Month grouping for header
  const months = []
  let curMonth = null
  days.forEach((d, i) => {
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (key !== curMonth) {
      curMonth = key
      months.push({ label: d.toLocaleString('default', { month: 'short', year: '2-digit' }), startDay: i })
    }
  })

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,15,25,0.55)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000,
    }}>
      <div style={{
        background: 'white', borderRadius: '16px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
        width: 'min(760px, 96vw)',
        maxHeight: '85vh', overflowY: 'auto',
        padding: '1.75rem',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: 0 }}>{task.title}</h2>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: 0 }}>
              {new Date(taskStart).toLocaleDateString('default', { day: 'numeric', month: 'short' })}
              {' → '}
              {new Date(taskEnd).toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' · '}Schedule breakdown steps by dragging onto the timeline
            </p>
          </div>
          <button onClick={onClose} style={{
            background: '#f3f4f6', border: 'none', borderRadius: '8px',
            width: '32px', height: '32px', cursor: 'pointer', fontSize: '1rem',
            color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Timeline area */}
        <div style={{
          border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden',
          marginBottom: '1.25rem',
        }}>
          {/* Month row */}
          <div style={{
            height: '24px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb',
            position: 'relative', display: 'flex',
          }}>
            {months.map((m, i) => (
              <div key={i} style={{
                position: 'absolute',
                left: m.startDay * DAY_PX,
                fontSize: '0.65rem', fontWeight: 700, color: '#6b7280',
                padding: '0 6px', lineHeight: '24px',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>{m.label}</div>
            ))}
          </div>

          {/* Day row */}
          <div style={{
            height: '28px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb',
            display: 'flex', position: 'relative', overflowX: 'hidden',
          }}>
            {days.map((d, i) => {
              const isWeekend = d.getDay() === 0 || d.getDay() === 6
              const isToday = d.toDateString() === new Date().toDateString()
              return (
                <div key={i} style={{
                  width: DAY_PX, flexShrink: 0, textAlign: 'center',
                  fontSize: '0.62rem', lineHeight: '28px',
                  color: isToday ? color : isWeekend ? '#d1d5db' : '#9ca3af',
                  fontWeight: isToday ? 700 : 400,
                  background: isToday ? color + '15' : 'transparent',
                  borderRight: '1px solid #f1f5f9',
                }}>
                  {d.getDate()}
                </div>
              )
            })}
          </div>

          {/* Task span bar */}
          <div style={{
            height: '24px', background: '#fafafa', borderBottom: '1px solid #e5e7eb',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
              width: totalDays * DAY_PX, height: '10px',
              background: color + '25', borderRadius: '4px',
            }} />
            <div style={{
              position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)',
              fontSize: '0.62rem', color: color, fontWeight: 600,
            }}>
              {task.title}
            </div>
          </div>

          {/* Breakdown rows */}
          <div ref={timelineRef} style={{ position: 'relative', userSelect: 'none' }}>
            {breakdowns.map((b, idx) => {
              const { start, end } = getBreakdownDays(b)
              const hasPosition = start !== null && end !== null
              const rowBg = idx % 2 === 0 ? 'white' : '#fafafa'

              return (
                <div key={b.id} style={{
                  height: '40px', position: 'relative',
                  borderBottom: idx < breakdowns.length - 1 ? '1px solid #f1f5f9' : 'none',
                  background: rowBg,
                  display: 'flex', alignItems: 'center',
                }}>
                  {/* Weekend shading */}
                  {days.map((d, di) => (d.getDay() === 0 || d.getDay() === 6) && (
                    <div key={di} style={{
                      position: 'absolute', left: di * DAY_PX, top: 0, bottom: 0,
                      width: DAY_PX, background: 'rgba(0,0,0,0.025)', pointerEvents: 'none',
                    }} />
                  ))}

                  {/* Drop zone hint (if not placed) */}
                  {!hasPosition && (
                    <div
                      onClick={(e) => handleTimelineClick(e, b.id)}
                      style={{
                        position: 'absolute', left: 0, right: 0, top: 4, bottom: 4,
                        borderRadius: '6px', cursor: 'crosshair',
                        display: 'flex', alignItems: 'center', paddingLeft: '8px',
                      }}
                    >
                      <span style={{
                        fontSize: '0.7rem', color: '#d1d5db', pointerEvents: 'none',
                        fontStyle: 'italic',
                      }}>click to place "{b.title}"</span>
                    </div>
                  )}

                  {/* Placed breakdown box */}
                  {hasPosition && (
                    <div
                      onMouseDown={(e) => handleMouseDown(e, b.id, 'move')}
                      style={{
                        position: 'absolute',
                        left: start * DAY_PX,
                        width: Math.max((end - start) * DAY_PX, DAY_PX),
                        top: 5, bottom: 5,
                        borderRadius: '6px',
                        background: b.is_checked ? '#d1fae5' : color + 'dd',
                        border: `1.5px solid ${b.is_checked ? '#6ee7b7' : color}`,
                        cursor: dragging?.id === b.id ? 'grabbing' : 'grab',
                        display: 'flex', alignItems: 'center',
                        overflow: 'hidden',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                        transition: dragging ? 'none' : 'box-shadow 0.15s',
                        zIndex: dragging?.id === b.id ? 10 : 1,
                      }}
                    >
                      {/* Left resize handle */}
                      <div
                        onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, b.id, 'resize-left') }}
                        style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0, width: '7px',
                          cursor: 'ew-resize', background: 'rgba(255,255,255,0.25)',
                          borderRadius: '6px 0 0 6px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <div style={{ width: '2px', height: '10px', background: 'rgba(255,255,255,0.6)', borderRadius: '1px' }} />
                      </div>

                      <span style={{
                        fontSize: '0.68rem', fontWeight: 600,
                        color: b.is_checked ? '#059669' : 'white',
                        padding: '0 10px',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        flex: 1, pointerEvents: 'none',
                      }}>
                        {b.is_checked ? '✓ ' : ''}{b.title}
                      </span>

                      {/* Right resize handle */}
                      <div
                        onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, b.id, 'resize-right') }}
                        style={{
                          position: 'absolute', right: 0, top: 0, bottom: 0, width: '7px',
                          cursor: 'ew-resize', background: 'rgba(255,255,255,0.25)',
                          borderRadius: '0 6px 6px 0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <div style={{ width: '2px', height: '10px', background: 'rgba(255,255,255,0.6)', borderRadius: '1px' }} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Breakdown list with date labels */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.6rem' }}>
            Scheduled Steps
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {breakdowns.map(b => {
              const { start, end } = getBreakdownDays(b)
              const hasPos = start !== null && end !== null
              return (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  padding: '0.45rem 0.75rem', borderRadius: '8px',
                  background: hasPos ? '#f8fafc' : '#fffbeb',
                  border: `1px solid ${hasPos ? '#e5e7eb' : '#fde68a'}`,
                }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '2px', flexShrink: 0,
                    background: b.is_checked ? '#10b981' : color,
                  }} />
                  <span style={{
                    fontSize: '0.82rem', color: b.is_checked ? '#9ca3af' : '#374151',
                    textDecoration: b.is_checked ? 'line-through' : 'none', flex: 1,
                  }}>{b.title}</span>
                  {hasPos ? (
                    <span style={{ fontSize: '0.72rem', color: '#9ca3af', flexShrink: 0 }}>
                      {new Date(b.start_date).toLocaleDateString('default', { day: 'numeric', month: 'short' })}
                      {' – '}
                      {new Date(b.end_date).toLocaleDateString('default', { day: 'numeric', month: 'short' })}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#f59e0b', flexShrink: 0 }}>not scheduled</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '0.55rem 1.25rem', borderRadius: '8px',
            border: '1px solid #e5e7eb', background: 'white',
            color: '#6b7280', fontSize: '0.875rem', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '0.55rem 1.25rem', borderRadius: '8px',
            background: color, border: 'none',
            color: 'white', fontSize: '0.875rem', fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Saving…' : 'Save Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Gantt Chart ──────────────────────────────────────────────────────────
export default function GanttChart() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [hoveredTask, setHoveredTask] = useState(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const [activityLogs, setActivityLogs] = useState({})
  const [profile, setProfile] = useState(null)
  const [users, setUsers] = useState([])
  const [filterUser, setFilterUser] = useState('all')
  const [filterArea, setFilterArea] = useState('all')
  const [expandedTasks, setExpandedTasks] = useState({})
  const [schedulingTask, setSchedulingTask] = useState(null)
  const navigate = useNavigate()
  const containerRef = useRef(null)

  const fetchTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profileData } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()

    let query = supabase
      .from('tasks')
      .select('*, areas(name, color), breakdowns(*), task_assignments(user_id)')
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true })

    if (profileData?.role === 'intern') {
      const { data: assignedTasks } = await supabase
        .from('task_assignments').select('task_id').eq('user_id', user.id)
      const taskIds = assignedTasks?.map(a => a.task_id) || []
      if (taskIds.length === 0) { setTasks([]); setLoading(false); return }
      query = query.in('id', taskIds)
    }

    const { data } = await query
    setTasks(data || [])
    setLoading(false)
  }

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, role').order('full_name')
    setUsers(data || [])
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      const { data: profileData } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      setProfile(profileData)
      await fetchTasks()
      await fetchUsers()
    }
    init()
  }, [])

  const fetchActivityLog = async (taskId) => {
    if (activityLogs[taskId]) return
    const { data } = await supabase
      .from('activity_log')
      .select('*, profiles(full_name)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(5)
    setActivityLogs(prev => ({ ...prev, [taskId]: data || [] }))
  }

  const handleMouseEnter = (task, e) => {
    setHoveredTask(task)
    setHoverPos({ x: e.clientX, y: e.clientY })
    fetchActivityLog(task.id)
  }
  const handleMouseMove = (e) => setHoverPos({ x: e.clientX, y: e.clientY })
  const handleMouseLeave = () => setHoveredTask(null)

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date + 'Z')) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const handleScheduleSave = (taskId, updatedBreakdowns) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, breakdowns: updatedBreakdowns }
        : t
    ))
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ color: '#6b7280' }}>Loading…</div>
    </div>
  )

  const filteredTasks = tasks.filter(task => {
    const matchesArea = filterArea === 'all' || task.areas?.name === filterArea
    const matchesUser = filterUser === 'all' || task.task_assignments?.some(a => a.user_id === filterUser)
    return matchesArea && matchesUser
  })

  const tasksWithNoDueDate = tasks
    .filter(t => !t.due_date)
    .filter(task => {
      const matchesArea = filterArea === 'all' || task.areas?.name === filterArea
      const matchesUser = filterUser === 'all' || task.task_assignments?.some(a => a.user_id === filterUser)
      return matchesArea && matchesUser
    })

  const today = new Date()

  const allDates = filteredTasks.flatMap(t => [
    t.start_date ? new Date(t.start_date) : null,
    t.due_date ? new Date(t.due_date) : null,
    ...(t.breakdowns || []).flatMap(b => [
      b.start_date ? new Date(b.start_date) : null,
      b.end_date ? new Date(b.end_date) : null,
    ])
  ]).filter(Boolean)

  const minDate = allDates.length > 0
    ? new Date(Math.min(...allDates.map(d => d.getTime()), today.getTime()))
    : today
  const maxDate = allDates.length > 0
    ? new Date(Math.max(...allDates.map(d => d.getTime())))
    : new Date(today.getTime() + 30 * 86400000)

  minDate.setDate(minDate.getDate() - 7)
  maxDate.setDate(maxDate.getDate() + 7)

  const totalDays = Math.ceil((maxDate - minDate) / 86400000)
  const dayWidth = 40
  const taskRowHeight = 44
  const breakdownRowHeight = 26
  const labelWidth = 220

  const months = []
  const current = new Date(minDate)
  while (current <= maxDate) {
    months.push({
      label: current.toLocaleString('default', { month: 'short', year: 'numeric' }),
      offset: Math.floor((current - minDate) / 86400000) * dayWidth
    })
    current.setMonth(current.getMonth() + 1)
    current.setDate(1)
  }

  const days = []
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(minDate)
    d.setDate(d.getDate() + i)
    days.push(d)
  }

  const todayX = Math.floor((today - minDate) / 86400000) * dayWidth

  const getX = (dateStr) => {
    if (!dateStr) return null
    return Math.floor((new Date(dateStr) - minDate) / 86400000) * dayWidth
  }

  const getRowTotalHeight = (task) => {
    const isExpanded = expandedTasks[task.id]
    const bdCount = task.breakdowns?.length || 0
    return taskRowHeight + (isExpanded && bdCount > 0 ? bdCount * breakdownRowHeight + 8 : 0)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>

      {/* Sidebar */}
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

        {[
          { label: '📋 Task Board', path: '/dashboard' },
          { label: '🏆 Leaderboard', path: '/leaderboard' },
          { label: '📅 Gantt Chart', path: '/gantt', active: true },
        ].map(item => (
          <div key={item.path} onClick={() => navigate(item.path)} style={{
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
        ))}

        {profile?.role !== 'intern' && [
          { label: '👥 User Management', path: '/users' },
          { label: '📊 Activity Log', path: '/activity' },
        ].map(item => (
          <div key={item.path} onClick={() => navigate(item.path)} style={{
            padding: '0.5rem 0.75rem', borderRadius: '8px',
            marginBottom: '0.2rem', cursor: 'pointer', fontSize: '0.875rem',
            background: 'transparent', color: '#374151',
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {item.label}
          </div>
        ))}

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

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', background: 'white' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>📅 Gantt Chart</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            {filteredTasks.length} tasks with due dates
            {tasksWithNoDueDate.length > 0 && ` · ${tasksWithNoDueDate.length} without due date`}
            {' · '}Click a task bar to schedule its breakdowns
          </p>
        </div>

        {/* Filter bar */}
        <div style={{
          padding: '0.75rem 2rem', borderBottom: '1px solid #f1f5f9',
          background: 'white', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#9ca3af' }}>Filter:</span>

          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{
            padding: '0.4rem 0.75rem', border: '1.5px solid #e5e7eb', borderRadius: '8px',
            fontSize: '0.82rem', background: 'white', color: '#374151', cursor: 'pointer',
          }}>
            <option value="all">All users</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>

          <select value={filterArea} onChange={e => setFilterArea(e.target.value)} style={{
            padding: '0.4rem 0.75rem', border: '1.5px solid #e5e7eb', borderRadius: '8px',
            fontSize: '0.82rem', background: 'white', color: '#374151', cursor: 'pointer',
          }}>
            <option value="all">All areas</option>
            {Object.keys(AREA_COLORS).map(area => <option key={area} value={area}>{area}</option>)}
          </select>

          {(filterUser !== 'all' || filterArea !== 'all') && (
            <button onClick={() => { setFilterUser('all'); setFilterArea('all') }} style={{
              padding: '0.4rem 0.75rem', border: '1.5px solid #e5e7eb', borderRadius: '8px',
              fontSize: '0.82rem', background: 'transparent', color: '#6b7280', cursor: 'pointer',
            }}>Clear filters</button>
          )}

          <span style={{ fontSize: '0.78rem', color: '#9ca3af', marginLeft: 'auto' }}>
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Gantt area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem 2rem' }} ref={containerRef}>
          {filteredTasks.length === 0 ? (
            <div style={{
              background: 'white', borderRadius: '14px', padding: '3rem 2rem',
              textAlign: 'center', color: '#9ca3af', border: '1px solid #f1f5f9',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📅</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#6b7280' }}>No tasks match your filters</div>
            </div>
          ) : (
            <div style={{
              display: 'flex', background: 'white', borderRadius: '14px',
              border: '1px solid #f1f5f9', overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>

              {/* Task labels column */}
              <div style={{ width: `${labelWidth}px`, flexShrink: 0, borderRight: '1px solid #f1f5f9' }}>
                <div style={{
                  height: '56px', borderBottom: '1px solid #f1f5f9',
                  padding: '0 1rem', display: 'flex', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Task</span>
                </div>

                {filteredTasks.map((task, i) => {
                  const total = task.breakdowns?.length || 0
                  const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
                  const percent = total > 0 ? Math.round((checked / total) * 100) : 0
                  const color = task.areas?.color || '#6366f1'
                  const isExpanded = expandedTasks[task.id]
                  const rowH = getRowTotalHeight(task)
                  const scheduledCount = task.breakdowns?.filter(b => b.start_date && b.end_date).length || 0

                  return (
                    <div key={task.id} style={{
                      height: `${rowH}px`,
                      borderBottom: '1px solid #f9fafb',
                      background: i % 2 === 0 ? 'white' : '#fafafa',
                      display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
                      padding: '0 0.75rem',
                    }}>
                      {/* Task label row */}
                      <div style={{
                        height: `${taskRowHeight}px`, display: 'flex',
                        alignItems: 'center', gap: '0.5rem',
                      }}>
                        <div style={{ width: '4px', height: '26px', borderRadius: '2px', background: color, flexShrink: 0 }} />
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {task.title}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.1rem' }}>
                            {percent}% · {task.areas?.name}
                          </div>
                        </div>
                        {total > 0 && (
                          <button
                            onClick={() => setExpandedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                            title={isExpanded ? 'Collapse breakdowns' : 'Expand breakdowns'}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontSize: '0.65rem', color: '#9ca3af', padding: '2px 4px',
                              borderRadius: '4px', flexShrink: 0,
                              transform: isExpanded ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.2s',
                            }}>▼</button>
                        )}
                      </div>

                      {/* Breakdown sub-labels */}
                      {isExpanded && task.breakdowns?.sort((a, b) => a.order_index - b.order_index).map(b => (
                        <div key={b.id} style={{
                          height: `${breakdownRowHeight}px`,
                          display: 'flex', alignItems: 'center',
                          paddingLeft: '1.25rem', gap: '0.4rem',
                        }}>
                          <div style={{
                            width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                            background: b.is_checked ? '#10b981' : b.start_date ? color : '#d1d5db',
                          }} />
                          <span style={{
                            fontSize: '0.72rem', color: b.is_checked ? '#9ca3af' : '#6b7280',
                            textDecoration: b.is_checked ? 'line-through' : 'none',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>{b.title}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>

              {/* Timeline column */}
              <div style={{ overflow: 'auto', flex: 1 }}>
                <div style={{ width: `${totalDays * dayWidth}px`, position: 'relative' }}>

                  {/* Month headers */}
                  <div style={{ height: '28px', position: 'relative', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                    {months.map((m, i) => (
                      <div key={i} style={{
                        position: 'absolute', left: m.offset,
                        fontSize: '0.72rem', fontWeight: 600, color: '#6b7280',
                        padding: '0 8px', lineHeight: '28px', whiteSpace: 'nowrap',
                      }}>{m.label}</div>
                    ))}
                  </div>

                  {/* Day headers */}
                  <div style={{ height: '28px', position: 'relative', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                    {days.map((d, i) => (
                      <div key={i} style={{
                        position: 'absolute', left: i * dayWidth, width: dayWidth,
                        textAlign: 'center', fontSize: '0.65rem',
                        color: d.getDay() === 0 || d.getDay() === 6 ? '#d1d5db' : '#9ca3af',
                        lineHeight: '28px',
                        background: d.toDateString() === today.toDateString() ? '#eef2ff' : 'transparent',
                      }}>{d.getDate()}</div>
                    ))}
                  </div>

                  {/* Today line */}
                  <div style={{
                    position: 'absolute', left: todayX + dayWidth / 2,
                    top: 0, bottom: 0, width: '2px',
                    background: '#6366f1', opacity: 0.4, zIndex: 10, pointerEvents: 'none',
                  }} />

                  {/* Task rows */}
                  {filteredTasks.map((task, i) => {
                    const total = task.breakdowns?.length || 0
                    const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
                    const percent = total > 0 ? Math.round((checked / total) * 100) : 0
                    const color = task.areas?.color || '#6366f1'
                    const isComplete = percent === 100
                    const isExpanded = expandedTasks[task.id]
                    const rowH = getRowTotalHeight(task)

                    const startX = task.start_date
                      ? Math.floor((new Date(task.start_date) - minDate) / 86400000) * dayWidth
                      : Math.floor((new Date(task.due_date) - minDate) / 86400000) * dayWidth - 60
                    const endX = Math.floor((new Date(task.due_date) - minDate) / 86400000) * dayWidth + dayWidth / 2
                    const barWidth = Math.max(endX - startX, 80)

                    const scheduledBreakdowns = (task.breakdowns || [])
                      .filter(b => b.start_date && b.end_date)
                      .sort((a, b) => a.order_index - b.order_index)

                    return (
                      <div key={task.id} style={{
                        height: `${rowH}px`, position: 'relative',
                        borderBottom: '1px solid #f9fafb',
                        background: i % 2 === 0 ? 'white' : '#fafafa',
                      }}>
                        {/* Weekend shading */}
                        {days.map((d, di) => (d.getDay() === 0 || d.getDay() === 6) && (
                          <div key={di} style={{
                            position: 'absolute', left: di * dayWidth, top: 0, bottom: 0,
                            width: dayWidth, background: 'rgba(0,0,0,0.018)', pointerEvents: 'none',
                          }} />
                        ))}

                        {/* Task bar */}
                        <div
                          onMouseEnter={(e) => handleMouseEnter(task, e)}
                          onMouseMove={handleMouseMove}
                          onMouseLeave={handleMouseLeave}
                          onClick={() => setSchedulingTask(task)}
                          style={{
                            position: 'absolute',
                            left: startX, top: (taskRowHeight - 28) / 2,
                            height: '28px', width: `${barWidth}px`,
                            borderRadius: '6px',
                            background: color,
                            opacity: isComplete ? 0.5 : 1,
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center',
                            overflow: 'hidden',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                            zIndex: 2,
                          }}
                        >
                          <div style={{
                            position: 'absolute', left: 0, top: 0, bottom: 0,
                            width: `${percent}%`, background: 'rgba(255,255,255,0.22)',
                            transition: 'width 0.3s',
                          }} />
                          <span style={{
                            fontSize: '0.7rem', color: 'white', fontWeight: 600,
                            padding: '0 8px', position: 'relative', zIndex: 1,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {isComplete ? '✓ ' : ''}{task.title}
                          </span>
                          {/* Schedule icon */}
                          {total > 0 && (
                            <span style={{
                              position: 'absolute', right: 6, fontSize: '0.6rem',
                              color: 'rgba(255,255,255,0.8)', zIndex: 1,
                            }}>
                              {scheduledBreakdowns.length}/{total}
                            </span>
                          )}
                        </div>

                        {/* Breakdown sub-bars */}
                        {isExpanded && (task.breakdowns || []).sort((a, b) => a.order_index - b.order_index).map((b, bi) => {
                          const bStartX = getX(b.start_date)
                          const bEndX = getX(b.end_date)
                          if (bStartX === null || bEndX === null) return (
                            <div key={b.id} style={{
                              position: 'absolute',
                              top: taskRowHeight + bi * breakdownRowHeight + 4,
                              left: startX, height: `${breakdownRowHeight - 6}px`,
                              display: 'flex', alignItems: 'center', paddingLeft: 4,
                            }}>
                              <span style={{
                                fontSize: '0.62rem', color: '#d1d5db',
                                fontStyle: 'italic',
                              }}>not scheduled</span>
                            </div>
                          )

                          const bWidth = Math.max(bEndX - bStartX, dayWidth)
                          return (
                            <div key={b.id} style={{
                              position: 'absolute',
                              left: bStartX,
                              top: taskRowHeight + bi * breakdownRowHeight + 3,
                              height: `${breakdownRowHeight - 6}px`,
                              width: `${bWidth}px`,
                              borderRadius: '4px',
                              background: b.is_checked ? '#d1fae5' : color + '55',
                              border: `1px solid ${b.is_checked ? '#6ee7b7' : color + '99'}`,
                              display: 'flex', alignItems: 'center', overflow: 'hidden',
                              zIndex: 1,
                            }}>
                              <span style={{
                                fontSize: '0.62rem', fontWeight: 500,
                                color: b.is_checked ? '#059669' : color,
                                padding: '0 6px',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              }}>
                                {b.is_checked ? '✓ ' : ''}{b.title}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tasks with no due date */}
          {tasksWithNoDueDate.length > 0 && (
            <div style={{
              marginTop: '1rem', background: 'white', borderRadius: '14px',
              border: '1px solid #f1f5f9', padding: '1rem 1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.5rem' }}>NO DUE DATE</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {tasksWithNoDueDate.map(task => (
                  <div key={task.id} style={{
                    padding: '0.3rem 0.75rem', borderRadius: '20px',
                    background: (task.areas?.color || '#6366f1') + '15',
                    color: task.areas?.color || '#6366f1',
                    fontSize: '0.8rem', fontWeight: 500,
                    border: `1px solid ${(task.areas?.color || '#6366f1')}30`,
                  }}>
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredTask && (
        <div style={{
          position: 'fixed', left: hoverPos.x + 16, top: hoverPos.y - 10,
          background: 'white', border: '1px solid #e5e7eb',
          borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          padding: '1rem', minWidth: '240px', maxWidth: '300px',
          zIndex: 9999, pointerEvents: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: hoveredTask.areas?.color || '#6366f1', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>{hoveredTask.title}</div>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                {hoveredTask.start_date && `${new Date(hoveredTask.start_date).toLocaleDateString()} → `}
                {hoveredTask.areas?.name} · Due {new Date(hoveredTask.due_date).toLocaleDateString()}
              </div>
            </div>
          </div>

          {hoveredTask.breakdowns?.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Breakdown</span>
                <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                  {hoveredTask.breakdowns.filter(b => b.is_checked).length}/{hoveredTask.breakdowns.length}
                </span>
              </div>
              <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.4rem' }}>
                <div style={{
                  height: '100%', borderRadius: '3px',
                  background: hoveredTask.areas?.color || '#6366f1',
                  width: `${Math.round((hoveredTask.breakdowns.filter(b => b.is_checked).length / hoveredTask.breakdowns.length) * 100)}%`,
                }} />
              </div>
              {hoveredTask.breakdowns.slice(0, 4).map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', marginBottom: '0.2rem' }}>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '3px', flexShrink: 0, marginTop: '1px',
                    background: b.is_checked ? (hoveredTask.areas?.color || '#6366f1') : 'white',
                    border: `1.5px solid ${b.is_checked ? (hoveredTask.areas?.color || '#6366f1') : '#d1d5db'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {b.is_checked && <svg width="7" height="7" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: b.is_checked ? '#9ca3af' : '#374151', textDecoration: b.is_checked ? 'line-through' : 'none' }}>
                      {b.title}
                    </span>
                    {(b.start_date || b.end_date) && (
                      <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.1rem' }}>
                        {b.start_date && new Date(b.start_date).toLocaleDateString('default', { day: 'numeric', month: 'short' })}
                        {b.start_date && b.end_date && ' – '}
                        {b.end_date && new Date(b.end_date).toLocaleDateString('default', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {hoveredTask.breakdowns.length > 4 && (
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                  +{hoveredTask.breakdowns.length - 4} more steps
                </div>
              )}
            </div>
          )}

          {activityLogs[hoveredTask.id]?.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Recent Activity</div>
              {activityLogs[hoveredTask.id].map(log => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#374151', flex: 1, paddingRight: '0.5rem' }}>
                    <span style={{ fontWeight: 500 }}>{log.profiles?.full_name?.split(' ')[0]}</span> — {log.action.length > 35 ? log.action.slice(0, 35) + '…' : log.action}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#9ca3af', flexShrink: 0 }}>{timeAgo(log.created_at)}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{
            marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid #f1f5f9',
            fontSize: '0.7rem', color: '#9ca3af', fontStyle: 'italic',
          }}>
            Click bar to schedule breakdowns
          </div>
        </div>
      )}

      {/* Breakdown Scheduler Modal */}
      {schedulingTask && (
        <BreakdownScheduler
          task={schedulingTask}
          onClose={() => setSchedulingTask(null)}
          onSave={handleScheduleSave}
        />
      )}
    </div>
  )
}
