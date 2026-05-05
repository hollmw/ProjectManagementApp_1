/**
 * Shared date helpers used across pages and components.
 * Centralising these avoids copy-pasted implementations diverging over time.
 */

/**
 * Returns a human-readable "time ago" string for a UTC timestamp string.
 * Appends 'Z' so JS treats the raw DB string as UTC, not local time.
 */
export function timeAgo(dateStr) {
  const seconds = Math.floor((new Date() - new Date(dateStr + 'Z')) / 1000)
  if (seconds < 60)    return 'just now'
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

/**
 * Parses a YYYY-MM-DD date string as local midnight, avoiding UTC-offset
 * day-shift bugs that occur when passing the string directly to new Date().
 */
export function localDate(str) {
  return str ? new Date(str + 'T00:00:00') : null
}

/**
 * Formats a YYYY-MM-DD string to a short human date, e.g. "5 May".
 */
export function fmtDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
  })
}

/** Returns true if all breakdowns are checked, or status === 'done'. */
export function isCompleted(task) {
  if (task.status === 'done') return true
  const total   = task.breakdowns?.length || 0
  const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
  return total > 0 && checked === total
}

/** Returns true if the task is past its due date and not completed. */
export function isOverdue(task) {
  if (isCompleted(task)) return false
  const due = localDate(task.due_date)
  if (!due) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}
