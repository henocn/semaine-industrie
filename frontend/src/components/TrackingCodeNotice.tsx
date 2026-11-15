import { Link } from 'react-router-dom'

/* Code de suivi remis dès l'inscription, avec le bouton vers le dossier. */
export function TrackingCodeNotice({ code }: { code?: string | null }) {
  if (!code) return null
  return (
    <div className="mt-5">
      <p className="text-[15px] text-ink/80">
        Code de suivi, à conserver : <span className="font-mono text-lg font-semibold tracking-wide text-forest">{code}</span>
      </p>
      <Link
        to={`/mon-espace?code=${encodeURIComponent(code)}`}
        className="mt-3 inline-flex items-center border border-forest bg-forest px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-ink"
      >
        Suivi de participation
      </Link>
    </div>
  )
}
