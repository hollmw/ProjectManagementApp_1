import { useState } from 'react'
import { supabase } from '../../supabase'
import { logActivity } from '../../utils/logActivity'

// ─── Inline start/due date editor on the card ────────────────────────────────
export default function DateEditor({ task }) {
  const [editing, setEditing] = useState(false)
  const [startDate, setStartDate] = useState(task.start_date || '')
  const [dueDate, setDueDate] = useState(task.due_date || '')

  const save = async () => {
    await supabase.from('tasks').update({
      start_date: startDate || null,
      due_date: dueDate || null,
    }).eq('id', task.id)

    const { data: { user } } = await supabase.auth.getUser()
    const fmt = (d) => d
      ? new Date(d).toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'none'
    await logActivity(
      user.id,
      `Updated dates on "${task.title}" — start: ${fmt(startDate)}, due: ${fmt(dueDate)}`,
      task.id,
      0,
    )
    setEditing(false)
  }

  return (
    <>
      <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
          {task.start_date && <span>Start: <strong>{new Date(task.start_date).toLocaleDateString()}</strong></span>}
          {task.start_date && task.due_date && <span style={{ margin: '0 0.4rem' }}>→</span>}
          {task.due_date && <span>Due: <strong>{new Date(task.due_date).toLocaleDateString()}</strong></span>}
        </div>
        <button
          onClick={() => setEditing(!editing)}
          style={{
            fontSize: '0.72rem', padding: '0.2rem 0.5rem',
            background: '#f3f4f6', border: 'none', borderRadius: '6px',
            cursor: 'pointer', color: '#6b7280',
          }}
        >
          {editing ? 'Cancel' : 'Edit dates'}
        </button>
      </div>

      {editing && (
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '8px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: '#9ca3af', marginBottom: '0.2rem' }}>Start date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.8rem', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: '#9ca3af', marginBottom: '0.2rem' }}>Due date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.8rem', boxSizing: 'border-box' }} />
          </div>
          <button
            onClick={save}
            style={{
              alignSelf: 'flex-end', padding: '0.4rem 0.75rem',
              background: '#6366f1', color: 'white', border: 'none',
              borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer',
            }}
          >
            Save
          </button>
        </div>
      )}
    </>
  )
}
