import { useState } from 'react'
import { login, requestComic } from '../api/client'

export default function Login({ onLogin }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showRequest, setShowRequest] = useState(false)
  const [requestName, setRequestName] = useState('')
  const [requestSent, setRequestSent] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!key.trim()) return
    setLoading(true)
    setError('')
    try {
      await login(key.trim())
      onLogin()
    } catch {
      setError('Invalid beta key. Check your key and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRequest(e) {
    e.preventDefault()
    if (!requestName.trim()) return
    try {
      await requestComic(requestName.trim())
      setRequestSent(true)
      setRequestName('')
    } catch {
      /* silent */
    }
  }

  return (
    <div className="min-h-screen dot-grid flex flex-col items-center justify-center px-4">
      {/* Logo / title */}
      <div className="mb-10 text-center animate-fade-in">
        <h1 className="font-display text-6xl sm:text-7xl text-yellow-400 tracking-wide leading-none drop-shadow-lg">
          ComicBook
        </h1>
        <h1 className="font-display text-6xl sm:text-7xl text-white tracking-wide leading-none">
          Server
        </h1>
        <p className="mt-3 text-zinc-400 text-sm tracking-widest uppercase">
          Your digital comics library
        </p>
      </div>

      {/* Login card */}
      <div className="w-full max-w-sm panel-border bg-zinc-900 rounded-xl p-8 animate-slide-up">
        <h2 className="text-lg font-semibold text-white mb-1">Enter your beta key</h2>
        <p className="text-zinc-500 text-sm mb-6">Access is currently invitation-only.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            placeholder="••••••••••••"
            value={key}
            onChange={(e) => { setKey(e.target.value); setError('') }}
            disabled={loading}
            autoFocus
            className="
              w-full px-4 py-3 rounded-lg
              bg-zinc-800 border border-zinc-700
              text-white placeholder-zinc-600
              focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400
              transition disabled:opacity-50 text-sm
            "
          />

          {error && (
            <p className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="
              w-full py-3 rounded-lg font-bold text-sm tracking-widest uppercase
              bg-yellow-400 text-zinc-950 hover:bg-yellow-500
              disabled:opacity-40 disabled:cursor-not-allowed
              transition focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-zinc-900
            "
          >
            {loading ? 'Checking…' : 'Access Library'}
          </button>
        </form>

        <div className="mt-6 border-t border-zinc-800 pt-5">
          {!showRequest ? (
            <button
              onClick={() => setShowRequest(true)}
              className="text-sm text-zinc-500 hover:text-yellow-400 transition"
            >
              Don't have a key? Request access →
            </button>
          ) : requestSent ? (
            <p className="text-sm text-green-400">
              ✓ Request submitted! Watch your inbox for a beta key.
            </p>
          ) : (
            <form onSubmit={handleRequest} className="space-y-3">
              <p className="text-sm text-zinc-400">What comics would you like access to?</p>
              <input
                type="text"
                placeholder="e.g. Batman, X-Men, Saga…"
                value={requestName}
                onChange={(e) => setRequestName(e.target.value)}
                className="
                  w-full px-4 py-2 rounded-lg text-sm
                  bg-zinc-800 border border-zinc-700
                  text-white placeholder-zinc-600
                  focus:outline-none focus:border-yellow-400
                  transition
                "
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!requestName.trim()}
                  className="
                    flex-1 py-2 rounded-lg text-sm font-semibold
                    bg-zinc-700 hover:bg-zinc-600 text-white
                    disabled:opacity-40 transition
                  "
                >
                  Send Request
                </button>
                <button
                  type="button"
                  onClick={() => setShowRequest(false)}
                  className="px-4 py-2 rounded-lg text-sm text-zinc-500 hover:text-white transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <p className="mt-8 text-zinc-700 text-xs">
        ComicBookServer v2.0 — supports CBR &amp; CBZ
      </p>
    </div>
  )
}
