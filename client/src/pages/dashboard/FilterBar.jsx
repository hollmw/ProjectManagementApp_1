// ─── Search + status + sort row above the task list ─────────────────────────
export default function FilterBar({
  search, setSearch,
  filterStatus, setFilterStatus,
  sortBy, setSortBy,
  filteredCount,
}) {
  return (
    <div style={{
      display: 'flex', gap: '0.6rem', marginBottom: '1.5rem',
      alignItems: 'center', flexWrap: 'wrap',
      background: 'white', padding: '0.75rem 1rem',
      borderRadius: '12px', border: '1px solid #f1f5f9',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search tasks..."
        style={{
          padding: '0.45rem 0.75rem', border: '1.5px solid #e5e7eb',
          borderRadius: '8px', fontSize: '0.85rem', width: '180px',
          background: '#f9fafb',
        }}
      />

      <div style={{ width: '1px', height: '20px', background: '#e5e7eb' }} />

      {['All', 'Incomplete', 'Complete'].map(s => (
        <button
          key={s}
          onClick={() => setFilterStatus(s)}
          style={{
            padding: '0.4rem 0.9rem', borderRadius: '8px', fontSize: '0.82rem',
            cursor: 'pointer',
            border: filterStatus === s ? 'none' : '1.5px solid #e5e7eb',
            background: filterStatus === s ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
            color: filterStatus === s ? 'white' : '#6b7280',
            fontWeight: filterStatus === s ? 600 : 400,
          }}
        >
          {s}
        </button>
      ))}

      <div style={{ width: '1px', height: '20px', background: '#e5e7eb' }} />

      <select
        value={sortBy}
        onChange={e => setSortBy(e.target.value)}
        style={{
          padding: '0.45rem 0.75rem', border: '1.5px solid #e5e7eb',
          borderRadius: '8px', fontSize: '0.82rem',
          background: '#f9fafb', color: '#374151', cursor: 'pointer',
        }}
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="due_date">Due date</option>
        <option value="completion">Completion %</option>
        <option value="area">Area</option>
      </select>

      <span style={{ fontSize: '0.78rem', color: '#9ca3af', marginLeft: 'auto' }}>
        {filteredCount} task{filteredCount !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
