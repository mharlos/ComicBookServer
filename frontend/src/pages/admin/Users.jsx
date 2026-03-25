import { useEffect, useState, useCallback } from 'react'
import AdminLayout from './AdminLayout'
import { getAdminUsers, updateAdminUser, deleteAdminUser } from '../../api/client'
import Modal from '../../components/Modal'

function Badge({ children, variant = 'default' }) {
  const cls = {
    admin:    'bg-yellow-400/15 text-yellow-400',
    user:     'bg-zinc-800 text-zinc-400',
    active:   'bg-green-900/40 text-green-400',
    inactive: 'bg-red-900/40 text-red-400',
  }[variant] ?? 'bg-zinc-800 text-zinc-400'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{children}</span>
  )
}

export default function AdminUsers({ user: currentUser, onLogout }) {
  const [users,   setUsers]   = useState([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(null) // { type, user }
  const [busy,    setBusy]    = useState(false)
  const [msg,     setMsg]     = useState('')

  const perPage = 25

  const load = useCallback(async (p = page, s = search) => {
    setLoading(true)
    try {
      const data = await getAdminUsers(p, s)
      setUsers(data.users)
      setTotal(data.total)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { load(1, search) }, []) // eslint-disable-line

  function doSearch(e) {
    e.preventDefault()
    setPage(1)
    load(1, search)
  }

  function changePage(p) {
    setPage(p)
    load(p, search)
  }

  function flash(text) {
    setMsg(text)
    setTimeout(() => setMsg(''), 3000)
  }

  async function handleConfirm() {
    if (!confirm) return
    setBusy(true)
    try {
      if (confirm.type === 'delete') {
        await deleteAdminUser(confirm.user.id)
        flash(`Deleted ${confirm.user.username}.`)
      } else if (confirm.type === 'role') {
        const newRole = confirm.user.role === 'admin' ? 'user' : 'admin'
        await updateAdminUser(confirm.user.id, { role: newRole })
        flash(`${confirm.user.username} is now ${newRole}.`)
      } else if (confirm.type === 'active') {
        await updateAdminUser(confirm.user.id, { active: !confirm.user.active })
        flash(`${confirm.user.username} ${confirm.user.active ? 'deactivated' : 'activated'}.`)
      }
      setConfirm(null)
      load(page, search)
    } catch (err) {
      flash(err.message)
    } finally {
      setBusy(false)
    }
  }

  const fmtDate = (s) => s ? new Date(s + 'Z').toLocaleDateString() : '—'
  const totalPages = Math.ceil(total / perPage)

  return (
    <AdminLayout user={currentUser} onLogout={onLogout}>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Users</h1>
            <p className="text-zinc-500 text-sm">{total} total accounts</p>
          </div>
          <form onSubmit={doSearch} className="flex gap-2 sm:ml-auto">
            <input
              type="search"
              placeholder="Search username or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-yellow-400 transition w-full sm:w-64"
            />
            <button type="submit" className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition border border-zinc-700">
              Search
            </button>
          </form>
        </div>

        {msg && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-300 toast">
            {msg}
          </div>
        )}

        {/* Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase">
                  <th className="text-left px-5 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Joined</th>
                  <th className="text-left px-4 py-3 font-medium">Last Login</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-zinc-600">Loading…</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-zinc-600">No users found.</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className="hover:bg-zinc-800/30 transition">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-yellow-400 shrink-0">
                          {u.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">{u.username}</p>
                          <p className="text-xs text-zinc-600">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant={u.role}>{u.role}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={u.active ? 'active' : 'inactive'}>{u.active ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-4 py-3 text-zinc-500">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-zinc-500">{fmtDate(u.last_login)}</td>
                    <td className="px-4 py-3">
                      {u.id !== currentUser?.id && (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => setConfirm({ type: 'role', user: u })}
                            className="px-2.5 py-1 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                          >
                            {u.role === 'admin' ? 'Demote' : 'Promote'}
                          </button>
                          <button
                            onClick={() => setConfirm({ type: 'active', user: u })}
                            className="px-2.5 py-1 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                          >
                            {u.active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => setConfirm({ type: 'delete', user: u })}
                            className="px-2.5 py-1 text-xs rounded-lg bg-red-950/30 hover:bg-red-900/40 text-red-500 hover:text-red-400 transition"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-zinc-800">
            {loading ? (
              <div className="py-8 text-center text-zinc-600 text-sm">Loading…</div>
            ) : users.map(u => (
              <div key={u.id} className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-yellow-400 text-sm">
                    {u.username[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white text-sm">{u.username}</p>
                    <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                  </div>
                  <Badge variant={u.role}>{u.role}</Badge>
                </div>
                {u.id !== currentUser?.id && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setConfirm({ type: 'role', user: u })} className="flex-1 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition">
                      {u.role === 'admin' ? 'Demote' : 'Promote'}
                    </button>
                    <button onClick={() => setConfirm({ type: 'active', user: u })} className="flex-1 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition">
                      {u.active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => setConfirm({ type: 'delete', user: u })} className="flex-1 py-1.5 text-xs rounded-lg bg-red-950/30 text-red-500 transition">
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
              <button
                onClick={() => changePage(page - 1)}
                disabled={page === 1}
                className="text-sm px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40 transition"
              >
                ← Prev
              </button>
              <span className="text-xs text-zinc-500">Page {page} of {totalPages}</span>
              <button
                onClick={() => changePage(page + 1)}
                disabled={page === totalPages}
                className="text-sm px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40 transition"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm modal */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Confirm Action">
        {confirm && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">
              {confirm.type === 'delete' && `Are you sure you want to permanently delete ${confirm.user.username}? This cannot be undone.`}
              {confirm.type === 'role'   && `${confirm.user.role === 'admin' ? 'Demote' : 'Promote'} ${confirm.user.username} to ${confirm.user.role === 'admin' ? 'user' : 'admin'}?`}
              {confirm.type === 'active' && `${confirm.user.active ? 'Disable' : 'Enable'} account for ${confirm.user.username}?`}
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirm(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition">
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={busy}
                className={`px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 transition ${
                  confirm.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-yellow-400 hover:bg-yellow-500 text-zinc-950'
                }`}
              >
                {busy ? 'Working…' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  )
}
