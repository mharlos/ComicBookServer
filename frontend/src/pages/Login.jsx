import { useState } from 'react'
import { Link } from 'react-router-dom'
import { login } from '../api/client'

export default function Login({ onLogin }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError('')
    try {
      const { user } = await login(email.trim(), password)
      onLogin(user)
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen dot-grid flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10 text-center">
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

      {/* Card */}
      <div className="w-full max-w-sm panel-border bg-zinc-900 rounded-xl p-8">
        <h2 className="text-lg font-semibold text-white mb-1">Sign in</h2>
        <p className="text-zinc-500 text-sm mb-6">Access is by invitation only.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError('') }}
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
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            disabled={loading}
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
            disabled={loading || !email.trim() || !password}
            className="
              w-full py-3 rounded-lg font-bold text-sm tracking-widest uppercase
              bg-yellow-400 text-zinc-950 hover:bg-yellow-500
              disabled:opacity-40 disabled:cursor-not-allowed
              transition focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-zinc-900
            "
          >
            {loading ? 'Signing in…' : 'Access Library'}
          </button>
        </form>

        <div className="mt-6 border-t border-zinc-800 pt-5 text-center">
          <p className="text-sm text-zinc-500">
            Have an invite?{' '}
            <Link to="/register" className="text-yellow-400 hover:text-yellow-300 transition">
              Create an account →
            </Link>
          </p>
        </div>
      </div>

      <p className="mt-8 text-zinc-700 text-xs">
        ComicBookServer v3.0 — supports CBR &amp; CBZ
      </p>
    </div>
  )
}
