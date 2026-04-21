import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'
import NewTaskModal from '../components/NewTaskModal'
import TaskCard from '../components/TaskCard'

const AREAS = [
  { name: 'Tech', color: '#6366f1' },
  { name: 'Business', color: '#f59e0b' },
  { name: 'Marketing', color: '#ec4899' },
  { name: 'Science', color: '#10b981' },
  { name: 'Clinical', color: '#3b82f6' },
  { name: 'Design', color: '#8b5cf6' },
]

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [tasks, setTasks] = useState([])
  const [filterArea, setFilterArea] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [search, setSearch] = useState('')
  const [editingTask, setEditingTask] = useState(null)
  const navigate = useNavigate()

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
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    let query = supabase
      .from('tasks')
      .select('*, areas(name, color), breakdowns(*), reviews(*), task_assignments(*, profiles!task_assignments_user_id_fkey(id, full_name, role))')
      .order('created_at', { ascending: false })

    if (profileData?.role === 'intern') {
      const { data: assignedTasks } = await supabase
        .from('task_assignments')
        .select('task_id')
        .eq('user_id', user.id)
      const taskIds = assignedTasks?.map(a => a.task_id) || []
      if (taskIds.length === 0) { setTasks([]); return }
      query = query.in('id', taskIds)
    }

    const { data } = await query
    setTasks(data || [])
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-tasks-${profile?.id || 'guest'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        console.log('tasks changed:', payload)
        fetchTasks()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'breakdowns' }, (payload) => {
        console.log('breakdowns changed:', payload)
        fetchTasks()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignments' }, (payload) => {
        console.log('assignments changed:', payload)
        fetchTasks()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, (payload) => {
        console.log('reviews changed:', payload)
        fetchTasks()
      })
      .subscribe((status) => {
        console.log('realtime status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchTasks])

  const handleDeleteTask = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const handleEditTask = (task) => {
    setEditingTask(task)
    setShowModal(true)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleBreakdownToggle = (taskId, breakdownId, newChecked) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task
      return {
        ...task,
        breakdowns: task.breakdowns.map(b =>
          b.id === breakdownId ? { ...b, is_checked: newChecked } : b
        )
      }
    }))
  }

  const handleReviewSaved = (taskId, reviewData) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task
      return { ...task, reviews: [reviewData] }
    }))
  }

  const handleAssignmentChange = (taskId, newAssignments) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task
      return { ...task, task_assignments: newAssignments }
    }))
  }

  const filteredTasks = tasks.filter(task => {
    const matchesArea = filterArea === 'All' || task.areas?.name === filterArea
    const totalBreakdowns = task.breakdowns?.length || 0
    const checkedBreakdowns = task.breakdowns?.filter(b => b.is_checked).length || 0
    const isComplete = totalBreakdowns > 0 && checkedBreakdowns === totalBreakdowns
    const matchesStatus =
      filterStatus === 'All' ||
      (filterStatus === 'Complete' && isComplete) ||
      (filterStatus === 'Incomplete' && !isComplete)
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase())
    return matchesArea && matchesStatus && matchesSearch
  })

  if (!profile) return <div style={{ padding: '2rem' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f3f4f6' }}>

      {/* Left Sidebar */}
      <div style={{
        width: '260px', background: 'white',
        borderRight: '1px solid #e5e7eb',
        display: 'flex', flexDirection: 'column',
        padding: '1.5rem 1rem'
      }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>WorkSpace</h2>
        <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '2rem' }}>Project Management</p>

        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Business Areas
        </p>

        <div
          onClick={() => setFilterArea('All')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            padding: '0.5rem 0.75rem', borderRadius: '8px',
            marginBottom: '0.25rem', cursor: 'pointer', fontSize: '0.9rem',
            background: filterArea === 'All' ? '#f3f4f6' : 'transparent',
            fontWeight: filterArea === 'All' ? 600 : 400
          }}
        >
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#9ca3af', flexShrink: 0 }} />
          All
        </div>

        {AREAS.map(area => (
          <div
            key={area.name}
            onClick={() => setFilterArea(area.name)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.5rem 0.75rem', borderRadius: '8px',
              marginBottom: '0.25rem', cursor: 'pointer', fontSize: '0.9rem',
              background: filterArea === area.name ? area.color + '15' : 'transparent',
              fontWeight: filterArea === area.name ? 600 : 400,
              color: filterArea === area.name ? area.color : 'inherit'
            }}
            onMouseEnter={e => { if (filterArea !== area.name) e.currentTarget.style.background = '#f3f4f6' }}
            onMouseLeave={e => { if (filterArea !== area.name) e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: area.color, flexShrink: 0 }} />
            {area.name}
            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#9ca3af' }}>
              {tasks.filter(t => t.areas?.name === area.name).length}
            </span>
          </div>
        ))}

        {profile.role !== 'intern' && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Admin
            </p>
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
            <div
              onClick={() => navigate('/activity')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.5rem 0.75rem', borderRadius: '8px',
                marginBottom: '0.25rem', cursor: 'pointer', fontSize: '0.9rem'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Activity Log
            </div>
          </div>
        )}

        <div style={{ marginTop: 'auto', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{profile.full_name}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>{profile.role}</div>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '0.5rem', background: 'transparent',
            border: '1px solid #e5e7eb', borderRadius: '8px',
            fontSize: '0.85rem', cursor: 'pointer', color: '#6b7280'
          }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Task Board</h1>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Welcome back, {profile.full_name}</p>
          </div>
          {profile.role !== 'intern' && (
            <button onClick={() => setShowModal(true)} style={{
              padding: '0.6rem 1.2rem', background: '#6366f1', color: 'white',
              border: 'none', borderRadius: '8px', fontSize: '0.9rem',
              fontWeight: 500, cursor: 'pointer'
            }}>
              + New Task
            </button>
          )}
        </div>

        <div style={{
          display: 'flex', gap: '0.75rem', marginBottom: '1.5rem',
          alignItems: 'center', flexWrap: 'wrap'
        }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            style={{
              padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb',
              borderRadius: '8px', fontSize: '0.85rem', width: '200px',
              background: 'white'
            }}
          />

          {['All', 'Incomplete', 'Complete'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem',
                cursor: 'pointer', border: '1px solid #e5e7eb',
                background: filterStatus === s ? '#6366f1' : 'white',
                color: filterStatus === s ? 'white' : '#6b7280',
                fontWeight: filterStatus === s ? 500 : 400
              }}
            >
              {s}
            </button>
          ))}

          <span style={{ fontSize: '0.8rem', color: '#9ca3af', marginLeft: 'auto' }}>
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filteredTasks.length === 0 ? (
          <div style={{
            background: 'white', borderRadius: '12px', padding: '2rem',
            textAlign: 'center', color: '#9ca3af', border: '1px solid #e5e7eb'
          }}>
            {tasks.length === 0 ? 'No tasks yet — click + New Task to create one' : 'No tasks match your filters'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onBreakdownToggle={handleBreakdownToggle}
                onDelete={handleDeleteTask}
                onEdit={handleEditTask}
                onReviewSaved={handleReviewSaved}
                onAssignmentChange={handleAssignmentChange}
                userRole={profile.role}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <NewTaskModal
          onClose={() => { setShowModal(false); setEditingTask(null) }}
          onTaskCreated={fetchTasks}
          editingTask={editingTask}
        />
      )}
    </div>
  )
}