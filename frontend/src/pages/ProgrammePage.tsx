import { useState } from 'react'
import { CalendarDays, MapPin, Minus, Plus } from 'lucide-react'
import { DAYS } from '../data'
import { Seo } from '../components/Seo'
import { CAMPAIGN_TAGLINE, WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/ui/SectionHeader'

/* Page programme : hero forest, cartouche infos, jours en liste institutionnelle. */
export default function ProgrammePage() {
  const [open, setOpen] = useState<number | null>(20)

  return (
    <main className="bg-white pb-20 sm:pb-28">
      <Seo
        title="Programme"
        description="Programme officiel du 16 au 22 novembre 2026. Un thème par jour, journée phare le vendredi 20 novembre."
        path="/programme"
      />

      <section className="bg-forest text-white">
        <div className={`${WRAP} animate-rise py-14 sm:py-20`}>
          <SectionHeader
            level={1}
            eyebrow="16 au 22 novembre 2026"
            title="Le programme"
            lead={`Un thème par jour. Fil conducteur : « ${CAMPAIGN_TAGLINE.replace(/\.$/, '')} ».`}
            tone="dark"
          />
          <dl className="cartouche mt-10 grid gap-5 text-forest sm:grid-cols-2">
            <div className="flex gap-3">
              <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-energy" strokeWidth={1.75} aria-hidden="true" />
              <div>
                <dt className="text-[13px] font-semibold uppercase tracking-wide text-muted">Dates</dt>
                <dd className="mt-1 text-[15px]">Du 16 au 22 novembre 2026</dd>
              </div>
            </div>
            <div className="flex gap-3 sm:border-l sm:border-forest/15 sm:pl-6">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-energy" strokeWidth={1.75} aria-hidden="true" />
              <div>
                <dt className="text-[13px] font-semibold uppercase tracking-wide text-muted">Lieu principal</dt>
                <dd className="mt-1 text-[15px]">Palais des congrès ou Hôtel Sarakawa (à confirmer)</dd>
              </div>
            </div>
          </dl>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button to="/carte" variant="accent">
              Voir la carte des sites
            </Button>
            <Button to="/#contact" variant="onDark">
              Contacter l’équipe
            </Button>
          </div>
        </div>
      </section>

      <div className={`${WRAP} mt-10 sm:mt-14`}>
        <ul className="grid gap-0">
          {DAYS.map((d) => {
            const isOpen = open === d.n
            const canOpen = d.slots.length > 0
            const phare = Boolean(d.phare)

            return (
              <li
                key={d.n}
                id={phare ? 'vendredi' : undefined}
                className={
                  phare
                    ? 'border-b border-line border-l-4 border-l-sun bg-white'
                    : 'border-b border-line'
                }
              >
                <button
                  type="button"
                  disabled={!canOpen}
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : d.n)}
                  className="grid w-full grid-cols-[3rem_1fr_auto] items-start gap-x-4 gap-y-2 py-5 text-left md:grid-cols-[4.5rem_11rem_1fr_auto] md:gap-x-8"
                >
                  <span className="text-2xl font-semibold tabular-nums text-forest">{d.n}</span>
                  <span className="font-semibold text-forest">
                    {d.name}
                    <span className="mt-0.5 block text-[14px] font-normal text-ink/75">{d.theme}</span>
                    {phare && (
                      <span className="mt-2 inline-block bg-sun px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-forest">
                        Journée phare
                      </span>
                    )}
                  </span>
                  <span className="col-span-2 col-start-2 text-[15px] leading-relaxed text-ink/80 md:col-span-1 md:col-start-auto">
                    {d.goal}
                  </span>
                  {canOpen && (
                    <span className="row-start-1 col-start-3 text-forest md:col-start-4" aria-hidden="true">
                      {isOpen ? (
                        <Minus className="h-5 w-5" strokeWidth={1.75} />
                      ) : (
                        <Plus className="h-5 w-5" strokeWidth={1.75} />
                      )}
                    </span>
                  )}
                </button>

                <div className="fold" data-open={isOpen}>
                  <div>
                    <div className="pb-8 md:ml-[4.5rem] md:pl-8">
                      <p className="mb-5 text-[14px] text-ink/70">{d.where}</p>
                      <ol className="grid gap-4">
                        {d.slots.map(([h, t]) => (
                          <li key={h + t} className="grid grid-cols-[4rem_1fr] gap-4 border-t border-forest/10 pt-4 first:border-t-0 first:pt-0">
                            <p className="text-sm font-semibold tabular-nums text-forest">{h}</p>
                            <p className="text-[15px] leading-relaxed text-ink/85">{t}</p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-line pt-8">
          <p className="mr-2 text-[15px] text-ink/80">Préparez votre parcours :</p>
          <Button to="/carte">Ouvrir la carte</Button>
          <Button to="/#contact" variant="outline">
            Nous écrire
          </Button>
        </div>
      </div>
    </main>
  )
}
