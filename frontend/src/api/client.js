/**
 * API client — thin wrappers around fetch for all server endpoints.
 */

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

// ── Auth ───────────────────────────────────────────────────────────────────────
export const getAuthStatus = () => apiFetch('/api/auth/status')

export const login = (key) =>
  apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ key }),
  })

export const logout = () => apiFetch('/api/auth/logout', { method: 'POST' })

// ── Comics ─────────────────────────────────────────────────────────────────────
export const browseComics = (dir = '') =>
  apiFetch(`/api/comics/browse${dir ? `?dir=${encodeURIComponent(dir)}` : ''}`)

export const openComic = (path) =>
  apiFetch('/api/comics/open', {
    method: 'POST',
    body: JSON.stringify({ path }),
  })

export const getComicPages = (sessionId) =>
  apiFetch(`/api/comics/pages?sessionId=${sessionId}`)

// ── Feedback ───────────────────────────────────────────────────────────────────
export const requestComic = (comic) =>
  apiFetch('/api/request', {
    method: 'POST',
    body: JSON.stringify({ comic }),
  })

export const reportIssue = (description) =>
  apiFetch('/api/issue', {
    method: 'POST',
    body: JSON.stringify({ description }),
  })
