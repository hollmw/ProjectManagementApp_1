import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabase'
import { useProfile } from '../../contexts/ProfileContext'

// Loads tasks for the dashboard, with realtime updates.
// Profile is sourced from ProfileContext (cached globally) so no
// duplicate auth/profile fetch is needed here.
// Also exposes fetchAreaUsers for the sidebar hover popover.
export default function useDashboardData() {
  const { user, profile } = useProfile()

  const [tasks,     setTasks]     = useState([])
  const [areaUsers, setAreaUsers] = useState({})

  const fetchTasks = useCallback(async () => {
    if (!user || !profile) return

    let query = supabase
      .from('tasks')
      .select('*, areas(name, color), breakdowns(*), reviews(*), task_assignments(*, profiles!task_assignments_user_id_fkey(id, full_name, role))')
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

  // Fetch tasks whenever profile becomes available (or changes)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (profile) fetchTasks()
  }, [profile, fetchTasks])

  // Realtime subscription for live task updates
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel('realtime-tasks-' + profile.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' },            () => fetchTasks())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'breakdowns' },       () => fetchTasks())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignments' }, () => fetchTasks())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' },          () => fetchTasks())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchTasks, profile])

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
