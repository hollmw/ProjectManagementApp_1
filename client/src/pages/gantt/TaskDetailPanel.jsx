import { useState } from 'react'

// ─── Task Detail Panel ─────────────────────────────────────────────────────────
// Right-hand drawer with Activity / Schedule tabs.
export default function TaskDetailPanel({ task, activityLog, onClose, onOpenScheduler, timeAgo }) {
  const [activeTab, setActiveTab] = useState('activity')
  const color = task.areas?.color || '#6366f1'
  const total = task.breakdowns?.length || 0
  const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
  const percent = total > 0 ? Math.round((checked / total) * 100) : 0

  const scheduledBreakdowns = (task.breakdowns || [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 900,
          background: 'transparent',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0,
        width: '380px', background: 'white',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
        zIndex: 950, display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid #e5e7eb',
      }}>
        {/* Panel header */}
        <div style={{
          padding: '1.25rem 1.25rem 0',
          borderBottom: '1px solid #f1f5f9',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {task.title}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.15rem' }}>
                  {task.areas?.name}
                  {task.start_date && ` · ${new Date(task.start_date).toLocaleDateString('default', { day: 'numeric', month: 'short' })}`}
                  {task.due_date && ` → ${new Date(task.due_date).toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{
              background: '#f3f4f6', border: 'none', borderRadius: '8px',
              width: '30px', height: '30px', cursor: 'pointer', fontSize: '0.9rem',
              color: '#6b7280', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>

          {/* Progress bar */}
          {total > 0 && (
            <div style={{ marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Progress</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color }}>
                  {checked}/{total} steps · {percent}%
                </span>
              </div>
              <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '3px', background: color, width: `${percent}%`, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {['activity', 'schedule'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.45rem 1rem',
                  border: 'none', borderRadius: '8px 8px 0 0',
                  fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                  background: activeTab === tab ? color : 'transparent',
                  color: activeTab === tab ? 'white' : '#9ca3af',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {tab === 'activity' ? 'Recent Activity' : 'Schedule'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>

          {/* Activity tab */}
          {activeTab === 'activity' && (
            <div>
              {(!activityLog || activityLog.length === 0) ? (
                <div style={{ textAlign: 'center', color: '#d1d5db', padding: '2rem 0' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🕐</div>
                  <div style={{ fontSize: '0.82rem' }}>No activity recorded yet</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activityLog.map((log, i) => (
                    <div key={log.id} style={{
                      padding: '0.75rem',
                      background: i === 0 ? color + '08' : '#f8fafc',
                      borderRadius: '10px',
                      border: `1px solid ${i === 0 ? color + '20' : '#f1f5f9'}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: color }}>
                          {log.profiles?.full_name || 'Unknown'}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{timeAgo(log.created_at)}</span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#374151', margin: 0, lineHeight: 1.4 }}>
                        {log.action}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Schedule tab */}
          {activeTab === 'schedule' && (
            <div>
              {scheduledBreakdowns.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#d1d5db', padding: '2rem 0' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📋</div>
                  <div style={{ fontSize: '0.82rem' }}>No breakdown steps yet</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {scheduledBreakdowns.map(b => {
                    const hasSchedule = b.start_date && b.end_date
                    return (
                      <div key={b.id} style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        padding: '0.6rem 0.75rem', borderRadius: '10px',
                        background: b.is_checked ? '#f0fdf4' : hasSchedule ? '#f8fafc' : '#fffbeb',
                        border: `1px solid ${b.is_checked ? '#bbf7d0' : hasSchedule ? '#e5e7eb' : '#fde68a'}`,
                      }}>
                        <div style={{
                          width: '8px', height: '8px', borderRadius: '2px', flexShrink: 0,
                          background: b.is_checked ? '#10b981' : hasSchedule ? color : '#f59e0b',
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.8rem',
                            color: b.is_checked ? '#6b7280' : '#374151',
                            textDecoration: b.is_checked ? 'line-through' : 'none',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {b.is_checked ? '✓ ' : ''}{b.title}
                          </div>
                          {hasSchedule && (
                            <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.1rem' }}>
                              {new Date(b.start_date).toLocaleDateString('default', { day: 'numeric', month: 'short' })}
                              {' – '}
                              {new Date(b.end_date).toLocaleDateString('default', { day: 'numeric', month: 'short' })}
                            </div>
                          )}
                        </div>
                        {!hasSchedule && (
                          <span style={{ fontSize: '0.65rem', color: '#f59e0b', flexShrink: 0 }}>not scheduled</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <button
                onClick={onOpenScheduler}
                style={{
                  width: '100%', padding: '0.65rem',
                  background: color, border: 'none', borderRadius: '10px',
                  color: 'white', fontSize: '0.82rem', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {scheduledBreakdowns.length === 0 ? 'Add Schedule' : 'Edit Schedule'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
