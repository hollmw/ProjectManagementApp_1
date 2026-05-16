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

  const priorityBorderColor = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' }[task.priority] || '#6366f1'
  const taskAreas = task.task_areas?.length ? task.task_areas : (task.areas ? [{ area_id: task.area_id, areas: task.areas }] : [])

  // Slot fill status — computed from live assignments state so it updates in real time
  const slotStatus = (task.task_area_slots || []).map(slot => {
    const filled = assignments.filter(a => {
      const prof = a.profiles
      if (!prof) return false
      return (prof.user_areas || []).some(ua => ua.area_id === slot.area_id)
    }).length
    return { ...slot, filled }
  })

  // Build a multi-color left strip using background gradient (4px wide)
  // Falls back to priority color when no area colors are available
  const areaColors = taskAreas.map(ta => ta.areas?.color).filter(Boolean)
  let leftStripBackground
  if (areaColors.length === 0) {
    leftStripBackground = `linear-gradient(to right, ${priorityBorderColor} 4px, white 4px)`
  } else if (areaColors.length === 1) {
    leftStripBackground = `linear-gradient(to right, ${areaColors[0]} 4px, white 4px)`
  } else {
    const n = areaColors.length
    const stops = areaColors.map((c, i) => {
      const pct0 = ((i / n) * 100).toFixed(1)
      const pct1 = (((i + 1) / n) * 100).toFixed(1)
      return `${c} ${pct0}% ${pct1}%`
    }).join(', ')
    leftStripBackground = `linear-gradient(to right, transparent 4px, white 4px), linear-gradient(to bottom, ${stops}) 0 0 / 4px 100% no-repeat, white`
    // Simpler: use a single background shorthand
    leftStripBackground = `linear-gradient(to bottom, ${stops}) 0 0 / 4px 100% no-repeat, white`
  }

  return (
    <div style={{
      background: leftStripBackground,
      borderRadius: '14px',
      padding: '1.25rem 1.5rem',
      borderTop: '1px solid #f1f5f9',
      borderRight: '1px solid #f1f5f9',
      borderBottom: '1px solid #f1f5f9',
      borderLeft: 'none',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            {taskAreas.map(ta => {
              const area = ta.areas
              if (!area) return null
              return (
                <span key={ta.area_id} style={{
                  fontSize: '0.75rem', padding: '0.2rem 0.6rem',
                  background: (area.color || '#6366f1') + '20',
                  color: area.color || '#6366f1',
                  borderRadius: '20px', fontWeight: 500,
                }}>
                  {area.name}
                </span>
              )
            })}
            {task.priority && (() => {
              const cfg = { high: { color: '#ef4444', bg: '#fef2f2', label: '↑ High' }, medium: { color: '#f59e0b', bg: '#fffbeb', label: '→ Medium' }, low: { color: '#10b981', bg: '#ecfdf5', label: '↓ Low' } }
              const p = cfg[task.priority] || cfg.medium
              return (
                <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', background: p.bg, color: p.color, borderRadius: '20px', fontWeight: 600 }}>
                  {p.label}
                </span>
              )
            })()}
          </div>

          {/* ── Slot fill pills ── */}
          {slotStatus.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
              {slotStatus.map(s => {
                const over  = s.filled > s.required_count
                const exact = s.filled === s.required_count
                const color = s.areas?.color || '#6366f1'
                const style = over
                  ? { background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }
                  : exact
                    ? { background: '#d1fae5', color: '#059669', border: '1px solid #a7f3d0' }
                    : { background: color + '15', color, border: `1px solid ${color}40` }
                return (
                  <span key={s.area_id} style={{
                    fontSize: '0.68rem', fontWeight: 700,
                    padding: '0.15rem 0.5rem', borderRadius: '20px',
                    ...style,
                  }}>
                    {s.areas?.name} {s.filled}/{s.required_count}{exact ? ' ✓' : over ? ' ↑' : ''}
                  </span>
                )
              })}
            </div>
          )}
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
                zIndex: 100, minWidth: '150px', overflow: 'hidden',
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
