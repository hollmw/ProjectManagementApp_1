import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'
import { useProfile } from '../../contexts/ProfileContext'

// Loads the data the Gantt page needs: tasks and users.
// Profile is sourced from ProfileContext (cached globally).
// Tasks and users are fetched in parallel for faster page load.
// Also exposes per-task activity log fetching (cached by task id).
export default function useGanttData() {
  const navigate = useNavigate()
  const { user, profile, loading: profileLoading } = useProfile()

  const [tasks,        setTasks]        = useState([])
  const [users,        setUsers]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [activityLogs, setActivityLogs] = useState({})

  // Redirect if not authenticated
  useEffect(() => {
    if (!profileLoading && !profile) navigate('/login')
  }, [profileLoading, profile, navigate])

  const fetchTasks = useCallback(async () => {
    if (!user || !profile) return

    let query = supabase
      .from('tasks')
      .select('*, areas(name, color), breakdowns(*), task_assignments(user_id)')
      .order('created_at', { ascending: false })

    if (profile.role === 'intern') {
      const { data: assignedTasks } = await supabase
        .from('task_assignments').select('task_id').eq('user_id', user.id)
      const taskIds = assignedTasks?.map(a => a.task_id) || []
      if (taskIds.length === 0) { setTasks([]); return }
      query = query.in('id', taskIds)
    }

    const { data } = await query
    setTasks(data || [])
  }, [user, profile])

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, role').order('full_name')
    setUsers(data || [])
  }, [])

  // Fetch tasks and users in parallel once profile is ready.
  // fetchTasks/fetchUsers are stable useCallback refs — safe to omit from deps.
  useEffect(() => {
    if (!profile) return
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchTasks(), fetchUsers()])
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

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
