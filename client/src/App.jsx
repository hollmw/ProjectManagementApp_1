import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import UserManagement from './pages/UserManagement'
import ActivityLog from './pages/ActivityLog'
import Leaderboard from './pages/Leaderboard'
import GanttChart from './pages/GanttChart'
import UserAnalytics from './pages/UserAnalytics'

function App() {
  return (
    <Routes>
      <Route path="/login"     element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/users"     element={<UserManagement />} />
      <Route path="/activity"  element={<ActivityLog />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/gantt"     element={<GanttChart />} />
      <Route path="/analytics" element={<UserAnalytics />} />
      <Route path="*"          element={<Navigate to="/login" />} />
    </Routes>
  )
}

export default App