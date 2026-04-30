import { useState, useEffect } from 'react'
import { fetchUserAreas, updateUser, createUser } from './api'

// ─── Add / Edit user modal ───────────────────────────────────────────────────
export default function UserModal({ editingUser, areas, onClose, onSaved }) {
  const [fullName, setFullName] = useState(editingUser?.full_name || '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(editingUser?.role || 'intern')
  const [selectedAreas, setSelectedAreas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editingUser) fetchUserAreas(editingUser.id).then(setSelectedAreas)
  }, [editingUser])

  const toggleArea = (areaId) => {
    setSelectedAreas(prev =>
      prev.includes(areaId)
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    )
  }

  const handleSave = async () => {
    if (!fullName) return
    setLoading(true)
    setError('')

    if (editingUser) {
      const result = await updateUser(editingUser.id, {
        fullName, role, areaIds: selectedAreas,
      })
      if (result.error) { setError(result.error); setLoading(false); return }
    } else {
      if (!email || !password) { setError('Email and password required'); setLoading(false); return }
      const result = await createUser({
        email, password, fullName, role, areaIds: selectedAreas,
      })
      if (result.error) { setError(result.error); setLoading(false); return }
    }

    onSaved()
    onClose()
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'white', borderRadius: '12px', padding: '2rem',
        width: '420px', maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{editingUser ? 'Edit User' : 'Add User'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Full Name</label>
        <input value={fullName} onChange={e => setFullName(e.target.value)}
          style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1rem', boxSizing: 'border-box' }} />

        {!editingUser && (
          <>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1rem', boxSizing: 'border-box' }} />

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1rem', boxSizing: 'border-box' }} />
          </>
        )}

        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>Role</label>
        <select value={role} onChange={e => setRole(e.target.value)}
          style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1rem', boxSizing: 'border-box' }}>
          <option value="intern">Intern</option>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>

        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem' }}>Business Areas</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {areas.map(area => (
            <div
              key={area.id}
              onClick={() => toggleArea(area.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.4rem 0.75rem', borderRadius: '20px',
                cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                border: `2px solid ${selectedAreas.includes(area.id) ? area.color : '#e5e7eb'}`,
                background: selectedAreas.includes(area.id) ? area.color + '15' : 'white',
                color: selectedAreas.includes(area.id) ? area.color : '#6b7280',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: area.color }} />
              {area.name}
            </div>
          ))}
        </div>

        <button onClick={handleSave} disabled={loading}
          style={{ width: '100%', padding: '0.75rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer' }}>
          {loading ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
        </button>
      </div>
    </div>
  )
}
