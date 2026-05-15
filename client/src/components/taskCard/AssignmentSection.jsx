import { useState } from 'react'
import { supabase } from '../../supabase'
import UserAvatar from './UserAvatar'
import { autoAssignTask } from '../../utils/autoAssign'

// ─── Assigned-users avatars + slot-aware assign UI ───────────────────────────
export default function AssignmentSection({ task, assignments, setAssignments, userRole, onAssignmentChange }) {
  const [showAssign, setShowAssign] = useState(false)
  const [users, setUsers] = useState([])
  const [filterAreaId, setFilterAreaId] = useState('all')
  const [autoFilling, setAutoFilling] = useState(false)
  const [autoMessage, setAutoMessage] = useState(null)
  const [concurrencyMap, setConcurrencyMap] = useState({}) // userId -> concurrent count

  const slots = task.task_area_slots || []     // [{ area_id, required_count, areas }]

  const taskEnd = task.due_date ? new Date(task.due_date + 'T00:00:00') : null
  const taskStart = task.start_date ? new Date(task.start_date + 'T00:00:00') : null

  const loadUsers = async () => {
    const [{ data: profiles }, { data: allAssignments }] = await Promise.all([
      supabase.from('profiles')
        .select('id, full_name, role, intern_start_date, intern_end_date, user_areas(area_id, areas(name, color))'),
      supabase.from('task_assignments')
        .select('user_id, tasks(id, start_date, due_date)'),
    ])
    setUsers(profiles || [])

    // Compute concurrent task count per user during this task's period
    const map = {}
    ;(allAssignments || []).forEach(a => {
      if (!taskStart || !taskEnd) return
      const t = a.tasks
      if (!t) return
      const s = t.start_date ? new Date(t.start_date + 'T00:00:00') : null
      const e = t.due_date   ? new Date(t.due_date   + 'T00:00:00') : null
      if (!s || !e) return
      if (s <= taskEnd && e >= taskStart) {
        map[a.user_id] = (map[a.user_id] || 0) + 1
      }
    })
    setConcurrencyMap(map)
  }

  const toggleAssignment = async (user) => {
    const existing = assignments.find(a => a.profiles?.id === user.id || a.user_id === user.id)
    if (existing) {
      await supabase.from('task_assignments').delete().eq('id', existing.id)
      const next = assignments.filter(a => a.id !== existing.id)
      setAssignments(next)
      onAssignmentChange(task.id, next)
    } else {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('task_assignments')
        .insert({ task_id: task.id, user_id: user.id, assigned_by: currentUser.id })
        .select('*, profiles!task_assignments_user_id_fkey(id, full_name, role, user_areas(area_id, areas(name, color)))')
        .single()
      if (data) {
        const next = [...assignments, data]
        setAssignments(next)
        onAssignmentChange(task.id, next)
      }
    }
  }

  // ── Slot fill summary ───────────────────────────────────────────────────────
  const slotStatus = slots.map(slot => {
    const filled = assignments.filter(a => {
      const prof = a.profiles
      if (!prof) return false
      return (prof.user_areas || []).some(ua => ua.area_id === slot.area_id)
    }).length
    return { ...slot, filled }   // no cap — show actual count even if over-filled
  })

  // Area filter options derived from all unique areas across users
  const areaOptions = users.reduce((acc, u) => {
    ;(u.user_areas || []).forEach(ua => {
      if (!acc.find(a => a.area_id === ua.area_id)) {
        acc.push({ area_id: ua.area_id, name: ua.areas.name, color: ua.areas.color })
      }
    })
    return acc
  }, []).sort((a, b) => a.name.localeCompare(b.name))

  const visibleUsers = filterAreaId === 'all'
    ? users
    : users.filter(u => (u.user_areas || []).some(ua => ua.area_id === filterAreaId))

  // ── Busyness helpers ────────────────────────────────────────────────────────
  function getBusynessColor(count) {
    if (count <= 1) return { color: '#059669', bg: '#d1fae5', label: `${count} concurrent` }
    if (count === 2) return { color: '#92400e', bg: '#fef3c7', label: `${count} concurrent` }
    return { color: '#991b1b', bg: '#fee2e2', label: `${count} concurrent` }
  }

  function endsEarly(user) {
    if (!taskEnd || !user.intern_end_date) return false
    return new Date(user.intern_end_date + 'T00:00:00') < taskEnd
  }

  function startsLate(user) {
    if (!taskStart || !user.intern_start_date) return false
    return new Date(user.intern_start_date + 'T00:00:00') > taskStart
  }

  return (
    <div style={{ marginTop: '1rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>

      {/* ── Slot requirement pills ─────────────────────────────────────────── */}
      {slotStatus.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Slots needed
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.35rem' }}>
            {slotStatus.map(s => {
              const over  = s.filled > s.required_count
              const exact = s.filled === s.required_count
              const under = s.filled < s.required_count
              const color = s.areas?.color || '#6366f1'
              const style = over
                ? { border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4338ca' }
                : exact
                  ? { border: '1px solid #d1fae5', background: '#d1fae5', color: '#059669' }
                  : { border: `1px solid ${color}50`, background: color + '15', color }
              return (
                <span key={s.area_id} style={{
                  fontSize: '0.72rem', fontWeight: 600,
                  padding: '0.2rem 0.6rem', borderRadius: '20px',
                  ...style,
                }}>
                  {s.areas?.name}: {s.filled}/{s.required_count}{exact ? ' ✓' : over ? ' ↑' : ''}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Header row ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Assigned</span>
          <div style={{ display: 'flex' }}>
            {assignments.filter(a => a?.profiles).slice(0, 4).map((a, i) => (
              <UserAvatar key={a.id} profile={a.profiles} index={i} total={assignments.length} />
            ))}
            {assignments.length > 4 && (
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: '#e5e7eb', color: '#6b7280',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', fontWeight: 600,
                border: '2px solid white', marginLeft: '-6px',
              }}>
                +{assignments.length - 4}
              </div>
            )}
          </div>
        </div>
        {userRole !== 'intern' && (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {/* Auto-fill button — only shown when slot requirements exist */}
            {slots.length > 0 && (
              <button
                onClick={async () => {
                  setAutoFilling(true)
                  setAutoMessage(null)
                  const result = await autoAssignTask(task, assignments)
                  if (result.newAssignments.length > 0) {
                    const next = [...assignments, ...result.newAssignments]
                    setAssignments(next)
                    onAssignmentChange(task.id, next)
                    const earlyNote = result.skippedEarlyEnd > 0
                      ? ` · ${result.skippedEarlyEnd} skipped (placement ends early)`
                      : ''
                    setAutoMessage({ type: 'success', text: `Auto-assigned ${result.assigned} intern${result.assigned !== 1 ? 's' : ''}${earlyNote}` })
                  } else {
                    setAutoMessage({ type: 'warn', text: result.message || 'No interns assigned' })
                  }
                  setAutoFilling(false)
                  setTimeout(() => setAutoMessage(null), 5000)
                }}
                disabled={autoFilling}
                style={{
                  fontSize: '0.75rem', padding: '0.3rem 0.65rem',
                  background: autoFilling ? '#f3f4f6' : '#f0fdf4',
                  color: autoFilling ? '#9ca3af' : '#059669',
                  border: '1px solid #d1fae5',
                  borderRadius: '6px', cursor: autoFilling ? 'default' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {autoFilling ? '…' : '⚡ Auto-fill'}
              </button>
            )}
            <button
              onClick={() => { setShowAssign(!showAssign); if (!showAssign) loadUsers() }}
              style={{
                fontSize: '0.8rem', padding: '0.3rem 0.75rem',
                background: showAssign ? '#f3f4f6' : '#6366f1',
                color: showAssign ? '#6b7280' : 'white',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
              }}
            >
              {showAssign ? 'Close' : '+ Assign'}
            </button>
          </div>
        )}
      </div>

      {/* ── Auto-fill feedback ───────────────────────────────────────────── */}
      {autoMessage && (
        <div style={{
          marginTop: '0.5rem', padding: '0.4rem 0.75rem',
          borderRadius: '7px', fontSize: '0.75rem', fontWeight: 600,
          background: autoMessage.type === 'success' ? '#f0fdf4' : '#fffbeb',
          color:      autoMessage.type === 'success' ? '#059669'  : '#92400e',
          border:     `1px solid ${autoMessage.type === 'success' ? '#d1fae5' : '#fde68a'}`,
        }}>
          {autoMessage.type === 'success' ? '✓ ' : '⚠ '}{autoMessage.text}
        </div>
      )}

      {/* ── Assign panel ──────────────────────────────────────────────────── */}
      {showAssign && (
        <div style={{ marginTop: '0.75rem' }}>

          {/* Area filter tabs */}
          {areaOptions.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.6rem' }}>
              <button
                onClick={() => setFilterAreaId('all')}
                style={{
                  fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '20px', cursor: 'pointer',
                  border: `1px solid ${filterAreaId === 'all' ? '#6366f1' : '#e5e7eb'}`,
                  background: filterAreaId === 'all' ? '#6366f115' : 'white',
                  color: filterAreaId === 'all' ? '#6366f1' : '#6b7280',
                  fontWeight: 600,
                }}
              >All</button>
              {areaOptions.map(a => {
                const hasSlot    = slots.some(s => s.area_id === a.area_id)
                const isActive   = filterAreaId === a.area_id
                return (
                  <button
                    key={a.area_id}
                    onClick={() => setFilterAreaId(a.area_id)}
                    style={{
                      fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '20px', cursor: 'pointer',
                      border: `1px solid ${isActive ? a.color : hasSlot ? a.color + '60' : '#e5e7eb'}`,
                      background: isActive ? a.color + '15' : hasSlot ? a.color + '08' : 'white',
                      color: isActive ? a.color : hasSlot ? a.color : '#9ca3af',
                      fontWeight: hasSlot || isActive ? 700 : 500,
                    }}
                  >
                    {hasSlot ? '● ' : ''}{a.name}
                  </button>
                )
              })}
            </div>
          )}

          {/* User list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '220px', overflowY: 'auto' }}>
            {[...visibleUsers]
              .sort((a, b) => {
                const aMatch = (a.user_areas || []).some(ua => slots.some(s => s.area_id === ua.area_id))
                const bMatch = (b.user_areas || []).some(ua => slots.some(s => s.area_id === ua.area_id))
                if (aMatch && !bMatch) return -1
                if (!aMatch && bMatch) return 1
                return (a.full_name || '').localeCompare(b.full_name || '')
              })
              .map(user => {
                const isAssigned  = assignments.some(a => a.profiles?.id === user.id || a.user_id === user.id)
                const userAreas   = user.user_areas || []
                const slotAreaIds = new Set(slots.map(s => s.area_id))
                const hasMatch    = userAreas.some(ua => slotAreaIds.has(ua.area_id))
                const matchingArea    = userAreas.find(ua => slotAreaIds.has(ua.area_id))?.areas
                const avatarColor     = hasMatch ? (matchingArea?.color || '#6366f1') : '#9ca3af'

                // Busyness + placement checks
                const concurrent   = concurrencyMap[user.id] || 0
                const busyness     = getBusynessColor(concurrent)
                const isEarlyEnd   = endsEarly(user)
                const isLateStart  = startsLate(user)
                const placementBad = isEarlyEnd || isLateStart

                return (
                  <button
                    key={user.id}
                    onClick={() => toggleAssignment(user)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.4rem 0.65rem', borderRadius: '8px', cursor: 'pointer',
                      border: `1px solid ${isAssigned ? '#d1fae5' : placementBad ? '#fde68a' : hasMatch ? '#f0f0ff' : '#f3f4f6'}`,
                      background: isAssigned ? '#f0fdf4' : placementBad ? '#fffbeb' : hasMatch ? '#fafafe' : '#fafafa',
                      textAlign: 'left', width: '100%',
                      opacity: hasMatch || isAssigned || slots.length === 0 ? 1 : 0.45,
                      transition: 'all 0.12s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      {/* Avatar */}
                      <div style={{
                        width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                        background: avatarColor + '25',
                        color: avatarColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 700,
                        border: `1.5px solid ${avatarColor + '60'}`,
                      }}>
                        {user.full_name?.charAt(0).toUpperCase() || '?'}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 500, color: hasMatch || slots.length === 0 ? '#111827' : '#9ca3af' }}>
                          {user.full_name}
                        </div>

                        {/* Area chips + badges */}
                        <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.15rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          {userAreas.map(ua => {
                            const isSlotMatch = slotAreaIds.has(ua.area_id)
                            const chipColor   = isSlotMatch ? (ua.areas?.color || '#6366f1') : '#d1d5db'
                            const chipBg      = isSlotMatch ? chipColor + '18' : '#f3f4f6'
                            return (
                              <span key={ua.area_id} style={{
                                fontSize: '0.63rem', padding: '0.1rem 0.4rem',
                                borderRadius: '8px', fontWeight: isSlotMatch ? 700 : 400,
                                background: chipBg, color: chipColor,
                                border: isSlotMatch ? `1px solid ${chipColor}40` : '1px solid #e5e7eb',
                              }}>
                                {ua.areas?.name}
                              </span>
                            )
                          })}

                          {/* Busyness badge — shown when dates are set on task */}
                          {(taskStart && taskEnd) && (
                            <span style={{
                              fontSize: '0.6rem', padding: '0.1rem 0.35rem',
                              borderRadius: '8px', fontWeight: 700,
                              background: busyness.bg, color: busyness.color,
                            }}>
                              {concurrent === 0 ? 'Free' : `${concurrent} proj`}
                            </span>
                          )}

                          {/* Late-start warning */}
                          {isLateStart && (
                            <span style={{
                              fontSize: '0.6rem', padding: '0.1rem 0.35rem',
                              borderRadius: '8px', fontWeight: 700,
                              background: '#fef3c7', color: '#92400e',
                              border: '1px solid #fde68a',
                            }}>
                              ⚠ Starts late
                            </span>
                          )}

                          {/* Early-end warning */}
                          {isEarlyEnd && (
                            <span style={{
                              fontSize: '0.6rem', padding: '0.1rem 0.35rem',
                              borderRadius: '8px', fontWeight: 700,
                              background: '#fef3c7', color: '#92400e',
                              border: '1px solid #fde68a',
                            }}>
                              ⚠ Ends early
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.5rem',
                      borderRadius: '20px', flexShrink: 0, marginLeft: '0.4rem',
                      background: isAssigned ? '#d1fae5' : hasMatch ? avatarColor + '15' : '#f3f4f6',
                      color: isAssigned ? '#059669' : hasMatch ? avatarColor : '#9ca3af',
                    }}>
                      {isAssigned ? 'Assigned ✓' : 'Assign'}
                    </span>
                  </button>
                )
              })}
            {visibleUsers.length === 0 && (
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', padding: '0.75rem' }}>
                No users in this area
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
