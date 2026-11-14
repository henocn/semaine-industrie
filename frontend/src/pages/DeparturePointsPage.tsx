import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { WRAP } from '../components/layout/Mark'
import { SectionHeader } from '../components/ui/SectionHeader'
import { DEPARTURE_POINTS, VISIT_DAYS } from '../data'

/* Points de départ des visites : un point par ligne, l'heure de départ par jour. */
export default function DeparturePointsPage() {
  return (
    <main className="py-16 sm:py-24">
      <Seo {...publicSeo('/points-de-depart')} />
      <div className={`${WRAP} max-w-4xl`}>
        <SectionHeader
          level={1}
          title="Points de départ des visites"
          lead="Présentez-vous au point de départ un peu avant l’heure indiquée, avec votre QR de participation."
        />

        {DEPARTURE_POINTS.length === 0 ? (
          <p className="mt-8 border-t border-forest/15 pt-6 text-[15px] text-ink/70">
            Les points de départ et leurs horaires seront publiés ici avant le début des visites.
          </p>
        ) : (
          <div className="mt-8 overflow-x-auto border border-forest/15">
            <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
              <thead>
                <tr className="border-b border-forest/15 bg-sage/60 text-[13px] text-forest">
                  <th scope="col" className="sticky left-0 bg-sage px-4 py-3 font-semibold">Point de départ</th>
                  {VISIT_DAYS.map((d) => (
                    <th key={d.n} scope="col" className="whitespace-nowrap px-3 py-3 text-center font-semibold">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DEPARTURE_POINTS.map((row) => (
                  <tr key={row.point} className="border-b border-forest/10 last:border-b-0">
                    <th scope="row" className="sticky left-0 bg-white px-4 py-3 font-normal">
                      <span className="block font-semibold text-forest">{row.point}</span>
                      {row.place && <span className="block text-[13px] text-ink/60">{row.place}</span>}
                    </th>
                    {VISIT_DAYS.map((d) => (
                      <td key={d.n} className="whitespace-nowrap px-3 py-3 text-center tabular-nums">
                        {row.times[d.n] ? (
                          <span className="font-semibold text-forest">{row.times[d.n]}</span>
                        ) : (
                          <span className="text-ink/30" aria-label="Pas de départ">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-6 text-[14px] text-ink/60">
          Visites du lundi 16 au vendredi 20 novembre 2026. « — » : pas de départ ce jour-là.
        </p>
      </div>
    </main>
  )
}
