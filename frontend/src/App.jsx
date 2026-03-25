import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getAuthStatus } from './api/client'
import Login from './pages/Login'
import Register from './pages/Register'
import Browser from './pages/Browser'
import Reader from './pages/Reader'
import Account from './pages/Account'
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminInvites from './pages/admin/Invites'
import AdminInventory from './pages/admin/Inventory'

function LoadingDots() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-yellow-400 pulse-dot"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  )
}

function AdminGuard({ user, children }) {
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/browse" replace />
  return children
}

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = loading

  useEffect(() => {
    getAuthStatus()
      .then(({ authenticated, user: u }) => setUser(authenticated ? u : null))
      .catch(() => setUser(null))
  }, [])

  if (user === undefined) return <LoadingDots />

  const isAuth  = user !== null
  const isAdmin = user?.role === 'admin'

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={isAuth ? <Navigate to="/browse" replace /> : <Login onLogin={setUser} />}
      />
      <Route
        path="/register"
        element={isAuth ? <Navigate to="/browse" replace /> : <Register onRegister={setUser} />}
      />

      {/* Protected */}
      <Route
        path="/browse"
        element={isAuth ? <Browser user={user} onLogout={() => setUser(null)} /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/read/:sessionId"
        element={isAuth ? <Reader /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/account"
        element={isAuth ? <Account user={user} onUpdate={setUser} onLogout={() => setUser(null)} /> : <Navigate to="/login" replace />}
      />

      {/* Admin */}
      <Route
        path="/admin"
        element={<AdminGuard user={user}><AdminDashboard user={user} onLogout={() => setUser(null)} /></AdminGuard>}
      />
      <Route
        path="/admin/users"
        element={<AdminGuard user={user}><AdminUsers user={user} onLogout={() => setUser(null)} /></AdminGuard>}
      />
      <Route
        path="/admin/invites"
        element={<AdminGuard user={user}><AdminInvites user={user} onLogout={() => setUser(null)} /></AdminGuard>}
      />
      <Route
        path="/admin/inventory"
        element={<AdminGuard user={user}><AdminInventory user={user} onLogout={() => setUser(null)} /></AdminGuard>}
      />

      <Route path="*" element={<Navigate to={isAuth ? '/browse' : '/login'} replace />} />
    </Routes>
  )
}
