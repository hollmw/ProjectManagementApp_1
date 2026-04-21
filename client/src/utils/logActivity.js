import { supabase } from '../supabase'

export const logActivity = async (userId, action, taskId = null, points = 0) => {
  await supabase.from('activity_log').insert({
    user_id: userId, action, task_id: taskId, points_earned: points
  })

  if (points > 0) {
    const { data: profile } = await supabase
      .from('profiles').select('points').eq('id', userId).single()
    const newPoints = (profile?.points || 0) + points
    await supabase.from('profiles').update({ points: newPoints }).eq('id', userId)
    await checkAndAwardBadges(userId)
  }
}

const checkAndAwardBadges = async (userId, taskId) => {
  const { data: logs } = await supabase
    .from('activity_log')
    .select('id')
    .eq('user_id', userId)
    .ilike('action', 'Completed step%')

  const completedCount = logs?.length || 0

  const { data: existingBadges } = await supabase
    .from('badges').select('badge_type').eq('user_id', userId)
  const earned = existingBadges?.map(b => b.badge_type) || []

  const toAward = []
  if (completedCount >= 1 && !earned.includes('first_task')) toAward.push('first_task')
  if (completedCount >= 10 && !earned.includes('ten_tasks')) toAward.push('ten_tasks')
  if (completedCount >= 50 && !earned.includes('fifty_tasks')) toAward.push('fifty_tasks')
  if (completedCount >= 100 && !earned.includes('century')) toAward.push('century')

  if (toAward.length > 0) {
    await supabase.from('badges').insert(
      toAward.map(badge_type => ({ user_id: userId, badge_type }))
    )
  }
}
export const awardPerfectReviewBadge = async (taskId) => {
  // Get all users assigned to this task
  const { data: assignments } = await supabase
    .from('task_assignments')
    .select('user_id')
    .eq('task_id', taskId)

  if (!assignments || assignments.length === 0) return

  for (const assignment of assignments) {
    const { data: existingBadges } = await supabase
      .from('badges').select('badge_type').eq('user_id', assignment.user_id)
    const earned = existingBadges?.map(b => b.badge_type) || []

    if (!earned.includes('perfect_review')) {
      await supabase.from('badges').insert({
        user_id: assignment.user_id,
        badge_type: 'perfect_review'
      })
    }
  }
}