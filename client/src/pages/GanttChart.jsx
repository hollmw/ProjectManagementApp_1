import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

const AREA_COLORS = {
  'Tech': '#6366f1',
  'Business': '#f59e0b',
  'Marketing': '#ec4899',
  'Science': '#10b981',
  'Clinical': '#3b82f6',
  'Design': '#8b5cf6',
}

export default function GanttChart() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [hoveredTask, setHoveredTask] = useState(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const [activityLogs, setActivityLogs] = useState({})
  const [profile, setProfile] = useState(null)
  const [users, setUsers] = useState([])
  const [filterUser, setFilterUser] = useState('all')
  const [filterArea, setFilterArea] = useState('all')
  const navigate = useNavigate()
  const containerRef = useRef(null)

  const fetchTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    let query = supabase
      .from('tasks')
      .select('*, areas(name, color), breakdowns(*), task_assignments(user_id)')
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true })

    if (profileData?.role === 'intern') {
      const { data: assignedTasks } = await supabase
        .from('task_assignments')
        .select('task_id')
        .eq('user_id', user.id)
      const taskIds = assignedTasks?.map(a => a.task_id) || []
      if (taskIds.length === 0) { setTasks([]); setLoading(false); return }
      query = query.in('id', taskIds)
    }

    const { data } = await query
    setTasks(data || [])
    setLoading(false)
  }

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .order('full_name')
    setUsers(data || [])
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      setProfile(profileData)
      await fetchTasks()
      await fetchUsers()
    }
    init()
  }, [])

  const fetchActivityLog = async (taskId) => {
    if (activityLogs[taskId]) return
    const { data } = await supabase
      .from('activity_log')
      .select('*, profiles(full_name)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(5)
    setActivityLogs(prev => ({ ...prev, [taskId]: data || [] }))
  }

  const handleMouseEnter = (task, e) => {
    setHoveredTask(task)
    setHoverPos({ x: e.clientX, y: e.clientY })
    fetchActivityLog(task.id)
  }

  const handleMouseMove = (e) => setHoverPos({ x: e.clientX, y: e.clientY })
  const handleMouseLeave = () => setHoveredTask(null)

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date + 'Z')) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ color: '#6b7280' }}>Loading...</div>
    </div>
  )

  const filteredTasks = tasks.filter(task => {
    const matchesArea = filterArea === 'all' || task.areas?.name === filterArea
    const matchesUser = filterUser === 'all' ||
      task.task_assignments?.some(a => a.user_id === filterUser)
    return matchesArea && matchesUser
  })

  const tasksWithNoDueDate = tasks
    .filter(t => !t.due_date)
    .filter(task => {
      const matchesArea = filterArea === 'all' || task.areas?.name === filterArea
      const matchesUser = filterUser === 'all' ||
        task.task_assignments?.some(a => a.user_id === filterUser)
      return matchesArea && matchesUser
    })

  const today = new Date()
  const dates = filteredTasks.map(t => new Date(t.due_date))

  const minDate = dates.length > 0
    ? new Date(Math.min(...dates.map(d => d.getTime()), today.getTime()))
    : today
  const maxDate = dates.length > 0
    ? new Date(Math.max(...dates.map(d => d.getTime())))
    : new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

  minDate.setDate(minDate.getDate() - 7)
  maxDate.setDate(maxDate.getDate() + 7)

  const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24))
  const dayWidth = 40
  const rowHeight = 52
  const labelWidth = 220

  const months = []
  const current = new Date(minDate)
  while (current <= maxDate) {
    months.push({
      label: current.toLocaleString('default', { month: 'short', year: 'numeric' }),
      offset: Math.floor((current - minDate) / (1000 * 60 * 60 * 24)) * dayWidth
    })
    current.setMonth(current.getMonth() + 1)
    current.setDate(1)
  }

  const days = []
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(minDate)
    d.setDate(d.getDate() + i)
    days.push(d)
  }

  const getTaskX = (task) => {
    const due = new Date(task.due_date)
    const daysFromStart = Math.floor((due - minDate) / (1000 * 60 * 60 * 24))
    return daysFromStart * dayWidth
  }

  const todayX = Math.floor((today - minDate) / (1000 * 60 * 60 * 24)) * dayWidth

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>

      {/* Sidebar */}
      <div style={{
        width: '260px', background: 'white',
        borderRight: '1px solid #f1f5f9',
        display: 'flex', flexDirection: 'column',
        padding: '1.5rem 1rem',
        boxShadow: '2px 0 8px rgba(0,0,0,0.03)',
        flexShrink: 0
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
          { label: '📋 Task Board', path: '/dashboard' },
          { label: '🏆 Leaderboard', path: '/leaderboard' },
          { label: '📅 Gantt Chart', path: '/gantt', active: true },
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

        {profile?.role !== 'intern' && [
          { label: '👥 User Management', path: '/users' },
          { label: '📊 Activity Log', path: '/activity' },
        ].map(item => (
          <div
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              padding: '0.5rem 0.75rem', borderRadius: '8px',
              marginBottom: '0.2rem', cursor: 'pointer', fontSize: '0.875rem',
              background: 'transparent', color: '#374151'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {item.label}
          </div>
        ))}

        <div style={{ marginTop: '2rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Areas
          </p>
          {Object.entries(AREA_COLORS).map(([name, color]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: '0.8rem', color: '#374151' }}>{name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', background: 'white' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>📅 Gantt Chart</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            {filteredTasks.length} tasks with due dates
            {tasksWithNoDueDate.length > 0 && ` · ${tasksWithNoDueDate.length} without due date`}
          </p>
        </div>

        {/* Filter bar */}
        <div style={{
          padding: '0.75rem 2rem', borderBottom: '1px solid #f1f5f9',
          background: 'white', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#9ca3af' }}>Filter:</span>

          <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
            style={{ padding: '0.4rem 0.75rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.82rem', background: 'white', color: '#374151', cursor: 'pointer' }}>
            <option value="all">All users</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>

          <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
            style={{ padding: '0.4rem 0.75rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.82rem', background: 'white', color: '#374151', cursor: 'pointer' }}>
            <option value="all">All areas</option>
            {Object.keys(AREA_COLORS).map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>

          {(filterUser !== 'all' || filterArea !== 'all') && (
            <button onClick={() => { setFilterUser('all'); setFilterArea('all') }}
              style={{ padding: '0.4rem 0.75rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.82rem', background: 'transparent', color: '#6b7280', cursor: 'pointer' }}>
              Clear filters
            </button>
          )}

          <span style={{ fontSize: '0.78rem', color: '#9ca3af', marginLeft: 'auto' }}>
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Gantt area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem 2rem' }} ref={containerRef}>
          {filteredTasks.length === 0 ? (
            <div style={{
              background: 'white', borderRadius: '14px', padding: '3rem 2rem',
              textAlign: 'center', color: '#9ca3af', border: '1px solid #f1f5f9'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📅</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#6b7280' }}>No tasks match your filters</div>
            </div>
          ) : (
            <div style={{ display: 'flex', background: 'white', borderRadius: '14px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

              {/* Task labels column */}
              <div style={{ width: `${labelWidth}px`, flexShrink: 0, borderRight: '1px solid #f1f5f9' }}>
                <div style={{ height: '56px', borderBottom: '1px solid #f1f5f9', padding: '0 1rem', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Task</span>
                </div>

                {filteredTasks.map((task, i) => {
                  const total = task.breakdowns?.length || 0
                  const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
                  const percent = total > 0 ? Math.round((checked / total) * 100) : 0
                  const color = task.areas?.color || '#6366f1'
                  return (
                    <div key={task.id} style={{
                      height: `${rowHeight}px`, padding: '0 1rem',
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      borderBottom: '1px solid #f9fafb',
                      background: i % 2 === 0 ? 'white' : '#fafafa'
                    }}>
                      <div style={{ width: '4px', height: '28px', borderRadius: '2px', background: color, flexShrink: 0 }} />
                      <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.title}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.1rem' }}>
                          {percent}% · {task.areas?.name}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Timeline column */}
              <div style={{ overflow: 'auto', flex: 1 }}>
                <div style={{ width: `${totalDays * dayWidth}px`, position: 'relative' }}>

                  {/* Month headers */}
                  <div style={{ height: '28px', position: 'relative', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                    {months.map((m, i) => (
                      <div key={i} style={{
                        position: 'absolute', left: m.offset,
                        fontSize: '0.72rem', fontWeight: 600, color: '#6b7280',
                        padding: '0 8px', lineHeight: '28px', whiteSpace: 'nowrap'
                      }}>
                        {m.label}
                      </div>
                    ))}
                  </div>

                  {/* Day headers */}
                  <div style={{ height: '28px', position: 'relative', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                    {days.map((d, i) => (
                      <div key={i} style={{
                        position: 'absolute', left: i * dayWidth, width: dayWidth,
                        textAlign: 'center', fontSize: '0.65rem',
                        color: d.getDay() === 0 || d.getDay() === 6 ? '#d1d5db' : '#9ca3af',
                        lineHeight: '28px',
                        background: d.toDateString() === today.toDateString() ? '#eef2ff' : 'transparent'
                      }}>
                        {d.getDate()}
                      </div>
                    ))}
                  </div>

                  {/* Today line */}
                  <div style={{
                    position: 'absolute', left: todayX + dayWidth / 2,
                    top: 0, bottom: 0, width: '2px',
                    background: '#6366f1', opacity: 0.5, zIndex: 10, pointerEvents: 'none'
                  }} />

                  {/* Task rows */}
                  {filteredTasks.map((task, i) => {
                    const x = getTaskX(task)
                    const total = task.breakdowns?.length || 0
                    const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
                    const percent = total > 0 ? Math.round((checked / total) * 100) : 0
                    const color = task.areas?.color || '#6366f1'
                    const isComplete = percent === 100

                    return (
                      <div key={task.id} style={{
                        height: `${rowHeight}px`, position: 'relative',
                        borderBottom: '1px solid #f9fafb',
                        background: i % 2 === 0 ? 'white' : '#fafafa'
                      }}>
                        {days.map((d, di) => (
                          (d.getDay() === 0 || d.getDay() === 6) && (
                            <div key={di} style={{
                              position: 'absolute', left: di * dayWidth,
                              top: 0, bottom: 0, width: dayWidth,
                              background: 'rgba(0,0,0,0.02)', pointerEvents: 'none'
                            }} />
                          )
                        ))}

                        <div
                          onMouseEnter={(e) => handleMouseEnter(task, e)}
                          onMouseMove={handleMouseMove}
                          onMouseLeave={handleMouseLeave}
                          style={{
                            position: 'absolute', left: x - 60,
                            top: '50%', transform: 'translateY(-50%)',
                            height: '28px', width: '120px', borderRadius: '6px',
                            background: color, opacity: isComplete ? 0.5 : 1,
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.15)'
                          }}
                        >
                          <div style={{
                            position: 'absolute', left: 0, top: 0, bottom: 0,
                            width: `${percent}%`, background: 'rgba(255,255,255,0.25)',
                            transition: 'width 0.3s'
                          }} />
                          <span style={{
                            fontSize: '0.7rem', color: 'white', fontWeight: 600,
                            padding: '0 8px', position: 'relative', zIndex: 1,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                          }}>
                            {isComplete ? '✓ ' : ''}{task.title}
                          </span>
                        </div>

                        <div style={{
                          position: 'absolute', left: x + dayWidth / 2 - 1,
                          top: '50%', transform: 'translateY(-50%)',
                          width: '2px', height: '20px',
                          background: color, opacity: 0.6
                        }} />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {tasksWithNoDueDate.length > 0 && (
            <div style={{ marginTop: '1rem', background: 'white', borderRadius: '14px', border: '1px solid #f1f5f9', padding: '1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.5rem' }}>NO DUE DATE</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {tasksWithNoDueDate.map(task => (
                  <div key={task.id} style={{
                    padding: '0.3rem 0.75rem', borderRadius: '20px',
                    background: (task.areas?.color || '#6366f1') + '15',
                    color: task.areas?.color || '#6366f1',
                    fontSize: '0.8rem', fontWeight: 500,
                    border: `1px solid ${(task.areas?.color || '#6366f1')}30`
                  }}>
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredTask && (
        <div style={{
          position: 'fixed', left: hoverPos.x + 16, top: hoverPos.y - 10,
          background: 'white', border: '1px solid #e5e7eb',
          borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          padding: '1rem', minWidth: '240px', maxWidth: '300px',
          zIndex: 9999, pointerEvents: 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: hoveredTask.areas?.color || '#6366f1', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>{hoveredTask.title}</div>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{hoveredTask.areas?.name} · Due {new Date(hoveredTask.due_date).toLocaleDateString()}</div>
            </div>
          </div>

          {hoveredTask.breakdowns?.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Breakdown</span>
                <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                  {hoveredTask.breakdowns.filter(b => b.is_checked).length}/{hoveredTask.breakdowns.length}
                </span>
              </div>
              <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.4rem' }}>
                <div style={{
                  height: '100%', borderRadius: '3px',
                  background: hoveredTask.areas?.color || '#6366f1',
                  width: `${Math.round((hoveredTask.breakdowns.filter(b => b.is_checked).length / hoveredTask.breakdowns.length) * 100)}%`
                }} />
              </div>
              {hoveredTask.breakdowns.slice(0, 4).map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '3px', flexShrink: 0,
                    background: b.is_checked ? (hoveredTask.areas?.color || '#6366f1') : 'white',
                    border: `1.5px solid ${b.is_checked ? (hoveredTask.areas?.color || '#6366f1') : '#d1d5db'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {b.is_checked && <svg width="7" height="7" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: b.is_checked ? '#9ca3af' : '#374151', textDecoration: b.is_checked ? 'line-through' : 'none' }}>
                    {b.title}
                  </span>
                </div>
              ))}
              {hoveredTask.breakdowns.length > 4 && (
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                  +{hoveredTask.breakdowns.length - 4} more steps
                </div>
              )}
            </div>
          )}

          {activityLogs[hoveredTask.id]?.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Recent Activity</div>
              {activityLogs[hoveredTask.id].map(log => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#374151', flex: 1, paddingRight: '0.5rem' }}>
                    <span style={{ fontWeight: 500 }}>{log.profiles?.full_name?.split(' ')[0]}</span> — {log.action.length > 35 ? log.action.slice(0, 35) + '…' : log.action}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#9ca3af', flexShrink: 0 }}>{timeAgo(log.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}