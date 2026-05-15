import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

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
import { supabase } from '../supabase'

// ─── Date helper ──────────────────────────────────────────────────────────────
function addDaysToStr(dateStr, days) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// ─── Main Gantt Chart ─────────────────────────────────────────────────────────
export default function GanttChart() {
  const [searchParams] = useSearchParams()
  const {
    profile, tasks, setTasks, users, loading,
    activityLogs, fetchActivityLog,
  } = useGanttData()

  const [hoveredTask,    setHoveredTask]    = useState(null)
  const [hoverPos,       setHoverPos]       = useState({ x: 0, y: 0 })
  const [filterUser,     setFilterUser]     = useState(searchParams.get('user') || 'all')
  const [filterArea,     setFilterArea]     = useState('all')
  const [expandedTasks,  setExpandedTasks]  = useState({})
  const [schedulingTask, setSchedulingTask] = useState(null)
  const [selectedTask,   setSelectedTask]   = useState(null)
  const [sortBy,         setSortBy]         = useState('due_asc')

  const containerRef      = useRef(null)
  const timelineScrollRef = useRef(null)

  // All tasks passing the current filters (with AND without dates), sorted for display
  const allFilteredTasks = tasks.filter(t => matchesFilters(t, { filterUser, filterArea }))

  // Sort all tasks — undated tasks naturally fall to the end on date-based sorts
  const sortedAllTasks = sortTasks(allFilteredTasks, sortBy)

  // Only dated tasks matter for computing the timeline date range
  const datedTasks = sortedAllTasks.filter(t => t.due_date)

  const { minDate, maxDate, today } = computeDateRange(datedTasks)
  const totalDays = Math.max(Math.ceil((maxDate - minDate) / 86400000), 60)
  const months    = buildMonthRow(minDate, maxDate, DAY_WIDTH)
  const days      = buildDayList(minDate, totalDays)
  const todayX    = Math.floor((today - minDate) / 86400000) * DAY_WIDTH

  // Auto-scroll to today on first load
  useEffect(() => {
    if (!timelineScrollRef.current || loading) return
    timelineScrollRef.current.scrollLeft = Math.max(0, todayX - 80)
  }, [loading]) // eslint-disable-line

  // ── Hover helpers ──────────────────────────────────────────────────────────
  const hover = {
    onEnter: (task, e) => {
      setHoveredTask(task)
      setHoverPos({ x: e.clientX, y: e.clientY })
      fetchActivityLog(task.id)
    },
    onMove:  e  => setHoverPos({ x: e.clientX, y: e.clientY }),
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

  // ── Save dates (from bar drag/resize or label drop) ───────────────────────
  const handleSaveDates = useCallback(async (taskId, newStart, newDue, deltaDays) => {
    const updates = {}
    if (newStart !== undefined) updates.start_date = newStart
    if (newDue   !== undefined) updates.due_date   = newDue

    // Optimistic local update
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      const updatedT = { ...t, ...updates }
      if (deltaDays !== null && deltaDays !== 0) {
        updatedT.breakdowns = t.breakdowns?.map(b => ({
          ...b,
          start_date: b.start_date ? addDaysToStr(b.start_date, deltaDays) : null,
          end_date:   b.end_date   ? addDaysToStr(b.end_date,   deltaDays) : null,
        }))
      }
      return updatedT
    }))

    // Persist task
    await supabase.from('tasks').update(updates).eq('id', taskId)

    // If moving, also shift breakdown dates in DB
    if (deltaDays !== null && deltaDays !== 0) {
      const task = tasks.find(t => t.id === taskId)
      for (const b of task?.breakdowns?.filter(b => b.start_date || b.end_date) || []) {
        const bUp = {}
        if (b.start_date) bUp.start_date = addDaysToStr(b.start_date, deltaDays)
        if (b.end_date)   bUp.end_date   = addDaysToStr(b.end_date,   deltaDays)
        await supabase.from('breakdowns').update(bUp).eq('id', b.id)
      }
    }
  }, [tasks, setTasks])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ color: '#6b7280' }}>Loading…</div>
    </div>
  )

  const noDateCount = sortedAllTasks.filter(t => !t.due_date).length

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>
      <GanttSidebar profile={profile} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', background: 'white' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>📅 Gantt Chart</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            {datedTasks.length} scheduled
            {noDateCount > 0 && ` · ${noDateCount} unscheduled — drag from the left bar onto the timeline`}
            {' · '}drag bars to reschedule
          </p>
        </div>

        <FilterBar
          users={users}
          filterUser={filterUser} setFilterUser={setFilterUser}
          filterArea={filterArea} setFilterArea={setFilterArea}
          sortBy={sortBy} setSortBy={setSortBy}
          filteredCount={datedTasks.length}
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
          {sortedAllTasks.length === 0 ? (
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
              allTasks={sortedAllTasks}
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
              onSaveDates={handleSaveDates}
            />
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
