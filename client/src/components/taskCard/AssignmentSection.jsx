import { useState } from 'react'
import { supabase } from '../../supabase'
import UserPill from '../UserPill'
import UserAvatar from './UserAvatar'

// ─── Assigned-users avatars + admin assign UI ────────────────────────────────
export default function AssignmentSection({ task, assignments, setAssignments, userRole, onAssignmentChange }) {
  const [showAssign, setShowAssign] = useState(false)
  const [users, setUsers] = useState([])

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
    setUsers(data || [])
  }

  const toggleAssignment = async (user) => {
    const existing = assignments.find(a => a.profiles?.id === user.id || a.user_id === user.id)
    if (existing) {
      await supabase.from('task_assignments').delete().eq('id', existing.id)
      const next = assignments.filter(a => a.id !== existing.id)
      setAssignments(next)
      onAssignmentChange(task.id, next)
    } else {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('task_assignments')
        .insert({ task_id: task.id, user_id: user.id, assigned_by: currentUser.id })
        .select('*, profiles!task_assignments_user_id_fkey(id, full_name, role)')
        .single()
      if (data) {
        const next = [...assignments, data]
        setAssignments(next)
        onAssignmentChange(task.id, next)
      }
    }
  }

  return (
    <div style={{ marginTop: '1rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Assigned</span>
          <div style={{ display: 'flex' }}>
            {assignments.filter(a => a?.profiles).slice(0, 4).map((a, i) => (
              <UserAvatar key={a.id} profile={a.profiles} index={i} total={assignments.length} />
            ))}
            {assignments.length > 4 && (
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: '#e5e7eb', color: '#6b7280',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', fontWeight: 600,
                border: '2px solid white', marginLeft: '-6px',
              }}>
                +{assignments.length - 4}
              </div>
            )}
          </div>
        </div>
        {userRole !== 'intern' && (
          <button
            onClick={() => { setShowAssign(!showAssign); if (!showAssign) loadUsers() }}
            style={{
              fontSize: '0.8rem', padding: '0.3rem 0.75rem',
              background: showAssign ? '#f3f4f6' : '#6366f1',
              color: showAssign ? '#6b7280' : 'white',
              border: 'none', borderRadius: '6px', cursor: 'pointer',
            }}
          >
            {showAssign ? 'Close' : '+ Assign'}
          </button>
        )}
      </div>

      {showAssign && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {users.map(user => {
            const isAssigned = assignments.some(a => a.profiles?.id === user.id || a.user_id === user.id)
            return (
              <UserPill
                key={user.id}
                user={user}
                isAssigned={isAssigned}
                onClick={() => toggleAssignment(user)}
                showAssignState={true}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
