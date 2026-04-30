import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { logActivity } from '../utils/logActivity'

import BreakdownList from './taskCard/BreakdownList'
import AssignmentSection from './taskCard/AssignmentSection'
import ReviewSection from './taskCard/ReviewSection'
import DateEditor from './taskCard/DateEditor'

// Toggle a breakdown step's check state and log/award points appropriately.
async function toggleBreakdownInDb(task, breakdown, newChecked) {
  await supabase.from('breakdowns').update({ is_checked: newChecked }).eq('id', breakdown.id)
  const { data: { user } } = await supabase.auth.getUser()

  if (newChecked) {
    const { data: existing } = await supabase
      .from('activity_log')
      .select('id')
      .eq('user_id', user.id)
      .eq('task_id', task.id)
      .ilike('action', `%${breakdown.title}%`)
      .limit(1)
    const alreadyAwarded = existing && existing.length > 0
    await logActivity(
      user.id,
      `Completed step "${breakdown.title}" on task "${task.title}"`,
      task.id,
      alreadyAwarded ? 0 : 10,
    )
  } else {
    await logActivity(
      user.id,
      `Unchecked step "${breakdown.title}" on task "${task.title}"`,
      task.id,
      0,
    )
  }
}

export default function TaskCard({
  task,
  onBreakdownToggle, onDelete, onEdit,
  onReviewSaved, onAssignmentChange,
  userRole,
}) {
  const breakdowns = [...(task.breakdowns || [])].sort((a, b) => a.order_index - b.order_index)
  const [showMenu, setShowMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [assignments, setAssignments] = useState(task.task_assignments || [])

  useEffect(() => { setAssignments(task.task_assignments || []) }, [task.task_assignments])

  const handleToggle = async (breakdown) => {
    const newChecked = !breakdown.is_checked
    onBreakdownToggle(task.id, breakdown.id, newChecked)
    await toggleBreakdownInDb(task, breakdown, newChecked)
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('tasks').delete().eq('id', task.id)
    if (!error) onDelete(task.id)
  }

  const checkedCount = breakdowns.filter(b => b.is_checked).length
  const totalCount = breakdowns.length
  const percent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  return (
    <div style={{
      background: 'white', borderRadius: '14px',
      padding: '1.25rem 1.5rem', border: '1px solid #f1f5f9',
      borderLeft: `4px solid ${task.areas?.color || '#6366f1'}`,
      position: 'relative',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
      transition: 'box-shadow 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{task.title}</h3>
          <span style={{
            fontSize: '0.75rem', padding: '0.2rem 0.6rem',
            background: (task.areas?.color || '#6366f1') + '20',
            color: task.areas?.color || '#6366f1',
            borderRadius: '20px', fontWeight: 500,
          }}>
            {task.areas?.name}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#6b7280' }}>
            {task.due_date && <div>Due: {new Date(task.due_date).toLocaleDateString()}</div>}
            <div style={{
              marginTop: '0.25rem', padding: '0.2rem 0.6rem',
              background: percent === 100 ? '#d1fae5' : '#f3f4f6',
              color: percent === 100 ? '#059669' : '#6b7280',
              borderRadius: '20px', fontSize: '0.75rem',
            }}>
              {percent === 100 ? 'complete' : task.status}
            </div>
          </div>

          {/* Three-dot menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '0.25rem 0.4rem', borderRadius: '6px',
                fontSize: '1.1rem', color: '#9ca3af', lineHeight: 1,
              }}
            >
              ⋯
            </button>
            {showMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '100%',
                background: 'white', border: '1px solid #e5e7eb',
                borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 100, minWidth: '130px', overflow: 'hidden',
              }}>
                <button
                  onClick={() => { setShowMenu(false); onEdit(task) }}
                  style={{
                    display: 'block', width: '100%', padding: '0.6rem 1rem',
                    background: 'none', border: 'none', textAlign: 'left',
                    fontSize: '0.85rem', cursor: 'pointer', color: '#374151',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  Edit task
                </button>
                {userRole !== 'intern' && (
                  <button
                    onClick={() => { setShowMenu(false); setConfirmDelete(true) }}
                    style={{
                      display: 'block', width: '100%', padding: '0.6rem 1rem',
                      background: 'none', border: 'none', textAlign: 'left',
                      fontSize: '0.85rem', cursor: 'pointer', color: '#ef4444',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    Delete task
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: '8px', padding: '0.75rem 1rem',
          marginBottom: '0.75rem', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.85rem', color: '#dc2626' }}>Delete this task?</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleDelete} style={{
              padding: '0.3rem 0.75rem', background: '#ef4444', color: 'white',
              border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer',
            }}>Delete</button>
            <button onClick={() => setConfirmDelete(false)} style={{
              padding: '0.3rem 0.75rem', background: 'white',
              border: '1px solid #e5e7eb', borderRadius: '6px',
              fontSize: '0.8rem', cursor: 'pointer', color: '#6b7280',
            }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Description */}
      {task.description && (
        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.75rem' }}>{task.description}</p>
      )}

      <DateEditor task={task} />

      <BreakdownList breakdowns={breakdowns} onToggle={handleToggle} />

      <AssignmentSection
        task={task}
        assignments={assignments}
        setAssignments={setAssignments}
        userRole={userRole}
        onAssignmentChange={onAssignmentChange}
      />

      <ReviewSection
        task={task}
        userRole={userRole}
        onReviewSaved={onReviewSaved}
      />
    </div>
  )
}
