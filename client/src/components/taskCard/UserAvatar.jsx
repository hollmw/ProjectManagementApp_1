import { useState } from 'react'
import { supabase } from '../../supabase'

// ─── Stacked-avatar with on-hover workload tooltip ───────────────────────────
export default function UserAvatar({ profile, index, total }) {
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

    const incomplete = (data || []).filter(a => {
      const task = a.tasks
      if (!task) return false
      const t = task.breakdowns?.length || 0
      const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
      if (t === 0) return true
      return checked < t
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
      <div style={{
        width: '24px', height: '24px', borderRadius: '50%',
        background: '#6366f1', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.7rem', fontWeight: 600,
        border: '2px solid white', cursor: 'pointer',
      }}>
        {profile?.full_name?.charAt(0).toUpperCase() || '?'}
      </div>

      {hover && (
        <div style={{
          position: 'absolute', bottom: '130%', left: '50%',
          transform: 'translateX(-50%)',
          background: 'white', border: '1px solid #e5e7eb',
          borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          padding: '0.75rem', minWidth: '220px', maxWidth: '280px',
          zIndex: 999,
        }}>
          <div style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid white',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: '#6366f1', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 600, flexShrink: 0,
            }}>
              {profile?.full_name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{profile?.full_name}</div>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                {workload ? `${workload.length} task${workload.length !== 1 ? 's' : ''}` : 'Loading...'}
              </div>
            </div>
          </div>

          {!workload ? (
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', padding: '0.5rem' }}>Loading...</div>
          ) : workload.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', padding: '0.5rem' }}>No tasks assigned</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {workload.map(a => {
                const task = a.tasks
                if (!task) return null
                const t = task.breakdowns?.length || 0
                const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
                const percent = t > 0 ? Math.round((checked / t) * 100) : 0
                const color = task.areas?.color || '#6366f1'

                return (
                  <div key={task.id} style={{
                    padding: '0.5rem 0.6rem',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${color}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#111827' }}>{task.title}</span>
                      <span style={{
                        fontSize: '0.7rem', padding: '0.1rem 0.4rem',
                        background: color + '20', color: color,
                        borderRadius: '10px', fontWeight: 600, flexShrink: 0,
                      }}>
                        {task.areas?.name}
                      </span>
                    </div>
                    {t > 0 && (
                      <div>
                        <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: '2px',
                            background: percent === 100 ? '#10b981' : color,
                            width: `${percent}%`,
                            transition: 'width 0.3s',
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
