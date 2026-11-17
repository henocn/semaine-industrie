import { Link } from 'react-router-dom'
import { WhatsAppIcon } from './ui/WhatsAppIcon'

/* Numéro du bot WhatsApp de la Semaine de l'industrie. */
const WHATSAPP_BOT = '22871535358'

/* Code de suivi remis dès l'inscription, avec le bouton vers le dossier.
   via="whatsapp" : le bouton ouvre le bot WhatsApp avec le code déjà écrit (c'est la personne qui écrit en premier). */
export function TrackingCodeNotice({ code, via = 'site' }: { code?: string | null; via?: 'site' | 'whatsapp' }) {
  if (!code) return null
  return (
    <div className="mt-5">
      <p className="text-[15px] text-ink/80">
        Code de suivi, à conserver : <span className="font-mono text-lg font-semibold tracking-wide text-forest">{code}</span>
      </p>
      {via === 'whatsapp' ? (
        <a
          href={`https://wa.me/${WHATSAPP_BOT}?text=${encodeURIComponent(code)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 border border-forest bg-forest px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-ink"
        >
          <WhatsAppIcon className="h-4 w-4" />
          Vérifier le statut
        </a>
      ) : (
        <Link
          to={`/mon-espace?code=${encodeURIComponent(code)}`}
          className="mt-3 inline-flex items-center border border-forest bg-forest px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-ink"
        >
          Suivi de participation
        </Link>
      )}
    </div>
  )
}
