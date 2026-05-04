import AppSidebar, { SidebarSection } from '../../components/AppSidebar'
import { AREA_COLORS } from './constants'

export default function GanttSidebar({ profile }) {
  return (
    <AppSidebar profile={profile}>
      <SidebarSection title="Areas">
        {Object.entries(AREA_COLORS).map(([name, color]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.8rem', color: '#374151' }}>{name}</span>
          </div>
        ))}
      </SidebarSection>
    </AppSidebar>
  )
}
