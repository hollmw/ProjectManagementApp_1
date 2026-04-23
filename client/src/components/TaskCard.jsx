import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { logActivity, awardPerfectReviewBadge} from '../utils/logActivity'
import UserPill from './UserPill'


export default function TaskCard({ task, onBreakdownToggle, onDelete, onEdit, onReviewSaved, onAssignmentChange, userRole }) {  const breakdowns = [...(task.breakdowns || [])].sort((a, b) => a.order_index - b.order_index)
  const [review, setReview] = useState(task.reviews?.[0] || null)
  const [showReview, setShowReview] = useState(false)
  const [score, setScore] = useState(task.reviews?.[0]?.score || 0)
  const [notes, setNotes] = useState(task.reviews?.[0]?.notes || '')
  const [savingReview, setSavingReview] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [users, setUsers] = useState([])
  const [assignments, setAssignments] = useState(task.task_assignments || [])
  

  useEffect(() => {
    setReview(task.reviews?.[0] || null)
    setScore(task.reviews?.[0]?.score || 0)
    setNotes(task.reviews?.[0]?.notes || '')
  }, [task.reviews])

  useEffect(() => {
    setAssignments(task.task_assignments || [])
  }, [task.task_assignments])

  const toggleBreakdown = async (breakdown) => {
  const newChecked = !breakdown.is_checked
  onBreakdownToggle(task.id, breakdown.id, newChecked)
  await supabase
    .from('breakdowns')
    .update({ is_checked: newChecked })
    .eq('id', breakdown.id)

  const { data: { user } } = await supabase.auth.getUser()

  if (newChecked) {
    // Check if points already awarded for this breakdown
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
      alreadyAwarded ? 0 : 10  // only award points first time
    )
  } else {
    await logActivity(
      user.id,
      `Unchecked step "${breakdown.title}" on task "${task.title}"`,
      task.id,
      0
    )
  }
}

  const handleDelete = async () => {
  const { error } = await supabase.from('tasks').delete().eq('id', task.id)
  console.log('delete result:', error)
  if (!error) onDelete(task.id)
}

  const saveReview = async () => {
    setSavingReview(true)
    const { data: { user } } = await supabase.auth.getUser()
    await logActivity(user.id, `Reviewed task "${task.title}" — scored ${score}/10`, task.id, 5)
    if (review) {
      const { data } = await supabase
        .from('reviews')
        .update({ score, notes })
        .eq('id', review.id)
        .select()
        .single()
      setReview(data)
      if (data) onReviewSaved(task.id, data)
      if (score === 10) await awardPerfectReviewBadge(task.id)
    } else {
      const { data } = await supabase
        .from('reviews')
        .insert({ task_id: task.id, score, notes, reviewed_by: user.id })
        .select()
        .single()
      setReview(data)
      if (data) onReviewSaved(task.id, data)
      if (score === 10) { await awardPerfectReviewBadge(task.id) }
    }
    setSavingReview(false)
    setShowReview(false)
  }

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
    setUsers(data || [])
  }

  const toggleAssignment = async (user) => {
  const existing = assignments.find(a => a.profiles?.id === user.id || a.user_id === user.id)
  if (existing) {
    await supabase.from('task_assignments').delete().eq('id', existing.id)
    const newAssignments = assignments.filter(a => a.id !== existing.id)
    setAssignments(newAssignments)
    onAssignmentChange(task.id, newAssignments)
  } else {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('task_assignments')
      .insert({ task_id: task.id, user_id: user.id, assigned_by: currentUser.id })
      .select('*, profiles!task_assignments_user_id_fkey(id, full_name, role)')
      .single()
    if (data) {
      const newAssignments = [...assignments, data]
      setAssignments(newAssignments)
      onAssignmentChange(task.id, newAssignments)
    }
  }
}

  const checkedCount = breakdowns.filter(b => b.is_checked).length
  const totalCount = breakdowns.length
  const percent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  const scoreColor = (s) => {
    if (s >= 8) return '#10b981'
    if (s >= 5) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div style={{
      background: 'white', borderRadius: '14px',
      padding: '1.25rem 1.5rem', border: '1px solid #f1f5f9',
      borderLeft: `4px solid ${task.areas?.color || '#6366f1'}`,
      position: 'relative',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
      transition: 'box-shadow 0.2s, transform 0.2s'
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
            borderRadius: '20px', fontWeight: 500
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
              borderRadius: '20px', fontSize: '0.75rem'
            }}>
              {percent === 100 ? 'complete' : task.status}
            </div>
          </div>

          {/* Three dot menu */}

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '0.25rem 0.4rem', borderRadius: '6px',
                fontSize: '1.1rem', color: '#9ca3af', lineHeight: 1
              }}
            >
              ⋯
            </button>
            {showMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '100%',
                background: 'white', border: '1px solid #e5e7eb',
                borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 100, minWidth: '130px', overflow: 'hidden'
              }}>
                <button
                  onClick={() => { setShowMenu(false); onEdit(task) }}
                  style={{
                    display: 'block', width: '100%', padding: '0.6rem 1rem',
                    background: 'none', border: 'none', textAlign: 'left',
                    fontSize: '0.85rem', cursor: 'pointer', color: '#374151'
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
                    fontSize: '0.85rem', cursor: 'pointer', color: '#ef4444'
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
          justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.85rem', color: '#dc2626' }}>Delete this task?</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleDelete} style={{
              padding: '0.3rem 0.75rem', background: '#ef4444', color: 'white',
              border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer'
            }}>Delete</button>
            <button onClick={() => setConfirmDelete(false)} style={{
              padding: '0.3rem 0.75rem', background: 'white',
              border: '1px solid #e5e7eb', borderRadius: '6px',
              fontSize: '0.8rem', cursor: 'pointer', color: '#6b7280'
            }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Description */}
      {task.description && (
        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.75rem' }}>{task.description}</p>
      )}

      {/* Breakdowns */}
      {breakdowns.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Breakdown — {percent}% complete
          </div>
          {breakdowns.map(b => (
            <div
              key={b.id}
              onClick={() => toggleBreakdown(b)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                marginBottom: '0.4rem', fontSize: '0.85rem',
                cursor: 'pointer', padding: '0.3rem 0.4rem',
                borderRadius: '6px', transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                border: `2px solid ${b.is_checked ? '#6366f1' : '#d1d5db'}`,
                background: b.is_checked ? '#6366f1' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s'
              }}>
                {b.is_checked && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={{
                color: b.is_checked ? '#9ca3af' : '#374151',
                textDecoration: b.is_checked ? 'line-through' : 'none',
                transition: 'all 0.15s'
              }}>
                {b.title}
              </span>
            </div>
          ))}

          <div style={{ marginTop: '0.75rem', height: '6px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '3px',
              background: percent === 100 ? '#10b981' : '#6366f1',
              width: `${percent}%`,
              transition: 'width 0.3s ease, background 0.3s ease'
            }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.3rem', textAlign: 'right' }}>
            {checkedCount}/{totalCount} steps done
          </div>
        </div>
      )}

      {/* Assignment section */}
      <div style={{ marginTop: '1rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Assigned</span>
            <div style={{ display: 'flex' }}>
            {assignments.filter(a => a?.profiles).slice(0, 4).map((a, i) => (
              <UserAvatar key={a.id} profile={a.profiles} index={i} total={assignments.length} />
            ))}
              {assignments.length > 4 && (
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: '#e5e7eb', color: '#6b7280',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 600,
                  border: '2px solid white', marginLeft: '-6px'
                }}>
                  +{assignments.length - 4}
                </div>
              )}
            </div>
          </div>
          {userRole !== 'intern' && (
          <button
            onClick={() => { setShowAssign(!showAssign); if (!showAssign) loadUsers() }}
            style={{
              fontSize: '0.8rem', padding: '0.3rem 0.75rem',
              background: showAssign ? '#f3f4f6' : '#6366f1',
              color: showAssign ? '#6b7280' : 'white',
              border: 'none', borderRadius: '6px', cursor: 'pointer'
            }}
          >
            {showAssign ? 'Close' : '+ Assign'}
          </button>
          )}
        </div>

        {showAssign && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {users.map(user => {
              const isAssigned = assignments.some(a => a.profiles?.id === user.id || a.user_id === user.id)
              return (
                <UserPill
                  key={user.id}
                  user={user}
                  isAssigned={isAssigned}
                  onClick={() => toggleAssignment(user)}
                  showAssignState={true}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Review section */}
      <div style={{ marginTop: '1rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Review</span>
            {review && (
              <span style={{
                fontSize: '0.85rem', fontWeight: 700,
                color: scoreColor(review.score),
                background: scoreColor(review.score) + '15',
                padding: '0.1rem 0.5rem', borderRadius: '20px'
              }}>
                {review.score}/10
              </span>
            )}
          </div>
          {userRole !== 'intern' && (
          <button
            onClick={() => setShowReview(!showReview)}
            style={{
              fontSize: '0.8rem', padding: '0.3rem 0.75rem',
              background: showReview ? '#f3f4f6' : '#6366f1',
              color: showReview ? '#6b7280' : 'white',
              border: 'none', borderRadius: '6px', cursor: 'pointer'
            }}
          >
            {review ? 'Edit review' : '+ Add review'}
          </button>
          )}
        </div>

        {review && !showReview && review.notes && (
          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem', fontStyle: 'italic' }}>
            "{review.notes}"
          </p>
        )}

        {showReview && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.5rem', color: '#374151' }}>
                Score: <span style={{ color: scoreColor(score), fontWeight: 700 }}>{score}/10</span>
              </div>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button
                    key={n}
                    onClick={() => setScore(n)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '6px',
                      border: `2px solid ${score === n ? scoreColor(n) : '#e5e7eb'}`,
                      background: score === n ? scoreColor(n) : 'white',
                      color: score === n ? 'white' : '#6b7280',
                      fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add review notes..."
              rows={2}
              style={{
                width: '100%', padding: '0.6rem 0.75rem',
                border: '1px solid #e5e7eb', borderRadius: '8px',
                fontSize: '0.85rem', resize: 'vertical',
                boxSizing: 'border-box', marginBottom: '0.75rem'
              }}
            />

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={saveReview}
                disabled={savingReview || score === 0}
                style={{
                  padding: '0.5rem 1rem', background: '#6366f1', color: 'white',
                  border: 'none', borderRadius: '8px', fontSize: '0.85rem',
                  cursor: score === 0 ? 'not-allowed' : 'pointer',
                  opacity: score === 0 ? 0.6 : 1
                }}
              >
                {savingReview ? 'Saving...' : 'Save review'}
              </button>
              <button
                onClick={() => setShowReview(false)}
                style={{
                  padding: '0.5rem 1rem', background: 'transparent',
                  border: '1px solid #e5e7eb', borderRadius: '8px',
                  fontSize: '0.85rem', cursor: 'pointer', color: '#6b7280'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function UserAvatar({ profile, index, total }) {
  const [hover, setHover] = useState(false)
  const [workload, setWorkload] = useState(null)

  const [lastFetched, setLastFetched] = useState(null)

  const loadWorkload = async () => {
  const now = Date.now()
  if (lastFetched && now - lastFetched < 3000) return
  const { data } = await supabase
    .from('task_assignments')
    .select('tasks(id, title, area_id, areas(name, color), breakdowns(*))')
    .eq('user_id', profile.id)
  
  // Filter out fully completed tasks
  const incomplete = (data || []).filter(a => {
    const task = a.tasks
    if (!task) return false
    const total = task.breakdowns?.length || 0
    const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
    if (total === 0) return true
    return checked < total
  })

  setWorkload(incomplete)
  setLastFetched(now)
}

  return (
    <div
      style={{ position: 'relative', marginLeft: index > 0 ? '-6px' : '0', zIndex: total - index }}
      onMouseEnter={() => { setHover(true); loadWorkload() }}
      onMouseLeave={() => setHover(false)}
    >
      {/* Avatar circle */}
      <div style={{
        width: '24px', height: '24px', borderRadius: '50%',
        background: '#6366f1', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.7rem', fontWeight: 600,
        border: '2px solid white', cursor: 'pointer'
      }}>
        {profile?.full_name?.charAt(0).toUpperCase() || '?'}
      </div>

      {/* Hover pill */}
      {hover && (
        <div style={{
          position: 'absolute', bottom: '130%', left: '50%',
          transform: 'translateX(-50%)',
          background: 'white', border: '1px solid #e5e7eb',
          borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          padding: '0.75rem', minWidth: '220px', maxWidth: '280px',
          zIndex: 999
        }}>
          {/* Arrow */}
          <div style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid white'
          }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: '#6366f1', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 600, flexShrink: 0
            }}>
              {profile?.full_name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{profile?.full_name}</div>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{workload ? `${workload.length} task${workload.length !== 1 ? 's' : ''}` : 'Loading...'}</div>
            </div>
          </div>

          {/* Task list */}
          {!workload ? (
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', padding: '0.5rem' }}>Loading...</div>
          ) : workload.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', padding: '0.5rem' }}>No tasks assigned</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {workload.map(a => {
                const task = a.tasks
                if (!task) return null
                const total = task.breakdowns?.length || 0
                const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
                const percent = total > 0 ? Math.round((checked / total) * 100) : 0
                const color = task.areas?.color || '#6366f1'

                return (
                  <div key={task.id} style={{
                    padding: '0.5rem 0.6rem',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${color}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#111827' }}>{task.title}</span>
                      <span style={{
                        fontSize: '0.7rem', padding: '0.1rem 0.4rem',
                        background: color + '20', color: color,
                        borderRadius: '10px', fontWeight: 600, flexShrink: 0
                      }}>
                        {task.areas?.name}
                      </span>
                    </div>
                    {total > 0 && (
                      <div>
                        <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: '2px',
                            background: percent === 100 ? '#10b981' : color,
                            width: `${percent}%`,
                            transition: 'width 0.3s'
                          }} />
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                          {percent}% complete
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
