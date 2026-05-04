import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import AppSidebar from '../components/AppSidebar'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const today = new Date()
today.setHours(0, 0, 0, 0)

function localDate(str) {
  return str ? new Date(str + 'T00:00:00') : null
}

function isCompleted(task) {
  if (task.status === 'done') return true
  const total = task.breakdowns?.length || 0
  const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
  return total > 0 && checked === total
}

function isOverdue(task) {
  if (isCompleted(task)) return false
  const due = localDate(task.due_date)
  return due && due < today
}

function fmtDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function pct(n, d) {
  return d > 0 ? Math.round((n / d) * 100) : 0
}

// Build day buckets for the last N days
function buildDayBuckets(n) {
  const buckets = {}
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    buckets[d.toISOString().split('T')[0]] = 0
  }
  return buckets
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = '#6366f1', icon }) {
  return (
    <div style={{
      background: 'white', borderRadius: '14px',
      border: '1px solid #f1f5f9', padding: '1.25rem 1.5rem',
      flex: 1, minWidth: 0,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
            {label}
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.35rem' }}>{sub}</div>}
        </div>
        <span style={{ fontSize: '1.4rem', opacity: 0.7 }}>{icon}</span>
      </div>
    </div>
  )
}

// Horizontal stacked bar chart — one row per entry
function BarChart({ data }) {
  if (!data.length) return <div style={{ color: '#9ca3af', fontSize: '0.85rem', padding: '1rem' }}>No data</div>

  const LABEL_W = 130
  const ROW_H   = 38
  const GAP      = 6

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        width="100%"
        viewBox={`0 0 580 ${data.length * (ROW_H + GAP) + 12}`}
        style={{ display: 'block', minWidth: '400px' }}
      >
        {data.map((d, i) => {
          const y        = i * (ROW_H + GAP) + 6
          const BAR_W    = 580 - LABEL_W - 70
          const doneW    = (d.completed / Math.max(d.total, 1)) * BAR_W
          const overdueW = (d.overdue   / Math.max(d.total, 1)) * BAR_W
          const rate     = pct(d.completed, d.total)

          return (
            <g key={d.label}>
              {/* Label */}
              <text
                x={LABEL_W - 8} y={y + ROW_H / 2 + 4}
                textAnchor="end" fontSize="11.5" fill="#374151"
                fontFamily="system-ui, sans-serif"
              >
                {d.label.length > 16 ? d.label.slice(0, 15) + '…' : d.label}
              </text>

              {/* Background track */}
              <rect x={LABEL_W} y={y + 8} width={BAR_W} height={ROW_H - 16} rx={5} fill="#f1f5f9" />

              {/* Overdue (amber, behind done) */}
              {overdueW > 0 && (
                <rect x={LABEL_W} y={y + 8} width={overdueW} height={ROW_H - 16} rx={5} fill="#fbbf24" />
              )}

              {/* Done (colour) */}
              {doneW > 0 && (
                <rect x={LABEL_W} y={y + 8} width={doneW} height={ROW_H - 16} rx={5} fill={d.color || '#6366f1'} />
              )}

              {/* Rate label */}
              <text
                x={LABEL_W + BAR_W + 8} y={y + ROW_H / 2 + 4}
                fontSize="11" fill={rate === 100 ? '#10b981' : '#374151'}
                fontWeight="600" fontFamily="system-ui, sans-serif"
              >
                {rate}%
              </text>
            </g>
          )
        })}

        {/* Legend */}
        <g transform={`translate(${LABEL_W}, ${data.length * (ROW_H + GAP) + 8})`}>
          <rect width="10" height="10" rx="2" fill="#6366f1" />
          <text x="14" y="9" fontSize="10" fill="#6b7280" fontFamily="system-ui, sans-serif">Done</text>
          <rect x="50" width="10" height="10" rx="2" fill="#fbbf24" />
          <text x="64" y="9" fontSize="10" fill="#6b7280" fontFamily="system-ui, sans-serif">Overdue</text>
          <rect x="110" width="10" height="10" rx="2" fill="#f1f5f9" />
          <text x="124" y="9" fontSize="10" fill="#6b7280" fontFamily="system-ui, sans-serif">Pending</text>
        </g>
      </svg>
    </div>
  )
}

// Area-fill line chart for activity trend
function LineChart({ data }) {
  if (data.length < 2) return <div style={{ color: '#9ca3af', fontSize: '0.85rem', padding: '1rem' }}>Not enough data</div>

  const W = 580, H = 160
  const PAD = { top: 16, right: 16, bottom: 28, left: 36 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const maxVal = Math.max(...data.map(d => d.count), 1)

  const pts = data.map((d, i) => ({
    x: PAD.left + (i / (data.length - 1)) * chartW,
    y: PAD.top + (1 - d.count / maxVal) * chartH,
    ...d,
  }))

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + chartH).toFixed(1)} L${pts[0].x.toFixed(1)},${(PAD.top + chartH).toFixed(1)} Z`

  // Y-axis grid lines
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(r => ({
    y: PAD.top + (1 - r) * chartH,
    label: Math.round(r * maxVal),
  }))

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', minWidth: '300px' }}>
      {/* Grid lines */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} stroke="#f1f5f9" strokeWidth="1" />
          <text x={PAD.left - 4} y={t.y + 4} textAnchor="end" fontSize="9" fill="#9ca3af" fontFamily="system-ui, sans-serif">
            {t.label}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="#6366f1" opacity="0.12" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" />

      {/* Dots on non-zero days */}
      {pts.filter(p => p.count > 0).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366f1" />
      ))}

      {/* X-axis date labels (every ~7 days) */}
      {pts.filter((_, i) => i === 0 || i === pts.length - 1 || i % 7 === 0).map((p, i) => (
        <text key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af" fontFamily="system-ui, sans-serif">
          {fmtDate(p.date)}
        </text>
      ))}
    </svg>
  )
}

// Metrics table — one row per user
function MetricsTable({ rows, groupBy }) {
  const [sort, setSort] = useState({ col: 'total', dir: 'desc' })

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sort.col] ?? 0
      const bv = b[sort.col] ?? 0
      if (typeof av === 'string') return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sort.dir === 'asc' ? av - bv : bv - av
    })
  }, [rows, sort])

  const Col = ({ col, label, numeric }) => {
    const active = sort.col === col
    return (
      <th
        onClick={() => setSort(s => ({ col, dir: s.col === col && s.dir === 'desc' ? 'asc' : 'desc' }))}
        style={{
          padding: '0.6rem 0.75rem', textAlign: numeric ? 'right' : 'left',
          fontSize: '0.7rem', fontWeight: 700, color: active ? '#6366f1' : '#9ca3af',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
          borderBottom: '2px solid #f1f5f9',
          background: 'white',
        }}
      >
        {label} {active ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
      </th>
    )
  }

  const Num = ({ val, color }) => (
    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontSize: '0.83rem', color: color || '#374151', fontWeight: 500 }}>
      {val}
    </td>
  )

  if (!sorted.length) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', fontSize: '0.9rem' }}>
      No data for the selected filters
    </div>
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr>
            <Col col="label"    label={groupBy === 'area' ? 'Area' : 'Name'} />
            {groupBy === 'user' && <Col col="role" label="Role" />}
            <Col col="total"    label="Tasks"   numeric />
            <Col col="completed" label="Done"   numeric />
            <Col col="overdue"  label="Overdue" numeric />
            <Col col="rate"     label="Rate"    numeric />
            <Col col="breakdowns" label="Steps" numeric />
            <Col col="bdCompleted" label="Steps done" numeric />
            <Col col="bdOverdue"   label="Steps overdue" numeric />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={row.id || row.label} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
              <td style={{ padding: '0.6rem 0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {row.color && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                  )}
                  <span style={{ fontWeight: 500, color: '#111827' }}>{row.label}</span>
                </div>
              </td>
              {groupBy === 'user' && (
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  <span style={{
                    fontSize: '0.68rem', padding: '0.15rem 0.5rem',
                    borderRadius: '10px', fontWeight: 600,
                    background: row.role === 'admin' ? '#ede9fe' : row.role === 'intern' ? '#fef3c7' : '#f0fdf4',
                    color:      row.role === 'admin' ? '#7c3aed' : row.role === 'intern' ? '#92400e' : '#065f46',
                  }}>
                    {row.role}
                  </span>
                </td>
              )}
              <Num val={row.total} />
              <Num val={row.completed} color="#10b981" />
              <Num val={row.overdue}   color={row.overdue > 0 ? '#ef4444' : '#9ca3af'} />
              <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <div style={{ width: '60px', height: '6px', borderRadius: '3px', background: '#f1f5f9', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '3px',
                      width: `${row.rate}%`,
                      background: row.rate === 100 ? '#10b981' : row.rate >= 60 ? '#6366f1' : '#f59e0b',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', minWidth: '32px' }}>{row.rate}%</span>
                </div>
              </td>
              <Num val={row.breakdowns} />
              <Num val={row.bdCompleted} color="#10b981" />
              <Num val={row.bdOverdue}   color={row.bdOverdue > 0 ? '#ef4444' : '#9ca3af'} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function AnalyticsSidebar({ profile }) {
  return <AppSidebar profile={profile} />
}

/*
  const navigate = useNavigate()

  const navItems = [
    { label: '📋 Task Board',      path: '/dashboard' },
    { label: '📅 Gantt Chart',     path: '/gantt' },
    { label: '🏆 Leaderboard',     path: '/leaderboard' },
    { label: '👥 User Management', path: '/users' },
    { label: '📜 Activity Log',    path: '/activity' },
  ]

  return (
    <div style={{
      width: '240px', flexShrink: 0, background: 'white',
      borderRight: '1px solid #f1f5f9',
      display: 'flex', flexDirection: 'column',
      padding: '1.5rem 1rem',
      boxShadow: '2px 0 8px rgba(0,0,0,0.03)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' }}>
        <img src="/logo.png" alt="WorkSpace" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }} />
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>WorkSpace</div>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Project Management</div>
        </div>
      </div>

      {navItems.map(item => (
        <div
          key={item.path}
          onClick={() => navigate(item.path)}
          style={{ padding: '0.48rem 0.75rem', borderRadius: '8px', marginBottom: '0.2rem', cursor: 'pointer', fontSize: '0.875rem', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {item.label}
        </div>
      ))}

      {null}
      <div style={{
        padding: '0.48rem 0.75rem', borderRadius: '8px', fontSize: '0.875rem',
        background: '#ede9fe', color: '#7c3aed', fontWeight: 600,
      }}>
        📊 User Analytics
      </div>

      {null}
      {profile && (
        <div style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
            }}>
              {profile.full_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{profile.full_name}</div>
              <div style={{ fontSize: '0.68rem', color: '#9ca3af', textTransform: 'capitalize' }}>{profile.role}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Pill filter select ───────────────────────────────────────────────────────
*/

function Select({ label, value, onChange, options }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '0.45rem 0.75rem', borderRadius: '8px',
          border: '1px solid #e5e7eb', fontSize: '0.85rem',
          background: 'white', color: '#374151', cursor: 'pointer',
          outline: 'none', minWidth: '140px',
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

function DateInput({ label, value, onChange }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '0.45rem 0.75rem', borderRadius: '8px',
          border: '1px solid #e5e7eb', fontSize: '0.85rem',
          background: 'white', color: '#374151',
          outline: 'none',
        }}
      />
    </label>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UserAnalytics() {
  const navigate = useNavigate()

  const [profile,     setProfile]     = useState(null)
  const [tasks,       setTasks]       = useState([])
  const [users,       setUsers]       = useState([])
  const [areas,       setAreas]       = useState([])
  const [activity,    setActivity]    = useState([])
  const [loading,     setLoading]     = useState(true)

  // Filters
  const [filterArea, setFilterArea]   = useState('all')
  const [filterUser, setFilterUser]   = useState('all')
  const [dateFrom,   setDateFrom]     = useState('')
  const [dateTo,     setDateTo]       = useState('')
  const [groupBy,    setGroupBy]      = useState('user') // 'user' | 'area'
  const [trendDays,  setTrendDays]    = useState(30)

  // ── Data fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('role, full_name').eq('id', user.id).single()
      if (prof?.role === 'intern') { navigate('/dashboard'); return }
      setProfile(prof)

      // All tasks with relationships
      const { data: taskData } = await supabase
        .from('tasks')
        .select('id, title, status, due_date, start_date, areas(name, color), breakdowns(*), task_assignments(user_id)')
        .order('created_at', { ascending: false })

      // All users
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .order('full_name')

      // All areas
      const { data: areaData } = await supabase
        .from('areas')
        .select('name, color')

      // Activity log (last 60 days for trend data)
      const since = new Date()
      since.setDate(since.getDate() - 60)
      const { data: activityData } = await supabase
        .from('activity_log')
        .select('created_at, user_id')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true })

      setTasks(taskData || [])
      setUsers(userData || [])
      setAreas(areaData || [])
      setActivity(activityData || [])
      setLoading(false)
    }
    init()
  }, [])

  // ── Filtered tasks ──────────────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterArea !== 'all' && t.areas?.name !== filterArea) return false
      if (filterUser !== 'all' && !t.task_assignments?.some(a => a.user_id === filterUser)) return false
      if (dateFrom && t.due_date && t.due_date < dateFrom) return false
      if (dateTo   && t.due_date && t.due_date > dateTo)   return false
      return true
    })
  }, [tasks, filterArea, filterUser, dateFrom, dateTo])

  // ── Key stats ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalUsers  = users.length
    const done        = filteredTasks.filter(isCompleted).length
    const overdueCt   = filteredTasks.filter(isOverdue).length
    const rate        = pct(done, filteredTasks.length)
    const avgTasks    = totalUsers > 0 ? (filteredTasks.length / totalUsers).toFixed(1) : '–'

    const todayStr    = today.toISOString().split('T')[0]
    const activeToday = new Set(
      activity
        .filter(a => a.created_at.startsWith(todayStr))
        .map(a => a.user_id)
    ).size

    return { totalUsers, done, overdueCt, rate, avgTasks, activeToday }
  }, [filteredTasks, users, activity])

  // ── Bar chart data ──────────────────────────────────────────────────────────
  const barData = useMemo(() => {
    if (groupBy === 'user') {
      return users
        .map(u => {
          const uTasks    = filteredTasks.filter(t => t.task_assignments?.some(a => a.user_id === u.id))
          const completed = uTasks.filter(isCompleted).length
          const overdue   = uTasks.filter(isOverdue).length
          return { label: u.full_name, total: uTasks.length, completed, overdue, color: '#6366f1' }
        })
        .filter(d => d.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 15)
    } else {
      return areas
        .map(area => {
          const aTasks    = filteredTasks.filter(t => t.areas?.name === area.name)
          const completed = aTasks.filter(isCompleted).length
          const overdue   = aTasks.filter(isOverdue).length
          return { label: area.name, total: aTasks.length, completed, overdue, color: area.color }
        })
        .filter(d => d.total > 0)
        .sort((a, b) => b.total - a.total)
    }
  }, [filteredTasks, users, areas, groupBy])

  // ── Activity trend ──────────────────────────────────────────────────────────
  const trendData = useMemo(() => {
    const buckets = buildDayBuckets(trendDays)

    const filteredActivity = filterUser !== 'all'
      ? activity.filter(a => a.user_id === filterUser)
      : activity

    filteredActivity.forEach(a => {
      const day = a.created_at.split('T')[0]
      if (day in buckets) buckets[day]++
    })

    return Object.entries(buckets).map(([date, count]) => ({ date, count }))
  }, [activity, filterUser, trendDays])

  // ── Table rows ──────────────────────────────────────────────────────────────
  const tableRows = useMemo(() => {
    if (groupBy === 'user') {
      return users.map(u => {
        const uTasks       = filteredTasks.filter(t => t.task_assignments?.some(a => a.user_id === u.id))
        const completed    = uTasks.filter(isCompleted).length
        const overdue      = uTasks.filter(isOverdue).length
        const allBd        = uTasks.flatMap(t => t.breakdowns || [])
        const bdCompleted  = allBd.filter(b => b.is_checked).length
        const bdOverdue    = allBd.filter(b => !b.is_checked && b.end_date && localDate(b.end_date) < today).length
        return {
          id: u.id, label: u.full_name, role: u.role,
          total: uTasks.length, completed, overdue,
          rate: pct(completed, uTasks.length),
          breakdowns: allBd.length, bdCompleted, bdOverdue,
        }
      }).filter(r => r.total > 0)
    } else {
      return areas.map(area => {
        const aTasks      = filteredTasks.filter(t => t.areas?.name === area.name)
        const completed   = aTasks.filter(isCompleted).length
        const overdue     = aTasks.filter(isOverdue).length
        const allBd       = aTasks.flatMap(t => t.breakdowns || [])
        const bdCompleted = allBd.filter(b => b.is_checked).length
        const bdOverdue   = allBd.filter(b => !b.is_checked && b.end_date && localDate(b.end_date) < today).length
        return {
          id: area.name, label: area.name, color: area.color,
          total: aTasks.length, completed, overdue,
          rate: pct(completed, aTasks.length),
          breakdowns: allBd.length, bdCompleted, bdOverdue,
        }
      }).filter(r => r.total > 0)
    }
  }, [filteredTasks, users, areas, groupBy])

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading || !profile) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
      <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading analytics…</div>
    </div>
  )

  const areaOptions  = [{ value: 'all', label: 'All areas' }, ...areas.map(a => ({ value: a.name, label: a.name }))]
  const userOptions  = [{ value: 'all', label: 'All users' }, ...users.map(u => ({ value: u.id, label: u.full_name }))]
  const groupOptions = [{ value: 'user', label: 'By user' }, { value: 'area', label: 'By area' }]
  const dayOptions   = [
    { value: 7,  label: 'Last 7 days' },
    { value: 14, label: 'Last 14 days' },
    { value: 30, label: 'Last 30 days' },
    { value: 60, label: 'Last 60 days' },
  ]

  const section = (title, children) => (
    <div style={{
      background: 'white', borderRadius: '14px',
      border: '1px solid #f1f5f9',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '0.85rem 1.25rem',
        borderBottom: '1px solid #f1f5f9',
        fontSize: '0.82rem', fontWeight: 700,
        color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {title}
      </div>
      <div style={{ padding: '1.25rem' }}>{children}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>
      <AnalyticsSidebar profile={profile} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.2rem' }}>
            📊 User Analytics
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            {filteredTasks.length} tasks · {users.length} users · admin only
          </p>
        </div>

        {/* ── Key stats ── */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <StatCard label="Total users"      value={stats.totalUsers}  icon="👥" color="#6366f1" />
          <StatCard label="Completion rate"  value={`${stats.rate}%`}  icon="✅" color="#10b981"
            sub={`${stats.done} of ${filteredTasks.length} tasks done`} />
          <StatCard label="Overdue tasks"    value={stats.overdueCt}   icon="🔴" color="#ef4444"
            sub={filteredTasks.length > 0 ? `${pct(stats.overdueCt, filteredTasks.length)}% of tasks` : undefined} />
          <StatCard label="Avg tasks / user" value={stats.avgTasks}    icon="📋" color="#f59e0b" />
          <StatCard label="Active today"     value={stats.activeToday} icon="⚡" color="#8b5cf6"
            sub="users with app activity" />
        </div>

        {/* ── Filters ── */}
        <div style={{
          background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9',
          padding: '1rem 1.25rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'flex-end', gap: '1.25rem', flexWrap: 'wrap',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <Select label="Group by"      value={groupBy}     onChange={setGroupBy}     options={groupOptions} />
          <Select label="Business area" value={filterArea}  onChange={setFilterArea}  options={areaOptions} />
          <Select label="User"          value={filterUser}  onChange={setFilterUser}  options={userOptions} />
          <DateInput label="Due from"   value={dateFrom}    onChange={setDateFrom} />
          <DateInput label="Due to"     value={dateTo}      onChange={setDateTo} />
          {(filterArea !== 'all' || filterUser !== 'all' || dateFrom || dateTo) && (
            <button
              onClick={() => { setFilterArea('all'); setFilterUser('all'); setDateFrom(''); setDateTo('') }}
              style={{
                padding: '0.45rem 0.9rem', borderRadius: '8px',
                border: '1px solid #e5e7eb', background: 'white',
                fontSize: '0.82rem', color: '#6b7280', cursor: 'pointer',
                alignSelf: 'flex-end',
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* ── Charts row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

          {section(
            `Task completion — ${groupBy === 'user' ? 'by user' : 'by area'}`,
            <BarChart data={barData} />
          )}

          {section(
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span>Activity trend</span>
              <select
                value={trendDays}
                onChange={e => setTrendDays(Number(e.target.value))}
                style={{ fontSize: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.2rem 0.4rem', color: '#6b7280', cursor: 'pointer' }}
              >
                {dayOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>,
            <LineChart data={trendData} />
          )}
        </div>

        {/* ── Full metrics table ── */}
        {section(
          `Detailed metrics — ${groupBy === 'user' ? 'by user' : 'by area'}`,
          <MetricsTable rows={tableRows} groupBy={groupBy} />
        )}

        <div style={{ height: '2rem' }} />
      </div>
    </div>
  )
}
