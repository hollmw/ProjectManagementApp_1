import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const getProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        console.log('user:', user)
        if (!user) { navigate('/login'); return }

        const { data, error } = await supabase
            .from('profiles')
            .select('*, areas(name, color)')
            .eq('id', user.id)
            .single()

        console.log('profile data:', data)
        console.log('profile error:', error)

        setProfile(data)
        }
    getProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (!profile) return <div style={{ padding: '2rem' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f3f4f6' }}>

      {/* Left Sidebar */}
      <div style={{
        width: '260px',
        background: 'white',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1rem'
      }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
          WorkSpace
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '2rem' }}>
          Project Management
        </p>

        {/* Business Areas */}
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Business Areas
        </p>
        {[
          { name: 'Tech', color: '#6366f1' },
          { name: 'Business', color: '#f59e0b' },
          { name: 'Marketing', color: '#ec4899' },
          { name: 'Science', color: '#10b981' },
          { name: 'Clinical', color: '#3b82f6' },
          { name: 'Design', color: '#8b5cf6' },
        ].map(area => (
          <div key={area.name} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            marginBottom: '0.25rem',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{
              width: '10px', height: '10px',
              borderRadius: '50%',
              background: area.color,
              flexShrink: 0
            }} />
            {area.name}
          </div>
        ))}

        {/* Bottom user info */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{profile.full_name}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>
            {profile.role}
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Task Board</h1>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Welcome back, {profile.full_name}</p>
          </div>
          <button style={{
            padding: '0.6rem 1.2rem',
            background: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: 500,
            cursor: 'pointer'
          }}>
            + New Task
          </button>
        </div>

        {/* Task board placeholder */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          color: '#9ca3af',
          border: '1px solid #e5e7eb'
        }}>
          Tasks will appear here
        </div>
      </div>

    </div>
  )
}