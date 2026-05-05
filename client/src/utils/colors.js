/**
 * Shared color constants and helpers used throughout the app.
 */

// ─── Brand ────────────────────────────────────────────────────────────────────
export const BRAND_PRIMARY    = '#6366f1'
export const BRAND_SECONDARY  = '#8b5cf6'
export const BRAND_GRADIENT   = 'linear-gradient(135deg, #6366f1, #8b5cf6)'
export const SUCCESS_COLOR    = '#10b981'

// ─── Role colours ─────────────────────────────────────────────────────────────
/**
 * Returns { bg, color } for a role badge/pill.
 * bg    — light tinted background
 * color — foreground / border colour
 */
export function getRoleColors(role) {
  switch (role) {
    case 'admin':  return { bg: '#ede9fe', color: '#7c3aed' }
    case 'member': return { bg: '#dbeafe', color: '#1d4ed8' }
    case 'intern': return { bg: '#fef3c7', color: '#f59e0b' }
    default:       return { bg: '#f3f4f6', color: '#6b7280' }
  }
}

/**
 * Returns just the foreground colour string for a role.
 * Useful where you only need one value, e.g. border or text.
 */
export function getRoleColor(role) {
  return getRoleColors(role).color
}

// ─── Convenience map (for components that iterate roles) ──────────────────────
export const ROLE_COLOR_MAP = {
  intern: '#f59e0b',
  member: '#6366f1',
  admin:  '#10b981',
}
