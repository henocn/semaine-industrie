import { Link } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'

/* Invitation polie à répondre au questionnaire, après une inscription. Le code relie la réponse à l'inscription. */
export function SurveyInvite({ code }: { code?: string | null }) {
  const href = `/vue-par-vous/?jeu=sondage${code ? `&code=${encodeURIComponent(code)}` : ''}`
  return (
    <div className="mt-6 border-t border-forest/15 pt-5">
      <p className="text-[15px] leading-relaxed text-ink/80">
        Votre avis compte : répondez à notre questionnaire, en moins d’une minute. Merci !
      </p>
      <Link
        to={href}
        className="mt-3 inline-flex items-center gap-2 border border-forest bg-sun px-4 py-2.5 text-[14px] font-semibold text-forest transition-opacity hover:opacity-90"
      >
        <ClipboardList className="h-4 w-4" aria-hidden="true" />
        Répondre
      </Link>
    </div>
  )
}
