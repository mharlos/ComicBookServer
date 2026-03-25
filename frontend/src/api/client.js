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

export const login = (email, password) =>
  apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const register = (username, email, password, inviteToken = '') =>
  apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, inviteToken }),
  })

export const logout = () => apiFetch('/api/auth/logout', { method: 'POST' })

export const getMe = () => apiFetch('/api/auth/me')

export const updateMe = (updates) =>
  apiFetch('/api/auth/me', {
    method: 'PUT',
    body: JSON.stringify(updates),
  })

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

export const getReadingHistory = () => apiFetch('/api/comics/history')

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

// ── Admin ──────────────────────────────────────────────────────────────────────
export const getAdminStats = () => apiFetch('/api/admin/stats')

export const getAdminUsers = (page = 1, search = '') =>
  apiFetch(`/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`)

export const updateAdminUser = (id, updates) =>
  apiFetch(`/api/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })

export const deleteAdminUser = (id) =>
  apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' })

export const getAdminInvites = () => apiFetch('/api/admin/invites')

export const createAdminInvite = (note = '', expiresDays = null) =>
  apiFetch('/api/admin/invites', {
    method: 'POST',
    body: JSON.stringify({ note, expiresDays }),
  })

export const deleteAdminInvite = (id) =>
  apiFetch(`/api/admin/invites/${id}`, { method: 'DELETE' })

export const getAdminInventory = (page = 1, search = '') =>
  apiFetch(`/api/admin/inventory?page=${page}&search=${encodeURIComponent(search)}`)
