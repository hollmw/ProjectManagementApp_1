// Static metadata for the badges users can earn.
export const BADGES = {
  first_task: { label: 'First Step', icon: '🌱', desc: 'Completed first breakdown', color: '#10b981' },
  ten_tasks: { label: 'Getting Going', icon: '⚡', desc: '10 breakdowns completed', color: '#f59e0b' },
  fifty_tasks: { label: 'On Fire', icon: '🔥', desc: '50 breakdowns completed', color: '#ef4444' },
  perfect_review: { label: 'Perfectionist', icon: '⭐', desc: 'Received a 10/10 review', color: '#6366f1' },
  century: { label: 'Century', icon: '💯', desc: '100 breakdowns completed', color: '#8b5cf6' },
}

export function rankStyle(index) {
  if (index === 0) return { bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '#f59e0b', icon: '🥇' }
  if (index === 1) return { bg: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', border: '#94a3b8', icon: '🥈' }
  if (index === 2) return { bg: 'linear-gradient(135deg, #fef3c7, #fed7aa)', border: '#f97316', icon: '🥉' }
  return { bg: 'white', border: '#f1f5f9', icon: null }
}
