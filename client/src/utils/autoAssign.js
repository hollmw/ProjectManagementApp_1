import { supabase } from '../supabase'

/**
 * Auto-assigns interns to a task based on:
 *  - Slot requirements (task_area_slots): how many interns per area are needed
 *  - Availability: intern placement period overlaps with task date range
 *  - Placement end: skips interns whose placement ends before the task ends
 *  - Load balancing: prefer interns with fewer CONCURRENT assignments during task period
 *
 * Returns { assigned: number, newAssignments: [], message: string, skippedEarlyEnd: number }
 */
export async function autoAssignTask(task, existingAssignments = []) {
  const slots = task.task_area_slots || []
  if (!slots.length) {
    return { assigned: 0, newAssignments: [], message: 'No slot requirements set for this task.', skippedEarlyEnd: 0 }
  }

  // Fetch all interns with their areas and placement dates
  const { data: interns, error: internErr } = await supabase
    .from('profiles')
    .select('id, full_name, intern_start_date, intern_end_date, user_areas(area_id)')
    .eq('role', 'intern')

  if (internErr) return { assigned: 0, newAssignments: [], message: 'Could not load interns.', skippedEarlyEnd: 0 }

  // Fetch all task_assignments with task dates for concurrency calculation
  const { data: allAssignments } = await supabase
    .from('task_assignments')
    .select('user_id, tasks(id, start_date, due_date)')

  const taskStart = task.start_date ? new Date(task.start_date + 'T00:00:00') : null
  const taskEnd   = task.due_date   ? new Date(task.due_date   + 'T00:00:00') : null

  // Count how many of a user's existing tasks overlap with the target task period
  function getConcurrentCount(userId) {
    if (!taskStart || !taskEnd) return 0
    return (allAssignments || []).filter(a => {
      if (a.user_id !== userId) return false
      const t = a.tasks
      if (!t) return false
      const s = t.start_date ? new Date(t.start_date + 'T00:00:00') : null
      const e = t.due_date   ? new Date(t.due_date   + 'T00:00:00') : null
      if (!s || !e) return false
      return s <= taskEnd && e >= taskStart
    }).length
  }

  // Track who is already assigned to THIS task (don't double-assign)
  const alreadyOnTask = new Set(
    existingAssignments.map(a => a.profiles?.id || a.user_id).filter(Boolean)
  )

  const { data: authData } = await supabase.auth.getUser()
  const currentUserId = authData?.user?.id

  const toInsert = []
  let totalSkippedEarlyEnd  = 0
  let totalSkippedLateStart = 0

  // Sort slots: most understaffed first (fewest filled relative to required)
  const sortedSlots = [...slots].sort((a, b) => {
    const aFilled = existingAssignments.filter(x => {
      const prof = x.profiles
      return prof && (prof.user_areas || []).some(ua => ua.area_id === a.area_id)
    }).length
    const bFilled = existingAssignments.filter(x => {
      const prof = x.profiles
      return prof && (prof.user_areas || []).some(ua => ua.area_id === b.area_id)
    }).length
    // Sort by fill ratio ascending — slot with lowest fill rate gets processed first
    const aRatio = aFilled / Math.max(a.required_count, 1)
    const bRatio = bFilled / Math.max(b.required_count, 1)
    return aRatio - bRatio
  })

  for (const slot of sortedSlots) {
    // Count how many already-assigned users fill this area slot
    const alreadyFilled = existingAssignments.filter(a => {
      const prof = a.profiles
      return prof && (prof.user_areas || []).some(ua => ua.area_id === slot.area_id)
    }).length

    const needed = Math.max(0, slot.required_count - alreadyFilled)
    if (needed === 0) continue

    const eligible = []
    let skippedEarlyEnd  = 0
    let skippedLateStart = 0

    for (const intern of (interns || [])) {
      // Must belong to the required area
      if (!(intern.user_areas || []).some(ua => ua.area_id === slot.area_id)) continue

      // Must not already be assigned to this task
      if (alreadyOnTask.has(intern.id)) continue

      // Must not already be queued for assignment in this run
      if (toInsert.some(r => r.user_id === intern.id)) continue

      // Availability: placement period must cover the full task period
      if (intern.intern_start_date && intern.intern_end_date) {
        const internStart = new Date(intern.intern_start_date + 'T00:00:00')
        const internEnd   = new Date(intern.intern_end_date   + 'T00:00:00')

        // Intern hasn't started by the time the task begins — skip with warning
        if (taskStart && internStart > taskStart) {
          skippedLateStart++
          continue
        }

        // No overlap at all — skip silently
        if (taskEnd && (internStart > taskEnd || internEnd < (taskStart || taskEnd))) continue

        // Intern's placement ends before the task does — skip with warning
        if (taskEnd && internEnd < taskEnd) {
          skippedEarlyEnd++
          continue
        }
      }

      eligible.push(intern)
    }

    totalSkippedEarlyEnd  += skippedEarlyEnd
    totalSkippedLateStart += skippedLateStart

    // Sort priority:
    //  1. Specialists first — interns whose ONLY matching area is this slot's area
    //     (fewer total areas = more specific fit, preserve multi-discipline interns as wildcards)
    //  2. Fewest concurrent tasks (least busy during this period)
    //  3. Alphabetical as final tiebreaker
    eligible.sort((a, b) => {
      const aAreas = (a.user_areas || []).length
      const bAreas = (b.user_areas || []).length
      if (aAreas !== bAreas) return aAreas - bAreas   // fewer areas = specialist = goes first
      const diff = getConcurrentCount(a.id) - getConcurrentCount(b.id)
      return diff !== 0 ? diff : (a.full_name || '').localeCompare(b.full_name || '')
    })

    // Queue the top N
    eligible.slice(0, needed).forEach(intern => {
      toInsert.push({
        task_id:     task.id,
        user_id:     intern.id,
        assigned_by: currentUserId,
      })
    })
  }

  if (toInsert.length === 0) {
    const notes = []
    if (totalSkippedLateStart > 0) notes.push(`${totalSkippedLateStart} start after project`)
    if (totalSkippedEarlyEnd  > 0) notes.push(`${totalSkippedEarlyEnd} end before project finishes`)
    const noteStr = notes.length > 0 ? ` (${notes.join(', ')})` : ''
    return {
      assigned: 0,
      newAssignments: [],
      message: 'No available interns found. Check placement dates match the task period and slot requirements are set.' + noteStr,
      skippedEarlyEnd:  totalSkippedEarlyEnd,
      skippedLateStart: totalSkippedLateStart,
    }
  }

  const { data: inserted, error } = await supabase
    .from('task_assignments')
    .insert(toInsert)
    .select('*, profiles!task_assignments_user_id_fkey(id, full_name, role, user_areas(area_id, areas(name, color)))')

  if (error) return { assigned: 0, newAssignments: [], message: 'Database error: ' + error.message, skippedEarlyEnd: totalSkippedEarlyEnd, skippedLateStart: totalSkippedLateStart }

  const notes = []
  if (totalSkippedLateStart > 0) notes.push(`${totalSkippedLateStart} skipped (start after project)`)
  if (totalSkippedEarlyEnd  > 0) notes.push(`${totalSkippedEarlyEnd} skipped (end before project finishes)`)

  return {
    assigned: inserted?.length || 0,
    newAssignments: inserted || [],
    message: notes.length > 0 ? notes.join(' · ') : null,
    skippedEarlyEnd:  totalSkippedEarlyEnd,
    skippedLateStart: totalSkippedLateStart,
  }
}
