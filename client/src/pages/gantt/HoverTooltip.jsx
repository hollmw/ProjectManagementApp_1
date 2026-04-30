// ─── Floating tooltip shown on task-bar hover ─────────────────────────────────
export default function HoverTooltip({ task, position, activityLog, timeAgo }) {
  if (!task) return null
  const color = task.areas?.color || '#6366f1'
  const total = task.breakdowns?.length || 0
  const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
  const percent = total > 0 ? Math.round((checked / total) * 100) : 0

  return (
    <div style={{
      position: 'fixed', left: position.x + 16, top: position.y - 10,
      background: 'white', border: '1px solid #e5e7eb',
      borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      padding: '1rem', minWidth: '240px', maxWidth: '300px',
      zIndex: 9999, pointerEvents: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>{task.title}</div>
          <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
            {task.start_date && `${new Date(task.start_date).toLocaleDateString()} → `}
            {task.areas?.name} · Due {new Date(task.due_date).toLocaleDateString()}
          </div>
        </div>
      </div>

      {total > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Breakdown</span>
            <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
              {checked}/{total}
            </span>
          </div>
          <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.4rem' }}>
            <div style={{
              height: '100%', borderRadius: '3px',
              background: color,
              width: `${percent}%`,
            }} />
          </div>
          {task.breakdowns.slice(0, 4).map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', marginBottom: '0.2rem' }}>
              <div style={{
                width: '12px', height: '12px', borderRadius: '3px', flexShrink: 0, marginTop: '1px',
                background: b.is_checked ? color : 'white',
                border: `1.5px solid ${b.is_checked ? color : '#d1d5db'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {b.is_checked && <svg width="7" height="7" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: b.is_checked ? '#9ca3af' : '#374151', textDecoration: b.is_checked ? 'line-through' : 'none' }}>
                  {b.title}
                </span>
                {(b.start_date || b.end_date) && (
                  <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.1rem' }}>
                    {b.start_date && new Date(b.start_date).toLocaleDateString('default', { day: 'numeric', month: 'short' })}
                    {b.start_date && b.end_date && ' – '}
                    {b.end_date && new Date(b.end_date).toLocaleDateString('default', { day: 'numeric', month: 'short' })}
                  </div>
                )}
              </div>
            </div>
          ))}
          {total > 4 && (
            <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.2rem' }}>
              +{total - 4} more steps
            </div>
          )}
        </div>
      )}

      {activityLog?.length > 0 && (
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Recent Activity</div>
          {activityLog.map(log => (
            <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#374151', flex: 1, paddingRight: '0.5rem' }}>
                <span style={{ fontWeight: 500 }}>{log.profiles?.full_name?.split(' ')[0]}</span> — {log.action.length > 35 ? log.action.slice(0, 35) + '…' : log.action}
              </span>
              <span style={{ fontSize: '0.68rem', color: '#9ca3af', flexShrink: 0 }}>{timeAgo(log.created_at)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{
        marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid #f1f5f9',
        fontSize: '0.7rem', color: '#9ca3af', fontStyle: 'italic',
      }}>
        Click bar to view activity & schedule
      </div>
    </div>
  )
}
