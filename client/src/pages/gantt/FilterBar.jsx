import { AREA_COLORS } from './constants'

// ─── Filter / sort bar above the Gantt timeline ───────────────────────────────
export default function FilterBar({
  users,
  filterUser, setFilterUser,
  filterArea, setFilterArea,
  sortBy, setSortBy,
  filteredCount,
}) {
  const hasFilter = filterUser !== 'all' || filterArea !== 'all'

  return (
    <div style={{
      padding: '0.75rem 2rem', borderBottom: '1px solid #f1f5f9',
      background: 'white', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#9ca3af' }}>Filter:</span>

      <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{
        padding: '0.4rem 0.75rem', border: '1.5px solid #e5e7eb', borderRadius: '8px',
        fontSize: '0.82rem', background: 'white', color: '#374151', cursor: 'pointer',
      }}>
        <option value="all">All users</option>
        {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
      </select>

      <select value={filterArea} onChange={e => setFilterArea(e.target.value)} style={{
        padding: '0.4rem 0.75rem', border: '1.5px solid #e5e7eb', borderRadius: '8px',
        fontSize: '0.82rem', background: 'white', color: '#374151', cursor: 'pointer',
      }}>
        <option value="all">All areas</option>
        {Object.keys(AREA_COLORS).map(area => <option key={area} value={area}>{area}</option>)}
      </select>

      {hasFilter && (
        <button onClick={() => { setFilterUser('all'); setFilterArea('all') }} style={{
          padding: '0.4rem 0.75rem', border: '1.5px solid #e5e7eb', borderRadius: '8px',
          fontSize: '0.82rem', background: 'transparent', color: '#6b7280', cursor: 'pointer',
        }}>Clear filters</button>
      )}

      <div style={{ width: '1px', height: '20px', background: '#e5e7eb', margin: '0 0.25rem' }} />

      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#9ca3af' }}>Sort:</span>

      <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
        padding: '0.4rem 0.75rem', border: '1.5px solid #e5e7eb', borderRadius: '8px',
        fontSize: '0.82rem', background: 'white', color: '#374151', cursor: 'pointer',
      }}>
        <optgroup label="Due Date">
          <option value="due_asc">Due date ↑ earliest first</option>
          <option value="due_desc">Due date ↓ latest first</option>
        </optgroup>
        <optgroup label="Start Date">
          <option value="start_asc">Start date ↑ earliest first</option>
          <option value="start_desc">Start date ↓ latest first</option>
        </optgroup>
        <optgroup label="Progress">
          <option value="progress_asc">Progress ↑ least done first</option>
          <option value="progress_desc">Progress ↓ most done first</option>
        </optgroup>
        <optgroup label="Other">
          <option value="title_asc">Title A → Z</option>
          <option value="title_desc">Title Z → A</option>
          <option value="area">Area</option>
        </optgroup>
      </select>

      <span style={{ fontSize: '0.78rem', color: '#9ca3af', marginLeft: 'auto' }}>
        {filteredCount} task{filteredCount !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
