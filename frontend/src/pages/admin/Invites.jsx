import { useEffect, useState } from 'react'
import AdminLayout from './AdminLayout'
import { getAdminInvites, createAdminInvite, deleteAdminInvite } from '../../api/client'
import Modal from '../../components/Modal'

export default function AdminInvites({ user, onLogout }) {
  const [invites,    setInvites]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form,       setForm]       = useState({ note: '', expiresDays: '' })
  const [creating,   setCreating]   = useState(false)
  const [newInvite,  setNewInvite]  = useState(null)   // { token, inviteUrl }
  const [copied,     setCopied]     = useState(false)
  const [msg,        setMsg]        = useState('')

  async function load() {
    setLoading(true)
    try {
      const { invites: data } = await getAdminInvites()
      setInvites(data)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function flash(text) {
    setMsg(text)
    setTimeout(() => setMsg(''), 3000)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await createAdminInvite(
        form.note.trim(),
        form.expiresDays ? parseInt(form.expiresDays) : null,
      )
      setNewInvite(res)
      setShowCreate(false)
      setForm({ note: '', expiresDays: '' })
      load()
    } catch (err) {
      flash(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteAdminInvite(id)
      flash('Invite revoked.')
      load()
    } catch (err) {
      flash(err.message)
    }
  }

  async function copyLink(url) {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const fmtDate  = (s) => s ? new Date(s + 'Z').toLocaleDateString() : null
  const isPast   = (s) => s && new Date(s + 'Z') < new Date()
  const status   = (inv) => {
    if (inv.used_by_name)  return { label: 'Used',    cls: 'bg-zinc-800 text-zinc-500' }
    if (isPast(inv.expires_at)) return { label: 'Expired', cls: 'bg-red-950/30 text-red-500' }
    return { label: 'Pending', cls: 'bg-green-900/30 text-green-400' }
  }

  return (
    <AdminLayout user={user} onLogout={onLogout}>
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Invites</h1>
            <p className="text-zinc-500 text-sm">{invites.filter(i => !i.used_by_name && !isPast(i.expires_at)).length} pending</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="ml-auto px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-zinc-950 font-semibold rounded-lg text-sm transition"
          >
            + Create Invite
          </button>
        </div>

        {msg && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-300 toast">
            {msg}
          </div>
        )}

        {/* New invite banner */}
        {newInvite && (
          <div className="bg-green-950/40 border border-green-800 rounded-xl p-4 space-y-3">
            <p className="text-green-400 font-semibold text-sm">✓ Invite created! Share this link:</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={newInvite.inviteUrl}
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs font-mono focus:outline-none"
                onFocus={e => e.target.select()}
              />
              <button
                onClick={() => copyLink(newInvite.inviteUrl)}
                className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition whitespace-nowrap"
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <button onClick={() => setNewInvite(null)} className="text-xs text-zinc-600 hover:text-zinc-400 transition">
              Dismiss
            </button>
          </div>
        )}

        {/* Invite list */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-zinc-600 text-sm">Loading…</div>
          ) : invites.length === 0 ? (
            <div className="py-12 text-center text-zinc-600 text-sm">No invites yet. Create one above.</div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {invites.map((inv) => {
                const st = status(inv)
                return (
                  <div key={inv.id} className="flex items-center gap-3 px-5 py-4 flex-wrap sm:flex-nowrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                        {inv.note && <span className="text-sm text-white">{inv.note}</span>}
                        {!inv.note && <span className="text-sm text-zinc-600 italic">No note</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-600">
                        <span>Created by <span className="text-zinc-400">{inv.created_by_name ?? '—'}</span></span>
                        <span>on {fmtDate(inv.created_at)}</span>
                        {inv.expires_at && <span>expires {fmtDate(inv.expires_at)}</span>}
                        {inv.used_by_name && <span>used by <span className="text-zinc-400">{inv.used_by_name}</span> on {fmtDate(inv.used_at)}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!inv.used_by_name && (
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/register?token=${inv.token}`
                            copyLink(url)
                          }}
                          className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                        >
                          Copy Link
                        </button>
                      )}
                      {!inv.used_by_name && (
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="px-3 py-1.5 text-xs rounded-lg bg-red-950/30 text-red-500 hover:text-red-400 hover:bg-red-900/40 transition"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Invite">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Note (optional)</label>
            <input
              type="text"
              placeholder="Who is this for?"
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-yellow-400 transition"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Expires in (days, optional)</label>
            <input
              type="number"
              placeholder="Leave empty for no expiry"
              min="1"
              max="365"
              value={form.expiresDays}
              onChange={e => setForm(f => ({ ...f, expiresDays: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-yellow-400 transition"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-zinc-950 font-semibold rounded-lg text-sm disabled:opacity-40 transition"
            >
              {creating ? 'Creating…' : 'Create Invite'}
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  )
}
