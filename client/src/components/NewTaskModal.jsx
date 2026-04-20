import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function NewTaskModal({ onClose, onTaskCreated, editingTask }) {
  const [title, setTitle] = useState(editingTask?.title || '')
  const [description, setDescription] = useState(editingTask?.description || '')
  const [areaId, setAreaId] = useState(editingTask?.area_id || '')
  const [dueDate, setDueDate] = useState(editingTask?.due_date || '')
  const [breakdowns, setBreakdowns] = useState(
    editingTask?.breakdowns?.map(b => b.title) || ['']
  )
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchAreas = async () => {
      const { data } = await supabase.from('areas').select('*')
      setAreas(data || [])
    }
    fetchAreas()
  }, [])

  const addBreakdown = () => setBreakdowns([...breakdowns, ''])

  const updateBreakdown = (index, value) => {
    const updated = [...breakdowns]
    updated[index] = value
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
    .update({ title, description, area_id: areaId, due_date: dueDate || null })
    .eq('id', editingTask.id)

  // Wait for delete to fully complete before inserting
  await supabase
    .from('breakdowns')
    .delete()
    .eq('task_id', editingTask.id)

  const validBreakdowns = breakdowns.filter(b => b.trim() !== '')
  if (validBreakdowns.length > 0) {
    await supabase.from('breakdowns').insert(
      validBreakdowns.map((title, index) => ({
        task_id: editingTask.id,
        title,
        order_index: index
      }))
    )
  }
} else {
      const { data: task, error } = await supabase
        .from('tasks')
        .insert({ title, description, area_id: areaId, due_date: dueDate || null, created_by: user.id })
        .select()
        .single()

      if (!error && task) {
        const validBreakdowns = breakdowns.filter(b => b.trim() !== '')
        if (validBreakdowns.length > 0) {
          await supabase.from('breakdowns').insert(
            validBreakdowns.map((title, index) => ({
              task_id: task.id, title, order_index: index
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

        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Expected Completion Date</label>
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
          style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1rem', boxSizing: 'border-box' }} />

        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Breakdown Steps</label>
        {breakdowns.map((b, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input value={b} onChange={e => updateBreakdown(i, e.target.value)}
              placeholder={`Step ${i + 1}`}
              style={{ flex: 1, padding: '0.6rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem' }} />
            {breakdowns.length > 1 && (
              <button onClick={() => removeBreakdown(i)}
                style={{ padding: '0.6rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
            )}
          </div>
        ))}
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