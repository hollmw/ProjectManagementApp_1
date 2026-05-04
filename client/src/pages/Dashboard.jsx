import { useState } from 'react'

import NewTaskModal from '../components/NewTaskModal'
import TaskCard from '../components/TaskCard'

import DashboardSidebar from './dashboard/DashboardSidebar'
import FilterBar from './dashboard/FilterBar'
import useDashboardData from './dashboard/useDashboardData'
import { filterTasks, sortTasks } from './dashboard/filtering'
import { supabase } from '../supabase'

function NotionIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="18" fill="white"/>
      <path d="M21.2 18.9c3.4 2.8 4.7 2.6 11.1 2.2l60.4-3.6c1.3 0 .2-1.3-.4-1.5l-10.2-7.4C80.1 7.3 78 6.8 75.6 7.1L17.2 11.3c-2.2.2-2.6 1.3-1.7 2.2l5.7 5.4zM24.5 31v63.2c0 3.4 1.7 4.7 5.5 4.5l66.3-3.8c3.8-.2 4.7-2.4 4.7-5.1V26.8c0-2.7-1.1-4.1-3.4-3.9L28.4 26.5c-2.5.2-3.9 1.6-3.9 4.5zm62.8 3.8c.4 1.8 0 3.6-1.8 3.8l-3 .6v44c-2.6 1.3-5 2-7 2-3.3 0-4.1-1-6.5-4.1L47.8 54.5v36.7l6.7 1.5s0 3.6-5 3.8L34 97.4c-.4-.8 0-2.8 1.4-3.2l3.6-1V47.2L34 46.9c-.4-1.8.6-4.4 3.4-4.6l16.5-1.1 24 36.7V43.6l-5.6-.6c-.4-2.2 1.3-3.8 3.4-4l14.6-.8z" fill="black"/>
    </svg>
  )
}

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
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(null) // { done, total }

  const handleSyncAll = async () => {
    if (syncing || tasks.length === 0) return
    setSyncing(true)
    setSyncProgress({ done: 0, total: tasks.length })
    for (let i = 0; i < tasks.length; i++) {
      try {
        await supabase.functions.invoke('sync-to-notion', { body: { task_id: tasks[i].id } })
      } catch (e) {
        console.warn('[Sync all] failed for task', tasks[i].id, e)
      }
      setSyncProgress({ done: i + 1, total: tasks.length })
    }
    setSyncing(false)
    setSyncProgress(null)
    fetchTasks()
  }

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
            {/* Sync All to Notion */}
            <button
              onClick={handleSyncAll}
              disabled={syncing || tasks.length === 0}
              title="Sync all tasks to Notion"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.65rem 1.1rem',
                background: syncing ? '#f9fafb' : 'white',
                color: '#374151', border: '1px solid #e5e7eb',
                borderRadius: '10px', fontSize: '0.875rem',
                fontWeight: 500, cursor: syncing ? 'default' : 'pointer',
                opacity: tasks.length === 0 ? 0.4 : 1,
                transition: 'box-shadow 0.15s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
              onMouseEnter={e => { if (!syncing) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' }}
            >
              <NotionIcon size={15} />
              {syncing && syncProgress
                ? `Syncing ${syncProgress.done}/${syncProgress.total}…`
                : 'Sync all to Notion'}
            </button>

            {profile.role !== 'intern' && (
              <button onClick={() => setShowModal(true)} style={{
                padding: '0.65rem 1.25rem',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white', border: 'none', borderRadius: '10px',
                fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
              }}>
                + New Task
              </button>
            )}
          </div>
        </div>

        <FilterBar
          search={search} setSearch={setSearch}
          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
          sortBy={sortBy} setSortBy={setSortBy}
          filteredCount={filteredTasks.length}
        />

        {/* Task Cards */}
        {filteredTasks.length === 0 ? (
          <div style={{
            background: 'white', borderRadius: '14px', padding: '3rem 2rem',
            textAlign: 'center', color: '#9ca3af',
            border: '1px solid #f1f5f9',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>
              {tasks.length === 0 ? '📋' : '🔍'}
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#6b7280' }}>
              {tasks.length === 0 ? 'No tasks yet' : 'No tasks match your filters'}
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
              {tasks.length === 0 ? 'Click + New Task to create one' : 'Try adjusting your filters'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.85rem' }}>
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
