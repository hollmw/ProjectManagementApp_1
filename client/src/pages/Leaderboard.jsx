import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

const BADGES = {
  first_task: { label: 'First Step', icon: '🌱', desc: 'Completed first breakdown', color: '#10b981' },
  ten_tasks: { label: 'Getting Going', icon: '⚡', desc: '10 breakdowns completed', color: '#f59e0b' },
  fifty_tasks: { label: 'On Fire', icon: '🔥', desc: '50 breakdowns completed', color: '#ef4444' },
  perfect_review: { label: 'Perfectionist', icon: '⭐', desc: 'Received a 10/10 review', color: '#6366f1' },
  century: { label: 'Century', icon: '💯', desc: '100 breakdowns completed', color: '#8b5cf6' },
}

export default function Leaderboard() {
  const [users, setUsers] = useState([])
  const [badges, setBadges] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      await fetchLeaderboard()
    }
    init()
  }, [])

  const fetchLeaderboard = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, role, points')
      .order('points', { ascending: false })

    const { data: badgeData } = await supabase
      .from('badges')
      .select('*')

    // Group badges by user
    const badgeMap = {}
    badgeData?.forEach(b => {
      if (!badgeMap[b.user_id]) badgeMap[b.user_id] = []
      badgeMap[b.user_id].push(b.badge_type)
    })

    setUsers(profiles || [])
    setBadges(badgeMap)
    setLoading(false)
  }

  const getRankStyle = (index) => {
    if (index === 0) return { bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '#f59e0b', icon: '🥇' }
    if (index === 1) return { bg: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', border: '#94a3b8', icon: '🥈' }
    if (index === 2) return { bg: 'linear-gradient(135deg, #fef3c7, #fed7aa)', border: '#f97316', icon: '🥉' }
    return { bg: 'white', border: '#f1f5f9', icon: null }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ color: '#6b7280' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>

      {/* Sidebar */}
      <div style={{
        width: '260px', background: 'white',
        borderRight: '1px solid #f1f5f9',
        display: 'flex', flexDirection: 'column',
        padding: '1.5rem 1rem',
        boxShadow: '2px 0 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem'
          }}>📋</div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>WorkSpace</div>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Project Management</div>
          </div>
        </div>

        {[
          { label: 'Task Board', path: '/dashboard' },
          { label: 'User Management', path: '/users' },
          { label: 'Activity Log', path: '/activity' },
          { label: 'Leaderboard', path: '/leaderboard', active: true },
        ].map(item => (
          <div
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              padding: '0.5rem 0.75rem', borderRadius: '8px',
              marginBottom: '0.2rem', cursor: 'pointer', fontSize: '0.875rem',
              background: item.active ? '#ede9fe' : 'transparent',
              color: item.active ? '#7c3aed' : '#374151',
              fontWeight: item.active ? 600 : 400
            }}
            onMouseEnter={e => { if (!item.active) e.currentTarget.style.background = '#f3f4f6' }}
            onMouseLeave={e => { if (!item.active) e.currentTarget.style.background = 'transparent' }}
          >
            {item.label}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>🏆 Leaderboard</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.2rem' }}>Top performers this month</p>
        </div>

        {/* Top 3 podium */}
        {users.length >= 3 && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'flex-end' }}>
            {/* 2nd place */}
            <div style={{
              flex: 1, background: 'white', borderRadius: '14px',
              padding: '1.5rem', textAlign: 'center',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🥈</div>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: '#94a3b8', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', fontWeight: 700, margin: '0 auto 0.5rem'
              }}>
                {users[1]?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{users[1]?.full_name}</div>
              <div style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.25rem' }}>{users[1]?.points || 0} pts</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                {(badges[users[1]?.id] || []).map(b => (
                  <span key={b} title={BADGES[b]?.desc} style={{ fontSize: '1rem' }}>{BADGES[b]?.icon}</span>
                ))}
              </div>
            </div>

            {/* 1st place */}
            <div style={{
              flex: 1, background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
              borderRadius: '14px', padding: '2rem 1.5rem', textAlign: 'center',
              border: '2px solid #f59e0b',
              boxShadow: '0 4px 16px rgba(245,158,11,0.2)'
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🥇</div>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', fontWeight: 700, margin: '0 auto 0.5rem',
                boxShadow: '0 4px 12px rgba(245,158,11,0.4)'
              }}>
                {users[0]?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{users[0]?.full_name}</div>
              <div style={{ color: '#92400e', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.25rem' }}>{users[0]?.points || 0} pts</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                {(badges[users[0]?.id] || []).map(b => (
                  <span key={b} title={BADGES[b]?.desc} style={{ fontSize: '1.1rem' }}>{BADGES[b]?.icon}</span>
                ))}
              </div>
            </div>

            {/* 3rd place */}
            <div style={{
              flex: 1, background: 'white', borderRadius: '14px',
              padding: '1.5rem', textAlign: 'center',
              border: '1px solid #fed7aa',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🥉</div>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: '#f97316', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', fontWeight: 700, margin: '0 auto 0.5rem'
              }}>
                {users[2]?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{users[2]?.full_name}</div>
              <div style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.25rem' }}>{users[2]?.points || 0} pts</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                {(badges[users[2]?.id] || []).map(b => (
                  <span key={b} title={BADGES[b]?.desc} style={{ fontSize: '1rem' }}>{BADGES[b]?.icon}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Full rankings table */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>All Rankings</span>
            <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{users.length} members</span>
          </div>

          {users.map((user, i) => {
            const { icon } = getRankStyle(i)
            const userBadges = badges[user.id] || []
            const maxPoints = users[0]?.points || 1

            return (
              <div
                key={user.id}
                onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.85rem 1.25rem',
                  borderBottom: i < users.length - 1 ? '1px solid #f9fafb' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  background: selectedUser?.id === user.id ? '#f8faff' : 'white'
                }}
                onMouseEnter={e => { if (selectedUser?.id !== user.id) e.currentTarget.style.background = '#f9fafb' }}
                onMouseLeave={e => { if (selectedUser?.id !== user.id) e.currentTarget.style.background = 'white' }}
              >
                {/* Rank */}
                <div style={{ width: '28px', textAlign: 'center', fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600, flexShrink: 0 }}>
                  {icon || `#${i + 1}`}
                </div>

                {/* Avatar */}
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: i === 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                               i === 1 ? 'linear-gradient(135deg, #94a3b8, #64748b)' :
                               i === 2 ? 'linear-gradient(135deg, #f97316, #ea580c)' :
                               'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700, flexShrink: 0
                }}>
                  {user.full_name?.charAt(0).toUpperCase()}
                </div>

                {/* Name + progress */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{user.full_name}</span>
                    <span style={{
                      fontSize: '0.7rem', padding: '0.1rem 0.4rem',
                      background: user.role === 'admin' ? '#ede9fe' : user.role === 'member' ? '#dbeafe' : '#f3f4f6',
                      color: user.role === 'admin' ? '#7c3aed' : user.role === 'member' ? '#1d4ed8' : '#6b7280',
                      borderRadius: '10px', fontWeight: 500
                    }}>
                      {user.role}
                    </span>
                    {userBadges.map(b => (
                      <span key={b} title={BADGES[b]?.desc} style={{ fontSize: '0.85rem' }}>{BADGES[b]?.icon}</span>
                    ))}
                  </div>
                  <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '2px',
                      background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#f97316' : '#6366f1',
                      width: `${Math.round(((user.points || 0) / maxPoints) * 100)}%`,
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>

                {/* Points */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>{user.points || 0}</div>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>points</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Badge legend */}
        <div style={{ marginTop: '1.5rem', background: 'white', borderRadius: '14px', border: '1px solid #f1f5f9', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>Badge Guide</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {Object.entries(BADGES).map(([key, badge]) => (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.4rem 0.75rem', borderRadius: '20px',
                background: badge.color + '15', border: `1px solid ${badge.color}30`
              }}>
                <span style={{ fontSize: '1rem' }}>{badge.icon}</span>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: badge.color }}>{badge.label}</div>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{badge.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}