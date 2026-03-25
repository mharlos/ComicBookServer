import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { register } from '../api/client'

export default function Register({ onRegister }) {
  const [params]    = useSearchParams()
  const navigate    = useNavigate()
  const [form, setForm] = useState({
    username:    '',
    email:       '',
    password:    '',
    confirm:     '',
    inviteToken: params.get('token') || '',
  })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function set(field) {
    return (e) => { setForm(f => ({ ...f, [field]: e.target.value })); setError('') }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { user } = await register(
        form.username.trim(), form.email.trim(), form.password, form.inviteToken.trim()
      )
      onRegister(user)
      navigate('/browse', { replace: true })
    } catch (err) {
      setError(err.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = `
    w-full px-4 py-3 rounded-lg
    bg-zinc-800 border border-zinc-700
    text-white placeholder-zinc-600
    focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400
    transition disabled:opacity-50 text-sm
  `

  return (
    <div className="min-h-screen dot-grid flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="font-display text-5xl text-yellow-400 tracking-wide leading-none">
          ComicBook
        </h1>
        <h1 className="font-display text-5xl text-white tracking-wide leading-none">
          Server
        </h1>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm panel-border bg-zinc-900 rounded-xl p-8">
        <h2 className="text-lg font-semibold text-white mb-1">Create account</h2>
        <p className="text-zinc-500 text-sm mb-6">
          {form.inviteToken
            ? 'You have an invite — fill in your details below.'
            : 'You need an invite token to register.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={set('username')}
            disabled={loading}
            autoFocus
            className={inputClass}
          />
          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={set('email')}
            disabled={loading}
            className={inputClass}
          />
          <input
            type="password"
            placeholder="Password (min 8 characters)"
            value={form.password}
            onChange={set('password')}
            disabled={loading}
            className={inputClass}
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={form.confirm}
            onChange={set('confirm')}
            disabled={loading}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Invite token"
            value={form.inviteToken}
            onChange={set('inviteToken')}
            disabled={loading}
            className={inputClass}
          />

          {error && (
            <p className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !form.username || !form.email || !form.password || !form.confirm}
            className="
              w-full py-3 rounded-lg font-bold text-sm tracking-widest uppercase
              bg-yellow-400 text-zinc-950 hover:bg-yellow-500
              disabled:opacity-40 disabled:cursor-not-allowed
              transition mt-2
            "
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="mt-5 border-t border-zinc-800 pt-4 text-center">
          <p className="text-sm text-zinc-500">
            Already have an account?{' '}
            <Link to="/login" className="text-yellow-400 hover:text-yellow-300 transition">
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
