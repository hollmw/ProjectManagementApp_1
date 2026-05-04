import { useRef, useState, useCallback } from 'react'
import {
  DAY_WIDTH, TASK_ROW_HEIGHT, BREAKDOWN_ROW_HEIGHT, LABEL_WIDTH,
} from './constants'
import { dateToX } from './utils'

const PHANTOM_ROW_COUNT = 6
const SECTION_HEADER_HEIGHT = 32

// ─── Helpers ──────────────────────────────────────────────────────────────────
function addDaysToStr(dateStr, days) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function fmtDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function getPhase(task) {
  const total   = task.breakdowns?.length || 0
  const checked = task.breakdowns?.filter(b => b.is_checked).length || 0
  if ((total > 0 && checked === total) || task.status === 'done') return 'done'
  if (checked > 0 || task.status === 'in_progress') return 'in_progress'
  const start = task.start_date ? new Date(task.start_date + 'T00:00:00') : null
  if (start && start <= new Date()) return 'in_progress'
  return 'not_started'
}

const PHASE_META = {
  in_progress: { label: 'In Progress', dot: '#f59e0b', bg: '#fffbeb' },
  not_started: { label: 'Not Started', dot: '#94a3b8', bg: '#f8fafc' },
  done:        { label: 'Done',        dot: '#10b981', bg: '#f0fdf4' },
}
const PHASE_ORDER = ['in_progress', 'not_started', 'done']

// Build flat list of section headers + task items
function buildItems(allTasks) {
  const byPhase = { in_progress: [], not_started: [], done: [] }
  for (const task of allTasks) {
    byPhase[getPhase(task)].push(task)
  }
  const items = []
  for (const phase of PHASE_ORDER) {
    if (byPhase[phase].length > 0) {
      items.push({ type: 'header', phase, count: byPhase[phase].length })
      for (const task of byPhase[phase]) {
        items.push({ type: 'task', task })
      }
    }
  }
  return items
}

function rowTotalHeight(task, expandedTasks) {
  const isExpanded = expandedTasks[task.id]
  const bdCount    = task.breakdowns?.length || 0
  return TASK_ROW_HEIGHT + (isExpanded && bdCount > 0
    ? bdCount * BREAKDOWN_ROW_HEIGHT + 8
    : 0)
}

