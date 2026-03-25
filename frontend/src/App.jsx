import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getAuthStatus } from './api/client'
import Login from './pages/Login'
import Browser from './pages/Browser'
import Reader from './pages/Reader'

export default function App() {
  const [auth, setAuth] = useState(null) // null = loading

  useEffect(() => {
    getAuthStatus()
      .then(({ authenticated }) => setAuth(authenticated))
      .catch(() => setAuth(false))
  }, [])

  if (auth === null) {
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

  return (
    <Routes>
      <Route
        path="/login"
        element={auth ? <Navigate to="/browse" replace /> : <Login onLogin={() => setAuth(true)} />}
      />
      <Route
        path="/browse"
        element={auth ? <Browser onLogout={() => setAuth(false)} /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/read/:sessionId"
        element={auth ? <Reader /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to={auth ? '/browse' : '/login'} replace />} />
    </Routes>
  )
}
