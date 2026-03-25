import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { browseComics, openComic, reportIssue } from '../api/client'
import ComicCard from '../components/ComicCard'
import DirectoryCard from '../components/DirectoryCard'
import Navbar from '../components/Navbar'
import Modal from '../components/Modal'

export default function Browser({ user, onLogout }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentDir = searchParams.get('dir') || ''

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [opening, setOpening] = useState('')
  const [showIssue, setShowIssue] = useState(false)
  const [issueText, setIssueSent] = useState('')
  const [issueSent, setIssueSentFlag] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await browseComics(currentDir)
      setData(res)
    } catch (e) {
      setError(e.message || 'Failed to load comics')
    } finally {
      setLoading(false)
    }
  }, [currentDir])

  useEffect(() => { load() }, [load])

  async function handleOpenComic(path, displayName) {
    setOpening(path)
    try {
      const { sessionId } = await openComic(path)
      navigate(`/read/${sessionId}?title=${encodeURIComponent(displayName)}`)
    } catch (e) {
      setError(`Could not open comic: ${e.message}`)
      setOpening('')
    }
  }

  function handleNavigate(dirPath) {
    if (dirPath) {
      setSearchParams({ dir: dirPath })
    } else {
      setSearchParams({})
    }
  }

  async function handleIssueSubmit(e) {
    e.preventDefault()
    if (!issueText.trim()) return
    try {
      await reportIssue(issueText.trim())
      setIssueSentFlag(true)
    } catch { /* ignore */ }
  }

  const breadcrumbs = data?.breadcrumbs || []

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <Navbar
        user={user}
        breadcrumbs={breadcrumbs}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        onReportIssue={() => { setShowIssue(true); setIssueSentFlag(false); setIssueSent('') }}
        totalComics={data?.totalComics}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-950/40 border border-red-900 text-red-400 rounded-xl px-4 py-3 text-sm flex items-center gap-3">
            <span className="text-lg">⚠</span>
            {error}
            <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-400">✕</button>
          </div>
        )}

        {/* Loading */}
        {loading && <BrowserSkeleton />}

        {/* Content */}
        {!loading && data && (
          <div className="animate-fade-in">
            {/* Directories */}
            {data.dirs.length > 0 && (
              <section className="mb-10">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
                  Folders — {data.dirs.length}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {data.dirs.map((dir) => (
                    <DirectoryCard
                      key={dir.path}
                      name={dir.display}
                      onClick={() => handleNavigate(dir.path)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Comics */}
            {data.comics.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
                  Comics — {data.comics.length}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {data.comics.map((comic) => (
                    <ComicCard
                      key={comic.path}
                      comic={comic}
                      isOpening={opening === comic.path}
                      onClick={() => handleOpenComic(comic.path, comic.display)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {data.dirs.length === 0 && data.comics.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 text-zinc-600">
                <span className="text-6xl mb-4">📭</span>
                <p className="text-lg font-medium text-zinc-500">No comics found here</p>
                <p className="text-sm mt-1">
                  Make sure COMIC_DIR is configured and contains CBR/CBZ files.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Report Issue modal */}
      <Modal open={showIssue} onClose={() => setShowIssue(false)} title="Report a Problem">
        {issueSent ? (
          <div className="text-center py-4">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-green-400 font-medium">Report submitted — thanks!</p>
            <button
              onClick={() => setShowIssue(false)}
              className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleIssueSubmit} className="space-y-4">
            <textarea
              rows={4}
              placeholder="Describe the issue…"
              value={issueText}
              onChange={(e) => setIssueSent(e.target.value)}
              className="
                w-full px-4 py-3 rounded-lg text-sm
                bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600
                focus:outline-none focus:border-yellow-400 resize-none transition
              "
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowIssue(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!issueText.trim()}
                className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-zinc-950 font-semibold rounded-lg text-sm disabled:opacity-40 transition"
              >
                Submit
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

function BrowserSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton h-4 w-24 mb-4 rounded" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mb-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-xl" />
        ))}
      </div>
      <div className="skeleton h-4 w-24 mb-4 rounded" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="skeleton rounded-xl" style={{ aspectRatio: '2/3' }} />
        ))}
      </div>
    </div>
  )
}
