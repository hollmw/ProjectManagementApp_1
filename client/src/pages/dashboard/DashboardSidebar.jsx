import AppSidebar, { SidebarSection } from '../../components/AppSidebar'
import AreaSidebarItem from './AreaSidebarItem'
import { AREAS } from './constants'

export default function DashboardSidebar({
  profile, tasks, filterArea, setFilterArea,
  areaUsers, fetchAreaUsers,
}) {
  return (
    <AppSidebar profile={profile}>
      <SidebarSection title="Business Areas">

        {/* All */}
        <div
          onClick={() => setFilterArea('All')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            padding: '0.48rem 0.85rem', borderRadius: '9px',
            marginBottom: '0.15rem', cursor: 'pointer', fontSize: '0.875rem',
            background: filterArea === 'All' ? 'rgba(99,102,241,0.18)' : 'transparent',
            borderLeft: `3px solid ${filterArea === 'All' ? '#818cf8' : 'transparent'}`,
            color: filterArea === 'All' ? '#a5b4fc' : '#94a3b8',
            fontWeight: filterArea === 'All' ? 600 : 400,
            transition: 'all 0.15s', userSelect: 'none',
          }}
          onMouseEnter={e => { if (filterArea !== 'All') { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#e2e8f0' } }}
          onMouseLeave={e => { if (filterArea !== 'All') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' } }}
        >
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: filterArea === 'All' ? '#818cf8' : '#475569', flexShrink: 0 }} />
          All
          <span style={{ marginLeft: 'auto', fontSize: '0.68rem', fontWeight: 600,
            background: 'rgba(255,255,255,0.08)', color: '#64748b',
            padding: '0.1rem 0.45rem', borderRadius: '20px',
          }}>
            {tasks.length}
          </span>
        </div>

        {AREAS.map(area => (
          <AreaSidebarItem
            key={area.name}
            area={area}
            count={tasks.filter(t => t.areas?.name === area.name).length}
            isSelected={filterArea === area.name}
            onClick={() => setFilterArea(area.name)}
            onHover={() => fetchAreaUsers(area.name)}
            users={areaUsers[area.name] || []}
          />
        ))}
      </SidebarSection>
    </AppSidebar>
  )
}
