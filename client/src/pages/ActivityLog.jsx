import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'
import AppSidebar, { SidebarSection } from '../components/AppSidebar'
import { useProfile } from '../contexts/ProfileContext'
import { timeAgo } from '../utils/dateUtils'

export default function ActivityLog() {
  const { profile, loading: profileLoading } = useProfile()
  const navigate = useNavigate()

  const [logs,         setLogs]         = useState([])
  const [users,        setUsers]        = useState([])
  const [selectedUser, setSelectedUser] = useState('all')
  const [filterType,   setFilterType]   = useState('all')
  const [loading,      setLoading]      = useState(true)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!profileLoading && !profile) navigate('/login')
  }, [profileLoading, profile, navigate])

  // Defined before useEffect to avoid temporal dead zone
  async function fetchUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .order('full_name')
    setUsers(data || [])
  }

  // loading state is managed by callers so this can be used in both
  // the initial parallel load and handleUserChange
  async function fetchLogs(userId = null) {
    let query = supabase
      .from('activity_log')
      .select('*, profiles(id, full_name, role), tasks(id, title, areas(name, color))')
      .order('created_at', { ascending: false })
      .limit(500)
    if (userId && userId !== 'all') {
      query = query.eq('user_id', userId)
    }
    const { data } = await query
    setLogs(data || [])
  }

  // Initial load — fetch users and logs in parallel (biggest UX win here)
  useEffect(() => {
    if (!profile) return
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchUsers(), fetchLogs()])
      setLoading(false)
    }
    init()
  }, [profile])

  const handleUserChange = async (userId) => {
    setSelectedUser(userId)
    setLoading(true)
    await fetchLogs(userId)
    setLoading(false)
  }

  const matchesType = (action, type) => {
    if (type === 'all') return true
    if (type === 'completed') return action.includes('Completed')
    if (type === 'unchecked') return action.includes('Unchecked')
    if (type === 'reviewed')  return action.includes('Reviewed')
    if (type === 'dates') return (
      action.includes('date') || action.includes('Date') ||
      action.includes('Rescheduled') || action.includes('scheduled') ||
      action.includes('deadline')
    )
    return true
  }

  const getActionIcon = (action) => {
    if (action.includes('Completed')) return { icon: '✓', bg: '#d1fae5', color: '#059669' }
    if (action.includes('Unchecked')) return { icon: '○', bg: '#fee2e2', color: '#dc2626' }
    if (action.includes('Reviewed'))  return { icon: '★', bg: '#fef3c7', color: '#d97706' }
    if (action.includes('date') || action.includes('Date') || action.includes('scheduled') || action.includes('deadline')) {
      return { icon: '📅', bg: '#ede9fe', color: '#7c3aed' }
    }
    return { icon: '·', bg: '#f3f4f6', color: '#6b7280' }
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
        <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading activity log...</div>
      </div>
    </div>
  )

  const filteredLogs = logs.filter(log => matchesType(log.action, filterType))

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f3f4f6' }}>
      <AppSidebar profile={profile}>
        <SidebarSection title="Filter by user">
          {/* All users option */}
          <div
            onClick={() => handleUserChange('all')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.48rem 0.85rem', borderRadius: '9px',
              marginBottom: '0.15rem', cursor: 'pointer', fontSize: '0.875rem',
              background: selectedUser === 'all' ? 'rgba(99,102,241,0.18)' : 'transparent',
              borderLeft: '3px solid ' + (selectedUser === 'all' ? '#818cf8' : 'transparent'),
              color: selectedUser === 'all' ? '#a5b4fc' : '#94a3b8',
              fontWeight: selectedUser === 'all' ? 600 : 400,
              transition: 'all 0.15s', userSelect: 'none',
            }}
            onMouseEnter={e => {
              if (selectedUser !== 'all') {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.color = '#e2e8f0'
              }
            }}
            onMouseLeave={e => {
              if (selectedUser !== 'all') {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#94a3b8'
              }
            }}
          >
            <div style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: selectedUser === 'all' ? '#818cf8' : '#475569', flexShrink: 0
            }} />
            All users
            <span style={{
              marginLeft: 'auto', fontSize: '0.68rem', fontWeight: 600,
              background: 'rgba(255,255,255,0.08)', color: '#64748b',
              padding: '0.1rem 0.45rem', borderRadius: '20px',
            }}>
              {users.length}
            </span>
          </div>

          {/* Individual users */}
          {users.map(user => (
            <div
              key={user.id}
              onClick={() => handleUserChange(user.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.48rem 0.85rem', borderRadius: '9px',
                marginBottom: '0.15rem', cursor: 'pointer', fontSize: '0.875rem',
                background: selectedUser === user.id ? 'rgba(99,102,241,0.18)' : 'transparent',
                borderLeft: '3px solid ' + (selectedUser === user.id ? '#818cf8' : 'transparent'),
                color: selectedUser === user.id ? '#a5b4fc' : '#94a3b8',
                fontWeight: selectedUser === user.id ? 600 : 400,
                transition: 'all 0.15s', userSelect: 'none',
              }}
              onMouseEnter={e => {
                if (selectedUser !== user.id) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.color = '#e2e8f0'
                }
              }}
              onMouseLeave={e => {
                if (selectedUser !== user.id) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#94a3b8'
                }
              }}
            >
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: selectedUser === user.id ? '#818cf8' : '#475569', flexShrink: 0
              }} />
              <div>
                <div style={{ fontWeight: 500 }}>{user.full_name}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{user.role}</div>
              </div>
            </div>
          ))}
        </SidebarSection>
      </AppSidebar>

      {/* Main content */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Activity Log</h1>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
            {selectedUser === 'all' ? 'All user activity' : 'Activity for ' + (users.find(u => u.id === selectedUser)?.full_name || '')}
          </p>
        </div>

        {/* Type filter pills */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {[
            { key: 'all',       label: 'All activity' },
            { key: 'completed', label: '✓ Completed' },
            { key: 'dates',     label: 'Date changes' },
            { key: 'reviewed',  label: '★ Reviews' },
            { key: 'unchecked', label: '○ Unchecked' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterType(key)}
              style={{
                padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem',
                fontWeight: filterType === key ? 600 : 400,
                cursor: 'pointer', border: 'none',
                background: filterType === key ? '#6366f1' : 'white',
                color: filterType === key ? 'white' : '#6b7280',
                boxShadow: filterType === key ? '0 1px 4px rgba(99,102,241,0.3)' : '0 1px 2px rgba(0,0,0,0.06)',
                transition: 'all 0.15s',
              }}
            >{label}</button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#9ca3af', alignSelf: 'center' }}>
            {filteredLogs.length} {filteredLogs.length !== 1 ? 'entries' : 'entry'}
          </span>
        </div>

        {loading ? (
          <div style={{ color: '#9ca3af', padding: '2rem', textAlign: 'center' }}>Loading...</div>
        ) : filteredLogs.length === 0 ? (
          <div style={{
            background: 'white', borderRadius: '12px', padding: '2rem',
            textAlign: 'center', color: '#9ca3af', border: '1px solid #e5e7eb'
          }}>
            No activity yet
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {filteredLogs.map((log, i) => {
              const { icon, bg, color } = getActionIcon(log.action)
              return (
                <div
                  key={log.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '1rem',
                    padding: '1rem 1.25rem',
                    borderBottom: i < filteredLogs.length - 1 ? '1px solid #f3f4f6' : 'none'
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: bg, color: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: 700, flexShrink: 0
                  }}>
                    {icon}
                  </div>

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
