import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
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

function SortableBreakdown({ id, value, startDate, endDate, index, onChange, onRemove, canRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={{ ...style, marginBottom: '0.75rem', background: '#f9fafb', borderRadius: '8px', padding: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', padding: '0.4rem', color: '#9ca3af', fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}
        >
          ⠿
        </div>
        <input
          value={value}
          onChange={e => onChange(index, 'title', e.target.value)}
          placeholder={`Step ${index + 1}`}
          style={{ flex: 1, padding: '0.6rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem' }}
        />
        {canRemove && (
          <button onClick={() => onRemove(index)}
            style={{ padding: '0.6rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer', flexShrink: 0 }}>
            ✕
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', paddingLeft: '2rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.72rem', color: '#9ca3af', marginBottom: '0.2rem' }}>Start</label>
          <input type="date" value={startDate || ''} onChange={e => onChange(index, 'start_date', e.target.value)}
            style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.8rem', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.72rem', color: '#9ca3af', marginBottom: '0.2rem' }}>End</label>
          <input type="date" value={endDate || ''} onChange={e => onChange(index, 'end_date', e.target.value)}
            style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.8rem', boxSizing: 'border-box' }} />
        </div>
      </div>
    </div>
  )
}

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
          .map((b, i) => ({ id: `item-${i}`, title: b.title, is_checked: b.is_checked, start_date: b.start_date || '', end_date: b.end_date || '' }))
      : [{ id: 'item-0', title: '', is_checked: false, start_date: '', end_date: '' }]
  ) 
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    const fetchAreas = async () => {
      const { data } = await supabase.from('areas').select('*')
      setAreas(data || [])
    }
    fetchAreas()
  }, [])

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
    const newId = `item-${Date.now()}`
    setBreakdowns([...breakdowns, { id: newId, title: '', is_checked: false, start_date: '', end_date: '' }])
  }

  const updateBreakdown = (index, field, value) => {
    const updated = [...breakdowns]
    updated[index] = { ...updated[index], [field]: value }
    setBreakdowns(updated)
  }

  const removeBreakdown = (index) => {
    setBreakdowns(breakdowns.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!title || !areaId) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (editingTask) {
      await supabase
        .from('tasks')
        .update({ title, description, area_id: areaId, due_date: dueDate || null, start_date: startDate || null })
        .eq('id', editingTask.id)

      await supabase.from('breakdowns').delete().eq('task_id', editingTask.id)

      const validBreakdowns = breakdowns.filter(b => b.title.trim() !== '')
      if (validBreakdowns.length > 0) {
        await supabase.from('breakdowns').insert(
          validBreakdowns.map((b, index) => ({
            task_id: editingTask?.id,
            title: b.title,
            is_checked: b.is_checked,
            order_index: index,
            start_date: b.start_date || null,
            end_date: b.end_date || null
          }))
        )
      }
    } else {
      const { data: task, error } = await supabase
        .from('tasks')
        .insert({ title, description, area_id: areaId, due_date: dueDate || null, start_date: startDate || null, created_by: user.id })
        .select()
        .single()

      if (!error && task) {
        const validBreakdowns = breakdowns.filter(b => b.title.trim() !== '')
        if (validBreakdowns.length > 0) {
          await supabase.from('breakdowns').insert(
            validBreakdowns.map((b, index) => ({
              task_id: task.id,
              title: b.title,
              is_checked: false,
              order_index: index
            }))
          )
        }
      }
    }

    onTaskCreated()
    onClose()
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white', borderRadius: '12px',
        padding: '2rem', width: '500px', maxHeight: '85vh',
        overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>
            {editingTask ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Task Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Build login page"
          style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1rem', boxSizing: 'border-box' }} />

        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What needs to be done?"
          rows={3} style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1rem', boxSizing: 'border-box', resize: 'vertical' }} />

        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Business Area *</label>
        <select value={areaId} onChange={e => setAreaId(e.target.value)}
          style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1rem', boxSizing: 'border-box' }}>
          <option value="">Select an area</option>
          {areas.map(area => (
            <option key={area.id} value={area.id}>{area.name}</option>
          ))}
        </select>
        
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Start Date</label>
      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
        style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1rem', boxSizing: 'border-box' }} />

      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Expected Completion Date</label>
      <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
        style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1rem', boxSizing: 'border-box' }} />
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Breakdown Steps</label>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={breakdowns.map(b => b.id)} strategy={verticalListSortingStrategy}>
            {breakdowns.map((b, i) => (
              <SortableBreakdown
                key={b.id}
                id={b.id}
                value={b.title}
                startDate={b.start_date}
                endDate={b.end_date}
                index={i}
                onChange={updateBreakdown}
                onRemove={removeBreakdown}
                canRemove={breakdowns.length > 1}
              />
            ))}
          </SortableContext>
        </DndContext>

        <button onClick={addBreakdown}
          style={{ background: 'none', border: '1px dashed #d1d5db', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#6b7280', cursor: 'pointer', width: '100%', marginBottom: '1.5rem' }}>
          + Add step
        </button>

        <button onClick={handleSubmit} disabled={loading}
          style={{ width: '100%', padding: '0.75rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer' }}>
          {loading ? 'Saving...' : editingTask ? 'Save Changes' : 'Create Task'}
        </button>
      </div>
    </div>
  )
}