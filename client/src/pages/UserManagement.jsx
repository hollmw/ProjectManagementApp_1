import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [areas, setAreas] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()


  const fetchUsers = async () => {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*, user_areas(area_id, areas(name, color))')
    .order('created_at', { ascending: false })

  // Get emails from auth.users
  const { data: authUsers } = await supabase
    .from('profiles')
    .select('id, email')

  const usersWithEmail = (profiles || []).map(p => ({
    ...p,
    email: p.email || authUsers?.find(u => u.id === p.id)?.email
  }))

  setUsers(usersWithEmail)
  setLoading(false)
}

const fetchAreas = async () => {
  const { data } = await supabase.from('areas').select('*')
  setAreas(data || [])
}

const handleDeleteUser = async (userId) => {
  const { data: { session } } = await supabase.auth.getSession()
  
  const response = await fetch(
    `https://zrmqhkydlxkfbydnhngb.supabase.co/functions/v1/delete-user/${userId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`
      }
    }
  )

  const result = await response.json()
  if (result.error) {
    alert(result.error)
  } else {
    fetchUsers()
  }
}   

useEffect(() => {
  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }
    await fetchUsers()
    await fetchAreas()
  }
  init()
}, [])

  const roleColor = (role) => {
    if (role === 'admin') return { bg: '#ede9fe', color: '#7c3aed' }
    if (role === 'member') return { bg: '#dbeafe', color: '#1d4ed8' }
    return { bg: '#f3f4f6', color: '#6b7280' }
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f3f4f6' }}>

      {/* Sidebar */}
      <div style={{
        width: '260px', background: 'white',
        borderRight: '1px solid #e5e7eb',
        display: 'flex', flexDirection: 'column',
        padding: '1.5rem 1rem'
      }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>WorkSpace</h2>
        <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '2rem' }}>Project Management</p>

        <div
          onClick={() => navigate('/dashboard')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            padding: '0.5rem 0.75rem', borderRadius: '8px',
            marginBottom: '0.25rem', cursor: 'pointer', fontSize: '0.9rem'
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
          background: '#ede9fe', color: '#7c3aed', fontWeight: 500
        }}>
          User Management
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 600 }}>User Management</h1>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>{users.length} users in workspace</p>
          </div>
          <button
            onClick={() => { setEditingUser(null); setShowModal(true) }}
            style={{
              padding: '0.6rem 1.2rem', background: '#6366f1', color: 'white',
              border: 'none', borderRadius: '8px', fontSize: '0.9rem',
              fontWeight: 500, cursor: 'pointer'
            }}
          >
            + Add User
          </button>
        </div>

        {/* Users table */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>User</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Role</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Area</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Points</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr key={user.id} style={{ borderBottom: i < users.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: '#6366f1', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.85rem', fontWeight: 600, flexShrink: 0
                      }}>
                        {user.full_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user.full_name || 'Unnamed'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{user.email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      fontSize: '0.8rem', padding: '0.2rem 0.6rem',
                      background: roleColor(user.role).bg,
                      color: roleColor(user.role).color,
                      borderRadius: '20px', fontWeight: 500
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
                            borderRadius: '20px', fontWeight: 500
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
                        onClick={() => { setEditingUser(user); setShowModal(true) }}
                        style={{
                          padding: '0.3rem 0.75rem', background: '#f3f4f6',
                          border: 'none', borderRadius: '6px',
                          fontSize: '0.8rem', cursor: 'pointer', color: '#374151'
                        }}
                      >
                        Edit
                      </button>
                      {user.role!='admin' && (
                      <button
                        onClick={() => {
                            if (window.confirm(`Delete ${user.full_name}?`)) {
                            handleDeleteUser(user.id)
                            }
                        }}
                        style={{
                            padding: '0.3rem 0.75rem', background: '#fee2e2',
                            border: 'none', borderRadius: '6px',
                            fontSize: '0.8rem', cursor: 'pointer', color: '#dc2626'
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
      </div>

      {/* User modal */}
      {showModal && (
        <UserModal
          editingUser={editingUser}
          areas={areas}
          onClose={() => { setShowModal(false); setEditingUser(null) }}
          onSaved={fetchUsers}
        />
      )}
    </div>
  )
}

function UserModal({ editingUser, areas, onClose, onSaved }) {
  const [fullName, setFullName] = useState(editingUser?.full_name || '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(editingUser?.role || 'intern')
  const [selectedAreas, setSelectedAreas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editingUser) {
      const fetchUserAreas = async () => {
        const { data } = await supabase
          .from('user_areas')
          .select('area_id')
          .eq('user_id', editingUser.id)
        setSelectedAreas(data?.map(d => d.area_id) || [])
      }
      fetchUserAreas()
    }
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
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, role })
      .eq('id', editingUser.id)

    if (error) { setError(error.message); setLoading(false); return }

    await supabase.from('user_areas').delete().eq('user_id', editingUser.id)
    if (selectedAreas.length > 0) {
      await supabase.from('user_areas').insert(
        selectedAreas.map(area_id => ({ user_id: editingUser.id, area_id }))
      )
    }
    onSaved()
    onClose()
  } else {
    if (!email || !password) { setError('Email and password required'); setLoading(false); return }

    const response = await fetch(
      'https://zrmqhkydlxkfbydnhngb.supabase.co/functions/v1/create-user',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          email, password,
          full_name: fullName,
          role,
          area_ids: selectedAreas
        })
      }
    )

    const result = await response.json()
    if (result.error) { setError(result.error); setLoading(false); return }
    onSaved()
    onClose()
  }

  setLoading(false)
}

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'white', borderRadius: '12px', padding: '2rem',
        width: '420px', maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
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
                transition: 'all 0.15s'
              }}
            >
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: area.color
              }} />
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