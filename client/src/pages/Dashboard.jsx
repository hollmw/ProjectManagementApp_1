import { useEffect, useState, useCallback, useRef} from 'react'
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
  const [areaUsers, setAreaUsers] = useState({})
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

  const fetchAreaUsers = async (areaName) => {
  if (areaUsers[areaName]) return

  // First get the area id
  const { data: areaData } = await supabase
    .from('areas')
    .select('id')
    .eq('name', areaName)
    .single()

  if (!areaData) return

  // Then get users in that area
  const { data } = await supabase
    .from('user_areas')
    .select('profiles(id, full_name, role)')
    .eq('area_id', areaData.id)

  const users = (data || []).map(d => d.profiles).filter(Boolean)
  setAreaUsers(prev => ({ ...prev, [areaName]: users }))
}

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
          <AreaSidebarItem
            key={area.name}
            area={area}
            count={tasks.filter(t => t.areas?.name === area.name).length}
            isSelected={filterArea === area.name}
            onClick={() => setFilterArea(area.name)}
            onHover={() => fetchAreaUsers(area.name)}
            users={areaUsers[area.name] || []}
          />
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

function AreaSidebarItem({ area, count, isSelected, onClick, onHover, users }) {
  const [hover, setHover] = useState(false)
  const closeTimer = useRef(null)

  const handleMouseEnter = () => {
    clearTimeout(closeTimer.current)
    setHover(true)
    onHover()
  }

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setHover(false), 150)
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.5rem 0.75rem', borderRadius: '8px',
          marginBottom: '0.25rem', cursor: 'pointer', fontSize: '0.9rem',
          background: isSelected ? area.color + '15' : 'transparent',
          fontWeight: isSelected ? 600 : 400,
          color: isSelected ? area.color : 'inherit'
        }}
      >
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: area.color, flexShrink: 0 }} />
        {area.name}
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#9ca3af' }}>{count}</span>
      </div>

      {hover && (
        <div
          onMouseEnter={() => clearTimeout(closeTimer.current)}
          onMouseLeave={handleMouseLeave}
          style={{
            position: 'absolute', left: '100%', top: 0,
            background: 'white', border: '1px solid #e5e7eb',
            borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: '0.75rem', minWidth: '200px',
            zIndex: 999, marginLeft: '8px'
          }}
        >
          {/* Arrow */}
          <div style={{
            position: 'absolute', right: '100%', top: '12px',
            width: 0, height: 0,
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderRight: '6px solid white'
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: area.color }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{area.name}</span>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: 'auto' }}>{users.length} member{users.length !== 1 ? 's' : ''}</span>
          </div>

          {users.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', padding: '0.5rem' }}>
              No members assigned
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {users.map(user => (
                <UserPill key={user.id} user={user} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function UserPill({ user }) {
  const [hover, setHover] = useState(false)
  const [workload, setWorkload] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)

  const loadWorkload = async () => {
    const now = Date.now()
    if (lastFetched && now - lastFetched < 3000) return
    const { data } = await supabase
      .from('task_assignments')
      .select('tasks(id, title, area_id, areas(name, color), breakdowns(*))')
      .eq('user_id', user.id)

    const incomplete = (data || []).filter(a => {
      const task = a.tasks
      if (!task) return false
      const total = task.breakdowns?.length || 0
      const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
      if (total === 0) return true
      return checked < total
    })

    setWorkload(incomplete)
    setLastFetched(now)
  }

  const roleColor = user.role === 'admin' ? '#7c3aed' : user.role === 'member' ? '#1d4ed8' : '#6b7280'
  const roleBg = user.role === 'admin' ? '#ede9fe' : user.role === 'member' ? '#dbeafe' : '#f3f4f6'

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => { setHover(true); loadWorkload() }}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        padding: '0.3rem 0.6rem', borderRadius: '20px',
        background: roleBg, color: roleColor,
        fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer',
        border: `1px solid ${roleColor}30`
      }}>
        <div style={{
          width: '18px', height: '18px', borderRadius: '50%',
          background: roleColor, color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.6rem', fontWeight: 700, flexShrink: 0
        }}>
          {user.full_name?.charAt(0).toUpperCase()}
        </div>
        {user.full_name}
      </div>

      {/* Workload tooltip */}
      {hover && (
        <div style={{
          position: 'absolute', left: '0', bottom: '130%',
          background: 'white', border: '1px solid #e5e7eb',
          borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          padding: '0.75rem', minWidth: '220px', maxWidth: '280px',
          zIndex: 1000
        }}>
          {/* Arrow */}
          <div style={{
            position: 'absolute', top: '100%', left: '16px',
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid white'
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: roleColor, color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 600, flexShrink: 0
            }}>
              {user.full_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{user.full_name}</div>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                {workload ? `${workload.length} active task${workload.length !== 1 ? 's' : ''}` : 'Loading...'}
              </div>
            </div>
          </div>

          {!workload ? (
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center' }}>Loading...</div>
          ) : workload.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center' }}>No active tasks</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {workload.map(a => {
                const task = a.tasks
                if (!task) return null
                const total = task.breakdowns?.length || 0
                const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
                const percent = total > 0 ? Math.round((checked / total) * 100) : 0
                const color = task.areas?.color || '#6366f1'
                return (
                  <div key={task.id} style={{
                    padding: '0.5rem 0.6rem', background: '#f9fafb',
                    borderRadius: '8px', borderLeft: `3px solid ${color}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#111827' }}>{task.title}</span>
                      <span style={{
                        fontSize: '0.7rem', padding: '0.1rem 0.4rem',
                        background: color + '20', color: color,
                        borderRadius: '10px', fontWeight: 600, flexShrink: 0
                      }}>
                        {task.areas?.name}
                      </span>
                    </div>
                    {total > 0 && (
                      <div>
                        <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: '2px',
                            background: percent === 100 ? '#10b981' : color,
                            width: `${percent}%`, transition: 'width 0.3s'
                          }} />
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                          {percent}% complete
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}