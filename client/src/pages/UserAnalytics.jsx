import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import AppSidebar from '../components/AppSidebar'
import { useProfile } from '../contexts/ProfileContext'
import { isCompleted, isOverdue } from '../utils/dateUtils'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const today = new Date()
today.setHours(0, 0, 0, 0)

function localDate(str) {
  return str ? new Date(str + 'T00:00:00') : null
}

// isOverdue and isCompleted are imported from utils/dateUtils

function fmtDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function pct(n, d) {
  return d > 0 ? Math.round((n / d) * 100) : 0
}

function buildDayBuckets(n) {
  const buckets = {}
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    buckets[d.toISOString().split('T')[0]] = 0
  }
  return buckets
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, gradient, icon, textColor = 'white' }) {
  return (
    <div style={{
      flex: 1, minWidth: '140px',
      background: gradient,
      borderRadius: '16px',
      padding: '1.3rem 1.4rem',
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    }}>
      {/* Decorative circle */}
      <div style={{
        position: 'absolute', right: '-18px', top: '-18px',
        width: '90px', height: '90px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
      }} />
      <div style={{
        position: 'absolute', right: '12px', bottom: '-24px',
        width: '70px', height: '70px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.06)',
      }} />

      <div style={{ position: 'relative' }}>
        {/* Icon */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', marginBottom: '0.75rem',
          backdropFilter: 'blur(4px)',
        }}>
          {icon}
        </div>

        {/* Value */}
        <div style={{
          fontSize: '2rem', fontWeight: 900, color: textColor,
          lineHeight: 1, letterSpacing: '-0.03em', marginBottom: '0.2rem',
        }}>
          {value}
        </div>

        {/* Label */}
        <div style={{
          fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.75)',
          textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: sub ? '0.2rem' : 0,
        }}>
          {label}
        </div>

        {/* Sub */}
        {sub && (
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)' }}>{sub}</div>
        )}
      </div>
    </div>
  )
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function BarChart({ data }) {
  if (!data.length) return (
    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.85rem' }}>
      No data for current filters
    </div>
  )

  const LABEL_W = 130
  const ROW_H   = 40
  const GAP     = 8
  const BAR_MAX = 580 - LABEL_W - 72

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        width="100%"
        viewBox={`0 0 580 ${data.length * (ROW_H + GAP) + 32}`}
        style={{ display: 'block', minWidth: '380px' }}
      >
        {data.map((d, i) => {
          const y       = i * (ROW_H + GAP) + 4
          const doneW   = (d.completed / Math.max(d.total, 1)) * BAR_MAX
          const overW   = (d.overdue   / Math.max(d.total, 1)) * BAR_MAX
          const rate    = pct(d.completed, d.total)
          const barColor = d.color || '#6366f1'

          return (
            <g key={d.label}>
              {/* Name label */}
              <text
                x={LABEL_W - 10} y={y + ROW_H / 2 + 4}
                textAnchor="end" fontSize="11.5" fill="#374151"
                fontFamily="system-ui, -apple-system, sans-serif" fontWeight="500"
              >
                {d.label.length > 17 ? d.label.slice(0, 16) + '…' : d.label}
              </text>

              {/* Track */}
              <rect x={LABEL_W} y={y + 10} width={BAR_MAX} height={ROW_H - 20} rx={6} fill="#f1f5f9" />

              {/* Overdue (amber) — shown from left, behind done */}
              {overW > 0 && (
                <rect x={LABEL_W} y={y + 10} width={overW} height={ROW_H - 20} rx={6} fill="#f59e0b" opacity="0.85" />
              )}

              {/* Done */}
              {doneW > 0 && (
                <rect x={LABEL_W} y={y + 10} width={doneW} height={ROW_H - 20} rx={6} fill={barColor} />
              )}

              {/* Shine on done bar */}
              {doneW > 4 && (
                <rect x={LABEL_W + 2} y={y + 11} width={Math.min(doneW - 4, 40)} height={4} rx={2} fill="rgba(255,255,255,0.25)" />
              )}

              {/* Rate */}
              <text
                x={LABEL_W + BAR_MAX + 8} y={y + ROW_H / 2 + 4}
                fontSize="11" fontWeight="700"
                fill={rate === 100 ? '#10b981' : rate >= 60 ? '#6366f1' : '#f59e0b'}
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {rate}%
              </text>

              {/* Count inside bar when wide enough */}
              {doneW > 30 && (
                <text
                  x={LABEL_W + doneW / 2} y={y + ROW_H / 2 + 4}
                  textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.9)"
                  fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {d.completed}
                </text>
              )}
            </g>
          )
        })}

        {/* Legend */}
        <g transform={`translate(${LABEL_W}, ${data.length * (ROW_H + GAP) + 12})`}>
          <rect width="10" height="10" rx="3" fill="#6366f1" />
          <text x="14" y="9" fontSize="10" fill="#64748b" fontFamily="system-ui, sans-serif">Done</text>
          <rect x="52" width="10" height="10" rx="3" fill="#f59e0b" opacity="0.85" />
          <text x="66" y="9" fontSize="10" fill="#64748b" fontFamily="system-ui, sans-serif">Overdue</text>
          <rect x="116" width="10" height="10" rx="3" fill="#f1f5f9" />
          <text x="130" y="9" fontSize="10" fill="#64748b" fontFamily="system-ui, sans-serif">Pending</text>
        </g>
      </svg>
    </div>
  )
}

