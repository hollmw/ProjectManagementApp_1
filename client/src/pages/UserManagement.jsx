import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import UserMgmtSidebar from './userManagement/UserMgmtSidebar'
import UsersTable from './userManagement/UsersTable'
import UserModal from './userManagement/UserModal'
import { fetchAllUsers, fetchAllAreas } from './userManagement/api'
import { useProfile } from '../contexts/ProfileContext'

export default function UserManagement() {
  const { profile, loading: profileLoading } = useProfile()
  const navigate = useNavigate()

  const [users,         setUsers]         = useState([])
  const [areas,         setAreas]         = useState([])
  const [showModal,     setShowModal]     = useState(false)
  const [editingUser,   setEditingUser]   = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [filterAreaId,      setFilterAreaId]      = useState('all')
  const [search,            setSearch]            = useState('')
  const [filterUnassigned,  setFilterUnassigned]  = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!profileLoading && !profile) navigate('/login')
  }, [profileLoading, profile, navigate])

  // Parallel initial load — users and areas have no dependency on each other
  useEffect(() => {
    if (!profile) return
    const init = async () => {
      setLoading(true)
      const [usersData, areasData] = await Promise.all([fetchAllUsers(), fetchAllAreas()])
      setUsers(usersData)
      setAreas(areasData)
      setLoading(false)
    }
    init()
  }, [profile])

  const refreshUsers = async () => {
    const usersData = await fetchAllUsers()
    setUsers(usersData)
  }

  if (profileLoading || !profile) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1a1040 100%)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px', margin: '0 auto 1rem',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem', boxShadow: '0 0 24px rgba(99,102,241,0.5)',
          animation: 'pulse 1.5s infinite',
        }}>
          {'\u{1F465}'}
        </div>
        <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading user management...</div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f3f4f6' }}>
      <UserMgmtSidebar profile={profile} />

      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 600 }}>User Management</h1>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>{users.length} users in workspace</p>
          </div>
          <button
            onClick={() => { setEditingUser(null); setShowModal(true) }}
            style={{
              padding: '0.6rem 1.2rem', background: '#6366f1', color: 'white',
              border: 'none', borderRadius: '8px', fontSize: '0.9rem',
              fontWeight: 500, cursor: 'pointer',
            }}
          >
            + Add User
          </button>
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            style={{
              padding: '0.5rem 0.85rem', border: '1px solid #e5e7eb',
              borderRadius: '8px', fontSize: '0.875rem', outline: 'none',
              width: '220px', background: 'white',
            }}
          />
          {/* Area filter */}
          <select
            value={filterAreaId}
            onChange={e => setFilterAreaId(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb',
              borderRadius: '8px', fontSize: '0.875rem', background: 'white',
              color: filterAreaId !== 'all' ? '#6366f1' : '#374151',
              fontWeight: filterAreaId !== 'all' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            <option value="all">All areas</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {/* Unassigned toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={filterUnassigned}
              onChange={e => setFilterUnassigned(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Show unassigned only
          </label>
        </div>

        <UsersTable
          users={(() => {
            let filtered = users
            if (search) filtered = filtered.filter(u =>
              u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
              u.email?.toLowerCase().includes(search.toLowerCase())
            )
            if (filterAreaId !== 'all') filtered = filtered.filter(u =>
              (u.user_areas || []).some(ua => ua.area_id === filterAreaId)
            )
            if (filterUnassigned) filtered = filtered.filter(u =>
              u.role === 'intern' && (u.assignment_count || 0) === 0
            )
            return filtered
          })()}
          loading={loading}
          onEdit={(user) => { setEditingUser(user); setShowModal(true) }}
          onChanged={refreshUsers}
        />
      </div>

      {showModal && (
        <UserModal
          editingUser={editingUser}
          areas={areas}
          onClose={() => { setShowModal(false); setEditingUser(null) }}
          onSaved={refreshUsers}
        />
      )}
    </div>
  )
}
