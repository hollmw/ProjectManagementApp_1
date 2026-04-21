import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import UserManagement from './pages/UserManagement'
import ActivityLog from './pages/ActivityLog'


function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/users" element={<UserManagement />} />
      <Route path="*" element={<Navigate to="/login" />} />
      <Route path="/activity" element={<ActivityLog />} />

    </Routes>
  )
}

export default App