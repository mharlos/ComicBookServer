import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe, updateMe, getReadingHistory, logout } from '../api/client'

function Section({ title, children }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-base font-semibold text-white mb-4">{title}</h2>
      {children}
    </div>
  )
}

function InputField({ label, ...props }) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1">{label}</label>
      <input
        {...props}
        className="
          w-full px-4 py-2.5 rounded-lg text-sm
          bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600
          focus:outline-none focus:border-yellow-400 transition
          disabled:opacity-50
        "
      />
    </div>
  )
}

export default function Account({ user, onUpdate, onLogout }) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState({ username: user?.username || '', email: user?.email || '' })
  const [pwForm,  setPwForm]  = useState({ currentPassword: '', password: '', confirm: '' })
  const [history, setHistory] = useState([])
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState({ type: '', text: '' })

  useEffect(() => {
    getMe().then(u => setProfile({ username: u.username, email: u.email })).catch(() => {})
    getReadingHistory().then(({ history: h }) => setHistory(h)).catch(() => {})
  }, [])

  function flash(type, text) {
    setMsg({ type, text })
    setTimeout(() => setMsg({ type: '', text: '' }), 3500)
  }

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateMe({ username: profile.username, email: profile.email })
      onUpdate(u => ({ ...u, username: profile.username, email: profile.email }))
      flash('success', 'Profile updated.')
    } catch (err) {
      flash('error', err.message)
    } finally {
      setSaving(false)
    }
  }

  async function savePassword(e) {
    e.preventDefault()
    if (pwForm.password !== pwForm.confirm) { flash('error', 'Passwords do not match.'); return }
    setSaving(true)
    try {
      await updateMe({ currentPassword: pwForm.currentPassword, password: pwForm.password })
      setPwForm({ currentPassword: '', password: '', confirm: '' })
      flash('success', 'Password changed.')
    } catch (err) {
      flash('error', err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await logout().catch(() => {})
    onLogout()
  }

  const comicName = (path) => path.split('/').pop().replace(/\.(cbr|cbz)$/i, '').replace(/[-_]/g, ' ')
  const fmtDate   = (s) => s ? new Date(s + 'Z').toLocaleDateString() : '—'

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-4">
          <button onClick={() => navigate('/browse')} className="text-zinc-400 hover:text-yellow-400 transition text-sm">
            ← Library
          </button>
          <span className="font-display text-xl text-yellow-400 flex-1">Account</span>
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="text-xs px-3 py-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 hover:bg-yellow-400/20 transition"
            >
              Admin Panel
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition border border-zinc-700"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Flash message */}
        {msg.text && (
          <div className={`rounded-lg px-4 py-3 text-sm toast ${
            msg.type === 'success'
              ? 'bg-green-950/50 border border-green-800 text-green-400'
              : 'bg-red-950/50 border border-red-800 text-red-400'
          }`}>
            {msg.text}
          </div>
        )}

        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-yellow-400 flex items-center justify-center text-zinc-950 font-bold text-xl shrink-0">
            {(user?.username || '?')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-white text-lg">{user?.username}</p>
            <p className="text-zinc-500 text-sm">{user?.email}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
              user?.role === 'admin' ? 'bg-yellow-400/15 text-yellow-400' : 'bg-zinc-800 text-zinc-400'
            }`}>
              {user?.role}
            </span>
          </div>
        </div>

        {/* Profile */}
        <Section title="Profile">
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <InputField
                label="Username"
                type="text"
                value={profile.username}
                onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
                disabled={saving}
              />
              <InputField
                label="Email"
                type="email"
                value={profile.email}
                onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-zinc-950 font-semibold rounded-lg text-sm disabled:opacity-40 transition"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Section>

        {/* Password */}
        <Section title="Change Password">
          <form onSubmit={savePassword} className="space-y-4">
            <InputField
              label="Current Password"
              type="password"
              placeholder="••••••••"
              value={pwForm.currentPassword}
              onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
              disabled={saving}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <InputField
                label="New Password"
                type="password"
                placeholder="Min 8 characters"
                value={pwForm.password}
                onChange={e => setPwForm(p => ({ ...p, password: e.target.value }))}
                disabled={saving}
              />
              <InputField
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                value={pwForm.confirm}
                onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || !pwForm.currentPassword || !pwForm.password}
                className="px-5 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold rounded-lg text-sm disabled:opacity-40 transition"
              >
                Change Password
              </button>
            </div>
          </form>
        </Section>

        {/* Reading History */}
        <Section title="Reading History">
          {history.length === 0 ? (
            <p className="text-zinc-600 text-sm">No reading history yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
                  <div className="w-8 h-10 bg-zinc-800 rounded flex items-center justify-center text-lg shrink-0">
                    📖
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{comicName(h.comic_path)}</p>
                    <p className="text-xs text-zinc-600">{fmtDate(h.last_read_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </main>
    </div>
  )
}
