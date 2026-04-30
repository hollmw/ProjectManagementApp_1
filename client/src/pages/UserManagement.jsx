import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

import UserMgmtSidebar from './userManagement/UserMgmtSidebar'
import UsersTable from './userManagement/UsersTable'
import UserModal from './userManagement/UserModal'
import { fetchAllUsers, fetchAllAreas } from './userManagement/api'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [areas, setAreas] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const refreshUsers = async () => {
    setUsers(await fetchAllUsers())
    setLoading(false)
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      await refreshUsers()
      setAreas(await fetchAllAreas())
    }
    init()
  }, [])

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f3f4f6' }}>
      <UserMgmtSidebar />

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
              fontWeight: 500, cursor: 'pointer',
            }}
          >
            + Add User
          </button>
        </div>

        <UsersTable
          users={users}
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
