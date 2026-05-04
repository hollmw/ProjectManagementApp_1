import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

import LeaderboardSidebar from './leaderboard/LeaderboardSidebar'
import Podium from './leaderboard/Podium'
import RankingsList from './leaderboard/RankingsList'
import BadgeLegend from './leaderboard/BadgeLegend'

export default function Leaderboard() {
  const [users, setUsers] = useState([])
  const [badges, setBadges] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const navigate = useNavigate()

  const fetchLeaderboard = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, role, points')
      .order('points', { ascending: false })

    const { data: badgeData } = await supabase.from('badges').select('*')

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

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      const { data: profileData } = await supabase
        .from('profiles').select('full_name, role').eq('id', user.id).single()
      setProfile(profileData)
      await fetchLeaderboard()
    }
    init()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ color: '#6b7280' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>
      <LeaderboardSidebar profile={profile} />

      {/* Main content */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>🏆 Leaderboard</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.2rem' }}>Top performers this month</p>
        </div>

        <Podium users={users} badges={badges} />

        <RankingsList
          users={users}
          badges={badges}
          selectedUser={selectedUser}
          setSelectedUser={setSelectedUser}
        />

        <BadgeLegend />
      </div>
    </div>
  )
}
