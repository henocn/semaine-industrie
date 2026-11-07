import { useEffect } from 'react'
import { Seo } from '../components/Seo'
import { WRAP } from '../components/layout/Mark'
import { SectionHeader } from '../components/ui/SectionHeader'
import { SITE_URL, publicSeo } from '../lib/seo'

const FAQ = [
  {
    q: 'Qu’est-ce que la Semaine de l’industrie ?',
    a: 'La Semaine de l’industrie est un événement qui vous permet de découvrir les entreprises, les métiers, les produits et les innovations de l’industrie togolaise. Elle réunit pendant une semaine les professionnels du secteur et le grand public autour de différentes activités.',
  },
  {
    q: 'Quand et où se déroule la Semaine de l’industrie 2026 ?',
    a: 'La Semaine de l’industrie se déroule du 16 au 22 novembre 2026. Les rendez-vous au Palais des Congrès de Lomé ont lieu du lundi 16 au mercredi 18 novembre, et les visites d’usines du lundi 16 au vendredi 20 novembre, directement dans les entreprises.',
  },
  {
    q: 'Qui peut participer à la Semaine de l’industrie ?',
    a: 'La Semaine de l’industrie est ouverte à tous. Que vous soyez élève, étudiant, enseignant, salarié, entrepreneur, industriel, investisseur ou simplement curieux de découvrir l’industrie togolaise, cette semaine s’adresse à vous.',
  },
  {
    q: 'Quelles activités sont prévues pendant la Semaine de l’industrie ?',
    a: 'Au programme : une cérémonie d’ouverture avec keynote et panel, un forum d’orientation des métiers, un panel sur les femmes dans l’industrie, l’exposition « Fabriqué au Togo », le parcours des métiers, des visites d’usines toute la semaine et un concours vidéo pour les élèves et les étudiants.',
  },
  {
    q: 'Les visites d’usines sont-elles ouvertes au public ?',
    a: 'Oui ! Les industries labellisées « Usine ouverte » accueillent les écoles et les particuliers du lundi 16 au vendredi 20 novembre 2026, par petits groupes et sur plusieurs créneaux.\nPour vous inscrire et connaître les modalités de participation, rendez-vous dans la rubrique « Participer » du site.',
  },
  {
    q: 'Qu’est-ce que le Forum d’orientation des métiers de l’industrie ?',
    a: 'Le Forum d’orientation des métiers est un espace de rencontre entre les jeunes, les établissements de formation et les professionnels qui travaillent dans l’industrie. Il vous permet de découvrir les métiers du secteur, les formations pour y accéder et les opportunités professionnelles.\nIl se tient le mardi 17 novembre 2026, de 14 h à 16 h, au Palais des Congrès de Lomé.',
  },
  {
    q: 'Quand se tient l’exposition « Fabriqué au Togo » et est-elle ouverte au public ?',
    a: 'L’exposition « Fabriqué au Togo » se tient du lundi 16 au mercredi 18 novembre 2026, au 1er étage du Palais des Congrès de Lomé.\nOui, elle est ouverte au public ! 19 industries togolaises y présentent leurs produits et leur savoir-faire.\nElle est lancée par le Ministre le lundi 16 novembre, à l’issue de la cérémonie d’ouverture.',
  },
  {
    q: 'Comment participer au concours vidéo ?',
    a: 'Le concours est ouvert aux élèves et aux étudiants. Filmez votre visite d’usine et publiez votre vidéo sur les réseaux sociaux avec le hashtag #SemaineIndustrieTogo2026.\nLa meilleure vidéo sur la semaine remporte 200 000 FCFA.',
  },
  {
    q: 'Comment s’inscrire à la Semaine de l’industrie en tant que particulier, école ou université ?',
    a: 'Rendez-vous dans la rubrique « Participer » du site et choisissez le type d’inscription qui vous correspond :\n• « En tant que particulier » pour une inscription individuelle.\n• « En tant qu’école / université » pour inscrire un groupe.\nAprès validation de votre inscription, un QR code vous est remis pour le jour de votre participation.',
  },
  {
    q: 'Comment demander un label et suivre l’évolution de sa demande ?',
    a: 'Pour demander un label, rendez-vous dans la rubrique « Participer », puis sélectionnez « Demande de label : industries ».\nDès l’envoi de votre demande, un code de suivi vous est remis. Ce code vous permet de suivre votre dossier depuis la rubrique « Mon espace » du site ou sur WhatsApp, en sélectionnant « Suivi de participation ».',
  },
  {
    q: 'Où consulter le programme complet et obtenir des informations complémentaires ?',
    a: 'Le programme détaillé de la Semaine de l’industrie est disponible dans la rubrique « Programme » du site.\nPour toute autre question ou information complémentaire, vous pouvez utiliser la rubrique « Contact » ou écrire à infos@semaineindustrie.tg.',
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
              <p className="mt-2 max-w-xl whitespace-pre-line text-[15px] leading-relaxed text-ink/75">{item.a}</p>
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
