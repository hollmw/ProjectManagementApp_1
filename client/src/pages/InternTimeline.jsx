import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import AppSidebar from '../components/AppSidebar'
import { useProfile } from '../contexts/ProfileContext'

const DAY_W  = 30
const ROW_H  = 56
const LEFT_W = 210
const HDR_H  = 56   // month row (28) + day row (28)

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toDate(str) {
  return str ? new Date(str + 'T00:00:00') : null
}
function addDays(d, n) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

// How many of this user's tasks overlap with the given task's period?
function getConcurrentCount(task, allUserTasks) {
  const s = toDate(task.start_date) || toDate(task.due_date)
  const e = toDate(task.due_date)   || toDate(task.start_date)
  if (!s || !e) return 1
  return allUserTasks.filter(t => {
    if (t.id === task.id) return false
    const ts = toDate(t.start_date) || toDate(t.due_date)
    const te = toDate(t.due_date)   || toDate(t.start_date)
    if (!ts || !te) return false
    return ts <= e && te >= s
  }).length + 1  // +1 to count the task itself
}

// Color based on number of concurrent projects at that time
function busynessColor(count) {
  if (count <= 1) return '#10b981'  // green
  if (count === 2) return '#f59e0b'  // amber
  return '#ef4444'                   // red (3+)
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function InternTimeline() {
  const { profile } = useProfile()
  const navigate     = useNavigate()
  const scrollRef    = useRef(null)

  const [users,   setUsers]   = useState([])
  const [tasks,   setTasks]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)   // false = interns only

  useEffect(() => {
    const load = async () => {
      const [{ data: u }, { data: t }] = await Promise.all([
        supabase.from('profiles')
          .select('id, full_name, role, intern_start_date, intern_end_date, user_areas(area_id, areas(name, color))')
          .order('full_name'),
        supabase.from('tasks')
          .select('id, title, start_date, due_date, areas(name, color), task_areas(area_id, areas(name, color)), task_assignments(user_id)'),
      ])
      setUsers(u || [])
      setTasks(t || [])
      setLoading(false)
    }
    load()
  }, [])

  // ── Date range ──────────────────────────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const allDates = [today]
  users.forEach(u => {
    if (u.intern_start_date) allDates.push(toDate(u.intern_start_date))
    if (u.intern_end_date)   allDates.push(toDate(u.intern_end_date))
  })
  tasks.forEach(t => {
    if (t.start_date) allDates.push(toDate(t.start_date))
    if (t.due_date)   allDates.push(toDate(t.due_date))
  })

  const rawMin = new Date(Math.min(...allDates.map(d => d.getTime())))
  const rawMax = new Date(Math.max(...allDates.map(d => d.getTime())))
  const rangeStart = addDays(rawMin, -7)
  const rangeEnd   = addDays(rawMax, 14)
  const totalDays  = Math.ceil((rangeEnd - rangeStart) / 86400000)

  // Day list
  const days = Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i))

  // Month headers
  const months = []
  let cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
  while (cur <= rangeEnd) {
    const mEnd    = new Date(cur.getFullYear(), cur.getMonth() + 1, 0)
    const cStart  = new Date(Math.max(cur, rangeStart))
    const cEnd    = new Date(Math.min(mEnd, rangeEnd))
    const dayCount = Math.ceil((cEnd - cStart) / 86400000) + 1
    months.push({ label: cur.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }), width: dayCount * DAY_W })
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
  }

  const todayX = Math.floor((today - rangeStart) / 86400000) * DAY_W

  // Scroll to today on mount
  useEffect(() => {
    if (!loading && scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(0, todayX - 300)
    }
  }, [loading]) // eslint-disable-line

  // ── Visible users ───────────────────────────────────────────────────────────
  const visibleUsers = showAll ? users : users.filter(u => u.role === 'intern')

  function getUserColor(user) {
    return user.user_areas?.[0]?.areas?.color || '#6366f1'
  }

  function getUserTasks(user) {
    return tasks.filter(t =>
      t.task_assignments?.some(a => a.user_id === user.id) && (t.start_date || t.due_date)
    )
  }

  // Does intern's placement end before task ends?
  function placementEndsEarly(user, task) {
    if (!user.intern_end_date || !task.due_date) return false
    return new Date(user.intern_end_date + 'T00:00:00') < new Date(task.due_date + 'T00:00:00')
  }

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#9ca3af' }}>Loading timeline…</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>
      <AppSidebar profile={profile} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div style={{
          padding: '1.25rem 1.75rem', background: 'white',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', margin: 0 }}>
              Intern Timeline
            </h1>
            <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '0.15rem 0 0' }}>
              Click a row to open their Gantt chart &nbsp;·&nbsp; bars = assigned tasks &nbsp;·&nbsp; shaded band = placement period
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Legend */}
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', color: '#6b7280', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#10b981', display: 'inline-block' }} />
                1 project
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#f59e0b', display: 'inline-block' }} />
                2 projects
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#ef4444', display: 'inline-block' }} />
                3+ projects
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: 12, height: 8, borderRadius: 2, border: '1px dashed #9ca3af', display: 'inline-block' }} />
                Placement
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.65rem' }}>⚠</span>
                Ends early
              </span>
            </div>
            <button
              onClick={() => setShowAll(v => !v)}
              style={{
                padding: '0.4rem 0.85rem', borderRadius: '8px', cursor: 'pointer',
                border: '1px solid #e5e7eb', background: showAll ? '#6366f115' : 'white',
                color: showAll ? '#6366f1' : '#6b7280', fontSize: '0.8rem', fontWeight: 600,
              }}
            >
              {showAll ? 'Interns only' : 'Show all users'}
            </button>
          </div>
        </div>

        {/* ── Timeline body ───────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

          {/* Fixed left: user names */}
          <div style={{
            width: LEFT_W, flexShrink: 0,
            background: 'white', borderRight: '1px solid #e5e7eb',
            display: 'flex', flexDirection: 'column', zIndex: 3,
          }}>
            {/* Header spacer */}
            <div style={{ height: HDR_H, flexShrink: 0, borderBottom: '1px solid #e5e7eb', background: '#f9fafb',
              display: 'flex', alignItems: 'flex-end', padding: '0 0.75rem 0.4rem' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {visibleUsers.length} people
              </span>
            </div>
            {/* User rows */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {visibleUsers.map(user => {
                const color = getUserColor(user)
                const userTasks = getUserTasks(user)
                const assigned = userTasks.length > 0
                return (
                  <div
                    key={user.id}
                    onClick={() => navigate(`/gantt?user=${user.id}`)}
                    style={{
                      height: ROW_H, borderBottom: '1px solid #f3f4f6',
                      display: 'flex', alignItems: 'center',
                      padding: '0 0.75rem', cursor: 'pointer',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: color + '25', color, fontWeight: 700, fontSize: '0.75rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginRight: '0.55rem',
                      border: `1.5px solid ${assigned ? color : '#e5e7eb'}`,
                    }}>
                      {user.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.full_name}
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                        {(user.user_areas || []).slice(0, 2).map(ua => (
                          <span key={ua.area_id} style={{
                            fontSize: '0.58rem', padding: '0.05rem 0.3rem',
                            background: (ua.areas?.color || '#6366f1') + '20',
                            color: ua.areas?.color || '#6366f1',
                            borderRadius: '6px', fontWeight: 600,
                          }}>{ua.areas?.name}</span>
                        ))}
                        {!assigned && (
                          <span style={{ fontSize: '0.58rem', padding: '0.05rem 0.3rem', background: '#fef2f2', color: '#dc2626', borderRadius: '6px', fontWeight: 600 }}>
                            Unassigned
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#d1d5db' }}>→</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Scrollable grid */}
          <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}>
            <div style={{ width: totalDays * DAY_W, position: 'relative' }}>

              {/* ── Month header ─────────────────────────────────────────── */}
              <div style={{
                display: 'flex', height: 28, position: 'sticky', top: 0, zIndex: 10,
                background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
              }}>
                {months.map((m, i) => (
                  <div key={i} style={{
                    width: m.width, flexShrink: 0, display: 'flex', alignItems: 'center',
                    padding: '0 0.5rem', fontSize: '0.68rem', fontWeight: 700, color: '#374151',
                    borderRight: '1px solid #e5e7eb',
                  }}>{m.label}</div>
                ))}
              </div>

              {/* ── Day header ───────────────────────────────────────────── */}
              <div style={{
                display: 'flex', height: 28, position: 'sticky', top: 28, zIndex: 10,
                background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
              }}>
                {days.map((d, i) => {
                  const isToday   = d.toDateString() === today.toDateString()
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6
                  return (
                    <div key={i} style={{
                      width: DAY_W, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem',
                      color: isToday ? '#6366f1' : isWeekend ? '#d1d5db' : '#9ca3af',
                      fontWeight: isToday ? 700 : 400,
                      background: isToday ? '#eef2ff' : 'transparent',
                      borderRight: '1px solid #f3f4f6',
                    }}>
                      {d.getDate()}
                    </div>
                  )
                })}
              </div>

              {/* ── Today vertical line ──────────────────────────────────── */}
              {todayX >= 0 && (
                <div style={{
                  position: 'absolute', left: todayX + DAY_W / 2 - 1, top: HDR_H,
                  width: 2, bottom: 0,
                  background: 'linear-gradient(to bottom, #6366f1, #8b5cf680)',
                  zIndex: 4, pointerEvents: 'none',
                }} />
              )}

              {/* ── User rows ────────────────────────────────────────────── */}
              {visibleUsers.map(user => {
                const color      = getUserColor(user)
                const userTasks  = getUserTasks(user)
                const internS    = toDate(user.intern_start_date)
                const internE    = toDate(user.intern_end_date)

                return (
                  <div key={user.id} style={{
                    height: ROW_H, borderBottom: '1px solid #f3f4f6',
                    position: 'relative', background: 'white',
                    cursor: 'pointer',
                  }}
                    onClick={() => navigate(`/gantt?user=${user.id}`)}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    {/* Weekend shading */}
                    {days.map((d, i) => (
                      d.getDay() === 0 || d.getDay() === 6
                        ? <div key={i} style={{ position: 'absolute', left: i * DAY_W, top: 0, width: DAY_W, height: '100%', background: '#f8fafc', pointerEvents: 'none' }} />
                        : null
                    ))}

                    {/* Placement period band */}
                    {internS && internE && (() => {
                      const x = Math.floor((internS - rangeStart) / 86400000) * DAY_W
                      const w = Math.max(0, Math.floor((internE - internS) / 86400000) * DAY_W)
                      return (
                        <div style={{
                          position: 'absolute', left: x, width: w,
                          top: 4, height: ROW_H - 8,
                          background: color + '10',
                          border: `1px dashed ${color}40`,
                          borderRadius: 6, pointerEvents: 'none', zIndex: 1,
                        }} />
                      )
                    })()}

                    {/* Task bars — colored by concurrent busyness */}
                    {userTasks.map(task => {
                      const s = toDate(task.start_date) || toDate(task.due_date)
                      const e = toDate(task.due_date)   || toDate(task.start_date)
                      if (!s || !e) return null
                      const x = Math.floor((s - rangeStart) / 86400000) * DAY_W
                      const w = Math.max(DAY_W, (Math.floor((e - s) / 86400000) + 1) * DAY_W)

                      const concurrent = getConcurrentCount(task, userTasks)
                      const barColor   = busynessColor(concurrent)
                      const earlyEnd   = placementEndsEarly(user, task)

                      return (
                        <div
                          key={task.id}
                          title={`${task.title}${concurrent > 1 ? ` · ${concurrent} concurrent projects` : ''}${earlyEnd ? ' · ⚠ Placement ends early' : ''}`}
                          style={{
                            position: 'absolute', left: x, width: w,
                            top: 10, height: ROW_H - 20,
                            background: `linear-gradient(135deg, ${barColor}, ${barColor}cc)`,
                            borderRadius: 6,
                            display: 'flex', alignItems: 'center',
                            padding: '0 0.45rem',
                            overflow: 'hidden', zIndex: 2,
                            boxShadow: `0 1px 4px ${barColor}50`,
                            // Striped overlay if early-end warning
                            outline: earlyEnd ? `2px solid #f59e0b` : 'none',
                            outlineOffset: '-2px',
                          }}
                        >
                          {/* Early-end warning icon */}
                          {earlyEnd && (
                            <span style={{
                              fontSize: '0.65rem', marginRight: '0.25rem', flexShrink: 0,
                              filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.3))',
                            }}>⚠</span>
                          )}
                          <span style={{ fontSize: '0.63rem', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {task.title}
                          </span>
                        </div>
                      )
                    })}

                    {/* "No tasks" label */}
                    {userTasks.length === 0 && (
                      <div style={{
                        position: 'absolute', left: todayX + 4, top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '0.65rem', color: '#d1d5db',
                        fontStyle: 'italic', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 2,
                      }}>
                        No assignments
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
