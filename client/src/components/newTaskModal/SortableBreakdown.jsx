import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── Sortable Breakdown Row ───────────────────────────────────────────────────
// Single editable step with drag handle and remove button.
export default function SortableBreakdown({ id, value, index, onChange, onRemove, canRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        marginBottom: '0.5rem',
        display: 'flex', gap: '0.5rem', alignItems: 'center',
      }}
    >
      <div
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab', padding: '0.4rem', color: '#9ca3af',
          fontSize: '1rem', lineHeight: 1, flexShrink: 0,
        }}
      >
        ⠿
      </div>
      <input
        value={value}
        onChange={e => onChange(index, 'title', e.target.value)}
        placeholder={`Step ${index + 1}`}
        style={{
          flex: 1, padding: '0.55rem 0.75rem',
          border: '1px solid #e5e7eb', borderRadius: '8px',
          fontSize: '0.875rem', outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = '#6366f1'}
        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
      />
      {canRemove && (
        <button
          onClick={() => onRemove(index)}
          style={{
            padding: '0.55rem 0.6rem', background: '#fee2e2',
            color: '#dc2626', border: 'none', borderRadius: '8px',
            cursor: 'pointer', flexShrink: 0, fontSize: '0.8rem',
          }}
        >✕</button>
      )}
    </div>
  )
}
