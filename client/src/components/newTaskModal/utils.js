// Small helpers shared by NewTaskModal and its sub-components.

// Only treat a typed date as "complete" once the year is fully specified
// (4 digits, plausible range). Prevents the timeline from popping up while
// the user is still typing.
export function isCompleteDate(d) {
  if (!d) return false
  const year = d.split('-')[0]
  return year && year.length === 4
    && parseInt(year) >= 1900
    && parseInt(year) <= 2100
}

export function fmtShort(d) {
  return d
    ? new Date(d).toLocaleDateString('default', { day: 'numeric', month: 'short' })
    : 'none'
}

export function fmtFull(d) {
  return d
    ? new Date(d).toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'none'
}
