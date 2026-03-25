export default function DirectoryCard({ name, onClick }) {
  return (
    <button
      onClick={onClick}
      className="
        dir-card group w-full text-left
        flex items-center gap-3 px-4 py-3 rounded-xl
        bg-zinc-900 border border-zinc-800
        hover:border-zinc-700
        focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-zinc-950
      "
    >
      <span className="text-2xl leading-none shrink-0">📁</span>
      <span className="text-sm text-zinc-300 group-hover:text-white transition-colors font-medium truncate">
        {name}
      </span>
    </button>
  )
}
