import { supabase } from '../supabase'

export const logActivity = async (userId, action, taskId = null, points = 0) => {
  // Log the activity
  await supabase.from('activity_log').insert({
    user_id: userId,
    action,
    task_id: taskId,
    points_earned: points
  })

  // Update the user's total points
  if (points > 0) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single()

    await supabase
      .from('profiles')
      .update({ points: (profile?.points || 0) + points })
      .eq('id', userId)
  }
}