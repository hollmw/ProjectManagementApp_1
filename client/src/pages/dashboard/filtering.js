// Filtering / sorting helpers for the Task Board.

function isComplete(task) {
  const total = task.breakdowns?.length || 0
  const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
  return total > 0 && checked === total
}

export function filterTasks(tasks, { filterArea, filterStatus, search }) {
  return tasks.filter(task => {
    const matchesArea = filterArea === 'All' || task.areas?.name === filterArea
    const complete = isComplete(task)
    const matchesStatus =
      filterStatus === 'All' ||
      (filterStatus === 'Complete' && complete) ||
      (filterStatus === 'Incomplete' && !complete)
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase())
    return matchesArea && matchesStatus && matchesSearch
  })
}

export function sortTasks(tasks, sortBy) {
  return [...tasks].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
    if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
    if (sortBy === 'due_date') {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date) - new Date(b.due_date)
    }
    if (sortBy === 'completion') {
      const pct = (t) => {
        const total = t.breakdowns?.length || 0
        return total > 0 ? t.breakdowns.filter(b => b.is_checked).length / total : 0
      }
      return pct(b) - pct(a)
    }
    if (sortBy === 'area') return (a.areas?.name || '').localeCompare(b.areas?.name || '')
    return 0
  })
}
