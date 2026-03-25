import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { requestComic, logout } from '../api/client'
import Modal from './Modal'

function UserMenu({ user, onLogout }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref  = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleLogout() {
    await logout().catch(() => {})
    onLogout()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 hover:opacity-80 transition"
        aria-label="User menu"
      >
        <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-zinc-950 font-bold text-sm">
          {(user?.username || '?')[0].toUpperCase()}
        </div>
        <span className="hidden sm:block text-sm text-zinc-300">{user?.username}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-sm font-medium text-white truncate">{user?.username}</p>
            <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
          </div>
          <div className="py-1">
            <button
              onClick={() => { setOpen(false); navigate('/account') }}
              className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
            >
              Account Settings
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => { setOpen(false); navigate('/admin') }}
                className="w-full text-left px-4 py-2.5 text-sm text-yellow-400 hover:text-yellow-300 hover:bg-zinc-800 transition"
              >
                Admin Panel
              </button>
            )}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-sm text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Navbar({ user, breadcrumbs, onNavigate, onLogout, onReportIssue, totalComics }) {
  const [showRequest, setShowRequest] = useState(false)
  const [requestText, setRequestText] = useState('')
  const [requestSent, setRequestSentFlag] = useState(false)

  async function handleRequest(e) {
    e.preventDefault()
    if (!requestText.trim()) return
    try {
      await requestComic(requestText.trim())
      setRequestSentFlag(true)
      setRequestText('')
    } catch { /* ignore */ }
  }

  function openRequest() {
    setShowRequest(true)
    setRequestSentFlag(false)
    setRequestText('')
  }

  return (
    <>
      <header className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 gap-4">
            {/* Logo */}
            <button
              onClick={() => onNavigate('')}
              className="font-display text-2xl text-yellow-400 tracking-wide leading-none hover:text-yellow-300 transition shrink-0"
            >
              CBS
            </button>

            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1 text-sm flex-1 min-w-0 overflow-hidden">
              <button
                onClick={() => onNavigate('')}
                className="text-zinc-400 hover:text-yellow-400 transition shrink-0"
              >
                Library
              </button>
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.path} className="flex items-center gap-1 min-w-0">
                  <span className="text-zinc-700">/</span>
                  <button
                    onClick={() => onNavigate(crumb.path)}
                    className={`truncate transition ${
                      i === breadcrumbs.length - 1
                        ? 'text-white font-medium'
                        : 'text-zinc-400 hover:text-yellow-400'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2 shrink-0">
              {totalComics != null && (
                <span className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
                  {totalComics.toLocaleString()} comics
                </span>
              )}

              <button
                onClick={openRequest}
                className="text-sm text-zinc-400 hover:text-yellow-400 transition px-2 py-1 hidden sm:block"
                title="Request a comic"
              >
                + Request
              </button>

              <button
                onClick={onReportIssue}
                className="text-sm text-zinc-600 hover:text-zinc-300 transition px-2 py-1 hidden sm:block"
                title="Report a problem"
              >
                ⚑ Issue
              </button>

              <UserMenu user={user} onLogout={onLogout} />
            </div>
          </div>
        </div>
      </header>

      {/* Request modal */}
      <Modal open={showRequest} onClose={() => setShowRequest(false)} title="Request a Comic">
        {requestSent ? (
          <div className="text-center py-4">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-green-400 font-medium">Request submitted!</p>
            <p className="text-zinc-500 text-sm mt-1">We'll try to add it to the library soon.</p>
            <button
              onClick={() => setShowRequest(false)}
              className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleRequest} className="space-y-4">
            <p className="text-sm text-zinc-400">
              What comic would you like added to the library?
            </p>
            <input
              type="text"
              placeholder="e.g. The Sandman #1, Watchmen, Maus…"
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              autoFocus
              className="
                w-full px-4 py-3 rounded-lg text-sm
                bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600
                focus:outline-none focus:border-yellow-400 transition
              "
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowRequest(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!requestText.trim()}
                className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-zinc-950 font-semibold rounded-lg text-sm disabled:opacity-40 transition"
              >
                Submit
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
