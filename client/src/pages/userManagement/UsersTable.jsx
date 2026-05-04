import { deleteUser } from './api'

function roleColor(role) {
  if (role === 'admin') return { bg: '#ede9fe', color: '#7c3aed' }
  if (role === 'member') return { bg: '#dbeafe', color: '#1d4ed8' }
  return { bg: '#f3f4f6', color: '#6b7280' }
}

const TH_STYLE = {
  padding: '0.75rem 1rem', textAlign: 'left',
  fontSize: '0.8rem', fontWeight: 600,
  color: '#6b7280', textTransform: 'uppercase',
}

// ─── Users table ─────────────────────────────────────────────────────────────
export default function UsersTable({ users, onEdit, onChanged }) {
  const handleDelete = async (user) => {
    if (!window.confirm(`Delete ${user.full_name}?`)) return
    const result = await deleteUser(user.id)
    if (result.error) alert(result.error)
    else onChanged()
  }

  return (
    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <th style={TH_STYLE}>User</th>
            <th style={TH_STYLE}>Role</th>
            <th style={TH_STYLE}>Area</th>
            <th style={TH_STYLE}>Points</th>
            <th style={TH_STYLE}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, i) => (
            <tr key={user.id} style={{ borderBottom: i < users.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <td style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: user.invited_at ? '#e5e7eb' : '#6366f1',
                    color: user.invited_at ? '#9ca3af' : 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: 600, flexShrink: 0,
                    border: user.invited_at ? '2px dashed #d1d5db' : 'none',
                  }}>
                    {user.full_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user.full_name || 'Unnamed'}</span>
                      {user.invited_at && (
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 600, padding: '0.15rem 0.5rem',
                          background: '#fef9c3', color: '#a16207',
                          border: '1px solid #fde68a', borderRadius: '20px',
                          letterSpacing: '0.01em',
                        }}>
                          ✉ Invite pending
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{user.email || '—'}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '1rem' }}>
                <span style={{
                  fontSize: '0.8rem', padding: '0.2rem 0.6rem',
                  background: roleColor(user.role).bg,
                  color: roleColor(user.role).color,
                  borderRadius: '20px', fontWeight: 500,
                }}>
                  {user.role}
                </span>
              </td>
              <td style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {user.user_areas?.length > 0 ? user.user_areas.map(ua => (
                    <span key={ua.area_id} style={{
                      fontSize: '0.75rem', padding: '0.2rem 0.5rem',
                      background: ua.areas.color + '20',
                      color: ua.areas.color,
                      borderRadius: '20px', fontWeight: 500,
                    }}>
                      {ua.areas.name}
                    </span>
                  )) : (
                    <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>No areas</span>
                  )}
                </div>
              </td>
              <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>
                {user.points || 0} pts
              </td>
              <td style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => onEdit(user)}
                    style={{
                      padding: '0.3rem 0.75rem', background: '#f3f4f6',
                      border: 'none', borderRadius: '6px',
                      fontSize: '0.8rem', cursor: 'pointer', color: '#374151',
                    }}
                  >
                    Edit
                  </button>
                  {user.role !== 'admin' && (
                    <button
                      onClick={() => handleDelete(user)}
                      style={{
                        padding: '0.3rem 0.75rem', background: '#fee2e2',
                        border: 'none', borderRadius: '6px',
                        fontSize: '0.8rem', cursor: 'pointer', color: '#dc2626',
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