// ─── Line Chart ───────────────────────────────────────────────────────────────
function LineChart({ data }) {
  if (data.length < 2) return (
    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.85rem' }}>
      Not enough activity data
    </div>
  )

  const W = 560, H = 150
  const PAD = { top: 14, right: 12, bottom: 26, left: 32 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const maxVal = Math.max(...data.map(d => d.count), 1)

  const pts = data.map((d, i) => ({
    x: PAD.left + (i / (data.length - 1)) * chartW,
    y: PAD.top  + (1 - d.count / maxVal) * chartH,
    ...d,
  }))

  const smoothPath = pts.map((p, i) => {
    if (i === 0) return `M${p.x.toFixed(1)},${p.y.toFixed(1)}`
    const prev = pts[i - 1]
    const cpx  = (prev.x + p.x) / 2
    return `C${cpx.toFixed(1)},${prev.y.toFixed(1)} ${cpx.toFixed(1)},${p.y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`
  }).join(' ')

  const areaPath = `${smoothPath} L${pts[pts.length - 1].x},${PAD.top + chartH} L${pts[0].x},${PAD.top + chartH} Z`

  const yTicks = [0, 0.5, 1].map(r => ({
    y: PAD.top + (1 - r) * chartH,
    label: Math.round(r * maxVal),
  }))

  const gradId = 'lineGrad'

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', minWidth: '280px' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} stroke="#f1f5f9" strokeWidth="1.5" />
          <text x={PAD.left - 5} y={t.y + 4} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="system-ui, sans-serif">
            {t.label}
          </text>
        </g>
      ))}

      {/* Area */}
      <path d={areaPath} fill={`url(#${gradId})`} />

      {/* Line */}
      <path d={smoothPath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Active dots */}
      {pts.filter(p => p.count > 0).map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4.5" fill="white" stroke="#6366f1" strokeWidth="2" />
        </g>
      ))}

      {/* X labels */}
      {pts.filter((_, i) => i === 0 || i === pts.length - 1 || i % Math.ceil(pts.length / 6) === 0).map((p, i) => (
        <text key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="system-ui, sans-serif">
          {fmtDate(p.date)}
        </text>
      ))}
    </svg>
  )
}

