import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/ui/SectionHeader'
// Tableau des points et horaires par jour : remplacé par les informations ci-dessous. Données conservées dans data.ts.
// import { DEPARTURE_POINTS, VISIT_DAYS } from '../data'

/* Lieux de départ des particuliers (mêmes lieux que la page /visites). */
const PARTICULIER_PLACES = ['Lycée d’Agoé', 'Palais des Congrès de Lomé']

/* Points de départ des visites : écoles pour les élèves, deux lieux pour les particuliers le jeudi et le vendredi. */
export default function DeparturePointsPage() {
  return (
    <main className="py-16 sm:py-24">
      <Seo {...publicSeo('/points-de-depart')} />
      <div className={`${WRAP} max-w-2xl`}>
        <SectionHeader
          level={1}
          title="Points de départ des visites"
          lead="Présentez-vous au point de départ un peu avant l’heure prévue, avec votre QR de participation : il est scanné au départ."
        />

        <section className="mt-8 border-t border-forest/15 pt-6">
          <h2 className="text-[17px] font-semibold text-forest">Élèves et étudiants</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink/80">
            Les départs se font principalement depuis les écoles et les établissements inscrits. Chaque établissement est prévenu de l’heure de départ de ses groupes.
          </p>
        </section>

        <section className="mt-8 border-t border-forest/15 pt-6">
          <h2 className="text-[17px] font-semibold text-forest">Particuliers</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink/80">
            Les visites des particuliers ont lieu le <strong>jeudi 19</strong> et le <strong>vendredi 20 novembre</strong>, le matin ou l’après-midi, au départ de deux lieux :
          </p>
          <ul className="mt-3 space-y-1.5 text-[15px] text-ink/80">
            {PARTICULIER_PLACES.map((place) => (
              <li key={place} className="flex gap-2">
                <span aria-hidden="true" className="text-forest">•</span>
                <span className="font-semibold text-forest">{place}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[15px] leading-relaxed text-ink/80">
            Inscription validée ? Choisissez votre jour et votre lieu de départ avec votre code de suivi. Les heures précises sont communiquées dans le groupe WhatsApp des visites.
          </p>
          <div className="mt-5">
            <Button to="/visites/">Choisir mon créneau</Button>
          </div>
        </section>
      </div>
    </main>
  )
}
