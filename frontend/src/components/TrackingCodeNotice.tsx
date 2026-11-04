import { Link } from 'react-router-dom'

/* Code de suivi remis dès l'inscription, avec le lien vers le dossier. */
export function TrackingCodeNotice({ code }: { code?: string | null }) {
  if (!code) return null
  return (
    <div className="mt-5">
      <p className="text-[15px] text-ink/80">Votre code de suivi, à conserver :</p>
      <p className="mt-2 inline-block bg-forest px-4 py-2 font-mono text-xl tracking-wide text-white">{code}</p>
      <p className="mt-3">
        <Link to={`/mon-espace?code=${encodeURIComponent(code)}`} className="font-semibold text-forest underline underline-offset-4">
          Suivre mon dossier dans Mon espace
        </Link>
      </p>
    </div>
  )
}
