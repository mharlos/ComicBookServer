// Colour palette for cover placeholders — cycles through a set of vibrant pairs
const PALETTES = [
  { bg: '#1a1a2e', accent: '#e94560' },
  { bg: '#0f3460', accent: '#e94560' },
  { bg: '#16213e', accent: '#f5c518' },
  { bg: '#1b262c', accent: '#0f3460' },
  { bg: '#2d132c', accent: '#ee4540' },
  { bg: '#1a1a1a', accent: '#f5c518' },
  { bg: '#0a3d62', accent: '#f5c518' },
  { bg: '#1e3799', accent: '#ffd32a' },
]

function getPalette(name) {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffff
  return PALETTES[hash % PALETTES.length]
}

export default function ComicCard({ comic, onClick, isOpening }) {
  const palette = getPalette(comic.name)

  return (
    <button
      onClick={onClick}
      disabled={isOpening}
      className="comic-card group text-left w-full focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-zinc-950 rounded-xl"
    >
      {/* Cover */}
      <div
        className="relative rounded-xl overflow-hidden border border-zinc-800 group-hover:border-yellow-400/50 transition-colors"
        style={{ aspectRatio: '2/3', background: palette.bg }}
      >
        {/* Decorative comic-cover lines */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, ${palette.accent} 0px, ${palette.accent} 1px, transparent 1px, transparent 14px)`,
          }}
        />

        {/* Title inset */}
        <div
          className="absolute bottom-0 left-0 right-0 px-3 py-2"
          style={{ background: `linear-gradient(transparent, ${palette.bg}dd)` }}
        >
          <div
            className="h-1.5 rounded-full mb-1.5"
            style={{ background: palette.accent, width: '60%' }}
          />
          <div
            className="h-1 rounded-full"
            style={{ background: palette.accent + '66', width: '40%' }}
          />
        </div>

        {/* Extension badge */}
        <span className="absolute top-2 right-2 text-xs font-bold px-1.5 py-0.5 rounded bg-black/60 text-zinc-400 uppercase">
          {comic.ext.replace('.', '')}
        </span>

        {/* Opening overlay */}
        {isOpening && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-yellow-400 pulse-dot"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Title */}
      <p className="mt-2 text-xs text-zinc-300 group-hover:text-white leading-snug line-clamp-2 transition-colors px-0.5">
        {comic.display}
      </p>
    </button>
  )
}
