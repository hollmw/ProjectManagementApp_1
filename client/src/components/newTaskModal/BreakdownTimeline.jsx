import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Inline Breakdown Timeline ────────────────────────────────────────────────
// Shown below the breakdown list when both start + due dates are set.
// Each breakdown gets a draggable, resizable bar on a mini calendar.
export default function BreakdownTimeline({ breakdowns, startDate, dueDate, color, onChange }) {
  const taskStart = new Date(startDate)
  const taskEnd = new Date(dueDate)
  const totalMs = taskEnd - taskStart
  const totalDays = Math.max(Math.ceil(totalMs / 86400000), 1)

  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(460)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width || 460)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const DAY_PX = Math.max(16, Math.floor(containerWidth / totalDays))

  const [dragging, setDragging] = useState(null)

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

  // Days array
  const days = []
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(taskStart)
    d.setDate(d.getDate() + i)
    days.push(d)
  }

  // Month labels
  const months = []
  let curKey = null
  days.forEach((d, i) => {
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (key !== curKey) {
      curKey = key
      months.push({
        label: d.toLocaleString('default', { month: 'short' }),
        day: i,
      })
    }
  })

  const handleMouseDown = (e, bdId, type) => {
    e.preventDefault()
    e.stopPropagation()
    const b = breakdowns.find(x => x.id === bdId)
    const start = dateToDay(b.start_date)
    const end = dateToDay(b.end_date)
    setDragging({
      id: bdId, type,
      startX: e.clientX,
      origStart: start ?? 0,
      origEnd: end ?? (start !== null ? start + 1 : 1),
    })
  }

  const handleRowClick = useCallback((e, bdId) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const day = Math.floor(x / DAY_PX)
    const clamped = Math.max(0, Math.min(day, totalDays - 1))
    onChange(bdId, dayToDate(clamped), dayToDate(clamped + 1))
  }, [DAY_PX, totalDays, onChange])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e) => {
      const dx = e.clientX - dragging.startX
      const delta = Math.round(dx / DAY_PX)
      let ns = dragging.origStart, ne = dragging.origEnd

      if (dragging.type === 'move') {
        ns = Math.max(0, Math.min(dragging.origStart + delta, totalDays - 1))
        ne = Math.max(ns + 1, Math.min(dragging.origEnd + delta, totalDays))
      } else if (dragging.type === 'resize-left') {
        ns = Math.max(0, Math.min(dragging.origStart + delta, dragging.origEnd - 1))
        ne = dragging.origEnd
      } else {
        ns = dragging.origStart
        ne = Math.max(dragging.origStart + 1, Math.min(dragging.origEnd + delta, totalDays))
      }
      onChange(dragging.id, dayToDate(ns), dayToDate(ne))
    }
    const onUp = () => setDragging(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, DAY_PX, totalDays, breakdowns, onChange])

  const today = new Date()

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        marginBottom: '0.5rem',
      }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color }} />
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Schedule Breakdowns
        </span>
        <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>
          · drag to place, resize edges to adjust
        </span>
      </div>

      <div style={{
        border: '1px solid #e5e7eb', borderRadius: '10px',
        overflow: 'hidden', background: '#fafafa',
      }}>
        {/* Month row */}
        <div style={{
          height: '20px', position: 'relative', background: '#f3f4f6',
          borderBottom: '1px solid #e5e7eb', overflow: 'hidden',
        }}>
          {months.map((m, i) => (
            <div key={i} style={{
              position: 'absolute', left: m.day * DAY_PX,
              fontSize: '0.6rem', fontWeight: 700, color: '#9ca3af',
              lineHeight: '20px', padding: '0 5px',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
            }}>{m.label}</div>
          ))}
        </div>

        {/* Day row */}
        <div style={{
          height: '22px', display: 'flex',
          borderBottom: '1px solid #e5e7eb', background: '#f8fafc',
          overflow: 'hidden',
        }}>
          {days.map((d, i) => {
            const isWeekend = d.getDay() === 0 || d.getDay() === 6
            const isToday = d.toDateString() === today.toDateString()
            return (
              <div key={i} style={{
                width: DAY_PX, flexShrink: 0,
                textAlign: 'center', fontSize: '0.58rem',
                lineHeight: '22px',
                color: isToday ? color : isWeekend ? '#e5e7eb' : '#d1d5db',
                fontWeight: isToday ? 800 : 400,
                background: isToday ? color + '15' : 'transparent',
                borderRight: '1px solid #f1f5f9',
              }}>
                {DAY_PX >= 20 ? d.getDate() : (d.getDate() % 5 === 0 ? d.getDate() : '')}
              </div>
            )
          })}
        </div>

        {/* Task span */}
        <div style={{
          height: '18px', position: 'relative',
          borderBottom: '1px solid #e5e7eb', background: 'white',
        }}>
          <div style={{
            position: 'absolute',
            left: 2, width: totalDays * DAY_PX - 4,
            top: 4, height: '10px',
            borderRadius: '3px', background: color + '20',
          }} />
        </div>

        {/* Breakdown rows */}
        <div ref={containerRef} style={{ position: 'relative', userSelect: 'none' }}>
          {breakdowns.map((b, idx) => {
            if (!b.title.trim()) return null
            const start = dateToDay(b.start_date)
            const end = dateToDay(b.end_date)
            const hasPos = start !== null && end !== null
            const rowBg = idx % 2 === 0 ? 'white' : '#fafafa'

            return (
              <div key={b.id} style={{
                height: '34px', position: 'relative',
                borderBottom: idx < breakdowns.length - 1 ? '1px solid #f1f5f9' : 'none',
                background: rowBg,
              }}>
                {/* Weekend tint */}
                {days.map((d, di) => (d.getDay() === 0 || d.getDay() === 6) && (
                  <div key={di} style={{
                    position: 'absolute', left: di * DAY_PX,
                    top: 0, bottom: 0, width: DAY_PX,
                    background: 'rgba(0,0,0,0.02)', pointerEvents: 'none',
                  }} />
                ))}

                {/* Click-to-place hint */}
                {!hasPos && (
                  <div
                    onClick={(e) => handleRowClick(e, b.id)}
                    style={{
                      position: 'absolute', inset: 0,
                      cursor: 'crosshair',
                      display: 'flex', alignItems: 'center',
                      paddingLeft: 8,
                    }}
                  >
                    <span style={{
                      fontSize: '0.65rem', color: '#d1d5db',
                      fontStyle: 'italic', pointerEvents: 'none',
                    }}>
                      click to place "{b.title}"
                    </span>
                  </div>
                )}

                {/* Placed bar */}
                {hasPos && (
                  <div
                    onMouseDown={(e) => handleMouseDown(e, b.id, 'move')}
                    style={{
                      position: 'absolute',
                      left: start * DAY_PX,
                      width: Math.max((end - start) * DAY_PX, DAY_PX),
                      top: 4, bottom: 4,
                      borderRadius: '5px',
                      background: b.is_checked ? '#d1fae5' : color,
                      border: `1.5px solid ${b.is_checked ? '#6ee7b7' : color}`,
                      cursor: dragging?.id === b.id ? 'grabbing' : 'grab',
                      display: 'flex', alignItems: 'center',
                      overflow: 'hidden',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.14)',
                      zIndex: dragging?.id === b.id ? 10 : 1,
                    }}
                  >
                    {/* Left resize */}
                    <div
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, b.id, 'resize-left') }}
                      style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px',
                        cursor: 'ew-resize', background: 'rgba(255,255,255,0.2)',
                        borderRadius: '5px 0 0 5px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <div style={{ width: '1.5px', height: '8px', background: 'rgba(255,255,255,0.6)', borderRadius: '1px' }} />
                    </div>

                    <span style={{
                      fontSize: '0.62rem', fontWeight: 600,
                      color: b.is_checked ? '#059669' : 'white',
                      padding: '0 8px',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      flex: 1, pointerEvents: 'none',
                    }}>
                      {b.title}
                    </span>

                    {/* Right resize */}
                    <div
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, b.id, 'resize-right') }}
                      style={{
                        position: 'absolute', right: 0, top: 0, bottom: 0, width: '6px',
                        cursor: 'ew-resize', background: 'rgba(255,255,255,0.2)',
                        borderRadius: '0 5px 5px 0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <div style={{ width: '1.5px', height: '8px', background: 'rgba(255,255,255,0.6)', borderRadius: '1px' }} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {breakdowns.every(b => !b.title.trim()) && (
            <div style={{
              height: '40px', display: 'flex', alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: '0.72rem', color: '#d1d5db', fontStyle: 'italic' }}>
                Add breakdown steps above to schedule them
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Date labels below each breakdown */}
      <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {breakdowns.filter(b => b.title.trim()).map(b => (
          <div key={b.id} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.3rem 0.6rem', borderRadius: '6px',
            background: b.start_date && b.end_date ? '#f8fafc' : '#fffbeb',
            border: `1px solid ${b.start_date && b.end_date ? '#f1f5f9' : '#fde68a'}`,
          }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
              background: b.start_date && b.end_date ? color : '#fbbf24',
            }} />
            <span style={{ fontSize: '0.75rem', color: '#374151', flex: 1 }}>{b.title}</span>
            {b.start_date && b.end_date ? (
              <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>
                {new Date(b.start_date).toLocaleDateString('default', { day: 'numeric', month: 'short' })}
                {' – '}
                {new Date(b.end_date).toLocaleDateString('default', { day: 'numeric', month: 'short' })}
              </span>
            ) : (
              <span style={{ fontSize: '0.68rem', color: '#f59e0b' }}>unscheduled</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
