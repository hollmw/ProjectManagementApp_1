import { useState, useEffect, useCallback } from 'react'
import {
  DndContext, closestCenter,
  KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext,
  sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable'

import { supabase } from '../supabase'
import { useProfile } from '../contexts/ProfileContext'
import BreakdownTimeline from './newTaskModal/BreakdownTimeline'
import SortableBreakdown from './newTaskModal/SortableBreakdown'
import { saveTask } from './newTaskModal/saveTask'
import { isCompleteDate } from './newTaskModal/utils'

// ─── Main Modal ───────────────────────────────────────────────────────────────
const PRIORITY_OPTIONS = [
  { value: 'high',   label: 'High',   color: '#ef4444', bg: '#fef2f2' },
  { value: 'medium', label: 'Medium', color: '#f59e0b', bg: '#fffbeb' },
  { value: 'low',    label: 'Low',    color: '#10b981', bg: '#ecfdf5' },
]

export default function NewTaskModal({ onClose, onTaskCreated, editingTask }) {
  const { profile } = useProfile()
  const [title, setTitle] = useState(editingTask?.title || '')
  const [description, setDescription] = useState(editingTask?.description || '')
  const [areaId, setAreaId] = useState(editingTask?.area_id || '')
  const [dueDate, setDueDate] = useState(editingTask?.due_date || '')
  const [startDate, setStartDate] = useState(editingTask?.start_date || '')
  const [priority, setPriority] = useState(editingTask?.priority || 'medium')
  // multi-area: array of selected area IDs
  const [selectedAreaIds, setSelectedAreaIds] = useState(() => {
    if (editingTask?.task_areas?.length) return editingTask.task_areas.map(ta => ta.area_id)
    if (editingTask?.area_id) return [editingTask.area_id]
    return []
  })
  // area slots: { [areaId]: count }
  const [areaSlots, setAreaSlots] = useState(() => {
    const slots = {}
    ;(editingTask?.task_area_slots || []).forEach(s => { slots[s.area_id] = s.required_count })
    return slots
  })
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
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    supabase.from('areas').select('*').then(({ data }) => setAreas(data || []))
  }, [])

  // Auto-show timeline only when both dates are fully typed
  useEffect(() => {
    if (isCompleteDate(startDate) && isCompleteDate(dueDate)) setShowTimeline(true)
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

  const handleTimelineChange = useCallback((bdId, newStart, newEnd) => {
    setBreakdowns(prev => prev.map(b =>
      b.id === bdId ? { ...b, start_date: newStart, end_date: newEnd } : b
    ))
  }, [])

  const areaColor = '#6366f1'
  const toggleArea = (id) => setSelectedAreaIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

  const handleSubmit = async () => {
    if (!title || selectedAreaIds.length === 0) return
    setLoading(true)
    await saveTask({
      editingTask,
      fields: { title, description, selectedAreaIds, dueDate, startDate, priority },
      breakdowns,
      areaSlots,
      profile,
    })
    onTaskCreated()
    onClose()
    setLoading(false)
  }

  const canShowTimeline = isCompleteDate(startDate)
    && isCompleteDate(dueDate)
    && new Date(dueDate) > new Date(startDate)
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

        {/* Areas — multi-select pills */}
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
          Business Areas * <span style={{ fontWeight: 400, color: '#9ca3af' }}>(select all that apply)</span>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
          {areas.map(area => {
            const active = selectedAreaIds.includes(area.id)
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => toggleArea(area.id)}
                style={{
                  padding: '0.3rem 0.75rem', borderRadius: '20px', cursor: 'pointer',
                  border: `1.5px solid ${active ? area.color : '#e5e7eb'}`,
                  background: active ? area.color + '18' : 'white',
                  color: active ? area.color : '#6b7280',
                  fontSize: '0.82rem', fontWeight: active ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {active ? '✓ ' : ''}{area.name}
              </button>
            )
          })}
        </div>

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

        {/* Priority */}
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
          Priority
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {PRIORITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPriority(opt.value)}
              style={{
                flex: 1, padding: '0.45rem 0',
                border: `1.5px solid ${priority === opt.value ? opt.color : '#e5e7eb'}`,
                borderRadius: '8px',
                background: priority === opt.value ? opt.bg : 'white',
                color: priority === opt.value ? opt.color : '#9ca3af',
                fontSize: '0.82rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Intern slot requirements by area */}
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>
          Intern Slots Needed <span style={{ fontWeight: 400, color: '#9ca3af' }}>(by area)</span>
        </label>
        <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginBottom: '0.6rem', marginTop: 0 }}>
          Set how many interns from each area this task requires.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
          {areas.map(area => {
            const count = areaSlots[area.id] || 0
            return (
              <div key={area.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.75rem', borderRadius: '8px', border: `1px solid ${count > 0 ? area.color + '50' : '#f3f4f6'}`, background: count > 0 ? area.color + '08' : '#fafafa' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 500, color: count > 0 ? area.color : '#6b7280' }}>
                  {area.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button type="button" onClick={() => setAreaSlots(s => ({ ...s, [area.id]: Math.max(0, (s[area.id] || 0) - 1) }))}
                    style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '0.9rem', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>−</button>
                  <span style={{ minWidth: '18px', textAlign: 'center', fontSize: '0.88rem', fontWeight: 600, color: count > 0 ? area.color : '#9ca3af' }}>{count}</span>
                  <button type="button" onClick={() => setAreaSlots(s => ({ ...s, [area.id]: (s[area.id] || 0) + 1 }))}
                    style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '0.9rem', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>+</button>
                </div>
              </div>
            )
          })}
        </div>

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
          disabled={loading || !title || selectedAreaIds.length === 0}
          style={{
            width: '100%', padding: '0.75rem',
            background: !title || selectedAreaIds.length === 0 ? '#e5e7eb' : areaColor,
            color: !title || selectedAreaIds.length === 0 ? '#9ca3af' : 'white',
            border: 'none', borderRadius: '9px',
            fontSize: '0.95rem', fontWeight: 600,
            cursor: loading || !title || selectedAreaIds.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Saving…' : editingTask ? 'Save Changes' : 'Create Task'}
        </button>
      </div>
    </div>
  )
}
