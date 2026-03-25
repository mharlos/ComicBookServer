import { useEffect, useState, useCallback } from 'react'
import AdminLayout from './AdminLayout'
import { getAdminInventory } from '../../api/client'

function formatSize(bytes) {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3)  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

export default function AdminInventory({ user, onLogout }) {
  const [comics,  setComics]  = useState([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [search,  setSearch]  = useState('')
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const perPage = 50

  const load = useCallback(async (p, s) => {
    setLoading(true)
    setError('')
    try {
      const data = await getAdminInventory(p, s)
      if (data.error) { setError(data.error); return }
      setComics(data.comics)
      setTotal(data.total)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(1, '') }, [load])

  function doSearch(e) {
    e.preventDefault()
    setPage(1)
    setSearch(input)
    load(1, input)
  }

  function changePage(p) {
    setPage(p)
    load(p, search)
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <AdminLayout user={user} onLogout={onLogout}>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Inventory</h1>
            <p className="text-zinc-500 text-sm">{total.toLocaleString()} comics in library</p>
          </div>
          <form onSubmit={doSearch} className="flex gap-2 sm:ml-auto">
            <input
              type="search"
              placeholder="Search by title or path…"
              value={input}
              onChange={e => setInput(e.target.value)}
              className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-yellow-400 transition w-full sm:w-72"
            />
            <button type="submit" className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition border border-zinc-700">
              Search
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase">
                  <th className="text-left px-5 py-3 font-medium">Title</th>
                  <th className="text-left px-4 py-3 font-medium">Path</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-right px-5 py-3 font-medium">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-12 text-zinc-600">Loading…</td></tr>
                ) : comics.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-zinc-600">
                    {search ? 'No comics match that search.' : 'No comics found. Is COMIC_DIR configured?'}
                  </td></tr>
                ) : comics.map((c, i) => (
                  <tr key={i} className="hover:bg-zinc-800/30 transition">
                    <td className="px-5 py-3">
                      <p className="font-medium text-white truncate max-w-xs">{c.name}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs font-mono truncate max-w-xs">
                      {c.parent || '/'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                        c.ext === '.cbz'
                          ? 'bg-blue-950/40 text-blue-400'
                          : 'bg-orange-950/40 text-orange-400'
                      }`}>
                        {c.ext.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-500 text-xs tabular-nums">
                      {formatSize(c.size)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="sm:hidden divide-y divide-zinc-800">
            {loading ? (
              <div className="py-12 text-center text-zinc-600 text-sm">Loading…</div>
            ) : comics.map((c, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-medium shrink-0 ${
                  c.ext === '.cbz' ? 'bg-blue-950/40 text-blue-400' : 'bg-orange-950/40 text-orange-400'
                }`}>
                  {c.ext.slice(1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{c.name}</p>
                  <p className="text-xs text-zinc-600 truncate">{c.parent || '/'}</p>
                </div>
                <span className="text-xs text-zinc-600 shrink-0">{formatSize(c.size)}</span>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
              <button
                onClick={() => changePage(page - 1)}
                disabled={page === 1 || loading}
                className="text-sm px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40 transition"
              >
                ← Prev
              </button>
              <span className="text-xs text-zinc-500">
                {((page - 1) * perPage + 1).toLocaleString()}–{Math.min(page * perPage, total).toLocaleString()} of {total.toLocaleString()}
              </span>
              <button
                onClick={() => changePage(page + 1)}
                disabled={page === totalPages || loading}
                className="text-sm px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40 transition"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
