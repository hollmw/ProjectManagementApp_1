import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { logActivity, awardPerfectReviewBadge } from '../../utils/logActivity'
import { scoreColor } from './helpers'

// ─── Review block: display existing review or open editor ─────────────────────
export default function ReviewSection({ task, userRole, onReviewSaved }) {
  const [review, setReview] = useState(task.reviews?.[0] || null)
  const [showReview, setShowReview] = useState(false)
  const [score, setScore] = useState(task.reviews?.[0]?.score || 0)
  const [notes, setNotes] = useState(task.reviews?.[0]?.notes || '')
  const [savingReview, setSavingReview] = useState(false)

  useEffect(() => {
    setReview(task.reviews?.[0] || null)
    setScore(task.reviews?.[0]?.score || 0)
    setNotes(task.reviews?.[0]?.notes || '')
  }, [task.reviews])

  const saveReview = async () => {
    setSavingReview(true)
    const { data: { user } } = await supabase.auth.getUser()
    await logActivity(user.id, `Reviewed task "${task.title}" — scored ${score}/10`, task.id, 5)
    if (review) {
      const { data } = await supabase
        .from('reviews').update({ score, notes }).eq('id', review.id)
        .select().single()
      setReview(data)
      if (data) onReviewSaved(task.id, data)
      if (score === 10) await awardPerfectReviewBadge(task.id)
    } else {
      const { data } = await supabase
        .from('reviews')
        .insert({ task_id: task.id, score, notes, reviewed_by: user.id })
        .select().single()
      setReview(data)
      if (data) onReviewSaved(task.id, data)
      if (score === 10) await awardPerfectReviewBadge(task.id)
    }
    setSavingReview(false)
    setShowReview(false)
  }

  return (
    <div style={{ marginTop: '1rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Review</span>
          {review && (
            <span style={{
              fontSize: '0.85rem', fontWeight: 700,
              color: scoreColor(review.score),
              background: scoreColor(review.score) + '15',
              padding: '0.1rem 0.5rem', borderRadius: '20px',
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
              border: 'none', borderRadius: '6px', cursor: 'pointer',
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
                    transition: 'all 0.15s',
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
              boxSizing: 'border-box', marginBottom: '0.75rem',
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
                opacity: score === 0 ? 0.6 : 1,
              }}
            >
              {savingReview ? 'Saving...' : 'Save review'}
            </button>
            <button
              onClick={() => setShowReview(false)}
              style={{
                padding: '0.5rem 1rem', background: 'transparent',
                border: '1px solid #e5e7eb', borderRadius: '8px',
                fontSize: '0.85rem', cursor: 'pointer', color: '#6b7280',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
