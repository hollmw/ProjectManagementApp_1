// Pure helpers for TaskCard sub-components.

export function scoreColor(s) {
  if (s >= 8) return '#10b981'
  if (s >= 5) return '#f59e0b'
  return '#ef4444'
}
