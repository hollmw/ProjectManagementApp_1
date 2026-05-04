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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' }}>
        <img
          src="/logo.png"
          alt="DRESIO"
          style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }}
        />
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>WorkSpace</div>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Project Management</div>
        </div>
      </div>

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
