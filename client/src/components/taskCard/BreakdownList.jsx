// ─── Checkbox list of breakdown steps + progress bar ─────────────────────────
export default function BreakdownList({ breakdowns, onToggle }) {
  if (breakdowns.length === 0) return null
  const checkedCount = breakdowns.filter(b => b.is_checked).length
  const totalCount = breakdowns.length
  const percent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
        Breakdown — {percent}% complete
      </div>
      {breakdowns.map(b => (
        <div
          key={b.id}
          onClick={() => onToggle(b)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            marginBottom: '0.4rem', fontSize: '0.85rem',
            cursor: 'pointer', padding: '0.3rem 0.4rem',
            borderRadius: '6px', transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{
            width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
            border: `2px solid ${b.is_checked ? '#6366f1' : '#d1d5db'}`,
            background: b.is_checked ? '#6366f1' : 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}>
            {b.is_checked && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span style={{
            color: b.is_checked ? '#9ca3af' : '#374151',
            textDecoration: b.is_checked ? 'line-through' : 'none',
            transition: 'all 0.15s',
          }}>
            {b.title}
          </span>
          {(b.start_date || b.end_date) && (
            <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginLeft: 'auto' }}>
              {b.start_date && new Date(b.start_date).toLocaleDateString('default', { day: 'numeric', month: 'short' })}
              {b.start_date && b.end_date && ' – '}
              {b.end_date && new Date(b.end_date).toLocaleDateString('default', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      ))}

      <div style={{ marginTop: '0.75rem', height: '6px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: '3px',
          background: percent === 100 ? '#10b981' : '#6366f1',
          width: `${percent}%`,
          transition: 'width 0.3s ease, background 0.3s ease',
        }} />
      </div>
      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.3rem', textAlign: 'right' }}>
        {checkedCount}/{totalCount} steps done
      </div>
    </div>
  )
}
