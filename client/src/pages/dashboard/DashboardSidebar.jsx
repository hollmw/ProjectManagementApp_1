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
        <div
          onClick={() => setFilterArea('All')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.45rem 0.75rem',
            borderRadius: '8px',
            marginBottom: '0.2rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            background: filterArea === 'All' ? '#f3f4f6' : 'transparent',
            fontWeight: filterArea === 'All' ? 600 : 400,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (filterArea !== 'All') e.currentTarget.style.background = '#f9fafb' }}
          onMouseLeave={e => { if (filterArea !== 'All') e.currentTarget.style.background = 'transparent' }}
        >
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9ca3af', flexShrink: 0 }} />
          All
          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#9ca3af', fontWeight: 500 }}>
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
