import { useState } from 'react'
import { supabase } from '../supabase'

export default function TaskCard({ task, onBreakdownToggle, onDelete, onEdit }) {
  const breakdowns = [...(task.breakdowns || [])].sort((a, b) => a.order_index - b.order_index)
  const [review, setReview] = useState(task.reviews?.[0] || null)
  const [showReview, setShowReview] = useState(false)
  const [score, setScore] = useState(task.reviews?.[0]?.score || 0)
  const [notes, setNotes] = useState(task.reviews?.[0]?.notes || '')
  const [savingReview, setSavingReview] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  

  const toggleBreakdown = async (breakdown) => {
  const newChecked = !breakdown.is_checked
  onBreakdownToggle(task.id, breakdown.id, newChecked)
  await supabase
    .from('breakdowns')
    .update({ is_checked: newChecked })
    .eq('id', breakdown.id)
}

  const handleDelete = async () => {
    await supabase.from('tasks').delete().eq('id', task.id)
    onDelete(task.id)
  }

  const saveReview = async () => {
    setSavingReview(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (review) {
      const { data } = await supabase
        .from('reviews').update({ score, notes }).eq('id', review.id).select().single()
      setReview(data)
    } else {
      const { data } = await supabase
        .from('reviews').insert({ task_id: task.id, score, notes, reviewed_by: user.id }).select().single()
      setReview(data)
    }
    setSavingReview(false)
    setShowReview(false)
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
      background: 'white', borderRadius: '12px',
      padding: '1.5rem', border: '1px solid #e5e7eb',
      borderLeft: `4px solid ${task.areas?.color || '#6366f1'}`,
      position: 'relative'
    }}>
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