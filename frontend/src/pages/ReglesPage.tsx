import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { WRAP } from '../components/layout/Mark'
import { SectionHeader } from '../components/ui/SectionHeader'

const CONTACT_EMAIL = 'infos@semaineindustrie.tg'

/* Lien vers l'adresse de contact. */
function ContactLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-forest underline underline-offset-2">
      {CONTACT_EMAIL}
    </a>
  )
}

/* Lien interne souligné. */
function PageLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="font-semibold text-forest underline underline-offset-2">
      {children}
    </Link>
  )
}

/* Rubrique des règles. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-forest">{title}</h2>
      {children}
    </section>
  )
}

/* Liste à puces. */
function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item, index) => <li key={index}>{item}</li>)}
    </ul>
  )
}

/* Règles de participation à la Semaine de l'industrie 2026. */
export default function ReglesPage() {
  return (
    <main className="py-16 sm:py-24">
      <Seo {...publicSeo('/regles-de-participation')} />
      <div className={`${WRAP} max-w-2xl space-y-10 text-[15px] leading-relaxed text-ink/80`}>
        <div className="animate-rise">
          <SectionHeader level={1} title="Règles de participation" />
          <p className="mt-3 text-[14px] text-ink/60">Dernière mise à jour : 9 novembre 2026</p>
          <p className="mt-4">
            Ces règles expliquent comment s’inscrire à la Semaine de l’industrie 2026, comment fonctionnent
            les codes de suivi et les QR, et ce qui est attendu de chacun pendant les conférences au Palais des
            Congrès de Lomé et les visites d’industries.
          </p>
        </div>

        <Section title="1. Les inscriptions">
          <p>Toutes les inscriptions se font en ligne, sans compte, dans la rubrique « Participer » :</p>
          <Bullets
            items={[
              <><strong>Participation au Palais des Congrès :</strong> conférences et panels du lundi 16 au mercredi 18 novembre. <PageLink to="/journees-au-palais/">S’inscrire</PageLink></>,
              <><strong>Visites d’industries, particuliers :</strong> visites d’usines du lundi 16 au vendredi 20 novembre. <PageLink to="/inscription-particulier/">S’inscrire</PageLink></>,
              <><strong>Visites d’industries, écoles / universités :</strong> visites de groupes d’apprenants. <PageLink to="/inscription-groupe/">Inscrire un établissement</PageLink></>,
              <><strong>Demande de labels pour les industries :</strong> pour ouvrir son usine aux visiteurs. <PageLink to="/label/">Déposer une demande</PageLink></>,
            ]}
          />
          <p>
            Chaque inscription est examinée par l’équipe d’organisation. Elle peut être acceptée, placée en
            liste d’attente ou refusée, notamment selon les places disponibles. La réponse est envoyée par
            e-mail et sur WhatsApp.
          </p>
          <p>Les informations données doivent être exactes : un nom, un numéro ou une adresse erronés peuvent empêcher l’envoi du QR.</p>
        </Section>

        <Section title="2. Code de suivi et QR">
          <Bullets
            items={[
              'Un code de suivi est donné dès l’envoi de chaque inscription. Il permet de suivre son dossier dans Mon espace ou sur WhatsApp.',
              'Chaque inscription a son propre code : celui des conférences au Palais des Congrès est différent de celui des visites d’industries ou des rencontres d’affaires.',
              'Après validation, un QR est envoyé par e-mail et sur WhatsApp. Il est personnel, ou valable pour le groupe dans le cas d’une école.',
              'Le code et le QR donnent accès au dossier : gardez-les pour vous et ne les partagez pas.',
            ]}
          />
          <p>Retrouvez votre dossier à tout moment dans <PageLink to="/mon-espace/">Mon espace</PageLink>.</p>
        </Section>

        <Section title="3. Une inscription par personne et par formulaire">
          <p>
            Un même e-mail ou un même numéro de téléphone ne peut servir qu’une seule fois dans chaque formulaire.
            Une même personne peut en revanche s’inscrire à la fois aux conférences du Palais des Congrès et aux
            visites d’industries.
          </p>
          <p>
            Si le site indique « déjà utilisé », votre dossier existe déjà : retrouvez-le dans Mon espace avec
            votre code de suivi plutôt que de vous inscrire à nouveau.
          </p>
        </Section>

        <Section title="4. Conférences et panels au Palais des Congrès">
          <Bullets
            items={[
              'Cochez une ou plusieurs journées : l’ouverture le lundi 16, le forum des métiers le mardi 17, les femmes dans l’industrie le mercredi 18 novembre.',
              'Les places sont limitées. L’accès n’est garanti qu’aux journées cochées et validées.',
              'Présentez votre QR à l’accueil du Palais à chaque journée : l’équipe d’accueil vérifie que vous êtes inscrit pour ce jour-là et enregistre votre entrée.',
              'Arrivez en avance : l’accueil et l’installation précèdent le début des sessions.',
            ]}
          />
        </Section>

        <Section title="5. Visites d’industries">
          <Bullets
            items={[
              'Les visites ont lieu du lundi 16 au vendredi 20 novembre, dans les industries labellisées « Usine ouverte », par petits groupes et sur créneaux.',
              'Particuliers : les places sont limitées. Au-delà, l’inscription reste possible en liste d’attente et vous êtes prévenu dès qu’une place se libère.',
              'Particuliers : indiquez une ville et un quartier précis, qui servent à vous affecter une école de départ vers les visites.',
              'Écoles, centres de formation et universités : une seule inscription par établissement, qui regroupe ses filières ou ses groupes. L’effectif est confirmé par l’organisation selon les places disponibles.',
              'Présentez votre QR à l’entrée du site visité.',
            ]}
          />
        </Section>

        <Section title="6. Pendant les visites">
          <Bullets
            items={[
              'Respectez l’horaire du créneau attribué.',
              'Suivez les consignes de sécurité de l’industrie et les indications des personnes qui vous accueillent, notamment sur les équipements de protection et les zones accessibles.',
              'Restez avec votre groupe pendant toute la visite.',
              'Les élèves et étudiants restent sous la responsabilité de leurs accompagnateurs.',
              'Les prises de vue se font uniquement là où l’industrie les autorise.',
            ]}
          />
        </Section>

        <Section title="7. Concours vidéo">
          <p>
            Le concours est ouvert aux élèves et aux étudiants. Filmez votre visite, dans le respect des consignes
            de l’industrie, et publiez votre vidéo sur les réseaux sociaux avec #SemaineIndustrieTogo2026. La
            meilleure vidéo gagne 200 000 FCFA.
          </p>
        </Section>

        <Section title="8. Données personnelles">
          <p>
            Les données collectées servent uniquement à organiser votre participation. Le détail, et la façon de
            demander leur suppression, figurent dans la <PageLink to="/confidentialite/">politique de confidentialité</PageLink>.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>Pour toute question, ou pour annuler ou modifier une inscription, écrivez à <ContactLink /> en indiquant votre code de suivi.</p>
        </Section>
      </div>
    </main>
  )
}
