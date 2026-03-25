import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getComicPages } from '../api/client'

export default function Reader() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const title = searchParams.get('title') || 'Comic'

  const [pages, setPages] = useState([])
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [imgLoading, setImgLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getComicPages(sessionId)
      .then(({ pages: p }) => {
        if (!p || p.length === 0) throw new Error('No pages found in this comic')
        setPages(p)
        setLoading(false)
      })
      .catch((e) => { setError(e.message); setLoading(false) })
  }, [sessionId])

  const goTo = useCallback((idx) => {
    if (idx < 0 || idx >= pages.length) return
    setImgLoading(true)
    setCurrent(idx)
  }, [pages.length])

  const prev = useCallback(() => goTo(current - 1), [current, goTo])
  const next = useCallback(() => goTo(current + 1), [current, goTo])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault(); next()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault(); prev()
      } else if (e.key === 'Escape') {
        navigate('/browse')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, navigate])

  // Preload next page
  useEffect(() => {
    if (pages[current + 1]) {
      const img = new Image()
      img.src = pages[current + 1]
    }
  }, [current, pages])

  const progress = pages.length > 0 ? ((current + 1) / pages.length) * 100 : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-yellow-400 pulse-dot"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
        <p className="text-zinc-500 text-sm">Loading comic…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-4xl">💥</p>
        <p className="text-red-400 font-medium">{error}</p>
        <button
          onClick={() => navigate('/browse')}
          className="mt-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-zinc-950 font-bold rounded-lg text-sm transition"
        >
          ← Back to Library
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-4 px-4 py-3 bg-zinc-950/95 backdrop-blur border-b border-zinc-900">
        <button
          onClick={() => navigate('/browse')}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-yellow-400 transition text-sm font-medium shrink-0"
        >
          ← Back
        </button>

        <div className="flex-1 min-w-0 text-center">
          <h1 className="text-sm font-semibold text-white truncate">{title}</h1>
        </div>

        <span className="shrink-0 text-sm text-zinc-500 tabular-nums">
          {current + 1} / {pages.length}
        </span>
      </header>

      {/* Progress bar */}
      <div className="progress-bar w-full rounded-none">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Page display */}
      <div className="flex-1 flex flex-col items-center">
        {/* Click zones */}
        <div className="relative w-full max-w-4xl mx-auto">
          {/* Prev zone */}
          <button
            onClick={prev}
            disabled={current === 0}
            aria-label="Previous page"
            className="
              absolute left-0 top-0 h-full w-1/3 z-10
              flex items-center justify-start pl-4
              opacity-0 hover:opacity-100 transition-opacity
              disabled:cursor-default
            "
          >
            <span className="
              text-white bg-zinc-950/70 rounded-full w-10 h-10
              flex items-center justify-center text-lg
              disabled:opacity-30
            ">
              ‹
            </span>
          </button>

          {/* Image */}
          <div className="relative min-h-screen reader-page">
            {imgLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full bg-zinc-700 pulse-dot"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <img
              key={pages[current]}
              src={pages[current]}
              alt={`Page ${current + 1}`}
              onLoad={() => setImgLoading(false)}
              onError={() => setImgLoading(false)}
              className={`transition-opacity duration-200 ${imgLoading ? 'opacity-0' : 'opacity-100'}`}
            />
          </div>

          {/* Next zone */}
          <button
            onClick={next}
            disabled={current === pages.length - 1}
            aria-label="Next page"
            className="
              absolute right-0 top-0 h-full w-1/3 z-10
              flex items-center justify-end pr-4
              opacity-0 hover:opacity-100 transition-opacity
              disabled:cursor-default
            "
          >
            <span className="
              text-white bg-zinc-950/70 rounded-full w-10 h-10
              flex items-center justify-center text-lg
            ">
              ›
            </span>
          </button>
        </div>
      </div>

      {/* Bottom nav */}
      <footer className="sticky bottom-0 z-10 flex items-center justify-between gap-4 px-4 py-3 bg-zinc-950/95 backdrop-blur border-t border-zinc-900">
        <button
          onClick={prev}
          disabled={current === 0}
          className="
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
            bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-default
            transition
          "
        >
          ← Prev
        </button>

        {/* Page dots (up to 12) */}
        <div className="flex items-center gap-1 overflow-hidden max-w-xs">
          {pages.slice(0, 30).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all ${
                i === current
                  ? 'w-4 h-2 bg-yellow-400'
                  : 'w-1.5 h-1.5 bg-zinc-700 hover:bg-zinc-500'
              }`}
            />
          ))}
          {pages.length > 30 && (
            <span className="text-xs text-zinc-600 ml-1">+{pages.length - 30}</span>
          )}
        </div>

        <button
          onClick={next}
          disabled={current === pages.length - 1}
          className="
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
            bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-default
            transition
          "
        >
          Next →
        </button>
      </footer>

      {/* Keyboard hint */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 pointer-events-none">
        <p className="text-xs text-zinc-700 text-center hidden sm:block">
          Use ← → arrow keys to navigate · Esc to exit
        </p>
      </div>
    </div>
  )
}
