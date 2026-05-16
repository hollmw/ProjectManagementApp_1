import { useState } from 'react'

import NewTaskModal from '../components/NewTaskModal'
import InternTaskGrid from './dashboard/InternTaskGrid'

import DashboardSidebar from './dashboard/DashboardSidebar'
import FilterBar from './dashboard/FilterBar'
import useDashboardData from './dashboard/useDashboardData'
import { filterTasks, sortTasks } from './dashboard/filtering'
export default function Dashboard() {
  const {
    profile, tasks, setTasks,
    areaUsers, fetchAreaUsers, fetchTasks,
  } = useDashboardData()

  const [showModal, setShowModal] = useState(false)
  const [filterArea, setFilterArea] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [search, setSearch] = useState('')
  const [editingTask, setEditingTask] = useState(null)
  const [sortBy, setSortBy] = useState('newest')
  const handleDeleteTask = (taskId) => setTasks(prev => prev.filter(t => t.id !== taskId))
  const handleEditTask = (task) => { setEditingTask(task); setShowModal(true) }

  const handleBreakdownToggle = (taskId, breakdownId, newChecked) => {
    setTasks(prev => prev.map(task =>
      task.id !== taskId
        ? task
        : { ...task, breakdowns: task.breakdowns.map(b => b.id === breakdownId ? { ...b, is_checked: newChecked } : b) }
    ))
  }

  const handleReviewSaved = (taskId, reviewData) => {
    setTasks(prev => prev.map(t => t.id !== taskId ? t : { ...t, reviews: [reviewData] }))
  }

  const handleAssignmentChange = (taskId, newAssignments) => {
    setTasks(prev => prev.map(t => t.id !== taskId ? t : { ...t, task_assignments: newAssignments }))
  }

  const filteredTasks = sortTasks(
    filterTasks(tasks, { filterArea, filterStatus, search }),
    sortBy,
  )

  if (!profile) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
      <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>
      <DashboardSidebar
        profile={profile}
        tasks={tasks}
        filterArea={filterArea}
        setFilterArea={setFilterArea}
        areaUsers={areaUsers}
        fetchAreaUsers={fetchAreaUsers}
      />

      {/* Main Content */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', background: '#f8fafc' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '0.2rem' }}>Task Board</h1>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Welcome back, {profile.full_name}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button onClick={() => setShowModal(true)} style={{
                padding: '0.65rem 1.25rem',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white', border: 'none', borderRadius: '10px',
                fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
              }}>
                + New Task
              </button>
          </div>
        </div>

        {/* Filter bar — hidden for interns (they navigate via the phase sections) */}
        {profile.role !== 'intern' && (
          <FilterBar
            search={search} setSearch={setSearch}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            sortBy={sortBy} setSortBy={setSortBy}
            filteredCount={filteredTasks.length}
          />
        )}

        {/* ── Cube grid for all roles ── */}
        <InternTaskGrid
          tasks={filteredTasks}
          cardProps={{
            onBreakdownToggle: handleBreakdownToggle,
            onDelete: handleDeleteTask,
            onEdit: handleEditTask,
            onReviewSaved: handleReviewSaved,
            onAssignmentChange: handleAssignmentChange,
            userRole: profile.role,
          }}
        />
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
