import { useEffect } from 'react'
import { Seo } from '../components/Seo'
import { WRAP } from '../components/layout/Mark'
import { SectionHeader } from '../components/ui/SectionHeader'
import { SITE_URL, publicSeo } from '../lib/seo'

const FAQ = [
  {
    q: 'Quand a lieu la Semaine ?',
    a: 'Du lundi 16 au dimanche 22 novembre 2026, au Togo. La journée phare est le vendredi 20 novembre.',
  },
  {
    q: 'Qui peut participer ?',
    a: 'Les entreprises, les écoles, les jeunes, les familles et les acteurs économiques. Certaines visites se font sur inscription.',
  },
  {
    q: "Comment s'inscrire, école, université ou particulier ?",
    a: "Depuis Participer : En tant que particulier pour une inscription personnelle, ou En tant qu’école / université pour un groupe. Après validation, un QR est remis pour le jour J.",
  },
  {
    q: 'Comment demander le label ?',
    a: 'Depuis Participer, puis Demande de label : industries. Après acceptation, un code de suivi est envoyé.',
  },
  {
    q: 'Faut-il un numéro de téléphone ?',
    a: "Oui, il est demandé dans chaque formulaire, de préférence un numéro WhatsApp : c'est par là que vous recevez votre code et votre QR.",
  },
  {
    q: 'Comment suivre un dossier de label ?',
    a: 'Avec le code de suivi (exemple : IN-K7P4 pour une industrie), sur le site dans Mon espace, ou sur WhatsApp dans Mon espace, puis Suivi de label.',
  },
  {
    q: 'À quoi sert Mon espace ?',
    a: 'Avec votre code de suivi, vous retrouvez votre dossier, le bilan de vos passages, vos visites à venir et vos documents.',
  },
  {
    q: "Comment retrouver mes rencontres d'affaires ?",
    a: "Avec l'e-mail utilisé à l'inscription, ou le code (exemple : AF-9TQB), sur WhatsApp : Mon espace, puis Rencontres d'affaires.",
  },
  {
    q: 'Où consulter le programme ?',
    a: "La page Programme détaille chaque jour. L'accueil ne montre que le vendredi 20. Sur WhatsApp, Programme demande de choisir une date.",
  },
  {
    q: 'Comment voter pour le coup de cœur ?',
    a: "Le samedi, sur la page Vote. Un vote par navigateur. Les produits en lice sont ceux retenus par l'organisation.",
  },
  {
    q: 'Les documents sont-ils publics ?',
    a: "Les ressources générales le sont, sur la page d'accueil. Le PDF du label personnel se télécharge dans Mon espace.",
  },
  {
    q: "Qui contacter ?",
    a: 'infos@semaineindustrie.tg, ou le formulaire Contact du site.',
  },
]

/* Injecte le balisage FAQ pour les moteurs de recherche. */
function useFaqJsonLd() {
  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'faq-jsonld'
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    })
    document.head.appendChild(script)
    return () => {
      script.remove()
    }
  }, [])
}

/* Page À propos : questions fréquentes. */
export default function FaqPage() {
  useFaqJsonLd()

  return (
    <main className="py-16 sm:py-24">
      <Seo {...publicSeo('/faq')} />
      <div className={`${WRAP} max-w-2xl`}>
        <div className="animate-rise">
          <SectionHeader
            level={1}
            title="Questions fréquentes"
            lead="Les réponses courtes. Le détail de chaque journée est sur la page Programme."
          />
        </div>
        <div className="mt-10 divide-y divide-forest/10 border-y border-forest/10">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="cursor-pointer list-none text-[16px] font-semibold text-forest marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-start justify-between gap-4">
                  {item.q}
                  <span className="mt-1 text-[12px] font-medium text-ink/40 group-open:hidden" aria-hidden="true">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink/75">{item.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-[14px] text-ink/55">
          Site : {SITE_URL.replace('https://', '')}
        </p>
      </div>
    </main>
  )
}
