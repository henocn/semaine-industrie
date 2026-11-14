import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/ui/SectionHeader'

/* Formulaire fermé : l'ancienne adresse affiche « Inscriptions clôturées » au lieu d'une 404. */
export default function ClosedFormPage({ path, subject }: { path: string; subject: string }) {
  return (
    <main className="py-16 sm:py-24">
      <Seo {...publicSeo(path)} />
      <div className={`${WRAP} max-w-2xl`}>
        <SectionHeader level={1} title="Inscriptions clôturées" lead={`${subject} sont closes.`} />
        <p className="mt-6 border-t border-forest/15 pt-6 text-[15px] leading-relaxed text-ink/75">
          Déjà inscrit ? Retrouvez votre dossier dans Mon espace avec votre code de suivi.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Button to="/mon-espace/">Mon espace</Button>
          <Button to="/regles-de-participation/" variant="outline">
            Inscriptions ouvertes
          </Button>
        </div>
      </div>
    </main>
  )
}
