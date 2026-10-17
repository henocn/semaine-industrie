import { Link } from 'react-router-dom'
import { WRAP } from '../components/layout/Mark'

/* Page publique : les visites sont arrangées par l'organisation. */
export default function BookingPage() {
  return (
    <main className="py-16 sm:py-24">
      <div className={`${WRAP} max-w-xl`}>
        <h1 className="display text-4xl sm:text-5xl">Visites d’usines</h1>
        <p className="mt-6 text-lg leading-relaxed text-ink/70">
          Les créneaux de visite sont organisés par l’équipe de la Semaine de l’industrie avec les
          établissements et les sites labellisés.
        </p>
        <p className="mt-4 text-[15px] text-ink/55">
          Établissements : faites d’abord votre demande de label. L’organisation vous recontactera
          pour fixer le créneau.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link to="/label" className="bg-forest px-8 py-4 text-[15px] font-semibold text-white hover:bg-ink">
            Demander le label
          </Link>
          <a
            href="#contact"
            className="border border-forest px-8 py-4 text-[15px] font-semibold text-forest hover:bg-forest hover:text-white"
          >
            Contacter l’organisation
          </a>
        </div>
      </div>
    </main>
  )
}
