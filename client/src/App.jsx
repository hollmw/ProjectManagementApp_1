import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// Route-based code splitting — each page is only downloaded when first visited,
// keeping the initial bundle small and first-load fast.
const Login          = lazy(() => import('./pages/Login'))
const Dashboard      = lazy(() => import('./pages/Dashboard'))
const UserManagement = lazy(() => import('./pages/UserManagement'))
const ActivityLog    = lazy(() => import('./pages/ActivityLog'))
const Leaderboard    = lazy(() => import('./pages/Leaderboard'))
const GanttChart     = lazy(() => import('./pages/GanttChart'))
const UserAnalytics   = lazy(() => import('./pages/UserAnalytics'))
const InternTimeline  = lazy(() => import('./pages/InternTimeline'))

function LoadingFallback() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#f8fafc',
    }}>
      <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading...</div>
    </div>
  )
}

function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login"       element={<Login />} />
        <Route path="/dashboard"   element={<Dashboard />} />
        <Route path="/users"       element={<UserManagement />} />
        <Route path="/activity"    element={<ActivityLog />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/gantt"       element={<GanttChart />} />
        <Route path="/analytics"        element={<UserAnalytics />} />
        <Route path="/intern-timeline"  element={<InternTimeline />} />
        <Route path="*"            element={<Navigate to="/login" />} />
      </Routes>
    </Suspense>
  )
}

export default App
