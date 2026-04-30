import { useRef } from 'react'
import {
  DAY_WIDTH, TASK_ROW_HEIGHT, BREAKDOWN_ROW_HEIGHT, LABEL_WIDTH,
} from './constants'
import { dateToX } from './utils'

const PHANTOM_ROW_COUNT = 10

// Total vertical height of one task row (header + breakdowns when expanded).
function rowTotalHeight(task, expandedTasks) {
  const isExpanded = expandedTasks[task.id]
  const bdCount = task.breakdowns?.length || 0
  return TASK_ROW_HEIGHT + (isExpanded && bdCount > 0
    ? bdCount * BREAKDOWN_ROW_HEIGHT + 8
    : 0)
}

// ─── Click-and-drag panning over the timeline scroll container ───────────────
function useTimelinePan(scrollRef) {
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })

  return (e) => {
    if (e.button !== 0) return
    if (e.target.closest('button, [data-nopan]')) return
    isPanning.current = true
    panStart.current = {
      x: e.clientX, y: e.clientY,
      scrollLeft: scrollRef.current.scrollLeft,
      scrollTop: scrollRef.current.scrollTop,
    }
    e.currentTarget.style.cursor = 'grabbing'
    e.preventDefault()

    const onMove = (ev) => {
      if (!isPanning.current) return
      const dx = ev.clientX - panStart.current.x
      const dy = ev.clientY - panStart.current.y
      scrollRef.current.scrollLeft = panStart.current.scrollLeft - dx
      scrollRef.current.scrollTop = panStart.current.scrollTop - dy
    }
    const onUp = () => {
      isPanning.current = false
      if (scrollRef.current) scrollRef.current.style.cursor = 'grab'
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
}

// ─── Sticky left column: task labels + breakdown sub-labels ──────────────────
function TaskLabelsColumn({ tasks, expandedTasks, setExpandedTasks }) {
  return (
    <div style={{
      width: `${LABEL_WIDTH}px`, flexShrink: 0,
      borderRight: '1px solid #f1f5f9',
      position: 'sticky', left: 0, zIndex: 20, background: 'white',
    }}>
      <div style={{
        height: '56px', borderBottom: '1px solid #f1f5f9',
        padding: '0 1rem', display: 'flex', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 25, background: 'white',
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>
          Task
        </span>
      </div>

      {tasks.map((task, i) => {
        const total = task.breakdowns?.length || 0
        const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
        const percent = total > 0 ? Math.round((checked / total) * 100) : 0
        const color = task.areas?.color || '#6366f1'
        const isExpanded = expandedTasks[task.id]
        const rowH = rowTotalHeight(task, expandedTasks)

        return (
          <div key={task.id} style={{
            height: `${rowH}px`,
            borderBottom: '1px solid #f9fafb',
            background: i % 2 === 0 ? 'white' : '#fafafa',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
            padding: '0 0.75rem',
          }}>
            <div style={{
              height: `${TASK_ROW_HEIGHT}px`, display: 'flex',
              alignItems: 'center', gap: '0.5rem',
            }}>
              <div style={{ width: '4px', height: '26px', borderRadius: '2px', background: color, flexShrink: 0 }} />
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {task.title}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.1rem' }}>
                  {percent}% · {task.areas?.name}
                </div>
              </div>
              {total > 0 && (
                <button
                  onClick={() => setExpandedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                  title={isExpanded ? 'Collapse breakdowns' : 'Expand breakdowns'}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '0.65rem', color: '#9ca3af', padding: '2px 4px',
                    borderRadius: '4px', flexShrink: 0,
                    transform: isExpanded ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}>▼</button>
              )}
            </div>

            {isExpanded && task.breakdowns?.sort((a, b) => a.order_index - b.order_index).map(b => (
              <div key={b.id} style={{
                height: `${BREAKDOWN_ROW_HEIGHT}px`,
                display: 'flex', alignItems: 'center',
                paddingLeft: '1.25rem', gap: '0.4rem',
              }}>
                <div style={{
                  width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                  background: b.is_checked ? '#10b981' : b.start_date ? color : '#d1d5db',
                }} />
                <span style={{
                  fontSize: '0.72rem', color: b.is_checked ? '#9ca3af' : '#6b7280',
                  textDecoration: b.is_checked ? 'line-through' : 'none',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{b.title}</span>
              </div>
            ))}
          </div>
        )
      })}

      {Array.from({ length: PHANTOM_ROW_COUNT }).map((_, i) => (
        <div key={`phantom-label-${i}`} style={{
          height: `${TASK_ROW_HEIGHT}px`,
          borderBottom: '1px solid #f9fafb',
          background: (tasks.length + i) % 2 === 0 ? 'white' : '#fafafa',
        }} />
      ))}
    </div>
  )
}

// ─── A single task row in the timeline (bar + breakdown sub-bars) ────────────
function TimelineRow({ task, index, expandedTasks, days, minDate, hover, onClick }) {
  const total = task.breakdowns?.length || 0
  const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
  const percent = total > 0 ? Math.round((checked / total) * 100) : 0
  const color = task.areas?.color || '#6366f1'
  const isComplete = percent === 100
  const isExpanded = expandedTasks[task.id]
  const rowH = rowTotalHeight(task, expandedTasks)

  const startX = task.start_date
    ? Math.floor((new Date(task.start_date) - minDate) / 86400000) * DAY_WIDTH
    : Math.floor((new Date(task.due_date) - minDate) / 86400000) * DAY_WIDTH - 60
  const endX = Math.floor((new Date(task.due_date) - minDate) / 86400000) * DAY_WIDTH + DAY_WIDTH / 2
  const barWidth = Math.max(endX - startX, 80)

  return (
    <div style={{
      height: `${rowH}px`, position: 'relative',
      borderBottom: '1px solid #f9fafb',
      background: index % 2 === 0 ? 'white' : '#fafafa',
    }}>
      {days.map((d, di) => (d.getDay() === 0 || d.getDay() === 6) && (
        <div key={di} style={{
          position: 'absolute', left: di * DAY_WIDTH, top: 0, bottom: 0,
          width: DAY_WIDTH, background: 'rgba(0,0,0,0.018)', pointerEvents: 'none',
        }} />
      ))}

      <div
        onMouseEnter={(e) => hover.onEnter(task, e)}
        onMouseMove={hover.onMove}
        onMouseLeave={hover.onLeave}
        onClick={() => onClick(task)}
        style={{
          position: 'absolute',
          left: startX, top: (TASK_ROW_HEIGHT - 28) / 2,
          height: '28px', width: `${barWidth}px`,
          borderRadius: '6px',
          background: color,
          opacity: isComplete ? 0.5 : 1,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center',
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          zIndex: 2,
        }}
      >
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${percent}%`, background: 'rgba(255,255,255,0.22)',
          transition: 'width 0.3s',
        }} />
        <span style={{
          fontSize: '0.7rem', color: 'white', fontWeight: 600,
          padding: '0 8px', position: 'relative', zIndex: 1,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {isComplete ? '✓ ' : ''}{task.title}
        </span>
        {total > 0 && (
          <span style={{
            position: 'absolute', right: 6, fontSize: '0.6rem',
            color: 'rgba(255,255,255,0.8)', zIndex: 1,
          }}>
            {checked}/{total}
          </span>
        )}
      </div>

      {isExpanded && (task.breakdowns || [])
        .sort((a, b) => a.order_index - b.order_index)
        .map((b, bi) => {
          const bStartX = dateToX(b.start_date, minDate, DAY_WIDTH)
          const bEndX = dateToX(b.end_date, minDate, DAY_WIDTH)
          if (bStartX === null || bEndX === null) return (
            <div key={b.id} style={{
              position: 'absolute',
              top: TASK_ROW_HEIGHT + bi * BREAKDOWN_ROW_HEIGHT + 4,
              left: startX, height: `${BREAKDOWN_ROW_HEIGHT - 6}px`,
              display: 'flex', alignItems: 'center', paddingLeft: 4,
            }}>
              <span style={{ fontSize: '0.62rem', color: '#d1d5db', fontStyle: 'italic' }}>
                not scheduled
              </span>
            </div>
          )

          const bWidth = Math.max(bEndX - bStartX, DAY_WIDTH)
          return (
            <div key={b.id} style={{
              position: 'absolute',
              left: bStartX,
              top: TASK_ROW_HEIGHT + bi * BREAKDOWN_ROW_HEIGHT + 3,
              height: `${BREAKDOWN_ROW_HEIGHT - 6}px`,
              width: `${bWidth}px`,
              borderRadius: '4px',
              background: b.is_checked ? '#d1fae5' : color + '55',
              border: `1px solid ${b.is_checked ? '#6ee7b7' : color + '99'}`,
              display: 'flex', alignItems: 'center', overflow: 'hidden',
              zIndex: 1,
            }}>
              <span style={{
                fontSize: '0.62rem', fontWeight: 500,
                color: b.is_checked ? '#059669' : color,
                padding: '0 6px',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {b.is_checked ? '✓ ' : ''}{b.title}
              </span>
            </div>
          )
        })}
    </div>
  )
}

// ─── The right-hand timeline column (month/day headers + task rows) ──────────
function TimelineColumn({ tasks, expandedTasks, days, months, minDate, today, totalDays, todayX, hover, onTaskClick }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ width: `${totalDays * DAY_WIDTH}px`, position: 'relative' }}>
        <div style={{ height: '28px', position: 'sticky', top: 0, borderBottom: '1px solid #f1f5f9', background: '#fafafa', zIndex: 15 }}>
          {months.map((m, i) => (
            <div key={i} style={{
              position: 'absolute', left: m.offset,
              fontSize: '0.72rem', fontWeight: 600, color: '#6b7280',
              padding: '0 8px', lineHeight: '28px', whiteSpace: 'nowrap',
            }}>{m.label}</div>
          ))}
        </div>

        <div style={{ height: '28px', position: 'sticky', top: '28px', borderBottom: '1px solid #f1f5f9', background: '#fafafa', zIndex: 15 }}>
          {days.map((d, i) => (
            <div key={i} style={{
              position: 'absolute', left: i * DAY_WIDTH, width: DAY_WIDTH,
              textAlign: 'center', fontSize: '0.65rem',
              color: d.getDay() === 0 || d.getDay() === 6 ? '#d1d5db' : '#9ca3af',
              lineHeight: '28px',
              background: d.toDateString() === today.toDateString() ? '#eef2ff' : 'transparent',
            }}>{d.getDate()}</div>
          ))}
        </div>

        <div style={{
          position: 'absolute', left: todayX + DAY_WIDTH / 2,
          top: 0, bottom: 0, width: '2px',
          background: '#6366f1', opacity: 0.4, zIndex: 10, pointerEvents: 'none',
        }} />

        {tasks.map((task, i) => (
          <TimelineRow
            key={task.id}
            task={task}
            index={i}
            expandedTasks={expandedTasks}
            days={days}
            minDate={minDate}
            hover={hover}
            onClick={onTaskClick}
          />
        ))}

        {Array.from({ length: PHANTOM_ROW_COUNT }).map((_, i) => (
          <div key={`phantom-${i}`} style={{
            height: `${TASK_ROW_HEIGHT}px`,
            borderBottom: '1px solid #f9fafb',
            background: (tasks.length + i) % 2 === 0 ? 'white' : '#fafafa',
            position: 'relative',
          }}>
            {days.map((d, di) => (d.getDay() === 0 || d.getDay() === 6) && (
              <div key={di} style={{
                position: 'absolute', left: di * DAY_WIDTH, top: 0, bottom: 0,
                width: DAY_WIDTH, background: 'rgba(0,0,0,0.018)', pointerEvents: 'none',
              }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main scrollable timeline (label column + timeline column) ───────────────
export default function TimelineGrid({
  scrollRef,
  tasks,
  expandedTasks, setExpandedTasks,
  days, months, totalDays, todayX, minDate, today,
  hover, onTaskClick,
}) {
  const onMouseDown = useTimelinePan(scrollRef)

  return (
    <div
      ref={scrollRef}
      onMouseDown={onMouseDown}
      style={{
        display: 'flex', background: 'white',
        borderRadius: '14px', border: '1px solid #f1f5f9',
        overflow: 'scroll', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        flex: 1, minHeight: 0, cursor: 'grab',
        scrollbarWidth: 'thin',
        userSelect: 'none',
      }}>
      <TaskLabelsColumn
        tasks={tasks}
        expandedTasks={expandedTasks}
        setExpandedTasks={setExpandedTasks}
      />
      <TimelineColumn
        tasks={tasks}
        expandedTasks={expandedTasks}
        days={days}
        months={months}
        minDate={minDate}
        today={today}
        totalDays={totalDays}
        todayX={todayX}
        hover={hover}
        onTaskClick={onTaskClick}
      />
    </div>
  )
}
