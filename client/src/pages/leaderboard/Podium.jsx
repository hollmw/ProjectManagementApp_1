import { BADGES } from './badges'

// Visual config for each podium slot.
const PODIUM_CONFIGS = [
  // 1st place — center, gold
  {
    rankIndex: 0, medal: '🥇',
    cardStyle: {
      background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
      borderRadius: '14px', padding: '2rem 1.5rem',
      border: '2px solid #f59e0b',
      boxShadow: '0 4px 16px rgba(245,158,11,0.2)',
    },
    medalSize: '2.5rem',
    avatarStyle: {
      width: '56px', height: '56px',
      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      fontSize: '1.4rem',
      boxShadow: '0 4px 12px rgba(245,158,11,0.4)',
    },
    nameStyle: { fontWeight: 700, fontSize: '1rem' },
    pointStyle: { color: '#92400e', fontSize: '0.85rem', fontWeight: 600 },
    badgeFontSize: '1.1rem',
  },
  // 2nd place — silver
  {
    rankIndex: 1, medal: '🥈',
    cardStyle: {
      background: 'white', borderRadius: '14px',
      padding: '1.5rem',
      border: '1px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    medalSize: '2rem',
    avatarStyle: { width: '48px', height: '48px', background: '#94a3b8', fontSize: '1.2rem' },
    nameStyle: { fontWeight: 600, fontSize: '0.9rem' },
    pointStyle: { color: '#6b7280', fontSize: '0.8rem' },
    badgeFontSize: '1rem',
  },
  // 3rd place — bronze
  {
    rankIndex: 2, medal: '🥉',
    cardStyle: {
      background: 'white', borderRadius: '14px',
      padding: '1.5rem',
      border: '1px solid #fed7aa',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    medalSize: '2rem',
    avatarStyle: { width: '48px', height: '48px', background: '#f97316', fontSize: '1.2rem' },
    nameStyle: { fontWeight: 600, fontSize: '0.9rem' },
    pointStyle: { color: '#6b7280', fontSize: '0.8rem' },
    badgeFontSize: '1rem',
  },
]

function PodiumCard({ config, user, badges }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', ...config.cardStyle }}>
      <div style={{ fontSize: config.medalSize, marginBottom: '0.5rem' }}>{config.medal}</div>
      <div style={{
        ...config.avatarStyle,
        borderRadius: '50%',
        color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, margin: '0 auto 0.5rem',
      }}>
        {user?.full_name?.charAt(0).toUpperCase()}
      </div>
      <div style={config.nameStyle}>{user?.full_name}</div>
      <div style={{ ...config.pointStyle, marginTop: '0.25rem' }}>{user?.points || 0} pts</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', justifyContent: 'center', marginTop: '0.5rem' }}>
        {(badges[user?.id] || []).map(b => (
          <span key={b} title={BADGES[b]?.desc} style={{ fontSize: config.badgeFontSize }}>
            {BADGES[b]?.icon}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Top 3 podium (renders nothing if fewer than 3 users) ────────────────────
export default function Podium({ users, badges }) {
  if (users.length < 3) return null
  // Render: 2nd | 1st | 3rd  (1st in center)
  const order = [1, 0, 2]
  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'flex-end' }}>
      {order.map(i => (
        <PodiumCard
          key={i}
          config={PODIUM_CONFIGS[i]}
          user={users[i]}
          badges={badges}
        />
      ))}
    </div>
  )
}
