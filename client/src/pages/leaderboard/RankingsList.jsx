import { BADGES, rankStyle } from './badges'

function avatarBg(i) {
  if (i === 0) return 'linear-gradient(135deg, #f59e0b, #d97706)'
  if (i === 1) return 'linear-gradient(135deg, #94a3b8, #64748b)'
  if (i === 2) return 'linear-gradient(135deg, #f97316, #ea580c)'
  return 'linear-gradient(135deg, #6366f1, #8b5cf6)'
}

function barBg(i) {
  if (i === 0) return '#f59e0b'
  if (i === 1) return '#94a3b8'
  if (i === 2) return '#f97316'
  return '#6366f1'
}

function roleStyle(role) {
  if (role === 'admin') return { bg: '#ede9fe', color: '#7c3aed' }
  if (role === 'member') return { bg: '#dbeafe', color: '#1d4ed8' }
  return { bg: '#f3f4f6', color: '#6b7280' }
}

function RankRow({ user, index, total, badges, isSelected, onClick, maxPoints }) {
  const { icon } = rankStyle(index)
  const userBadges = badges[user.id] || []
  const role = roleStyle(user.role)

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        padding: '0.85rem 1.25rem',
        borderBottom: index < total - 1 ? '1px solid #f9fafb' : 'none',
        cursor: 'pointer',
        transition: 'background 0.15s',
        background: isSelected ? '#f8faff' : 'white',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f9fafb' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'white' }}
    >
      <div style={{ width: '28px', textAlign: 'center', fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600, flexShrink: 0 }}>
        {icon || `#${index + 1}`}
      </div>

      <div style={{
        width: '36px', height: '36px', borderRadius: '50%',
        background: avatarBg(index),
        color: 'white', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700, flexShrink: 0,
      }}>
        {user.full_name?.charAt(0).toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{user.full_name}</span>
          <span style={{
            fontSize: '0.7rem', padding: '0.1rem 0.4rem',
            background: role.bg, color: role.color,
            borderRadius: '10px', fontWeight: 500,
          }}>
            {user.role}
          </span>
          {userBadges.map(b => (
            <span key={b} title={BADGES[b]?.desc} style={{ fontSize: '0.85rem' }}>{BADGES[b]?.icon}</span>
          ))}
        </div>
        <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '2px',
            background: barBg(index),
            width: `${Math.round(((user.points || 0) / maxPoints) * 100)}%`,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>{user.points || 0}</div>
        <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>points</div>
      </div>
    </div>
  )
}

// ─── Full ranking table including a header row ───────────────────────────────
export default function RankingsList({ users, badges, selectedUser, setSelectedUser }) {
  const maxPoints = users[0]?.points || 1
  return (
    <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>All Rankings</span>
        <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{users.length} members</span>
      </div>

      {users.map((user, i) => (
        <RankRow
          key={user.id}
          user={user}
          index={i}
          total={users.length}
          badges={badges}
          isSelected={selectedUser?.id === user.id}
          onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
          maxPoints={maxPoints}
        />
      ))}
    </div>
  )
}
