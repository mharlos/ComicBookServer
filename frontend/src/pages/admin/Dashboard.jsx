import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { getAdminStats } from '../../api/client'

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent ? 'text-yellow-400' : 'text-white'}`}>
        {value ?? '…'}
      </p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminDashboard({ user, onLogout }) {
  const navigate = useNavigate()
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fmtDate = (s) => s ? new Date(s + 'Z').toLocaleString() : 'Never'

  return (
    <AdminLayout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-1">System overview and recent activity</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Users"    value={stats?.totalUsers}    sub={`${stats?.activeUsers ?? '…'} active`} />
          <StatCard label="Total Comics"   value={stats?.totalComics?.toLocaleString()}   accent />
          <StatCard label="Total Reads"    value={stats?.totalReads?.toLocaleString()}    sub="all time" />
          <StatCard label="Pending Invites" value={stats?.pendingInvites} sub={`of ${stats?.totalInvites ?? '…'} total`} />
        </div>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Create Invite',    path: '/admin/invites',   icon: '✉', desc: 'Generate an invite link for a new user' },
            { label: 'Manage Users',     path: '/admin/users',     icon: '👥', desc: 'View, edit, and remove user accounts' },
            { label: 'Browse Inventory', path: '/admin/inventory', icon: '📚', desc: 'Search and audit the comics library' },
          ].map(({ label, path, icon, desc }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 text-left transition hover:bg-zinc-800/60 group"
            >
              <span className="text-3xl">{icon}</span>
              <p className="mt-3 font-semibold text-white group-hover:text-yellow-400 transition">{label}</p>
              <p className="text-xs text-zinc-500 mt-1">{desc}</p>
            </button>
          ))}
        </div>

        {/* Recent logins */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="font-semibold text-white">Recent Logins</h2>
          </div>
          {loading ? (
            <div className="p-5 text-zinc-600 text-sm">Loading…</div>
          ) : (stats?.recentLogins?.length ?? 0) === 0 ? (
            <div className="p-5 text-zinc-600 text-sm">No logins yet.</div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {stats.recentLogins.map((u, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-yellow-400 shrink-0">
                    {u.username[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-medium">{u.username}</p>
                    <p className="text-xs text-zinc-600 truncate">{u.email}</p>
                  </div>
                  <p className="text-xs text-zinc-600 shrink-0">{fmtDate(u.last_login)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
