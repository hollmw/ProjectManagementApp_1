import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

export default function ActivityLog() {
  const [logs, setLogs] = useState([])
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('all')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      await fetchUsers()
      await fetchLogs()
    }
    init()
  }, [])

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .order('full_name')
    setUsers(data || [])
  }

  const fetchLogs = async (userId = null) => {
    setLoading(true)
    let query = supabase
      .from('activity_log')
      .select('*, profiles(id, full_name, role), tasks(id, title, areas(name, color))')
      .order('created_at', { ascending: false })
      .limit(100)

    if (userId && userId !== 'all') {
      query = query.eq('user_id', userId)
    }

    const { data } = await query
    setLogs(data || [])
    setLoading(false)
  }

  const handleUserChange = (userId) => {
    setSelectedUser(userId)
    fetchLogs(userId)
  }

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date + 'Z')) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const getActionIcon = (action) => {
    if (action.includes('Completed')) return { icon: '✓', bg: '#d1fae5', color: '#059669' }
    if (action.includes('Unchecked')) return { icon: '○', bg: '#fee2e2', color: '#dc2626' }
    if (action.includes('Reviewed')) return { icon: '★', bg: '#fef3c7', color: '#d97706' }
    if (action.includes('date') || action.includes('Date') || action.includes('scheduled') || action.includes('deadline')) {
      return { icon: '📅', bg: '#ede9fe', color: '#7c3aed' }
    }
    return { icon: '·', bg: '#f3f4f6', color: '#6b7280' }
  }

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
          Task Board
        </div>

        <div
          onClick={() => navigate('/users')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            padding: '0.5rem 0.75rem', borderRadius: '8px',
            marginBottom: '0.25rem', cursor: 'pointer', fontSize: '0.9rem'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          User Management
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.5rem 0.75rem', borderRadius: '8px',
          marginBottom: '0.25rem', cursor: 'pointer', fontSize: '0.9rem',
          background: '#ede9fe', color: '#7c3aed', fontWeight: 500
        }}>
          Activity Log
        </div>

        {/* User filter */}
        <div style={{ marginTop: '1.5rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Filter by user
          </p>
          <div
            onClick={() => handleUserChange('all')}
            style={{
              padding: '0.5rem 0.75rem', borderRadius: '8px',
              marginBottom: '0.25rem', cursor: 'pointer', fontSize: '0.9rem',
              background: selectedUser === 'all' ? '#f3f4f6' : 'transparent',
              fontWeight: selectedUser === 'all' ? 600 : 400
            }}
          >
            All users
          </div>
          {users.map(user => (
            <div
              key={user.id}
              onClick={() => handleUserChange(user.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.5rem 0.75rem', borderRadius: '8px',
                marginBottom: '0.25rem', cursor: 'pointer', fontSize: '0.85rem',
                background: selectedUser === user.id ? '#ede9fe' : 'transparent',
                color: selectedUser === user.id ? '#7c3aed' : 'inherit'
              }}
              onMouseEnter={e => { if (selectedUser !== user.id) e.currentTarget.style.background = '#f3f4f6' }}
              onMouseLeave={e => { if (selectedUser !== user.id) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: '#6366f1', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: 600, flexShrink: 0
              }}>
                {user.full_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 500 }}>{user.full_name}</div>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{user.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Activity Log</h1>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
            {selectedUser === 'all' ? 'All user activity' : `Activity for ${users.find(u => u.id === selectedUser)?.full_name}`}
          </p>
        </div>

        {loading ? (
          <div style={{ color: '#9ca3af', padding: '2rem', textAlign: 'center' }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{
            background: 'white', borderRadius: '12px', padding: '2rem',
            textAlign: 'center', color: '#9ca3af', border: '1px solid #e5e7eb'
          }}>
            No activity yet
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {logs.map((log, i) => {
              const { icon, bg, color } = getActionIcon(log.action)
              return (
                <div
                  key={log.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '1rem',
                    padding: '1rem 1.25rem',
                    borderBottom: i < logs.length - 1 ? '1px solid #f3f4f6' : 'none'
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: bg, color: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: 700, flexShrink: 0
                  }}>
                    {icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>
                          {log.profiles?.full_name}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}> — {log.action}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                        {log.points_earned > 0 && (
                          <span style={{
                            fontSize: '0.75rem', padding: '0.15rem 0.5rem',
                            background: '#fef3c7', color: '#d97706',
                            borderRadius: '20px', fontWeight: 600
                          }}>
                            +{log.points_earned} pts
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          {timeAgo(log.created_at)}
                        </span>
                      </div>
                    </div>
                    {log.tasks && (
                      <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{
                          fontSize: '0.75rem', padding: '0.1rem 0.5rem',
                          background: (log.tasks.areas?.color || '#6366f1') + '20',
                          color: log.tasks.areas?.color || '#6366f1',
                          borderRadius: '10px', fontWeight: 500
                        }}>
                          {log.tasks.areas?.name}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{log.tasks.title}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}