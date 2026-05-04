import { useState } from 'react'
import TaskCard from '../../components/TaskCard'

// ─── Classify each task into one of three phases ─────────────────────────────
function getPhase(task) {
  const total   = task.breakdowns?.length || 0
  const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
  if ((total > 0 && checked === total) || task.status === 'done') return 'done'
  if (checked > 0 || task.status === 'in_progress') return 'in_progress'
  const start = task.start_date ? new Date(task.start_date + 'T00:00:00') : null
  if (start && start <= new Date()) return 'in_progress'
  return 'not_started'
}

// ─── Mini cube card ───────────────────────────────────────────────────────────
function TaskCube({ task, isSelected, onClick }) {
  const color   = task.areas?.color || '#6366f1'
  const total   = task.breakdowns?.length || 0
  const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
  const percent = total > 0 ? Math.round((checked / total) * 100) : null
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '164px',
        minHeight: '148px',
        background: 'white',
        borderRadius: '12px',
        border: `1.5px solid ${isSelected ? color : hovered ? color + '88' : '#e5e7eb'}`,
        borderTop: `3px solid ${color}`,
        cursor: 'pointer',
        padding: '0.85rem 0.8rem 0.8rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
        flexShrink: 0,
        boxShadow: isSelected
          ? `0 0 0 2px ${color}30, 0 6px 18px rgba(0,0,0,0.12)`
          : hovered
            ? '0 4px 14px rgba(0,0,0,0.09)'
            : '0 1px 4px rgba(0,0,0,0.05)',
        transform: hovered && !isSelected ? 'translateY(-2px)' : 'none',
        transition: 'box-shadow 0.15s, transform 0.15s, border-color 0.15s',
      }}
    >
      {/* Title */}
      <div style={{
        fontSize: '0.82rem',
        fontWeight: 600,
        color: '#111827',
        lineHeight: 1.4,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        flex: 1,
      }}>
        {task.title}
      </div>

      {/* Area chip */}
      {task.areas?.name && (
        <span style={{
          fontSize: '0.68rem',
          padding: '0.12rem 0.5rem',
          background: color + '18',
          color,
          borderRadius: '10px',
          fontWeight: 500,
          display: 'inline-block',
          width: 'fit-content',
        }}>
          {task.areas.name}
        </span>
      )}

      {/* Progress bar or due date */}
      {percent !== null ? (
        <div style={{ marginTop: '0.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ fontSize: '0.62rem', color: '#9ca3af' }}>{checked}/{total} steps</span>
            <span style={{ fontSize: '0.62rem', color: percent === 100 ? '#10b981' : '#9ca3af', fontWeight: 600 }}>
              {percent}%
            </span>
          </div>
          <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${percent}%`,
              background: percent === 100 ? '#10b981' : color,
              borderRadius: '2px',
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.1rem' }}>
          {task.due_date
            ? `Due ${new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
            : 'No due date'}
        </div>
      )}
    </div>
  )
}

// ─── Section (In Progress / Not Started / Done) ───────────────────────────────
const SECTION_META = {
  in_progress: { label: 'In Progress',  dot: '#f59e0b' },
  not_started: { label: 'Not Started',  dot: '#94a3b8' },
  done:        { label: 'Done',         dot: '#10b981' },
}

function Section({ phase, tasks, expandedId, setExpandedId, cardProps }) {
  if (!tasks.length) return null
  const { label, dot } = SECTION_META[phase]

  const expandedTask = tasks.find(t => t.id === expandedId)
  const cubes        = tasks.filter(t => t.id !== expandedId)
  const color        = expandedTask?.areas?.color || '#6366f1'

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dot, flexShrink: 0 }} />
        <span style={{
          fontSize: '0.77rem', fontWeight: 700, color: '#374151',
          textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          {label}
        </span>
        <span style={{
          fontSize: '0.7rem', padding: '0.1rem 0.48rem',
          background: dot + '20', color: dot,
          borderRadius: '20px', fontWeight: 700,
        }}>
          {tasks.length}
        </span>
      </div>

      {/* Expanded card pinned to top of section */}
      {expandedTask && (
        <div
          style={{
            position: 'relative',
            marginBottom: '0.75rem',
            animation: 'cubeExpand 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* ✕ close button — top-right corner, red, away from title */}
          <button
            onClick={() => setExpandedId(null)}
            title="Collapse"
            style={{
              position: 'absolute', 
              top: '0rem', 
              right: '0rem',  // Changed from left to right
              zIndex: 10,
              width: '28px', 
              height: '28px',
              borderRadius: '50%',
              background: 'white',
              border: '1.5px solid #fee2e2',  // Light red border
              boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
              cursor: 'pointer',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '0.85rem', 
              color: '#dc2626',  // Red color
              fontWeight: 'bold',
              transition: 'all 0.12s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#fee2e2'  // Light red background on hover
              e.currentTarget.style.color = '#b91c1c'  // Darker red
              e.currentTarget.style.borderColor = '#fecaca'
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'white'
              e.currentTarget.style.color = '#dc2626'
              e.currentTarget.style.borderColor = '#fee2e2'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            ✕
          </button>

          {/* The full task card */}
          <div style={{
            borderRadius: '14px',
            border: `1.5px solid ${color}45`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}>
            <TaskCard task={expandedTask} {...cardProps} />
          </div>
        </div>
      )}

      {/* Remaining cubes */}
      {cubes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'flex-start' }}>
          {cubes.map(task => (
            <TaskCube
              key={task.id}
              task={task}
              isSelected={false}
              onClick={() => setExpandedId(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function InternTaskGrid({ tasks, cardProps }) {
  const [expandedId, setExpandedId] = useState(null)

  const byPhase = {
    in_progress: tasks.filter(t => getPhase(t) === 'in_progress'),
    not_started: tasks.filter(t => getPhase(t) === 'not_started'),
    done:        tasks.filter(t => getPhase(t) === 'done'),
  }

  if (!tasks.length) {
    return (
      <div style={{
        background: 'white', borderRadius: '14px', padding: '3rem 2rem',
        textAlign: 'center', border: '1px solid #f1f5f9',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📋</div>
        <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#6b7280' }}>
          No tasks assigned to you yet
        </div>
        <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>
          Ask your admin to assign tasks to your area
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes cubeExpand {
          from { opacity: 0; transform: scaleY(0.92); transform-origin: top; }
          to   { opacity: 1; transform: scaleY(1); }
        }
      `}</style>

      {['in_progress', 'not_started', 'done'].map(phase => (
        <Section
          key={phase}
          phase={phase}
          tasks={byPhase[phase]}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          cardProps={cardProps}
        />
      ))}
    </>
  )
}
