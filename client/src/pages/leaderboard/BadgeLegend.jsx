import { BADGES } from './badges'

// ─── Footer card explaining what each badge means ────────────────────────────
export default function BadgeLegend() {
  return (
    <div style={{ marginTop: '1.5rem', background: 'white', borderRadius: '14px', border: '1px solid #f1f5f9', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>
        Badge Guide
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        {Object.entries(BADGES).map(([key, badge]) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.4rem 0.75rem', borderRadius: '20px',
            background: badge.color + '15', border: `1px solid ${badge.color}30`,
          }}>
            <span style={{ fontSize: '1rem' }}>{badge.icon}</span>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: badge.color }}>{badge.label}</div>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{badge.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
