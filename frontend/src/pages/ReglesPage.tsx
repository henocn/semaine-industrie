import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { WRAP } from '../components/layout/Mark'
import { SectionHeader } from '../components/ui/SectionHeader'

/* Lien interne souligné. */
function PageLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="font-semibold text-forest underline underline-offset-2">
      {children}
    </Link>
  )
}

/* Les formulaires de la rubrique « Participer » : lequel choisir. */
const FORMS: { title: string; to: string; who: string }[] = [
  {
    title: 'Participation au Palais des Congrès',
    to: '/journees-au-palais/',
    who: 'Pour assister aux conférences et panels du lundi 16 au mercredi 18 novembre, au Palais des Congrès de Lomé.',
  },
  {
    title: 'Visites d’industries : particuliers',
    to: '/inscription-particulier/',
    who: 'Pour visiter des usines à titre personnel, du lundi 16 au vendredi 20 novembre.',
  },
  // Retiré du public (inscriptions des écoles closes).
  // {
  //   title: 'Visites d’industries : écoles / universités',
  //   to: '/inscription-groupe/',
  //   who: 'Pour inscrire un établissement et ses groupes d’apprenants aux visites d’usines. Une seule inscription par établissement.',
  // },
  {
    title: 'Accréditation médias et créateurs de contenu',
    to: '/accreditation-medias/',
    who: 'Pour les journalistes, photographes, vidéastes et créateurs de contenu qui couvrent la semaine. Une seule accréditation, valable du 16 au 22 novembre.',
  },
  {
    title: 'Demande de labels pour les industries',
    to: '/label/',
    who: 'Pour une industrie qui souhaite ouvrir son usine aux visiteurs.',
  },
]

/* Règles de participation : comment s'inscrire, sans confondre les formulaires. */
export default function ReglesPage() {
  return (
    <main className="py-16 sm:py-24">
      <Seo {...publicSeo('/regles-de-participation')} />
      <div className={`${WRAP} max-w-2xl space-y-8 text-[15px] leading-relaxed text-ink/80`}>
        <div className="animate-rise">
          <SectionHeader
            level={1}
            title="Règles de participation"
            lead="Chaque activité a son propre formulaire, dans la rubrique « Participer ». Choisissez celui qui correspond à ce que vous voulez faire."
          />
        </div>

        <ul className="border-t border-forest/15">
          {FORMS.map((form) => (
            <li key={form.to} className="border-b border-forest/15 py-4">
              <PageLink to={form.to}>{form.title}</PageLink>
              <p className="mt-1">{form.who}</p>
            </li>
          ))}
        </ul>

        <div className="space-y-3">
          <p>
            Pour faire deux activités, par exemple les conférences au Palais et une visite d’usine, remplissez les deux
            formulaires. Chaque inscription reçoit son propre code de suivi : les codes sont différents et ne se remplacent pas.
          </p>
          <p>
            Chaque inscription est validée par l’équipe d’organisation. Votre QR arrive ensuite par e-mail et sur WhatsApp.
          </p>
          <p>
            Si le site indique « déjà utilisé », vous êtes déjà inscrit à ce formulaire : retrouvez votre dossier dans{' '}
            <PageLink to="/mon-espace/">Mon espace</PageLink> avec votre code de suivi.
          </p>
          <p>
            Une question :{' '}
            <a href="mailto:infos@semaineindustrie.tg" className="font-semibold text-forest underline underline-offset-2">
              infos@semaineindustrie.tg
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  )
}
