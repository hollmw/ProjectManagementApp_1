import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import AppSidebar from '../components/AppSidebar'
import { useProfile } from '../contexts/ProfileContext'

const DEFAULT_DB_ID = '34b8120c-9cff-8030-93d5-daa5ef84dfa8'

export default function NotionImport() {
  const { profile } = useProfile()
  const navigate    = useNavigate()

  const [databaseId, setDatabaseId] = useState(DEFAULT_DB_ID)
  const [running,    setRunning]    = useState(false)
  const [result,     setResult]     = useState(null)   // { imported, skipped, errors }
  const [error,      setError]      = useState(null)

  const runImport = async () => {
    setRunning(true)
    setResult(null)
    setError(null)

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('import-from-notion', {
        body: { database_id: databaseId.trim() },
      })
      if (fnErr) throw fnErr
      if (data?.error) throw new Error(data.error)
      setResult(data)
    } catch (err) {
      setError(err.message || 'Import failed')
    } finally {
      setRunning(false)
    }
  }

  if (!profile || profile.role === 'intern') {
    navigate('/dashboard')
    return null
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>
      <AppSidebar profile={profile} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            {/* Notion "N" */}
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'white', border: '1px solid #e5e7eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              fontSize: '1.2rem',
            }}>
              <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
                <rect width="100" height="100" rx="18" fill="white"/>
                <path d="M21.2 18.9c3.4 2.8 4.7 2.6 11.1 2.2l60.4-3.6c1.3 0 .2-1.3-.4-1.5l-10.2-7.4C80.1 7.3 78 6.8 75.6 7.1L17.2 11.3c-2.2.2-2.6 1.3-1.7 2.2l5.7 5.4zM24.5 31v63.2c0 3.4 1.7 4.7 5.5 4.5l66.3-3.8c3.8-.2 4.7-2.4 4.7-5.1V26.8c0-2.7-1.1-4.1-3.4-3.9L28.4 26.5c-2.5.2-3.9 1.6-3.9 4.5zm62.8 3.8c.4 1.8 0 3.6-1.8 3.8l-3 .6v44c-2.6 1.3-5 2-7 2-3.3 0-4.1-1-6.5-4.1L47.8 54.5v36.7l6.7 1.5s0 3.6-5 3.8L34 97.4c-.4-.8 0-2.8 1.4-3.2l3.6-1V47.2L34 46.9c-.4-1.8.6-4.4 3.4-4.6l16.5-1.1 24 36.7V43.6l-5.6-.6c-.4-2.2 1.3-3.8 3.4-4l14.6-.8z" fill="black"/>
              </svg>
            </div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              Import from Notion
            </h1>
          </div>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: 0 }}>
            Pulls projects from your Notion database and creates tasks in DRESIO.
            Already-imported projects are skipped automatically.
          </p>
        </div>

        {/* Main card */}
        <div style={{
          maxWidth: 580,
          background: 'white', borderRadius: 16,
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          padding: '1.75rem',
        }}>

          {/* What gets imported */}
          <div style={{
            background: '#f8fafc', borderRadius: 10,
            padding: '1rem 1.25rem', marginBottom: '1.5rem',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.65rem' }}>
              What gets imported
            </div>
            {[
              ['Project name', 'Task title'],
              ['Status (Not started / In progress / Done)', 'Task status'],
              ['Priority (High / Medium / Low)', 'Priority badge'],
              ['Start date / End date', 'Task date range'],
              ['Team (multi-select areas)', 'Business area tags'],
              ['Page description callout', 'Task description'],
              ['Breakdown steps checklist', 'Task steps'],
            ].map(([from, to]) => (
              <div key={from} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', fontSize: '0.82rem' }}>
                <span style={{ color: '#111827', minWidth: 260 }}>{from}</span>
                <span style={{ color: '#9ca3af', fontSize: '0.7rem' }}>→</span>
                <span style={{ color: '#6366f1', fontWeight: 600 }}>{to}</span>
              </div>
            ))}
          </div>

          {/* Database ID input */}
          <label style={{ display: 'block', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
              Notion Database ID
            </div>
            <input
              value={databaseId}
              onChange={e => setDatabaseId(e.target.value)}
              placeholder="34b8120c-9cff-8030-93d5-daa5ef84dfa8"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '0.6rem 0.85rem', borderRadius: 9,
                border: '1.5px solid #e2e8f0', fontSize: '0.84rem',
                fontFamily: 'monospace', color: '#111827',
                outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
            <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.3rem' }}>
              Found in the Notion database URL after notion.so/
            </div>
          </label>

          {/* Run button */}
          <button
            onClick={runImport}
            disabled={running || !databaseId.trim()}
            style={{
              width: '100%', padding: '0.7rem',
              background: running ? '#f3f4f6' : '#111827',
              color: running ? '#9ca3af' : 'white',
              border: 'none', borderRadius: 10,
              fontSize: '0.9rem', fontWeight: 700,
              cursor: running ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              transition: 'background 0.15s',
            }}
          >
            {running ? (
              <>
                <span style={{ fontSize: '1rem' }}>⏳</span> Importing…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 100 100" fill="none" style={{ flexShrink: 0 }}>
                  <rect width="100" height="100" rx="18" fill="white"/>
                  <path d="M21.2 18.9c3.4 2.8 4.7 2.6 11.1 2.2l60.4-3.6c1.3 0 .2-1.3-.4-1.5l-10.2-7.4C80.1 7.3 78 6.8 75.6 7.1L17.2 11.3c-2.2.2-2.6 1.3-1.7 2.2l5.7 5.4zM24.5 31v63.2c0 3.4 1.7 4.7 5.5 4.5l66.3-3.8c3.8-.2 4.7-2.4 4.7-5.1V26.8c0-2.7-1.1-4.1-3.4-3.9L28.4 26.5c-2.5.2-3.9 1.6-3.9 4.5zm62.8 3.8c.4 1.8 0 3.6-1.8 3.8l-3 .6v44c-2.6 1.3-5 2-7 2-3.3 0-4.1-1-6.5-4.1L47.8 54.5v36.7l6.7 1.5s0 3.6-5 3.8L34 97.4c-.4-.8 0-2.8 1.4-3.2l3.6-1V47.2L34 46.9c-.4-1.8.6-4.4 3.4-4.6l16.5-1.1 24 36.7V43.6l-5.6-.6c-.4-2.2 1.3-3.8 3.4-4l14.6-.8z" fill="black"/>
                </svg>
                Import from Notion
              </>
            )}
          </button>

          {/* Result */}
          {result && (
            <div style={{
              marginTop: '1rem', padding: '1rem 1.25rem',
              borderRadius: 10, border: '1px solid #d1fae5',
              background: '#f0fdf4',
            }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#059669', marginBottom: '0.3rem' }}>
                ✓ Import complete
              </div>
              <div style={{ fontSize: '0.82rem', color: '#065f46' }}>
                {result.imported} project{result.imported !== 1 ? 's' : ''} imported
                {result.skipped > 0 && `, ${result.skipped} skipped (already existed)`}
              </div>
              {result.errors?.length > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#92400e' }}>
                  {result.errors.map((e, i) => <div key={i}>⚠ {e}</div>)}
                </div>
              )}
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  marginTop: '0.75rem', padding: '0.4rem 1rem',
                  background: '#059669', color: 'white',
                  border: 'none', borderRadius: 8,
                  fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Go to dashboard →
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              marginTop: '1rem', padding: '1rem 1.25rem',
              borderRadius: 10, border: '1px solid #fecaca',
              background: '#fef2f2',
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#dc2626', marginBottom: '0.25rem' }}>Import failed</div>
              <div style={{ fontSize: '0.8rem', color: '#991b1b' }}>{error}</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                Make sure the <code>NOTION_TOKEN</code> secret is set in Supabase → Settings → Edge Functions.
              </div>
            </div>
          )}
        </div>

        {/* One-time SQL note */}
        <div style={{
          maxWidth: 580, marginTop: '1rem',
          padding: '0.85rem 1.1rem',
          borderRadius: 10, background: '#fffbeb',
          border: '1px solid #fde68a',
          fontSize: '0.78rem', color: '#92400e',
        }}>
          <strong>First time?</strong> The edge function needs the <code>NOTION_TOKEN</code> secret.
          Alternatively, paste <code>supabase/migrations/20260515_import_from_notion.sql</code> directly
          into the Supabase SQL Editor to import your current 3 projects without any setup.
        </div>
      </div>
    </div>
  )
}
