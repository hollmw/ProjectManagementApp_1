import { useState } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

const AREAS = ['Tech', 'Business', 'Marketing', 'Science', 'Clinical', 'Design']

const AREA_COLORS = {
  Tech: '#6366f1',
  Business: '#f59e0b',
  Marketing: '#ec4899',
  Science: '#10b981',
  Clinical: '#3b82f6',
  Design: '#8b5cf6',
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* ── Left panel — branding ── */}
      <div style={{
        flex: '0 0 48%',
        background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3rem 3.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(99,102,241,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.07) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }} />

        {/* Glow orbs */}
        <div style={{
          position: 'absolute', top: '-80px', left: '-80px',
          width: '320px', height: '320px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', right: '-60px',
          width: '280px', height: '280px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img 
            src="/logo.png" 
            alt="DRESIO Logo"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              objectFit: 'contain',
            }}
          />
          <span style={{ color: 'white', fontWeight: 700, fontSize: '1.2rem', letterSpacing: '-0.01em' }}>
            DRESIO
          </span>
        </div>
      </div>

        {/* Main copy */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{
            color: 'rgba(165,180,252,0.8)',
            fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.12em',
            textTransform: 'uppercase', marginBottom: '1rem',
          }}>
            Internal Platform
          </p>
          <h2 style={{
            color: 'white', fontSize: '2.6rem', fontWeight: 800,
            lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '1.25rem',
          }}>
            One workspace.<br />Six teams.<br />
          </h2>
          <p style={{ color: 'rgba(203,213,225,0.7)', fontSize: '0.95rem', lineHeight: 1.65, maxWidth: '340px' }}>
            Track tasks, measure progress, and keep every business area aligned.
          </p>

          {/* Area pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '2rem' }}>
            {AREAS.map(area => (
              <span key={area} style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 500,
                background: AREA_COLORS[area] + '22',
                color: AREA_COLORS[area],
                border: `1px solid ${AREA_COLORS[area]}44`,
              }}>
                {area}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: 'rgba(148,163,184,0.5)', fontSize: '0.75rem' }}>
            Internal use only.
          </p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: '2rem',
      }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          <div style={{ marginBottom: '2.5rem' }}>
            <h1 style={{
              fontSize: '1.75rem', fontWeight: 800, color: '#0f172a',
              letterSpacing: '-0.02em', marginBottom: '0.5rem',
            }}>
              Welcome back
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Sign in to your workspace
            </p>
          </div>

          {error && (
            <div style={{
              background: '#fef2f2', color: '#dc2626',
              padding: '0.75rem 1rem', borderRadius: '10px',
              marginBottom: '1.5rem', fontSize: '0.85rem',
              border: '1px solid #fecaca',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

            {/* Email */}
            <div>
              <label style={{
                display: 'block', fontSize: '0.82rem', fontWeight: 600,
                color: '#374151', marginBottom: '0.4rem', letterSpacing: '0.01em',
              }}>
                Work email
              </label>
              <input
                type="email"
                value={email}
                placeholder="you@dresio.io"
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%', padding: '0.75rem 1rem',
                  border: '1.5px solid #e2e8f0', borderRadius: '10px',
                  fontSize: '0.95rem', background: 'white',
                  color: '#0f172a', outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#6366f1'
                  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#e2e8f0'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{
                  fontSize: '0.82rem', fontWeight: 600,
                  color: '#374151', letterSpacing: '0.01em',
                }}>
                  Password
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  placeholder="••••••••"
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '0.75rem 3rem 0.75rem 1rem',
                    border: '1.5px solid #e2e8f0', borderRadius: '10px',
                    fontSize: '0.95rem', background: 'white',
                    color: '#0f172a', outline: 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#6366f1'
                    e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#e2e8f0'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#94a3b8', fontSize: '0.8rem', padding: '0.25rem',
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '0.8rem',
                background: loading
                  ? '#a5b4fc'
                  : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white', border: 'none', borderRadius: '10px',
                fontSize: '0.95rem', fontWeight: 700,
                cursor: loading ? 'default' : 'pointer',
                letterSpacing: '0.01em',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
                transition: 'box-shadow 0.2s, transform 0.1s',
                marginTop: '0.25rem',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p style={{
            marginTop: '2rem', fontSize: '0.8rem',
            color: '#94a3b8', textAlign: 'center', lineHeight: 1.6,
          }}>
            Don't have an account? Contact your workspace admin<br />to get access.
          </p>
        </div>
      </div>
    </div>
  )
}
