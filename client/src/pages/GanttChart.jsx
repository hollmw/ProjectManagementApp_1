import { useState, useEffect, useRef } from 'react'

import GanttSidebar from './gantt/GanttSidebar'
import FilterBar from './gantt/FilterBar'
import TimelineGrid from './gantt/TimelineGrid'
import HoverTooltip from './gantt/HoverTooltip'
import TaskDetailPanel from './gantt/TaskDetailPanel'
import BreakdownScheduler from './gantt/BreakdownScheduler'
import useGanttData from './gantt/useGanttData'
import { DAY_WIDTH } from './gantt/constants'
import {
  timeAgo, sortTasks, matchesFilters,
  computeDateRange, buildMonthRow, buildDayList,
} from './gantt/utils'

// ─── Main Gantt Chart ──────────────────────────────────────────────────────────
export default function GanttChart() {
  const {
    profile, tasks, setTasks, users, loading,
    activityLogs, fetchActivityLog,
  } = useGanttData()

  const [hoveredTask, setHoveredTask] = useState(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const [filterUser, setFilterUser] = useState('all')
  const [filterArea, setFilterArea] = useState('all')
  const [expandedTasks, setExpandedTasks] = useState({})
  const [schedulingTask, setSchedulingTask] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [sortBy, setSortBy] = useState('due_asc')
  const containerRef = useRef(null)
  const timelineScrollRef = useRef(null)

  // Auto-scroll timeline so today is visible on first render.
  useEffect(() => {
    if (!timelineScrollRef.current) return
    const now = new Date()
    const allDates = tasks.flatMap(t => [
      t.start_date ? new Date(t.start_date) : null,
      t.due_date ? new Date(t.due_date) : null,
      ...(t.breakdowns || []).flatMap(b => [
        b.start_date ? new Date(b.start_date) : null,
        b.end_date ? new Date(b.end_date) : null,
      ])
    ]).filter(Boolean)
    const earliest = allDates.length > 0
      ? new Date(Math.min(...allDates.map(d => d.getTime())))
      : now
    const minDate = new Date(Math.min(
      now.getTime() - 3 * 86400000,
      earliest.getTime() - 7 * 86400000,
    ))
    const todayX = Math.floor((now - minDate) / 86400000) * DAY_WIDTH
    timelineScrollRef.current.scrollLeft = Math.max(0, todayX - 60)
  }, [loading, tasks])

  const hover = {
    onEnter: (task, e) => {
      setHoveredTask(task)
      setHoverPos({ x: e.clientX, y: e.clientY })
      fetchActivityLog(task.id)
    },
    onMove: (e) => setHoverPos({ x: e.clientX, y: e.clientY }),
    onLeave: () => setHoveredTask(null),
  }

  const handleTaskClick = (task) => {
    setSelectedTask(task)
    fetchActivityLog(task.id)
  }

  const handleScheduleSave = (taskId, updatedBreakdowns) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, breakdowns: updatedBreakdowns } : t
    ))
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ color: '#6b7280' }}>Loading…</div>
    </div>
  )

  const tasksWithDue = tasks.filter(t => t.due_date)
  const tasksWithoutDue = tasks.filter(t => !t.due_date)

  const filteredTasks = sortTasks(
    tasksWithDue.filter(t => matchesFilters(t, { filterUser, filterArea })),
    sortBy,
  )
  const tasksWithNoDueDate = tasksWithoutDue.filter(t =>
    matchesFilters(t, { filterUser, filterArea })
  )

  const { minDate, maxDate, today } = computeDateRange(filteredTasks)
  const totalDays = Math.ceil((maxDate - minDate) / 86400000)
  const months = buildMonthRow(minDate, maxDate, DAY_WIDTH)
  const days = buildDayList(minDate, totalDays)
  const todayX = Math.floor((today - minDate) / 86400000) * DAY_WIDTH

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>
      <GanttSidebar profile={profile} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', background: 'white' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>📅 Gantt Chart</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            {filteredTasks.length} tasks with due dates
            {tasksWithNoDueDate.length > 0 && ` · ${tasksWithNoDueDate.length} without due date`}
            {' · '}Click a task bar to view activity & schedule
          </p>
        </div>

        <FilterBar
          users={users}
          filterUser={filterUser} setFilterUser={setFilterUser}
          filterArea={filterArea} setFilterArea={setFilterArea}
          sortBy={sortBy} setSortBy={setSortBy}
          filteredCount={filteredTasks.length}
        />

        {/* Gantt area */}
        <div
          ref={containerRef}
          style={{
            flex: 1, overflow: 'hidden', position: 'relative',
            display: 'flex', flexDirection: 'column',
            padding: '1.5rem 2rem', gap: '1rem', minHeight: 0,
          }}
        >
          {filteredTasks.length === 0 ? (
            <div style={{
              background: 'white', borderRadius: '14px', padding: '3rem 2rem',
              textAlign: 'center', color: '#9ca3af', border: '1px solid #f1f5f9',
              flex: 1,
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📅</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#6b7280' }}>
                No tasks match your filters
              </div>
            </div>
          ) : (
            <TimelineGrid
              scrollRef={timelineScrollRef}
              tasks={filteredTasks}
              expandedTasks={expandedTasks}
              setExpandedTasks={setExpandedTasks}
              days={days}
              months={months}
              totalDays={totalDays}
              todayX={todayX}
              minDate={minDate}
              today={today}
              hover={hover}
              onTaskClick={handleTaskClick}
            />
          )}

          {/* Tasks with no due date */}
          {tasksWithNoDueDate.length > 0 && (
            <div style={{
              marginTop: '1rem', background: 'white', borderRadius: '14px',
              border: '1px solid #f1f5f9', padding: '1rem 1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.5rem' }}>
                NO DUE DATE
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {tasksWithNoDueDate.map(task => (
                  <div key={task.id} style={{
                    padding: '0.3rem 0.75rem', borderRadius: '20px',
                    background: (task.areas?.color || '#6366f1') + '15',
                    color: task.areas?.color || '#6366f1',
                    fontSize: '0.8rem', fontWeight: 500,
                    border: `1px solid ${(task.areas?.color || '#6366f1')}30`,
                  }}>
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <HoverTooltip
        task={hoveredTask}
        position={hoverPos}
        activityLog={hoveredTask ? activityLogs[hoveredTask.id] : null}
        timeAgo={timeAgo}
      />

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          activityLog={activityLogs[selectedTask.id]}
          onClose={() => setSelectedTask(null)}
          onOpenScheduler={() => { setSchedulingTask(selectedTask); setSelectedTask(null) }}
          timeAgo={timeAgo}
        />
      )}

      {schedulingTask && (
        <BreakdownScheduler
          task={schedulingTask}
          onClose={() => setSchedulingTask(null)}
          onSave={handleScheduleSave}
        />
      )}
    </div>
  )
}
