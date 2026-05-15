import { supabase } from '../../supabase'
import { logActivity } from '../../utils/logActivity'
import { fmtShort, fmtFull } from './utils'

// ─── Fire-and-forget Notion sync (won't block the UI) ────────────────────────
async function syncToNotion(taskId) {
  try {
    await supabase.functions.invoke('sync-to-notion', { body: { task_id: taskId } })
  } catch (err) {
    console.warn('[Notion auto-sync]', err)
  }
}

// Save task_area_slots — delete all existing then re-insert
async function saveAreaSlots(taskId, areaSlots) {
  await supabase.from('task_area_slots').delete().eq('task_id', taskId)
  const rows = Object.entries(areaSlots)
    .filter(([, count]) => count > 0)
    .map(([area_id, required_count]) => ({ task_id: taskId, area_id, required_count }))
  if (rows.length > 0) {
    await supabase.from('task_area_slots').insert(rows)
  }
}

// Save task_areas — delete all then re-insert
async function saveTaskAreas(taskId, areaIds) {
  await supabase.from('task_areas').delete().eq('task_id', taskId)
  if (areaIds.length > 0) {
    await supabase.from('task_areas').insert(
      areaIds.map(area_id => ({ task_id: taskId, area_id }))
    )
  }
}

// Persist a new or edited task plus its breakdowns. Logs activity for any
// task-level or breakdown-level date changes when editing.
export async function saveTask({ editingTask, fields, breakdowns, areaSlots = {}, profile }) {
  const { title, description, selectedAreaIds = [], dueDate, startDate, priority } = fields
  const primaryAreaId = selectedAreaIds[0] || null
  const { data: { user } } = await supabase.auth.getUser()

  if (editingTask) {
    await supabase.from('tasks').update({
      title, description, area_id: primaryAreaId,
      due_date: dueDate || null, start_date: startDate || null,
      priority: priority || 'medium',
    }).eq('id', editingTask.id)

    await saveTaskAreas(editingTask.id, selectedAreaIds)
    await saveAreaSlots(editingTask.id, areaSlots)

    // Sync updated task to Notion in the background
    syncToNotion(editingTask.id)

    // Log task-level date changes
    const oldStart = editingTask.start_date || ''
    const oldDue = editingTask.due_date || ''
    if (oldStart !== (startDate || '') || oldDue !== (dueDate || '')) {
      await logActivity(
        user.id,
        `Updated dates on "${title}" — start: ${fmtFull(startDate)}, due: ${fmtFull(dueDate)}`,
        editingTask.id,
        0,
      )
    }

    // Snapshot before deleting so we can detect breakdown date changes
    const oldBreakdowns = [...(editingTask.breakdowns || [])]
      .sort((a, b) => a.order_index - b.order_index)

    await supabase.from('breakdowns').delete().eq('task_id', editingTask.id)

    const valid = breakdowns.filter(b => b.title.trim())
    if (valid.length > 0) {
      await supabase.from('breakdowns').insert(
        valid.map((b, i) => ({
          task_id: editingTask.id,
          title: b.title,
          is_checked: b.is_checked,
          order_index: i,
          start_date: b.start_date || null,
          end_date: b.end_date || null,
        })),
      )
    }

    // Log any breakdown date changes
    for (const b of valid) {
      const old = oldBreakdowns.find(o => o.title === b.title)
      if (!old) continue
      const oldS = old.start_date || ''
      const oldE = old.end_date || ''
      const newS = b.start_date || ''
      const newE = b.end_date || ''
      if (oldS !== newS || oldE !== newE) {
        await logActivity(
          user.id,
          `Rescheduled step "${b.title}" on "${title}" — ${fmtShort(newS)} to ${fmtShort(newE)}`,
          editingTask.id,
          0,
        )
      }
    }
    return
  }

  // Create flow
  const { data: task, error } = await supabase.from('tasks')
    .insert({
      title, description, area_id: primaryAreaId,
      due_date: dueDate || null, start_date: startDate || null,
      priority: priority || 'medium',
      created_by: user.id,
    })
    .select().single()

  if (!error && task) {
    await saveTaskAreas(task.id, selectedAreaIds)
    await saveAreaSlots(task.id, areaSlots)
    const valid = breakdowns.filter(b => b.title.trim())
    if (valid.length > 0) {
      await supabase.from('breakdowns').insert(
        valid.map((b, i) => ({
          task_id: task.id,
          title: b.title,
          is_checked: false,
          order_index: i,
          start_date: b.start_date || null,
          end_date: b.end_date || null,
        })),
      )
    }

    // Auto-assign the creator if they're not an admin
    if (profile?.role !== 'admin') {
      await supabase.from('task_assignments').insert({
        task_id: task.id,
        user_id: user.id,
      })
    }

    // Sync new task to Notion in the background (small delay so breakdowns are committed)
    setTimeout(() => syncToNotion(task.id), 500)
  }
}
