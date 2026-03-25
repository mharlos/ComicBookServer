import { useNavigate, useLocation } from 'react-router-dom'
import { logout } from '../../api/client'

const NAV = [
  { path: '/admin',           label: 'Dashboard', icon: '▦' },
  { path: '/admin/users',     label: 'Users',     icon: '👥' },
  { path: '/admin/invites',   label: 'Invites',   icon: '✉' },
  { path: '/admin/inventory', label: 'Inventory', icon: '📚' },
]

export default function AdminLayout({ user, onLogout, children }) {
  const navigate  = useNavigate()
  const location  = useLocation()

  async function handleLogout() {
    await logout().catch(() => {})
    onLogout()
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-4">
          <button
            onClick={() => navigate('/browse')}
            className="font-display text-xl text-yellow-400 tracking-wide hover:text-yellow-300 transition shrink-0"
          >
            CBS
          </button>
          <span className="text-zinc-700 text-sm hidden sm:block">/ Admin</span>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1 flex-1">
            {NAV.map(({ path, label, icon }) => {
              const active = location.pathname === path
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
                    active
                      ? 'bg-yellow-400/10 text-yellow-400 font-medium'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <span className="text-base leading-none">{icon}</span>
                  {label}
                </button>
              )
            })}
          </nav>

          <div className="flex items-center gap-2 ml-auto">
            <span className="hidden sm:block text-xs text-zinc-600">{user?.username}</span>
            <button
              onClick={() => navigate('/account')}
              className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-zinc-950 font-bold text-sm"
              title="Account"
            >
              {(user?.username || '?')[0].toUpperCase()}
            </button>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition border border-zinc-700"
            >
              Log out
            </button>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <nav className="sm:hidden flex border-t border-zinc-900">
          {NAV.map(({ path, label, icon }) => {
            const active = location.pathname === path
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition ${
                  active ? 'text-yellow-400' : 'text-zinc-500 hover:text-white'
                }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </button>
            )
          })}
        </nav>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  )
}
