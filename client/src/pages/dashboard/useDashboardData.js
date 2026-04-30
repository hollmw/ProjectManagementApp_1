import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'

// ─── Loads profile + tasks for the dashboard, with realtime updates ──────────
// Also exposes `fetchAreaUsers` for the sidebar's hover popover.
export default function useDashboardData() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [areaUsers, setAreaUsers] = useState({})

  // Profile bootstrap
  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      const { data } = await supabase
        .from('profiles')
        .select('*, areas(name, color)')
        .eq('id', user.id)
        .single()
      setProfile(data)
    }
    getProfile()
  }, [])

  const fetchTasks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profileData } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()

    let query = supabase
      .from('tasks')
      .select('*, areas(name, color), breakdowns(*), reviews(*), task_assignments(*, profiles!task_assignments_user_id_fkey(id, full_name, role))')
      .order('created_at', { ascending: false })

    if (profileData?.role === 'intern') {
      const { data: assignedTasks } = await supabase
        .from('task_assignments').select('task_id').eq('user_id', user.id)
      const taskIds = assignedTasks?.map(a => a.task_id) || []
      if (taskIds.length === 0) { setTasks([]); return }
      query = query.in('id', taskIds)
    }

    const { data } = await query
    setTasks(data || [])
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-tasks-${profile?.id || 'guest'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'breakdowns' }, () => fetchTasks())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignments' }, () => fetchTasks())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => fetchTasks())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchTasks])

  const fetchAreaUsers = useCallback(async (areaName) => {
    if (areaUsers[areaName]) return
    const { data: areaData } = await supabase
      .from('areas').select('id').eq('name', areaName).single()
    if (!areaData) return
    const { data } = await supabase
      .from('user_areas')
      .select('profiles(id, full_name, role)')
      .eq('area_id', areaData.id)
    const users = (data || []).map(d => d.profiles).filter(Boolean)
    setAreaUsers(prev => ({ ...prev, [areaName]: users }))
  }, [areaUsers])

  return {
    profile,
    tasks, setTasks,
    areaUsers, fetchAreaUsers,
    fetchTasks,
  }
}