// ─── Metrics Table ────────────────────────────────────────────────────────────
function MetricsTable({ rows, groupBy }) {
  const [sort, setSort] = useState({ col: 'total', dir: 'desc' })
  const [hovered, setHovered] = useState(null)

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sort.col] ?? 0
      const bv = b[sort.col] ?? 0
      if (typeof av === 'string') return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sort.dir === 'asc' ? av - bv : bv - av
    })
  }, [rows, sort])

  if (!sorted.length) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '0.9rem' }}>
      No data for the selected filters
    </div>
  )

  const TH = ({ col, label, numeric }) => {
    const active = sort.col === col
    return (
      <th
        onClick={() => setSort(s => ({ col, dir: s.col === col && s.dir === 'desc' ? 'asc' : 'desc' }))}
        style={{
          padding: '0.75rem 0.85rem',
          textAlign: numeric ? 'right' : 'left',
          fontSize: '0.67rem', fontWeight: 700,
          color: active ? '#6366f1' : '#94a3b8',
          textTransform: 'uppercase', letterSpacing: '0.07em',
          cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
          background: '#f8fafc',
          borderBottom: `2px solid ${active ? '#6366f1' : '#f1f5f9'}`,
          transition: 'color 0.15s, border-color 0.15s',
        }}
      >
        {label}
        {active && <span style={{ marginLeft: '3px', opacity: 0.8 }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>}
      </th>
    )
  }

  const ROLE_STYLE = {
    admin:  { bg: '#ede9fe', color: '#7c3aed' },
    member: { bg: '#dcfce7', color: '#15803d' },
    intern: { bg: '#fef3c7', color: '#92400e' },
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <TH col="label"       label={groupBy === 'area' ? 'Area' : 'Name'} />
            {groupBy === 'user' && <TH col="role" label="Role" />}
            <TH col="total"       label="Tasks"        numeric />
            <TH col="completed"   label="Done"         numeric />
            <TH col="overdue"     label="Overdue"      numeric />
            <TH col="rate"        label="Rate"         numeric />
            <TH col="breakdowns"  label="Steps"        numeric />
            <TH col="bdCompleted" label="Steps Done"   numeric />
            <TH col="bdOverdue"   label="Steps Late"   numeric />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const isHov = hovered === (row.id || row.label)
            return (
              <tr
                key={row.id || row.label}
                onMouseEnter={() => setHovered(row.id || row.label)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: isHov ? '#f0f9ff' : i % 2 === 0 ? 'white' : '#fafafa',
                  transition: 'background 0.12s',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                {/* Name / label */}
                <td style={{ padding: '0.7rem 0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    {groupBy === 'user' ? (
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.72rem', fontWeight: 700,
                      }}>
                        {row.label.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <div style={{
                        width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                        background: row.color || '#6366f1',
                        boxShadow: `0 0 6px ${row.color || '#6366f1'}80`,
                      }} />
                    )}
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                      {row.label}
                    </span>
                  </div>
                </td>

                {/* Role badge */}
                {groupBy === 'user' && (
                  <td style={{ padding: '0.7rem 0.85rem' }}>
                    <span style={{
                      fontSize: '0.66rem', padding: '0.18rem 0.55rem',
                      borderRadius: '20px', fontWeight: 700,
                      ...(ROLE_STYLE[row.role] || ROLE_STYLE.member),
                    }}>
                      {row.role}
                    </span>
                  </td>
                )}

                {/* Tasks */}
                <td style={{ padding: '0.7rem 0.85rem', textAlign: 'right', fontSize: '0.875rem', color: '#374151', fontWeight: 600 }}>
                  {row.total}
                </td>

                {/* Done */}
                <td style={{ padding: '0.7rem 0.85rem', textAlign: 'right' }}>
                  <span style={{
                    fontSize: '0.83rem', fontWeight: 600,
                    color: row.completed > 0 ? '#10b981' : '#94a3b8',
                  }}>
                    {row.completed}
                  </span>
                </td>

                {/* Overdue */}
                <td style={{ padding: '0.7rem 0.85rem', textAlign: 'right' }}>
                  {row.overdue > 0 ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      background: '#fef2f2', color: '#ef4444',
                      borderRadius: '6px', padding: '0.12rem 0.5rem',
                      fontSize: '0.78rem', fontWeight: 700,
                    }}>
                      {row.overdue}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.83rem', color: '#94a3b8' }}>—</span>
                  )}
                </td>

                {/* Rate with mini bar */}
                <td style={{ padding: '0.7rem 0.85rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <div style={{ width: '52px', height: '5px', borderRadius: '3px', background: '#f1f5f9', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '3px',
                        width: `${row.rate}%`,
                        background: row.rate === 100
                          ? 'linear-gradient(90deg, #10b981, #34d399)'
                          : row.rate >= 60
                            ? 'linear-gradient(90deg, #6366f1, #818cf8)'
                            : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                      }} />
                    </div>
                    <span style={{
                      fontSize: '0.78rem', fontWeight: 700, minWidth: '30px',
                      color: row.rate === 100 ? '#10b981' : row.rate >= 60 ? '#6366f1' : '#f59e0b',
                    }}>
                      {row.rate}%
                    </span>
                  </div>
                </td>

                {/* Breakdown stats */}
                <td style={{ padding: '0.7rem 0.85rem', textAlign: 'right', fontSize: '0.83rem', color: '#64748b' }}>{row.breakdowns}</td>
                <td style={{ padding: '0.7rem 0.85rem', textAlign: 'right', fontSize: '0.83rem', color: row.bdCompleted > 0 ? '#10b981' : '#94a3b8', fontWeight: 500 }}>{row.bdCompleted}</td>
                <td style={{ padding: '0.7rem 0.85rem', textAlign: 'right', fontSize: '0.83rem' }}>
                  {row.bdOverdue > 0 ? (
                    <span style={{ color: '#ef4444', fontWeight: 600 }}>{row.bdOverdue}</span>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({ title, accent = '#6366f1', action, children }) {
  return (
    <div style={{
      background: 'white', borderRadius: '16px',
      border: '1px solid #e8ecf0',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.9rem 1.3rem',
        borderBottom: '1px solid #f1f5f9',
        background: 'linear-gradient(135deg, #fafbff 0%, #f8fafc 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '4px', height: '18px', borderRadius: '2px',
            background: `linear-gradient(180deg, ${accent}, ${accent}88)`,
          }} />
          <span style={{
            fontSize: '0.8rem', fontWeight: 700, color: '#1e293b',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {title}
          </span>
        </div>
        {action}
      </div>
      <div style={{ padding: '1.1rem 1.1rem 1.25rem' }}>{children}</div>
    </div>
  )
}

// ─── Filter controls ──────────────────────────────────────────────────────────
function Select({ label, value, onChange, options }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '0.48rem 0.85rem', borderRadius: '9px',
          border: '1.5px solid #e2e8f0', fontSize: '0.84rem',
          background: 'white', color: '#1e293b', cursor: 'pointer',
          outline: 'none', minWidth: '140px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = '#6366f1'}
        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

function DateInput({ label, value, onChange }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '0.48rem 0.85rem', borderRadius: '9px',
          border: '1.5px solid #e2e8f0', fontSize: '0.84rem',
          background: 'white', color: '#1e293b', outline: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = '#6366f1'}
        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
      />
    </label>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UserAnalytics() {
  const navigate = useNavigate()
  const { profile, loading: profileLoading } = useProfile()

  const [tasks,    setTasks]    = useState([])
  const [users,    setUsers]    = useState([])
  const [areas,    setAreas]    = useState([])
  const [activity, setActivity] = useState([])
  const [loading,  setLoading]  = useState(true)

  const [filterArea, setFilterArea] = useState('all')
  const [filterUser, setFilterUser] = useState('all')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')
  const [groupBy,    setGroupBy]    = useState('user')
  const [trendDays,  setTrendDays]  = useState(30)

  // ── Redirect guards ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profileLoading && !profile) navigate('/login')
  }, [profileLoading, profile, navigate])

  useEffect(() => {
    if (profile?.role === 'intern') navigate('/dashboard')
  }, [profile, navigate])

  // ── Data fetch — all four queries run in parallel ───────────────────────────
  useEffect(() => {
    if (!profile || profile.role === 'intern') return

    const init = async () => {
      setLoading(true)

      const since = new Date()
      since.setDate(since.getDate() - 60)

      const [
        { data: taskData },
        { data: userData },
        { data: areaData },
        { data: activityData },
      ] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, status, due_date, start_date, areas(name, color), breakdowns(*), task_assignments(user_id), task_area_slots(area_id, required_count, areas(name, color))')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, full_name, role, intern_start_date, intern_end_date, user_areas(area_id, areas(name, color))')
          .order('full_name'),
        supabase
          .from('areas').select('id, name, color'),
        supabase
          .from('activity_log').select('created_at, user_id')
          .gte('created_at', since.toISOString())
          .order('created_at', { ascending: true }),
      ])

      setTasks(taskData || [])
      setUsers(userData || [])
      setAreas(areaData || [])
      setActivity(activityData || [])
      setLoading(false)
    }

    init()
  }, [profile])

  // ── Derived data ────────────────────────────────────────────────────────────
  const filteredTasks = useMemo(() => tasks.filter(t => {
    if (filterArea !== 'all' && t.areas?.name !== filterArea) return false
    if (filterUser !== 'all' && !t.task_assignments?.some(a => a.user_id === filterUser)) return false
    if (dateFrom && t.due_date && t.due_date < dateFrom) return false
    if (dateTo   && t.due_date && t.due_date > dateTo)   return false
    return true
  }), [tasks, filterArea, filterUser, dateFrom, dateTo])

  const stats = useMemo(() => {
    const done      = filteredTasks.filter(isCompleted).length
    const overdueCt = filteredTasks.filter(isOverdue).length
    const todayStr  = today.toISOString().split('T')[0]
    const activeToday = new Set(
      activity.filter(a => a.created_at.startsWith(todayStr)).map(a => a.user_id)
    ).size
    return {
      totalUsers: users.length,
      done, overdueCt,
      rate: pct(done, filteredTasks.length),
      avgTasks: users.length > 0 ? (filteredTasks.length / users.length).toFixed(1) : '–',
      activeToday,
    }
  }, [filteredTasks, users, activity])

  const barData = useMemo(() => {
    if (groupBy === 'user') {
      return users.map(u => {
        const ut = filteredTasks.filter(t => t.task_assignments?.some(a => a.user_id === u.id))
        return { label: u.full_name, total: ut.length, completed: ut.filter(isCompleted).length, overdue: ut.filter(isOverdue).length, color: '#6366f1' }
      }).filter(d => d.total > 0).sort((a, b) => b.total - a.total).slice(0, 15)
    }
    return areas.map(area => {
      const at = filteredTasks.filter(t => t.areas?.name === area.name)
      return { label: area.name, total: at.length, completed: at.filter(isCompleted).length, overdue: at.filter(isOverdue).length, color: area.color }
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total)
  }, [filteredTasks, users, areas, groupBy])

  const trendData = useMemo(() => {
    const buckets = buildDayBuckets(trendDays)
    const src = filterUser !== 'all' ? activity.filter(a => a.user_id === filterUser) : activity
    src.forEach(a => { const d = a.created_at.split('T')[0]; if (d in buckets) buckets[d]++ })
    return Object.entries(buckets).map(([date, count]) => ({ date, count }))
  }, [activity, filterUser, trendDays])

  const tableRows = useMemo(() => {
    if (groupBy === 'user') {
      return users.map(u => {
        const ut = filteredTasks.filter(t => t.task_assignments?.some(a => a.user_id === u.id))
        const allBd = ut.flatMap(t => t.breakdowns || [])
        return {
          id: u.id, label: u.full_name, role: u.role,
          total: ut.length, completed: ut.filter(isCompleted).length, overdue: ut.filter(isOverdue).length,
          rate: pct(ut.filter(isCompleted).length, ut.length),
          breakdowns: allBd.length,
          bdCompleted: allBd.filter(b => b.is_checked).length,
          bdOverdue:   allBd.filter(b => !b.is_checked && b.end_date && localDate(b.end_date) < today).length,
        }
      }).filter(r => r.total > 0)
    }
    return areas.map(area => {
      const at = filteredTasks.filter(t => t.areas?.name === area.name)
      const allBd = at.flatMap(t => t.breakdowns || [])
      return {
        id: area.name, label: area.name, color: area.color,
        total: at.length, completed: at.filter(isCompleted).length, overdue: at.filter(isOverdue).length,
        rate: pct(at.filter(isCompleted).length, at.length),
        breakdowns: allBd.length,
        bdCompleted: allBd.filter(b => b.is_checked).length,
        bdOverdue:   allBd.filter(b => !b.is_checked && b.end_date && localDate(b.end_date) < today).length,
      }
    }).filter(r => r.total > 0)
  }, [filteredTasks, users, areas, groupBy])

  // ── Allocation analytics (intern-specific) — must stay ABOVE any early return ─
  const allocationData = useMemo(() => {
    const interns = users.filter(u => u.role === 'intern')

    // 1. Slot coverage per area — total required vs filled across all tasks
    const slotsByArea = {}
    tasks.forEach(task => {
      const assigned = task.task_assignments || []
      ;(task.task_area_slots || []).forEach(slot => {
        const areaId   = slot.area_id
        const areaName = slot.areas?.name  || 'Unknown'
        const color    = slot.areas?.color || '#6366f1'
        if (!slotsByArea[areaId]) slotsByArea[areaId] = { areaId, areaName, color, required: 0, filled: 0 }
        slotsByArea[areaId].required += slot.required_count
        // Count assigned users who belong to this area
        const filledCount = assigned.filter(a => {
          const user = users.find(u => u.id === a.user_id)
          return user && (user.user_areas || []).some(ua => ua.area_id === areaId)
        }).length
        slotsByArea[areaId].filled += Math.min(filledCount, slot.required_count)
      })
    })
    const slotCoverage = Object.values(slotsByArea).sort((a, b) => b.required - a.required)

    // 2. Intern utilization — % of placement period covered by at least one active task
    const internUtilization = interns.map(intern => {
      if (!intern.intern_start_date || !intern.intern_end_date) {
        return { id: intern.id, name: intern.full_name, util: null, taskCount: 0, areas: intern.user_areas || [] }
      }
      const pStart = new Date(intern.intern_start_date + 'T00:00:00')
      const pEnd   = new Date(intern.intern_end_date   + 'T00:00:00')
      const totalDays = Math.max(1, Math.ceil((pEnd - pStart) / 86400000))

      // Find tasks assigned to this intern that overlap the placement
      const internTasks = tasks.filter(t =>
        (t.task_assignments || []).some(a => a.user_id === intern.id) &&
        t.start_date && t.due_date
      )

      // Build a Set of covered day indices to avoid double-counting overlapping tasks
      const coveredDays = new Set()
      internTasks.forEach(t => {
        const tStart = new Date(Math.max(new Date(t.start_date + 'T00:00:00'), pStart))
        const tEnd   = new Date(Math.min(new Date(t.due_date   + 'T00:00:00'), pEnd))
        for (let d = new Date(tStart); d <= tEnd; d.setDate(d.getDate() + 1)) {
          coveredDays.add(d.toISOString().split('T')[0])
        }
      })

      return {
        id: intern.id,
        name: intern.full_name,
        util: pct(coveredDays.size, totalDays),
        taskCount: internTasks.length,
        areas: intern.user_areas || [],
        placementDays: totalDays,
      }
    }).sort((a, b) => (b.util ?? -1) - (a.util ?? -1))

    // 3. Capacity vs demand per area
    const capacityByArea = areas.map(area => {
      const availableInterns = interns.filter(u =>
        (u.user_areas || []).some(ua => ua.area_id === area.id)
      ).length
      const totalDemand = tasks.reduce((sum, t) => {
        const slot = (t.task_area_slots || []).find(s => s.area_id === area.id)
        return sum + (slot?.required_count || 0)
      }, 0)
      return { areaId: area.id, areaName: area.name, color: area.color, availableInterns, totalDemand }
    }).filter(a => a.availableInterns > 0 || a.totalDemand > 0)

    // 4. Summary stats
    const unassigned = interns.filter(u => !tasks.some(t => (t.task_assignments || []).some(a => a.user_id === u.id))).length
    const totalRequired = slotCoverage.reduce((s, a) => s + a.required, 0)
    const totalFilled   = slotCoverage.reduce((s, a) => s + a.filled,   0)
    const overallFillRate = pct(totalFilled, totalRequired)

    return { slotCoverage, internUtilization, capacityByArea, unassigned, overallFillRate, totalRequired, totalFilled, internCount: interns.length }
  }, [tasks, users, areas])

  const hasActiveFilters = filterArea !== 'all' || filterUser !== 'all' || dateFrom || dateTo

  // ── Early return after all hooks ─────────────────────────────────────────────
  if (loading || !profile) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1a1040 100%)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px', margin: '0 auto 1rem',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem', boxShadow: '0 0 24px rgba(99,102,241,0.5)',
        }}>
          📊
        </div>
        <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading analytics…</div>
      </div>
    </div>
  )

  const areaOptions  = [{ value: 'all', label: 'All areas' },  ...areas.map(a => ({ value: a.name, label: a.name }))]
  const userOptions  = [{ value: 'all', label: 'All users' },  ...users.map(u => ({ value: u.id,   label: u.full_name }))]
  const groupOptions = [{ value: 'user', label: 'By user' }, { value: 'area', label: 'By area' }]
  const dayOptions   = [{ value: 7, label: '7 days' }, { value: 14, label: '14 days' }, { value: 30, label: '30 days' }, { value: 60, label: '60 days' }]

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f1f5f9' }}>
      <AppSidebar profile={profile} />

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ── Page header ── */}
        <div style={{
          padding: '1.75rem 2rem 1.5rem',
          background: 'white',
          borderBottom: '1px solid #e8ecf0',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
              }}>
                📊
              </div>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                User Analytics
              </h1>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.82rem', marginLeft: '0.1rem' }}>
              {filteredTasks.length} tasks across {users.length} users
              {hasActiveFilters && <span style={{ marginLeft: '0.5rem', color: '#6366f1', fontWeight: 600 }}>· Filtered</span>}
            </p>
          </div>

          {/* Active filters pill */}
          {hasActiveFilters && (
            <button
              onClick={() => { setFilterArea('all'); setFilterUser('all'); setDateFrom(''); setDateTo('') }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.45rem 1rem', borderRadius: '20px',
                background: '#fef2f2', border: '1px solid #fecaca',
                color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              ✕ Clear filters
            </button>
          )}
        </div>

        <div style={{ padding: '1.75rem 2rem' }}>

          {/* ── Stat cards ── */}
          <div style={{ display: 'flex', gap: '0.9rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <StatCard
              label="Total Users" value={stats.totalUsers} icon="👥"
              gradient="linear-gradient(135deg, #6366f1 0%, #818cf8 100%)"
            />
            <StatCard
              label="Completion Rate" value={`${stats.rate}%`} icon="✅"
              gradient="linear-gradient(135deg, #10b981 0%, #34d399 100%)"
              sub={`${stats.done} of ${filteredTasks.length} done`}
            />
            <StatCard
              label="Overdue Tasks" value={stats.overdueCt} icon="⚠️"
              gradient="linear-gradient(135deg, #ef4444 0%, #f87171 100%)"
              sub={filteredTasks.length > 0 ? `${pct(stats.overdueCt, filteredTasks.length)}% of all tasks` : undefined}
            />
            <StatCard
              label="Slot Fill Rate" value={`${allocationData.overallFillRate}%`} icon="🎯"
              gradient="linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)"
              sub={`${allocationData.totalFilled}/${allocationData.totalRequired} slots filled`}
            />
            <StatCard
              label="Unassigned Interns" value={allocationData.unassigned} icon="🔴"
              gradient={allocationData.unassigned > 0
                ? 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)'
                : 'linear-gradient(135deg, #10b981 0%, #34d399 100%)'}
              sub={`of ${allocationData.internCount} total interns`}
            />
            <StatCard
              label="Active Today" value={stats.activeToday} icon="⚡"
              gradient="linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)"
              sub="users with activity"
            />
          </div>

          {/* ── Filters ── */}
          <div style={{
            background: 'white', borderRadius: '14px',
            border: '1px solid #e8ecf0',
            padding: '1.1rem 1.3rem', marginBottom: '1.25rem',
            display: 'flex', alignItems: 'flex-end', gap: '1.1rem', flexWrap: 'wrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.05rem', alignSelf: 'flex-end' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '7px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem',
              }}>
                🔍
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151' }}>Filters</span>
            </div>
            <div style={{ width: '1px', height: '36px', background: '#e8ecf0', alignSelf: 'flex-end' }} />
            <Select label="Group by"      value={groupBy}    onChange={setGroupBy}    options={groupOptions} />
            <Select label="Business area" value={filterArea} onChange={setFilterArea} options={areaOptions} />
            <Select label="User"          value={filterUser} onChange={setFilterUser} options={userOptions} />
            <DateInput label="Due from"   value={dateFrom}   onChange={setDateFrom} />
            <DateInput label="Due to"     value={dateTo}     onChange={setDateTo} />
          </div>

          {/* ── Charts row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <Section
              title={`Completion — ${groupBy === 'user' ? 'by user' : 'by area'}`}
              accent="#6366f1"
            >
              <BarChart data={barData} />
            </Section>

            <Section
              title="Activity trend"
              accent="#8b5cf6"
              action={
                <select
                  value={trendDays}
                  onChange={e => setTrendDays(Number(e.target.value))}
                  style={{
                    fontSize: '0.75rem', border: '1px solid #e2e8f0',
                    borderRadius: '7px', padding: '0.22rem 0.5rem',
                    color: '#64748b', cursor: 'pointer', background: 'white',
                    outline: 'none',
                  }}
                >
                  {dayOptions.map(o => <option key={o.value} value={o.value}>Last {o.label}</option>)}
                </select>
              }
            >
              <LineChart data={trendData} />
            </Section>
          </div>

          {/* ── Detailed table ── */}
          <Section
            title={`Detailed metrics — ${groupBy === 'user' ? 'by user' : 'by area'}`}
            accent="#10b981"
          >
            <MetricsTable rows={tableRows} groupBy={groupBy} />
          </Section>

          {/* ── Allocation analytics ── */}
          <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

            {/* Slot coverage by area */}
            <Section title="Slot coverage by area" accent="#0ea5e9">
              {allocationData.slotCoverage.length === 0 ? (
                <div style={{ color: '#9ca3af', fontSize: '0.85rem', padding: '1rem 0' }}>No slot requirements set on any task yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {allocationData.slotCoverage.map(a => {
                    const rate = pct(a.filled, a.required)
                    return (
                      <div key={a.areaId}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color }} />
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>{a.areaName}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{a.filled}/{a.required} filled</span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: rate === 100 ? '#10b981' : rate >= 60 ? '#6366f1' : '#f59e0b', minWidth: 32, textAlign: 'right' }}>{rate}%</span>
                          </div>
                        </div>
                        <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${rate}%`, borderRadius: 4, transition: 'width 0.4s', background: rate === 100 ? '#10b981' : a.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Section>

            {/* Capacity vs demand */}
            <Section title="Intern capacity vs demand" accent="#8b5cf6">
              {allocationData.capacityByArea.length === 0 ? (
                <div style={{ color: '#9ca3af', fontSize: '0.85rem', padding: '1rem 0' }}>No intern area data available.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {allocationData.capacityByArea.map(a => {
                    const isOver = a.availableInterns < a.totalDemand
                    return (
                      <div key={a.areaId}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color }} />
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>{a.areaName}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: 6, background: a.color + '15', color: a.color, fontWeight: 600 }}>
                              {a.availableInterns} intern{a.availableInterns !== 1 ? 's' : ''}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>vs</span>
                            <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: 6, background: isOver ? '#fef2f2' : '#f0fdf4', color: isOver ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                              {a.totalDemand} slot{a.totalDemand !== 1 ? 's' : ''}
                            </span>
                            {isOver && <span title="Demand exceeds capacity" style={{ fontSize: '0.7rem' }}>⚠️</span>}
                          </div>
                        </div>
                        {/* Dual bar: interns (solid) vs demand (outline) */}
                        <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 4, background: a.color, width: `${Math.min(100, pct(a.availableInterns, Math.max(a.availableInterns, a.totalDemand)))}%`, opacity: 0.7 }} />
                          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 4, border: `1.5px solid ${isOver ? '#ef4444' : '#10b981'}`, width: `${pct(a.totalDemand, Math.max(a.availableInterns, a.totalDemand))}%`, background: 'transparent' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Section>
          </div>

          {/* Intern utilization */}
          <Section title="Intern utilisation" accent="#f59e0b">
            {allocationData.internUtilization.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '0.85rem', padding: '1rem 0' }}>No interns found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {allocationData.internUtilization.map(intern => {
                  const areaColor = intern.areas[0]?.areas?.color || '#6366f1'
                  const util = intern.util
                  const noPlacement = util === null
                  return (
                    <div key={intern.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {/* Avatar */}
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: areaColor + '25', color: areaColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0, border: `1.5px solid ${areaColor}50` }}>
                        {intern.name?.charAt(0).toUpperCase()}
                      </div>
                      {/* Name + area chips */}
                      <div style={{ minWidth: 160, flexShrink: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>{intern.name}</div>
                        <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.1rem' }}>
                          {intern.areas.slice(0, 3).map(ua => (
                            <span key={ua.area_id} style={{ fontSize: '0.58rem', padding: '0.05rem 0.3rem', background: (ua.areas?.color || '#6366f1') + '20', color: ua.areas?.color || '#6366f1', borderRadius: 6, fontWeight: 600 }}>
                              {ua.areas?.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* Bar */}
                      <div style={{ flex: 1, height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                        {noPlacement ? (
                          <div style={{ height: '100%', background: 'repeating-linear-gradient(45deg, #e5e7eb, #e5e7eb 3px, #f1f5f9 3px, #f1f5f9 6px)', borderRadius: 5 }} />
                        ) : (
                          <div style={{ height: '100%', width: `${util}%`, borderRadius: 5, background: util >= 80 ? '#10b981' : util >= 50 ? '#f59e0b' : '#6366f1', transition: 'width 0.4s' }} />
                        )}
                      </div>
                      {/* % label */}
                      <div style={{ minWidth: 48, textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: noPlacement ? '#9ca3af' : util >= 80 ? '#10b981' : util >= 50 ? '#f59e0b' : '#6366f1' }}>
                        {noPlacement ? 'No dates' : `${util}%`}
                      </div>
                      {/* Task count */}
                      <div style={{ minWidth: 52, textAlign: 'right', fontSize: '0.7rem', color: '#94a3b8' }}>
                        {intern.taskCount} task{intern.taskCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )
                })}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.68rem', color: '#94a3b8', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#10b981', display: 'inline-block' }} />≥80% utilised</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#f59e0b', display: 'inline-block' }} />50–79%</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#6366f1', display: 'inline-block' }} />&lt;50%</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: 12, height: 8, borderRadius: 2, background: 'repeating-linear-gradient(45deg, #e5e7eb, #e5e7eb 3px, #f1f5f9 3px, #f1f5f9 6px)', display: 'inline-block' }} />No placement dates set</span>
                </div>
              </div>
            )}
          </Section>

          <div style={{ height: '1.5rem' }} />
        </div>
      </div>
    </div>
  )
}
