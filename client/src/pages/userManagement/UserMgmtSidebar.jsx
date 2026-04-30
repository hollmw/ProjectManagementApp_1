import { useNavigate } from 'react-router-dom'

// ─── Slim left sidebar for the User Management page ──────────────────────────
export default function UserMgmtSidebar() {
  const navigate = useNavigate()

  return (
    <div style={{
      width: '260px', background: 'white',
      borderRight: '1px solid #e5e7eb',
      display: 'flex', flexDirection: 'column',
      padding: '1.5rem 1rem',
    }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>WorkSpace</h2>
      <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '2rem' }}>Project Management</p>

      <div
        onClick={() => navigate('/dashboard')}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.5rem 0.75rem', borderRadius: '8px',
          marginBottom: '0.25rem', cursor: 'pointer', fontSize: '0.9rem',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        📋 Task Board
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        padding: '0.5rem 0.75rem', borderRadius: '8px',
        marginBottom: '0.25rem', cursor: 'pointer', fontSize: '0.9rem',
        background: '#ede9fe', color: '#7c3aed', fontWeight: 500,
      }}>
        User Management
      </div>
    </div>
  )
}
