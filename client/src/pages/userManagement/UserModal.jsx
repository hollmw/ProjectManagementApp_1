import { useState, useEffect } from 'react'
import { fetchUserAreas, updateUser, createUser } from './api'
import { ROLE_COLOR_MAP as roleColors } from '../../utils/colors'

const inputStyle = {
  width: '100%', padding: '0.65rem 0.85rem',
  border: '1.5px solid #e5e7eb', borderRadius: '8px',
  fontSize: '0.9rem', boxSizing: 'border-box',
  outline: 'none', transition: 'border-color 0.15s',
}

export default function UserModal({ editingUser, areas, onClose, onSaved }) {
  const [fullName, setFullName]               = useState(editingUser?.full_name || '')
  const [email, setEmail]                     = useState('')
  const [password, setPassword]               = useState('')
  const [showPassword, setShowPassword]       = useState(false)
  const [role, setRole]                       = useState(editingUser?.role || 'intern')
  const [selectedAreas, setSelectedAreas]     = useState([])
  const [internStartDate, setInternStartDate] = useState(editingUser?.intern_start_date || '')
  const [internEndDate, setInternEndDate]     = useState(editingUser?.intern_end_date || '')
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState('')

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
      const result = await updateUser(editingUser.id, { fullName, role, areaIds: selectedAreas, internStartDate, internEndDate })
      if (result.error) { setError(result.error); setLoading(false); return }
    } else {
      if (!email) { setError('Email is required'); setLoading(false); return }
      if (!password) { setError('Password is required'); setLoading(false); return }
      const result = await createUser({ email, password, fullName, role, areaIds: selectedAreas, internStartDate, internEndDate })
      if (result.error) { setError(result.error); setLoading(false); return }
    }

    onSaved()
    onClose()
    setLoading(false)
  }

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
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
            {editingUser ? 'Edit User' : 'Add User'}
          </h2>
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
                  borderRadius: '8px',
                  border: `2px solid ${role === r ? roleColors[r] : '#e5e7eb'}`,
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

        {/* Email + Password (new users only) */}
        {!editingUser && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jane@example.com"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  style={{ ...inputStyle, paddingRight: '3.5rem' }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#94a3b8', fontSize: '0.78rem',
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Business Areas */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
            Business Areas
            {role === 'intern' && (
              <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: '0.4rem' }}>
                (interns only see tasks in their area)
              </span>
            )}
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
                  transition: 'all 0.15s', userSelect: 'none',
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

        {/* Intern placement dates — only shown when role is intern */}
        {role === 'intern' && (
          <div style={{ marginBottom: '1.5rem', padding: '0.85rem 1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#92400e', marginBottom: '0.65rem' }}>
              📅 Placement Period
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>Start Date</label>
                <input
                  type="date"
                  value={internStartDate}
                  onChange={e => setInternStartDate(e.target.value)}
                  style={{ ...inputStyle, fontSize: '0.85rem' }}
                  onFocus={e => e.target.style.borderColor = '#f59e0b'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>End Date</label>
                <input
                  type="date"
                  value={internEndDate}
                  onChange={e => setInternEndDate(e.target.value)}
                  style={{ ...inputStyle, fontSize: '0.85rem' }}
                  onFocus={e => e.target.style.borderColor = '#f59e0b'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>
          </div>
        )}

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
            {loading ? 'Saving…' : editingUser ? 'Save Changes' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  )
}
