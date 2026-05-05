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

  const [users,       setUsers]       = useState([])
  const [areas,       setAreas]       = useState([])
  const [showModal,   setShowModal]   = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [loading,     setLoading]     = useState(true)

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
              fontWeight: 500, cursor: 'pointer',
            }}
          >
            + Add User
          </button>
        </div>

        <UsersTable
          users={users}
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
