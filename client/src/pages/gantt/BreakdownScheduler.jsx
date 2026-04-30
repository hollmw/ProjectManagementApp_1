import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../supabase'
import { logActivity } from '../../utils/logActivity'

// ─── Mini Calendar Breakdown Scheduler ────────────────────────────────────────
// Modal that lets you place breakdown steps onto a mini-calendar by dragging.
export default function BreakdownScheduler({ task, onClose, onSave }) {
  const taskStart = task.start_date ? new Date(task.start_date) : new Date()
  const taskEnd = task.due_date
    ? new Date(task.due_date)
    : new Date(taskStart.getTime() + 14 * 86400000)

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

  const [dragging, setDragging] = useState(null)
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

  const getBreakdownDays = (b) => ({
    start: b.start_date ? dateToDay(b.start_date) : null,
    end: b.end_date ? dateToDay(b.end_date) : null,
  })

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
    const { data: { user } } = await supabase.auth.getUser()
    const scheduled = breakdowns.filter(b => b.start_date && b.end_date)
    if (scheduled.length > 0) {
      const stepList = scheduled.map(b => {
        const start = new Date(b.start_date).toLocaleDateString('default', { day: 'numeric', month: 'short' })
        const end = new Date(b.end_date).toLocaleDateString('default', { day: 'numeric', month: 'short' })
        return `"${b.title}" (${start} – ${end})`
      }).join(', ')
      await logActivity(user.id, `Scheduled breakdown steps for "${task.title}": ${stepList}`, task.id, 0)
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
