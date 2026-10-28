import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { WRAP } from '../components/layout/Mark'
import { SectionHeader } from '../components/ui/SectionHeader'

/* Page politique de confidentialité / cookies. */
export default function PrivacyPage() {
  return (
    <main className="py-16 sm:py-24">
      <Seo {...publicSeo('/confidentialite')} />
      <div className={`${WRAP} max-w-2xl space-y-6 text-[15px] leading-relaxed text-ink/80`}>
        <div className="animate-rise">
          <SectionHeader level={1} title="Confidentialité et cookies" />
        </div>
        <p>
          Les données collectées via les formulaires (label, rencontres d&apos;affaires, contact)
          servent uniquement à organiser la Semaine de l&apos;industrie 2026.
        </p>
        <p>
          Si vous acceptez d&apos;être contacté, l&apos;équipe peut vous écrire par e-mail ou WhatsApp
          pour le suivi (validation, rendez-vous, rappels).
        </p>
        <p>
          Cookies : uniquement des cookies techniques (session, préférence cookies). Pas de publicité
          tierce.
        </p>
        <p>
          Contact :{' '}
          <a href="mailto:infos@semaineindustrie.tg" className="font-semibold text-forest underline underline-offset-2">
            infos@semaineindustrie.tg
          </a>
        </p>
      </div>
    </main>
  )
}