// ─── Pan hook ─────────────────────────────────────────────────────────────────
function useTimelinePan(scrollRef) {
  const isPanning = useRef(false)
  const panStart  = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })

  return (e) => {
    if (e.target.closest('[data-drag-handle]') || e.target.closest('[data-label-drag]')) return
    if (e.button !== 0) return
    isPanning.current = true
    panStart.current = {
      x: e.clientX, y: e.clientY,
      scrollLeft: scrollRef.current.scrollLeft,
      scrollTop:  scrollRef.current.scrollTop,
    }
    e.currentTarget.style.cursor = 'grabbing'
    e.preventDefault()

    const onMove = (ev) => {
      if (!isPanning.current) return
      scrollRef.current.scrollLeft = panStart.current.scrollLeft - (ev.clientX - panStart.current.x)
      scrollRef.current.scrollTop  = panStart.current.scrollTop  - (ev.clientY - panStart.current.y)
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

// ─── Left label column ────────────────────────────────────────────────────────
function TaskLabelsColumn({ items, expandedTasks, setExpandedTasks, onLabelDragStart, draggingTaskId }) {
  return (
    <div style={{
      width: `${LABEL_WIDTH}px`, flexShrink: 0,
      borderRight: '1px solid #f1f5f9',
      position: 'sticky', left: 0, zIndex: 20, background: 'white',
    }}>
      {/* Column heading */}
      <div style={{
        height: '56px', borderBottom: '1px solid #f1f5f9',
        padding: '0 1rem', display: 'flex', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 25, background: 'white',
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>
          Task
        </span>
      </div>

      {items.map((item, idx) => {
        /* ── Section header row ── */
        if (item.type === 'header') {
          const meta = PHASE_META[item.phase]
          return (
            <div key={`hdr-${item.phase}`} style={{
              height: `${SECTION_HEADER_HEIGHT}px`,
              display: 'flex', alignItems: 'center',
              padding: '0 0.75rem', gap: '0.5rem',
              background: meta.bg,
              borderBottom: '1px solid #f1f5f9',
              position: 'sticky', top: '56px', zIndex: 18,
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: meta.dot, flexShrink: 0 }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {meta.label}
              </span>
              <span style={{
                fontSize: '0.65rem', padding: '0.05rem 0.4rem',
                background: meta.dot + '25', color: meta.dot,
                borderRadius: '10px', fontWeight: 700,
              }}>
                {item.count}
              </span>
            </div>
          )
        }

        /* ── Task label row ── */
        const { task } = item
        const hasDate    = !!task.due_date
        const total      = task.breakdowns?.length || 0
        const checked    = task.breakdowns?.filter(b => b.is_checked).length || 0
        const percent    = total > 0 ? Math.round((checked / total) * 100) : 0
        const color      = task.areas?.color || '#6366f1'
        const isExpanded = expandedTasks[task.id]
        const rowH       = rowTotalHeight(task, expandedTasks)
        const isDragging = draggingTaskId === task.id

        return (
          <div key={task.id} style={{
            height: `${rowH}px`,
            borderBottom: '1px solid #f9fafb',
            background: isDragging ? '#f0f9ff' : (idx % 2 === 0 ? 'white' : '#fafafa'),
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
            padding: '0 0.5rem 0 0.75rem',
            opacity: isDragging ? 0.5 : 1,
            transition: 'opacity 0.15s',
          }}>
            <div style={{ height: `${TASK_ROW_HEIGHT}px`, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {/* Colored bar */}
              <div style={{ width: '4px', height: '26px', borderRadius: '2px', background: color, flexShrink: 0 }} />

              {/* Drag handle — only for unscheduled tasks */}
              {!hasDate && (
                <div
                  data-label-drag="true"
                  onMouseDown={e => onLabelDragStart(e, task)}
                  title="Drag onto the timeline to set dates"
                  style={{
                    cursor: 'grab', color: '#94a3b8', fontSize: '0.8rem',
                    padding: '2px 4px', flexShrink: 0, userSelect: 'none',
                    borderRadius: '4px', lineHeight: 1,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.background = '#eef2ff' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none' }}
                >
                  ⠿
                </div>
              )}

              {/* Text */}
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{
                  fontSize: '0.82rem', fontWeight: 500,
                  color: hasDate ? '#111827' : '#374151',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {task.title}
                </div>
                {hasDate ? (
                  <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.1rem' }}>
                    {percent}% · {task.areas?.name}
                  </div>
                ) : (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem',
                  }}>
                    <span style={{
                      fontSize: '0.63rem', fontWeight: 600,
                      padding: '0.08rem 0.4rem',
                      background: '#fef3c7', color: '#92400e',
                      border: '1px solid #fcd34d',
                      borderRadius: '8px', whiteSpace: 'nowrap',
                    }}>
                      ⚠ No dates set
                    </span>
                  </div>
                )}
              </div>

              {/* Expand breakdowns (only for tasks with dates) */}
              {hasDate && total > 0 && (
                <button
                  onClick={() => setExpandedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '0.65rem', color: '#9ca3af', padding: '2px 4px',
                    borderRadius: '4px', flexShrink: 0,
                    transform: isExpanded ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}>▼</button>
              )}
            </div>

            {/* Breakdown sub-labels */}
            {isExpanded && task.breakdowns?.slice().sort((a, b) => a.order_index - b.order_index).map(b => (
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
          background: (items.length + i) % 2 === 0 ? 'white' : '#fafafa',
        }} />
      ))}
    </div>
  )
}

// ─── A single draggable/resizable task bar ────────────────────────────────────
function TimelineRow({ task, index, expandedTasks, days, minDate, hover, onClick, overrideDates, onDragStart, suppressNextClickRef }) {
  const total      = task.breakdowns?.length || 0
  const checked    = task.breakdowns?.filter(b => b.is_checked).length || 0
  const percent    = total > 0 ? Math.round((checked / total) * 100) : 0
  const color      = task.areas?.color || '#6366f1'
  const isComplete = percent === 100
  const isExpanded = expandedTasks[task.id]
  const rowH       = rowTotalHeight(task, expandedTasks)

  const effectiveStart = overrideDates?.start_date ?? task.start_date
  const effectiveDue   = overrideDates?.due_date   ?? task.due_date

  if (!effectiveDue) return null

  const startX   = effectiveStart
    ? Math.floor((new Date(effectiveStart + 'T00:00:00') - minDate) / 86400000) * DAY_WIDTH
    : Math.floor((new Date(effectiveDue + 'T00:00:00') - minDate) / 86400000) * DAY_WIDTH - 60
  const endX     = Math.floor((new Date(effectiveDue + 'T00:00:00') - minDate) / 86400000) * DAY_WIDTH + DAY_WIDTH / 2
  const barWidth = Math.max(endX - startX, DAY_WIDTH)
  const isDragging = !!overrideDates

  return (
    <div style={{
      height: `${rowH}px`, position: 'relative',
      borderBottom: '1px solid #f9fafb',
      background: index % 2 === 0 ? 'white' : '#fafafa',
    }}>
      {/* Weekend shading */}
      {days.map((d, di) => (d.getDay() === 0 || d.getDay() === 6) && (
        <div key={di} style={{
          position: 'absolute', left: di * DAY_WIDTH, top: 0, bottom: 0,
          width: DAY_WIDTH, background: 'rgba(0,0,0,0.018)', pointerEvents: 'none',
        }} />
      ))}

      {/* Task bar */}
      <div style={{
        position: 'absolute', left: startX, top: (TASK_ROW_HEIGHT - 28) / 2,
        height: '28px', width: `${barWidth}px`,
        borderRadius: '6px', background: color,
        opacity: isComplete ? 0.55 : 1,
        display: 'flex', alignItems: 'center', overflow: 'hidden',
        boxShadow: isDragging ? `0 4px 16px ${color}60, 0 2px 8px rgba(0,0,0,0.2)` : '0 1px 4px rgba(0,0,0,0.15)',
        zIndex: isDragging ? 10 : 2,
        userSelect: 'none',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${percent}%`, background: 'rgba(255,255,255,0.22)', transition: 'width 0.3s',
        }} />

        {/* Left resize handle */}
        <div
          data-drag-handle="resize-left"
          onMouseDown={e => { e.stopPropagation(); onDragStart(e, task, 'resize-left') }}
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '10px',
            cursor: 'ew-resize', zIndex: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{ width: '2px', height: '12px', background: 'rgba(255,255,255,0.6)', borderRadius: '1px', pointerEvents: 'none' }} />
        </div>

        {/* Move body */}
        <div
          data-drag-handle="move"
          onMouseDown={e => { e.stopPropagation(); onDragStart(e, task, 'move') }}
          onMouseEnter={hover ? e => hover.onEnter(task, e) : undefined}
          onMouseMove={hover?.onMove}
          onMouseLeave={hover?.onLeave}
          onClick={() => {
            // Suppress click if a real drag just finished
            if (suppressNextClickRef?.current) {
              suppressNextClickRef.current = false
              return
            }
            onClick(task)
          }}
          style={{
            position: 'absolute', left: '10px', right: '10px', top: 0, bottom: 0,
            cursor: isDragging ? 'grabbing' : 'grab',
            display: 'flex', alignItems: 'center', zIndex: 3,
          }}
        >
          <span style={{
            fontSize: '0.7rem', color: 'white', fontWeight: 600,
            paddingLeft: '4px', paddingRight: '20px',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            pointerEvents: 'none',
          }}>
            {isComplete ? '✓ ' : ''}{task.title}
          </span>
        </div>

        {total > 0 && (
          <span style={{
            position: 'absolute', right: 14, fontSize: '0.6rem',
            color: 'rgba(255,255,255,0.8)', zIndex: 1, pointerEvents: 'none',
          }}>{checked}/{total}</span>
        )}

        {/* Right resize handle */}
        <div
          data-drag-handle="resize-right"
          onMouseDown={e => { e.stopPropagation(); onDragStart(e, task, 'resize-right') }}
          style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '10px',
            cursor: 'ew-resize', zIndex: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{ width: '2px', height: '12px', background: 'rgba(255,255,255,0.6)', borderRadius: '1px', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* Live date tooltip while dragging */}
      {isDragging && (
        <div style={{
          position: 'absolute', left: startX, top: (TASK_ROW_HEIGHT - 28) / 2 - 22,
          background: 'rgba(15,23,42,0.85)', color: 'white',
          fontSize: '0.65rem', fontWeight: 600, padding: '2px 7px',
          borderRadius: '4px', whiteSpace: 'nowrap', zIndex: 20, pointerEvents: 'none',
        }}>
          {fmtDate(effectiveStart)} → {fmtDate(effectiveDue)}
        </div>
      )}

      {/* Breakdown sub-bars */}
      {isExpanded && (() => {
        // During a move-drag, shift breakdown bars by the same delta as the task.
        // We detect a "move" (vs resize) when both start and due shifted by the same amount.
        const startShift = overrideDates?.start_date && task.start_date
          ? Math.round((new Date(overrideDates.start_date + 'T00:00:00') - new Date(task.start_date + 'T00:00:00')) / 86400000)
          : 0
        const dueShift = overrideDates?.due_date && task.due_date
          ? Math.round((new Date(overrideDates.due_date + 'T00:00:00') - new Date(task.due_date + 'T00:00:00')) / 86400000)
          : 0
        const dragShift = startShift === dueShift ? startShift : 0

        return (task.breakdowns || [])
        .slice().sort((a, b) => a.order_index - b.order_index)
        .map((b, bi) => {
          const shiftedStart = dragShift ? addDaysToStr(b.start_date, dragShift) : b.start_date
          const shiftedEnd   = dragShift ? addDaysToStr(b.end_date,   dragShift) : b.end_date
          const bStartX = dateToX(shiftedStart, minDate, DAY_WIDTH)
          // Use the same midpoint convention as the task bar: end at centre of the due-date column
          const bEndX   = shiftedEnd ? dateToX(shiftedEnd, minDate, DAY_WIDTH) + DAY_WIDTH / 2 : null
          if (bStartX === null || bEndX === null) return (
            <div key={b.id} style={{
              position: 'absolute', left: startX,
              top: TASK_ROW_HEIGHT + bi * BREAKDOWN_ROW_HEIGHT + 4,
              height: `${BREAKDOWN_ROW_HEIGHT - 6}px`,
              display: 'flex', alignItems: 'center', paddingLeft: 4,
            }}>
              <span style={{ fontSize: '0.62rem', color: '#d1d5db', fontStyle: 'italic' }}>not scheduled</span>
            </div>
          )
          const bWidth = Math.max(bEndX - bStartX, DAY_WIDTH)
          return (
            <div key={b.id} style={{
              position: 'absolute', left: bStartX,
              top: TASK_ROW_HEIGHT + bi * BREAKDOWN_ROW_HEIGHT + 3,
              height: `${BREAKDOWN_ROW_HEIGHT - 6}px`, width: `${bWidth}px`,
              borderRadius: '4px',
              background: b.is_checked ? '#d1fae5' : color + '55',
              border: `1px solid ${b.is_checked ? '#6ee7b7' : color + '99'}`,
              display: 'flex', alignItems: 'center', overflow: 'hidden', zIndex: 1,
            }}>
              <span style={{
                fontSize: '0.62rem', fontWeight: 500,
                color: b.is_checked ? '#059669' : color,
                padding: '0 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {b.is_checked ? '✓ ' : ''}{b.title}
              </span>
            </div>
          )
        })
      })()}
    </div>
  )
}

// ─── Right timeline column ─────────────────────────────────────────────────────
function TimelineColumn({
  items, expandedTasks, days, months, minDate, today,
  totalDays, todayX, hover, onTaskClick,
  localOverrides, onDragStart, labelDragDate, suppressNextClickRef,
}) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ width: `${totalDays * DAY_WIDTH}px`, position: 'relative' }}>

        {/* Month row */}
        <div style={{ height: '28px', position: 'sticky', top: 0, borderBottom: '1px solid #f1f5f9', background: '#fafafa', zIndex: 15 }}>
          {months.map((m, i) => (
            <div key={i} style={{
              position: 'absolute', left: m.offset,
              fontSize: '0.72rem', fontWeight: 600, color: '#6b7280',
              padding: '0 8px', lineHeight: '28px', whiteSpace: 'nowrap',
            }}>{m.label}</div>
          ))}
        </div>

        {/* Day row */}
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

        {/* Today vertical line */}
        <div style={{
          position: 'absolute', left: todayX + DAY_WIDTH / 2,
          top: 0, bottom: 0, width: '2px',
          background: '#6366f1', opacity: 0.4, zIndex: 10, pointerEvents: 'none',
        }} />

        {/* Drop-date preview line when label-dragging over the timeline */}
        {labelDragDate && (() => {
          const dropX = Math.floor((new Date(labelDragDate + 'T00:00:00') - minDate) / 86400000) * DAY_WIDTH
          return (
            <div style={{
              position: 'absolute', left: dropX, top: 0, bottom: 0, width: '2px',
              background: '#6366f1', opacity: 0.7, zIndex: 11, pointerEvents: 'none',
            }}>
              <div style={{
                position: 'sticky', top: '60px',
                background: '#6366f1', color: 'white',
                fontSize: '0.65rem', fontWeight: 700,
                padding: '2px 6px', borderRadius: '4px',
                whiteSpace: 'nowrap', marginLeft: '4px',
              }}>
                {fmtDate(labelDragDate)}
              </div>
            </div>
          )
        })()}

        {/* Items */}
        {items.map((item, idx) => {
          if (item.type === 'header') {
            const meta = PHASE_META[item.phase]
            return (
              <div key={`hdr-${item.phase}`} style={{
                height: `${SECTION_HEADER_HEIGHT}px`,
                background: meta.bg,
                borderBottom: '1px solid #f1f5f9',
                position: 'sticky', top: '56px', zIndex: 14,
              }} />
            )
          }

          const { task } = item
          const hasDate = !!task.due_date

          if (!hasDate) {
            // Empty row — drag-from-left hint
            return (
              <div key={task.id} style={{
                height: `${TASK_ROW_HEIGHT}px`, position: 'relative',
                borderBottom: '1px solid #f9fafb',
                background: '#fffbeb', // subtle amber tint matches the warning badge
              }}>
                {days.map((d, di) => (d.getDay() === 0 || d.getDay() === 6) && (
                  <div key={di} style={{
                    position: 'absolute', left: di * DAY_WIDTH, top: 0, bottom: 0,
                    width: DAY_WIDTH, background: 'rgba(0,0,0,0.015)', pointerEvents: 'none',
                  }} />
                ))}
                {/* Dashed guideline */}
                <div style={{
                  position: 'absolute', left: 12, right: 12,
                  top: '50%', transform: 'translateY(-50%)',
                  height: '2px',
                  backgroundImage: 'repeating-linear-gradient(90deg, #fcd34d 0px, #fcd34d 6px, transparent 6px, transparent 14px)',
                  borderRadius: '1px',
                  pointerEvents: 'none',
                }} />
                {/* Hint label pinned near left edge */}
                <div style={{
                  position: 'sticky', left: 8,
                  display: 'inline-flex', alignItems: 'center',
                  height: '100%', pointerEvents: 'none',
                }}>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 600,
                    color: '#92400e', background: '#fef3c7',
                    border: '1px solid #fcd34d', borderRadius: '6px',
                    padding: '1px 6px', whiteSpace: 'nowrap',
                  }}>
                    drag ⠿ to schedule
                  </span>
                </div>
              </div>
            )
          }

          return (
            <TimelineRow
              key={task.id}
              task={task}
              index={idx}
              expandedTasks={expandedTasks}
              days={days}
              minDate={minDate}
              hover={hover}
              onClick={onTaskClick}
              overrideDates={localOverrides[task.id] || null}
              onDragStart={onDragStart}
              suppressNextClickRef={suppressNextClickRef}
            />
          )
        })}

        {Array.from({ length: PHANTOM_ROW_COUNT }).map((_, i) => (
          <div key={`phantom-${i}`} style={{
            height: `${TASK_ROW_HEIGHT}px`,
            borderBottom: '1px solid #f9fafb',
            background: (items.length + i) % 2 === 0 ? 'white' : '#fafafa',
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

// ─── Main export ──────────────────────────────────────────────────────────────
export default function TimelineGrid({
  scrollRef,
  allTasks,          // ALL tasks (with and without dates), already filtered
  expandedTasks, setExpandedTasks,
  days, months, totalDays, todayX, minDate, today,
  hover, onTaskClick,
  onSaveDates,       // (taskId, newStart, newDue, deltaDays | null) => Promise<void>
}) {
  const onMouseDown = useTimelinePan(scrollRef)

  // Bar drag overrides (visual feedback while dragging)
  const [localOverrides, setLocalOverrides] = useState({})
  const dragRef = useRef(null)
  // Set to true inside onUp when a real drag completes; checked + cleared by the bar's onClick
  const suppressNextClickRef = useRef(false)

  // Label-drag state (unscheduled task being dragged from the label column)
  const [labelDragging, setLabelDragging]   = useState(null) // { task, x, y }
  const [labelDragDate, setLabelDragDate]   = useState(null) // computed drop date string
  const minDateRef = useRef(minDate)
  minDateRef.current = minDate // always fresh

  const items = buildItems(allTasks)

  // ── Bar drag / resize ──────────────────────────────────────────────────────
  const DRAG_THRESHOLD_PX = 6 // minimum movement before we treat it as a real drag

  const handleDragStart = useCallback((e, task, dragType) => {
    e.preventDefault()
    const startClientX = e.clientX
    const origStart    = task.start_date
    const origDue      = task.due_date
    let hasDragged     = false
    dragRef.current    = { taskId: task.id }

    const calcDates = (clientX) => {
      const delta = Math.round((clientX - startClientX) / DAY_WIDTH)
      let ns = origStart, nd = origDue
      if (dragType === 'move') {
        ns = addDaysToStr(origStart, delta)
        nd = addDaysToStr(origDue,   delta)
      } else if (dragType === 'resize-left') {
        ns = addDaysToStr(origStart || origDue, delta)
        if (ns && nd && ns >= nd) ns = origStart
      } else if (dragType === 'resize-right') {
        nd = addDaysToStr(origDue, delta)
        if (ns && nd && nd <= ns) nd = origDue
      }
      return { ns, nd, delta }
    }

    const onMove = (ev) => {
      // Don't start visual drag until the user has moved enough pixels
      if (!hasDragged && Math.abs(ev.clientX - startClientX) < DRAG_THRESHOLD_PX) return
      if (!hasDragged) {
        hasDragged = true
        document.body.style.cursor = dragType === 'move' ? 'grabbing' : 'ew-resize'
      }
      const { ns, nd } = calcDates(ev.clientX)
      setLocalOverrides(prev => ({ ...prev, [task.id]: { start_date: ns, due_date: nd } }))
    }

    const onUp = async (ev) => {
      document.body.style.cursor = ''
      setLocalOverrides(prev => { const n = { ...prev }; delete n[task.id]; return n })
      dragRef.current = null

      if (!hasDragged) {
        // Was a click — let the onClick handler on the bar open the task detail
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        return
      }

      // Real drag completed — suppress the click that fires right after mouseup
      suppressNextClickRef.current = true

      const { ns, nd, delta } = calcDates(ev.clientX)
      if (ns !== origStart || nd !== origDue) {
        await onSaveDates(task.id, ns, nd, dragType === 'move' ? delta : null)
      }
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [onSaveDates]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Label drag → drop onto timeline ───────────────────────────────────────
  const handleLabelDragStart = useCallback((e, task) => {
    e.preventDefault()
    setLabelDragging({ task, x: e.clientX, y: e.clientY })
    document.body.style.cursor = 'grabbing'

    const getDropDate = (clientX) => {
      const scrollEl = scrollRef.current
      if (!scrollEl) return null
      const rect  = scrollEl.getBoundingClientRect()
      const relX  = clientX - rect.left - LABEL_WIDTH + scrollEl.scrollLeft
      const overTimeline = clientX > rect.left + LABEL_WIDTH && clientX < rect.right
      if (!overTimeline || relX < 0) return null
      const dayIndex = Math.floor(relX / DAY_WIDTH)
      return addDaysToStr(minDateRef.current.toISOString().split('T')[0], dayIndex)
    }

    const onMove = (ev) => {
      setLabelDragging(prev => prev ? { ...prev, x: ev.clientX, y: ev.clientY } : null)
      setLabelDragDate(getDropDate(ev.clientX))
    }
    const onUp = async (ev) => {
      document.body.style.cursor = ''
      const dropDate = getDropDate(ev.clientX)
      setLabelDragging(null)
      setLabelDragDate(null)
      if (dropDate) {
        const startDate = dropDate
        const dueDate   = addDaysToStr(startDate, 13)
        await onSaveDates(task.id, startDate, dueDate, null)
      }
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [onSaveDates, scrollRef])

  return (
    <>
      {/* ── Scrollable timeline container ── */}
      <div
        ref={scrollRef}
        data-timeline-grid="true"
        onMouseDown={onMouseDown}
        style={{
          display: 'flex', background: 'white',
          borderRadius: '14px',
          border: labelDragDate ? '2px dashed #6366f1' : '1px solid #f1f5f9',
          overflow: 'scroll',
          boxShadow: labelDragDate ? '0 0 0 4px rgba(99,102,241,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
          flex: 1, minHeight: 0, cursor: 'grab',
          scrollbarWidth: 'thin', userSelect: 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <TaskLabelsColumn
          items={items}
          expandedTasks={expandedTasks}
          setExpandedTasks={setExpandedTasks}
          onLabelDragStart={handleLabelDragStart}
          draggingTaskId={labelDragging?.task.id}
        />
        <TimelineColumn
          items={items}
          expandedTasks={expandedTasks}
          days={days}
          months={months}
          minDate={minDate}
          today={today}
          totalDays={totalDays}
          todayX={todayX}
          hover={hover}
          onTaskClick={onTaskClick}
          localOverrides={localOverrides}
          onDragStart={handleDragStart}
          labelDragDate={labelDragDate}
          suppressNextClickRef={suppressNextClickRef}
        />
      </div>

      {/* ── Ghost pill following cursor during label drag ── */}
      {labelDragging && (
        <div style={{
          position: 'fixed',
          left: labelDragging.x + 14,
          top:  labelDragging.y - 14,
          padding: '0.3rem 0.8rem',
          background: labelDragging.task.areas?.color || '#6366f1',
          color: 'white', borderRadius: '20px',
          fontSize: '0.78rem', fontWeight: 600,
          pointerEvents: 'none', zIndex: 9999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
          opacity: labelDragDate ? 1 : 0.7,
          transition: 'opacity 0.1s',
        }}>
          {labelDragDate ? `📅 From ${fmtDate(labelDragDate)}` : labelDragging.task.title}
        </div>
      )}
    </>
  )
}
