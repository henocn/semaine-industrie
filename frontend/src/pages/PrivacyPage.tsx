import type { ReactNode } from 'react'
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

/* Rubrique de la politique. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-forest">{title}</h2>
      {children}
    </section>
  )
}

/* Liste à puces de la politique. */
function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item, index) => <li key={index}>{item}</li>)}
    </ul>
  )
}

/* Politique de confidentialité et de cookies. */
export default function PrivacyPage() {
  return (
    <main className="py-16 sm:py-24">
      <Seo {...publicSeo('/confidentialite')} />
      <div className={`${WRAP} max-w-2xl space-y-10 text-[15px] leading-relaxed text-ink/80`}>
        <div className="animate-rise">
          <SectionHeader level={1} title="Politique de confidentialité" />
          <p className="mt-3 text-[14px] text-ink/60">Dernière mise à jour : 5 novembre 2026</p>
          <p className="mt-4">
            Cette politique explique quelles données personnelles sont collectées sur semaineindustrie.tg
            et par le bot WhatsApp de la Semaine de l&apos;industrie 2026, à quoi elles servent, qui y a
            accès et comment exercer vos droits, notamment pour demander leur suppression.
          </p>
        </div>

        <Section title="1. Responsable du traitement">
          <p>
            Les données sont traitées pour le compte du Ministère délégué, chargé de la Promotion des
            investissements, de l&apos;Industrie et de la Souveraineté économique, porteur de la Semaine
            de l&apos;industrie 2026.
          </p>
          <p>Pour toute question : <ContactLink />.</p>
        </Section>

        <Section title="2. Données collectées">
          <Bullets
            items={[
              <><strong>Inscription d&apos;une école ou d&apos;une université :</strong> nom de l&apos;établissement, e-mail, téléphone, position sur la carte, effectif souhaité, spécialités ou filières. Aucun nom d&apos;élève n&apos;est demandé.</>,
              <><strong>Inscription d&apos;un particulier :</strong> nom et prénom, e-mail, téléphone, ville et quartier, et note éventuelle.</>,
              <><strong>Demande de label d&apos;une industrie :</strong> nom et secteur de la structure, position sur la carte, photos, e-mail, téléphone, capacité d&apos;accueil, produits, description et règles de sécurité.</>,
              <><strong>Rencontres d&apos;affaires :</strong> profil, nom, e-mail, téléphone, secteur d&apos;activité et notes.</>,
              <><strong>Formulaire de contact :</strong> nom, e-mail et message, transmis par e-mail à l&apos;équipe d&apos;organisation.</>,
              <><strong>Bot WhatsApp :</strong> numéro de téléphone, contenu des messages échangés avec le bot, date et heure.</>,
              <><strong>Visites et passages :</strong> sites visités ou accueillis, créneaux, date et heure des passages enregistrés.</>,
              <><strong>Sondages, votes et jeux :</strong> vos réponses et, pour les votes, un identifiant aléatoire qui empêche de voter deux fois. Un sondage peut être rattaché à votre code de suivi si vous le renseignez.</>,
              <><strong>Données techniques :</strong> adresses demandées, date, résultat de la requête et, selon la configuration du serveur, adresse IP.</>,
            ]}
          />
        </Section>

        <Section title="3. À quoi servent ces données">
          <Bullets
            items={[
              'Enregistrer et examiner votre inscription ou votre demande de label.',
              'Vous attribuer un code de suivi et vous permettre de consulter votre dossier dans Mon espace.',
              'Vous informer par e-mail et sur WhatsApp : réception, décision, visites, rendez-vous et rappels.',
              'Organiser les visites et les rencontres d’affaires, et enregistrer les passages sur les sites.',
              'Affecter à chaque particulier une école de départ.',
              'Publier la fiche des industries labellisées et la carte des visites.',
              'Répondre à vos questions, y compris par le bot WhatsApp, et assurer le suivi de vos échanges.',
              'Établir des bilans de l’événement, assurer la sécurité du site et corriger les anomalies.',
            ]}
          />
          <p>
            Vos données ne servent ni à la publicité ni à des décisions entièrement automatisées. Elles
            ne sont pas vendues.
          </p>
        </Section>

        <Section title="4. Fondement du traitement">
          <p>
            Ces traitements reposent sur votre demande d&apos;inscription ou de contact, sur votre accord
            lorsqu&apos;il est recueilli dans un formulaire, et sur l&apos;organisation de cet événement
            public. Ils s&apos;inscrivent dans le cadre de la loi togolaise n° 2019-014 du 29 octobre 2019
            relative à la protection des données à caractère personnel.
          </p>
        </Section>

        <Section title="5. Qui peut voir vos données">
          <Bullets
            items={[
              <><strong>L&apos;équipe d&apos;organisation :</strong> les comptes autorisés du backoffice accèdent aux dossiers. Les conversations du bot sont réservées aux comptes administrateurs.</>,
              <><strong>Le public :</strong> la fiche d&apos;une industrie labellisée (nom, secteur, lieu, description, produits et photos) est publique, sans son e-mail ni son téléphone. La carte des visites affiche le nom des établissements, leur effectif et leur créneau.</>,
              <><strong>Les industries visitées :</strong> elles voient le nom et l&apos;effectif des groupes attendus ou reçus. Les particuliers y restent anonymes.</>,
              <><strong>Nos prestataires techniques :</strong> Meta pour WhatsApp, SiteGround pour l&apos;envoi des e-mails, OpenStreetMap pour l&apos;affichage des cartes et Google Fonts pour les polices du site. Ces deux derniers reçoivent l&apos;adresse IP de votre appareil lorsqu&apos;ils affichent une carte ou une police.</>,
            ]}
          />
          <p>
            Certains de ces prestataires sont situés hors du Togo : vos données peuvent donc être
            transférées à l&apos;étranger pour assurer ces services.
          </p>
        </Section>

        <Section title="6. Sécurité et code de suivi">
          <p>
            Les échanges avec le site sont chiffrés et l&apos;accès au backoffice est réservé aux comptes
            autorisés. Aucune mesure n&apos;offre toutefois une sécurité absolue.
          </p>
          <p>
            Votre code de suivi donne accès à votre dossier dans Mon espace : gardez-le pour vous. Votre
            e-mail et votre téléphone y sont masqués.
          </p>
        </Section>

        <Section title="7. Vos droits">
          <p>Vous pouvez à tout moment demander :</p>
          <Bullets
            items={[
              'à être informé des traitements qui vous concernent et à accéder à vos données ;',
              'à faire corriger des données inexactes ;',
              'à faire supprimer vos données ;',
              'à vous opposer à un traitement, par exemple aux messages de suivi.',
            ]}
          />
        </Section>

        <Section title="8. Demander la suppression de vos données">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Écrivez à <ContactLink /> avec pour objet « Données personnelles », si possible depuis l&apos;adresse utilisée à l&apos;inscription.</li>
            <li>Indiquez votre demande, votre nom et votre code de suivi, ou à défaut le numéro ou l&apos;e-mail du dossier.</li>
            <li>Nous pouvons vous demander de confirmer votre identité, pour éviter qu&apos;un tiers supprime votre dossier.</li>
            <li>Nous vous répondons au plus tard dans un délai d&apos;un mois.</li>
          </ol>
          <p>
            La suppression met fin à votre participation : votre dossier, votre code de suivi et votre QR
            ne seront plus utilisables. Nous ne conservons que ce qu&apos;une obligation légale impose de
            garder, et nous vous l&apos;indiquons le cas échéant.
          </p>
          <p>
            Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir l&apos;Instance de
            Protection des Données à Caractère Personnel (IPDCP) du Togo.
          </p>
        </Section>

        <Section title="9. Cookies et stockage dans le navigateur">
          <p>
            Le site n&apos;utilise ni cookie publicitaire ni outil de mesure d&apos;audience. Il garde
            seulement dans votre navigateur les éléments nécessaires à son fonctionnement :
          </p>
          <Bullets
            items={[
              'votre choix concernant cet avis ;',
              'l’identifiant aléatoire de vote ;',
              'la session de connexion des comptes de l’équipe ;',
              'le code saisi par une industrie pour valider les passages.',
            ]}
          />
          <p>Vous pouvez les effacer à tout moment dans les réglages de votre navigateur.</p>
        </Section>

        <Section title="10. Modification de cette politique">
          <p>
            Cette politique peut évoluer avec le site. La date de mise à jour en haut de cette page
            indique sa dernière version.
          </p>
        </Section>
      </div>
    </main>
  )
}
