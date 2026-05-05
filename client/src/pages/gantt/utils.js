// Pure helpers used by the Gantt chart and its sub-components.

// Re-export from shared utils so all pages use one canonical implementation
export { timeAgo } from '../../utils/dateUtils'

export function progressPercent(breakdowns) {
  const total = breakdowns?.length || 0
  if (total === 0) return 0
  const checked = breakdowns.filter(b => b.is_checked).length
  return Math.round((checked / total) * 100)
}

const SORTERS = {
  due_asc:  (a, b) => new Date(a.due_date) - new Date(b.due_date),
  due_desc: (a, b) => new Date(b.due_date) - new Date(a.due_date),
  start_asc:  (a, b) => new Date(a.start_date || a.due_date) - new Date(b.start_date || b.due_date),
  start_desc: (a, b) => new Date(b.start_date || b.due_date) - new Date(a.start_date || a.due_date),
  progress_asc:  (a, b) => progressPercent(a.breakdowns) - progressPercent(b.breakdowns),
  progress_desc: (a, b) => progressPercent(b.breakdowns) - progressPercent(a.breakdowns),
  title_asc:  (a, b) => a.title.localeCompare(b.title),
  title_desc: (a, b) => b.title.localeCompare(a.title),
  area: (a, b) => (a.areas?.name || '').localeCompare(b.areas?.name || ''),
}

export function sortTasks(tasks, sortBy) {
  const fn = SORTERS[sortBy] || (() => 0)
  return [...tasks].sort(fn)
}

export function matchesFilters(task, { filterUser, filterArea }) {
  const matchesArea = filterArea === 'all' || task.areas?.name === filterArea
  const matchesUser = filterUser === 'all' ||
    task.task_assignments?.some(a => a.user_id === filterUser)
  return matchesArea && matchesUser
}

// Parse a YYYY-MM-DD string as local midnight (avoids UTC-offset day shifts).
function localMidnight(dateStr) {
  return new Date(dateStr + 'T00:00:00')
}

// Collect every meaningful date attached to a list of tasks.
export function collectTaskDates(tasks) {
  return tasks.flatMap(t => [
    t.start_date ? localMidnight(t.start_date) : null,
    t.due_date   ? localMidnight(t.due_date)   : null,
    ...(t.breakdowns || []).flatMap(b => [
      b.start_date ? localMidnight(b.start_date) : null,
      b.end_date   ? localMidnight(b.end_date)   : null,
    ]),
  ]).filter(Boolean)
}

// Compute the chart's [minDate, maxDate] envelope for a list of tasks.
export function computeDateRange(tasks) {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // normalise to local midnight
  const allDates = collectTaskDates(tasks)
  const earliest = allDates.length > 0
    ? new Date(Math.min(...allDates.map(d => d.getTime())))
    : today
  const minDate = new Date(Math.min(
    today.getTime() - 3 * 86400000,
    earliest.getTime() - 7 * 86400000,
  ))
  minDate.setHours(0, 0, 0, 0) // keep it at local midnight
  const maxDate = allDates.length > 0
    ? new Date(Math.max(...allDates.map(d => d.getTime())))
    : new Date(today.getTime() + 30 * 86400000)
  maxDate.setDate(maxDate.getDate() + 7)
  return { minDate, maxDate, today }
}

export function buildMonthRow(minDate, maxDate, dayWidth) {
  const months = []
  const current = new Date(minDate)
  while (current <= maxDate) {
    months.push({
      label: current.toLocaleString('default', { month: 'short', year: 'numeric' }),
      offset: Math.floor((current - minDate) / 86400000) * dayWidth,
    })
    current.setMonth(current.getMonth() + 1)
    current.setDate(1)
  }
  return months
}

export function buildDayList(minDate, totalDays) {
  const days = []
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(minDate)
    d.setDate(d.getDate() + i)
    days.push(d)
  }
  return days
}

export function dateToX(dateStr, minDate, dayWidth) {
  if (!dateStr) return null
  return Math.floor((new Date(dateStr + 'T00:00:00') - minDate) / 86400000) * dayWidth
}
