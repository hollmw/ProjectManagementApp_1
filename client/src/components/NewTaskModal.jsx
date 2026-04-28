import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import { logActivity } from '../utils/logActivity'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── Inline Breakdown Timeline ────────────────────────────────────────────────
// Shown below the breakdown list when both start + due dates are set.
// Each breakdown gets a draggable, resizable bar on a mini calendar.

function BreakdownTimeline({ breakdowns, startDate, dueDate, color, onChange }) {
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
      const b = breakdowns.find(x => x.id === dragging.id)
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

// ─── Sortable Breakdown Row ───────────────────────────────────────────────────
function SortableBreakdown({ id, value, index, onChange, onRemove, canRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        marginBottom: '0.5rem',
        display: 'flex', gap: '0.5rem', alignItems: 'center',
      }}
    >
      <div
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab', padding: '0.4rem', color: '#9ca3af',
          fontSize: '1rem', lineHeight: 1, flexShrink: 0,
        }}
      >
        ⠿
      </div>
      <input
        value={value}
        onChange={e => onChange(index, 'title', e.target.value)}
        placeholder={`Step ${index + 1}`}
        style={{
          flex: 1, padding: '0.55rem 0.75rem',
          border: '1px solid #e5e7eb', borderRadius: '8px',
          fontSize: '0.875rem', outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = '#6366f1'}
        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
      />
      {canRemove && (
        <button
          onClick={() => onRemove(index)}
          style={{
            padding: '0.55rem 0.6rem', background: '#fee2e2',
            color: '#dc2626', border: 'none', borderRadius: '8px',
            cursor: 'pointer', flexShrink: 0, fontSize: '0.8rem',
          }}
        >✕</button>
      )}
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function NewTaskModal({ onClose, onTaskCreated, editingTask }) {
  const [title, setTitle] = useState(editingTask?.title || '')
  const [description, setDescription] = useState(editingTask?.description || '')
  const [areaId, setAreaId] = useState(editingTask?.area_id || '')
  const [dueDate, setDueDate] = useState(editingTask?.due_date || '')
  const [startDate, setStartDate] = useState(editingTask?.start_date || '')
  const [breakdowns, setBreakdowns] = useState(
    editingTask?.breakdowns
      ? [...editingTask.breakdowns]
          .sort((a, b) => a.order_index - b.order_index)
          .map((b, i) => ({
            id: `item-${i}`,
            title: b.title,
            is_checked: b.is_checked,
            start_date: b.start_date || '',
            end_date: b.end_date || '',
          }))
      : [{ id: 'item-0', title: '', is_checked: false, start_date: '', end_date: '' }]
  )
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(false)
  const [showTimeline, setShowTimeline] = useState(
    !!(editingTask?.start_date && editingTask?.due_date)
  )

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    supabase.from('areas').select('*').then(({ data }) => setAreas(data || []))
  }, [])

  // Auto-show timeline when both dates are filled
  useEffect(() => {
    if (startDate && dueDate) setShowTimeline(true)
  }, [startDate, dueDate])

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      setBreakdowns(items => {
        const oldIndex = items.findIndex(i => i.id === active.id)
        const newIndex = items.findIndex(i => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const addBreakdown = () => {
    setBreakdowns(prev => [...prev, {
      id: `item-${Date.now()}`,
      title: '', is_checked: false, start_date: '', end_date: '',
    }])
  }

  const updateBreakdown = (index, field, value) => {
    setBreakdowns(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const removeBreakdown = (index) => {
    setBreakdowns(prev => prev.filter((_, i) => i !== index))
  }

  // Called by BreakdownTimeline when a bar is dragged/resized
  const handleTimelineChange = useCallback((bdId, newStart, newEnd) => {
    setBreakdowns(prev => prev.map(b =>
      b.id === bdId ? { ...b, start_date: newStart, end_date: newEnd } : b
    ))
  }, [])

  // Selected area color
  const selectedArea = areas.find(a => a.id === areaId)
  const areaColor = selectedArea?.color || '#6366f1'

  const handleSubmit = async () => {
    if (!title || !areaId) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (editingTask) {
      await supabase.from('tasks').update({
        title, description, area_id: areaId,
        due_date: dueDate || null, start_date: startDate || null,
      }).eq('id', editingTask.id)

      // Log task-level date changes
      const oldStart = editingTask.start_date || ''
      const oldDue = editingTask.due_date || ''
      if (oldStart !== (startDate || '') || oldDue !== (dueDate || '')) {
        const fmt = (d) => d ? new Date(d).toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' }) : 'none'
        await logActivity(
          user.id,
          `Updated dates on "${title}" — start: ${fmt(startDate)}, due: ${fmt(dueDate)}`,
          editingTask.id,
          0
        )
      }

      // Snapshot old breakdown dates before deleting
      const oldBreakdowns = [...(editingTask.breakdowns || [])]
        .sort((a, b) => a.order_index - b.order_index)

      await supabase.from('breakdowns').delete().eq('task_id', editingTask.id)

      const valid = breakdowns.filter(b => b.title.trim())
      if (valid.length > 0) {
        await supabase.from('breakdowns').insert(
          valid.map((b, i) => ({
            task_id: editingTask.id,
            title: b.title,
            is_checked: b.is_checked,
            order_index: i,
            start_date: b.start_date || null,
            end_date: b.end_date || null,
          }))
        )
      }

      // Log any breakdown date changes
      const fmt = (d) => d ? new Date(d).toLocaleDateString('default', { day: 'numeric', month: 'short' }) : 'none'
      for (const b of valid) {
        const old = oldBreakdowns.find(o => o.title === b.title)
        if (!old) continue
        const oldS = old.start_date || ''
        const oldE = old.end_date || ''
        const newS = b.start_date || ''
        const newE = b.end_date || ''
        if (oldS !== newS || oldE !== newE) {
          await logActivity(
            user.id,
            `Rescheduled step "${b.title}" on "${title}" — ${fmt(newS)} to ${fmt(newE)}`,
            editingTask.id,
            0
          )
        }
      }
    } else {
      const { data: task, error } = await supabase.from('tasks')
        .insert({
          title, description, area_id: areaId,
          due_date: dueDate || null, start_date: startDate || null,
          created_by: user.id,
        })
        .select().single()

      if (!error && task) {
        const valid = breakdowns.filter(b => b.title.trim())
        if (valid.length > 0) {
          await supabase.from('breakdowns').insert(
            valid.map((b, i) => ({
              task_id: task.id,
              title: b.title,
              is_checked: false,
              order_index: i,
              start_date: b.start_date || null,
              end_date: b.end_date || null,
            }))
          )
        }
      }
    }

    onTaskCreated()
    onClose()
    setLoading(false)
  }

  const canShowTimeline = startDate && dueDate && new Date(dueDate) > new Date(startDate)
  const hasNamedBreakdowns = breakdowns.some(b => b.title.trim())

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'white', borderRadius: '14px',
        padding: '2rem', width: '540px', maxHeight: '90vh',
        overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
      }}>
        {/* Modal header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', margin: 0 }}>
              {editingTask ? 'Edit Task' : 'New Task'}
            </h2>
            <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '0.2rem 0 0' }}>
              {editingTask ? 'Update task details and schedule' : 'Create a task and schedule its steps'}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: '#f3f4f6', border: 'none', borderRadius: '8px',
            width: '32px', height: '32px', cursor: 'pointer',
            fontSize: '1rem', color: '#6b7280',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Title */}
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
          Task Title *
        </label>
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Build login page"
          style={{
            width: '100%', padding: '0.6rem 0.75rem',
            border: '1.5px solid #e5e7eb', borderRadius: '8px',
            fontSize: '0.9rem', marginBottom: '1rem', boxSizing: 'border-box',
            outline: 'none', transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = areaColor}
          onBlur={e => e.target.style.borderColor = '#e5e7eb'}
        />

        {/* Description */}
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
          Description
        </label>
        <textarea
          value={description} onChange={e => setDescription(e.target.value)}
          placeholder="What needs to be done?"
          rows={2}
          style={{
            width: '100%', padding: '0.6rem 0.75rem',
            border: '1.5px solid #e5e7eb', borderRadius: '8px',
            fontSize: '0.875rem', marginBottom: '1rem', boxSizing: 'border-box',
            resize: 'vertical', outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = areaColor}
          onBlur={e => e.target.style.borderColor = '#e5e7eb'}
        />

        {/* Area */}
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
          Business Area *
        </label>
        <select
          value={areaId} onChange={e => setAreaId(e.target.value)}
          style={{
            width: '100%', padding: '0.6rem 0.75rem',
            border: '1.5px solid #e5e7eb', borderRadius: '8px',
            fontSize: '0.875rem', marginBottom: '1rem', boxSizing: 'border-box',
            background: 'white',
          }}
        >
          <option value="">Select an area</option>
          {areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
        </select>

        {/* Dates — side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
              Start Date
            </label>
            <input
              type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{
                width: '100%', padding: '0.6rem 0.75rem',
                border: '1.5px solid #e5e7eb', borderRadius: '8px',
                fontSize: '0.875rem', boxSizing: 'border-box', outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = areaColor}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
              Due Date
            </label>
            <input
              type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              style={{
                width: '100%', padding: '0.6rem 0.75rem',
                border: '1.5px solid #e5e7eb', borderRadius: '8px',
                fontSize: '0.875rem', boxSizing: 'border-box', outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = areaColor}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#f1f5f9', marginBottom: '1.25rem' }} />

        {/* Breakdown steps */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
            Breakdown Steps
          </label>
          {canShowTimeline && hasNamedBreakdowns && (
            <button
              onClick={() => setShowTimeline(v => !v)}
              style={{
                fontSize: '0.7rem', padding: '0.25rem 0.6rem',
                background: showTimeline ? areaColor + '15' : '#f3f4f6',
                color: showTimeline ? areaColor : '#6b7280',
                border: `1px solid ${showTimeline ? areaColor + '40' : '#e5e7eb'}`,
                borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
              }}
            >
              {showTimeline ? '⏱ Hide timeline' : '⏱ Schedule on timeline'}
            </button>
          )}
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={breakdowns.map(b => b.id)} strategy={verticalListSortingStrategy}>
            {breakdowns.map((b, i) => (
              <SortableBreakdown
                key={b.id}
                id={b.id}
                value={b.title}
                index={i}
                onChange={updateBreakdown}
                onRemove={removeBreakdown}
                canRemove={breakdowns.length > 1}
              />
            ))}
          </SortableContext>
        </DndContext>

        <button
          onClick={addBreakdown}
          style={{
            background: 'none', border: '1.5px dashed #d1d5db', borderRadius: '8px',
            padding: '0.45rem 1rem', fontSize: '0.82rem', color: '#9ca3af',
            cursor: 'pointer', width: '100%', marginBottom: '0.75rem',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.target.style.borderColor = areaColor; e.target.style.color = areaColor }}
          onMouseLeave={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.color = '#9ca3af' }}
        >
          + Add step
        </button>

        {/* Inline timeline — only shown when start + due dates exist */}
        {canShowTimeline && showTimeline && hasNamedBreakdowns && (
          <BreakdownTimeline
            breakdowns={breakdowns}
            startDate={startDate}
            dueDate={dueDate}
            color={areaColor}
            onChange={handleTimelineChange}
          />
        )}

        {/* Hint when dates not set yet */}
        {!canShowTimeline && hasNamedBreakdowns && (
          <div style={{
            padding: '0.6rem 0.75rem', borderRadius: '8px',
            background: '#fffbeb', border: '1px solid #fde68a',
            fontSize: '0.75rem', color: '#92400e', marginBottom: '0.75rem',
          }}>
            💡 Set both a start and due date to schedule your breakdown steps on a timeline
          </div>
        )}

        <div style={{ height: '1px', background: '#f1f5f9', margin: '1.25rem 0' }} />

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !title || !areaId}
          style={{
            width: '100%', padding: '0.75rem',
            background: !title || !areaId ? '#e5e7eb' : areaColor,
            color: !title || !areaId ? '#9ca3af' : 'white',
            border: 'none', borderRadius: '9px',
            fontSize: '0.95rem', fontWeight: 600,
            cursor: loading || !title || !areaId ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Saving…' : editingTask ? 'Save Changes' : 'Create Task'}
        </button>
      </div>
    </div>
  )
}