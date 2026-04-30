import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'

// ─── Loads the data the Gantt page needs: profile, tasks, users ──────────────
// Also exposes per-task activity log fetching (cached by task id).
export default function useGanttData() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activityLogs, setActivityLogs] = useState({})

  const fetchTasks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profileData } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()

    let query = supabase
      .from('tasks')
      .select('*, areas(name, color), breakdowns(*), task_assignments(user_id)')
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true })

    if (profileData?.role === 'intern') {
      const { data: assignedTasks } = await supabase
        .from('task_assignments').select('task_id').eq('user_id', user.id)
      const taskIds = assignedTasks?.map(a => a.task_id) || []
      if (taskIds.length === 0) { setTasks([]); setLoading(false); return }
      query = query.in('id', taskIds)
    }

    const { data } = await query
    setTasks(data || [])
    setLoading(false)
  }, [])

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, role').order('full_name')
    setUsers(data || [])
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      const { data: profileData } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      setProfile(profileData)
      await fetchTasks()
      await fetchUsers()
    }
    init()
  }, [])

  const fetchActivityLog = useCallback(async (taskId) => {
    if (activityLogs[taskId]) return
    const { data } = await supabase
      .from('activity_log')
      .select('*, profiles(full_name)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(5)
    setActivityLogs(prev => ({ ...prev, [taskId]: data || [] }))
  }, [activityLogs])

  return {
    profile,
    tasks, setTasks,
    users,
    loading,
    activityLogs,
    fetchActivityLog,
  }
}
