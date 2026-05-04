import { useState, useEffect } from 'react'
import { fetchUserAreas, updateUser, createUser } from './api'

const inputStyle = {
  width: '100%', padding: '0.65rem 0.85rem',
  border: '1.5px solid #e5e7eb', borderRadius: '8px',
  fontSize: '0.9rem', boxSizing: 'border-box',
  outline: 'none', transition: 'border-color 0.15s',
}

// ─── Add / Edit user modal ────────────────────────────────────────────────────
export default function UserModal({ editingUser, areas, onClose, onSaved }) {
  const [fullName, setFullName]       = useState(editingUser?.full_name || '')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [role, setRole]               = useState(editingUser?.role || 'intern')
  const [selectedAreas, setSelectedAreas] = useState([])
  const [useInvite, setUseInvite]     = useState(true)   // default: send invite email
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  // Auto-switch invite toggle based on role
  useEffect(() => {
    setUseInvite(role === 'intern' || role === 'member')
  }, [role])

  useEffect(() => {
    if (editingUser) fetchUserAreas(editingUser.id).then(setSelectedAreas)
  }, [editingUser])

  const toggleArea = (areaId) => {
    setSelectedAreas(prev =>
      prev.includes(areaId) ? prev.filter(id => id !== areaId) : [...prev, areaId]
    )
  }

  const handleSave = async () => {
    if (!fullName.trim()) { setError('Full name is required'); return }
    setLoading(true)
    setError('')

    if (editingUser) {
      const result = await updateUser(editingUser.id, { fullName, role, areaIds: selectedAreas })
      if (result.error) { setError(result.error); setLoading(false); return }
    } else {
      if (!email) { setError('Email is required'); setLoading(false); return }
      if (!useInvite && !password) { setError('Password is required'); setLoading(false); return }
      const result = await createUser({ email, password, fullName, role, areaIds: selectedAreas, useInvite })
      if (result.error) { setError(result.error); setLoading(false); return }
    }

    onSaved()
    onClose()
    setLoading(false)
  }

  const roleColors = { intern: '#f59e0b', member: '#6366f1', admin: '#10b981' }
  const roleColor = roleColors[role] || '#6b7280'

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(2px)',
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', padding: '2rem',
        width: '440px', maxHeight: '88vh', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              {editingUser ? 'Edit User' : 'Add User'}
            </h2>
            {!editingUser && (
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                Fill in details and choose how they'll get access
              </p>
            )}
          </div>
          <button onClick={onClose} style={{
            background: '#f1f5f9', border: 'none', width: '32px', height: '32px',
            borderRadius: '8px', cursor: 'pointer', color: '#64748b', fontSize: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2', color: '#dc2626', padding: '0.75rem 1rem',
            borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem',
            border: '1px solid #fecaca', display: 'flex', gap: '0.5rem', alignItems: 'center',
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Full Name */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
            Full Name
          </label>
          <input
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Jane Smith"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#6366f1'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
        </div>

        {/* Role */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
            Role
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['intern', 'member', 'admin'].map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                style={{
                  flex: 1, padding: '0.55rem 0',
                  borderRadius: '8px', border: `2px solid ${role === r ? roleColors[r] : '#e5e7eb'}`,
                  background: role === r ? roleColors[r] + '15' : 'white',
                  color: role === r ? roleColors[r] : '#6b7280',
                  fontSize: '0.85rem', fontWeight: 600,
                  cursor: 'pointer', textTransform: 'capitalize',
                  transition: 'all 0.15s',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Email + access method (new users only) */}
        {!editingUser && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jane@dresio.com"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />

            {/* Invite toggle */}
            <div style={{
              marginTop: '0.85rem', display: 'flex', gap: '0.5rem',
            }}>
              {/* Invite option */}
              <button
                type="button"
                onClick={() => setUseInvite(true)}
                style={{
                  flex: 1, padding: '0.75rem',
                  borderRadius: '10px',
                  border: `2px solid ${useInvite ? '#6366f1' : '#e5e7eb'}`,
                  background: useInvite ? '#eef2ff' : 'white',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: useInvite ? '#6366f1' : '#374151', marginBottom: '0.2rem' }}>
                  ✉ Send invite email
                </div>
                <div style={{ fontSize: '0.72rem', color: useInvite ? '#818cf8' : '#94a3b8', lineHeight: 1.4 }}>
                  They'll set their own password via a secure link
                </div>
              </button>

              {/* Password option */}
              <button
                type="button"
                onClick={() => setUseInvite(false)}
                style={{
                  flex: 1, padding: '0.75rem',
                  borderRadius: '10px',
                  border: `2px solid ${!useInvite ? '#6366f1' : '#e5e7eb'}`,
                  background: !useInvite ? '#eef2ff' : 'white',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: !useInvite ? '#6366f1' : '#374151', marginBottom: '0.2rem' }}>
                  🔑 Set password
                </div>
                <div style={{ fontSize: '0.72rem', color: !useInvite ? '#818cf8' : '#94a3b8', lineHeight: 1.4 }}>
                  Create account with a password you define
                </div>
              </button>
            </div>

            {/* Password field (only when not inviting) */}
            {!useInvite && (
              <div style={{ marginTop: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            )}

            {/* Invite info banner */}
            {useInvite && email && (
              <div style={{
                marginTop: '0.85rem', padding: '0.65rem 0.85rem',
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: '8px', fontSize: '0.78rem', color: '#15803d',
                display: 'flex', gap: '0.4rem', alignItems: 'flex-start',
              }}>
                <span>✓</span>
                <span>An invite email will be sent to <strong>{email}</strong>. They'll set their own password and land straight on the dashboard.</span>
              </div>
            )}
          </div>
        )}

        {/* Business Areas */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
            Business Areas
            <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: '0.4rem' }}>
              {role === 'intern' ? '(interns only see tasks in their area)' : '(optional)'}
            </span>
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {areas.map(area => (
              <div
                key={area.id}
                onClick={() => toggleArea(area.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.4rem 0.85rem', borderRadius: '20px',
                  cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500,
                  border: `2px solid ${selectedAreas.includes(area.id) ? area.color : '#e5e7eb'}`,
                  background: selectedAreas.includes(area.id) ? area.color + '15' : 'white',
                  color: selectedAreas.includes(area.id) ? area.color : '#6b7280',
                  transition: 'all 0.15s',
                  userSelect: 'none',
                }}
              >
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: area.color, flexShrink: 0 }} />
                {area.name}
              </div>
            ))}
          </div>
          {role === 'intern' && selectedAreas.length === 0 && (
            <p style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.5rem' }}>
              ⚠ Select at least one area so this intern can see tasks
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '0.75rem', background: 'white',
            border: '1.5px solid #e5e7eb', borderRadius: '8px',
            fontSize: '0.9rem', cursor: 'pointer', color: '#6b7280', fontWeight: 500,
          }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading} style={{
            flex: 2, padding: '0.75rem',
            background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '0.9rem', fontWeight: 600, cursor: loading ? 'default' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 12px rgba(99,102,241,0.3)',
          }}>
            {loading
              ? (useInvite ? 'Sending invite…' : 'Creating…')
              : editingUser
                ? 'Save Changes'
                : useInvite ? '✉ Send Invite' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  )
}
