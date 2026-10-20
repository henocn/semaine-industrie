import { useState } from 'react'
import { DAYS } from '../data'
import { Seo } from '../components/Seo'
import { CAMPAIGN_TAGLINE, WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/ui/SectionHeader'

/* Page dédiée au programme : hero clair, jours en liste, jour phare mis en avant, timeline des créneaux. */
export default function ProgrammePage() {
  const [open, setOpen] = useState<number | null>(20)

  return (
    <main className="bg-white pb-20 sm:pb-28">
      <Seo
        title="Programme"
        description="Programme officiel du 16 au 22 novembre 2026. Un thème par jour, journée phare le vendredi 20 novembre."
        path="/programme"
      />

      <section className="border-b border-line bg-white py-14 sm:py-20">
        <div className={`${WRAP} animate-rise`}>
          <SectionHeader
            level={1}
            eyebrow="16 au 22 novembre 2026"
            title="Le programme"
            lead={
              <>
                Un thème par jour. Fil conducteur : « {CAMPAIGN_TAGLINE.replace(/\.$/, '')} ».
                <span className="mt-2 block text-[15px] text-ink/70">
                  Lieu principal à confirmer (Palais des congrès ou Hôtel Sarakawa).
                </span>
              </>
            }
          />
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button to="/carte">Voir la carte des sites</Button>
            <Button to="/#contact" variant="link">
              Une question ? Contactez l’équipe
            </Button>
          </div>
        </div>
      </section>

      <div className={`${WRAP} mt-10 sm:mt-14`}>
        <ul className="grid gap-4">
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
                    ? 'rounded-sm border-2 border-sun bg-sage px-4 sm:px-6'
                    : 'border-b border-line px-0'
                }
              >
                <button
                  type="button"
                  disabled={!canOpen}
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : d.n)}
                  className={
                    'grid w-full grid-cols-[3rem_1fr_auto] items-baseline gap-x-4 gap-y-1 text-left sm:grid-cols-[5rem_13rem_1fr_auto] sm:gap-x-8 '
                    + (phare ? 'py-6' : 'py-5')
                  }
                >
                  <span className="display text-3xl sm:text-4xl">{d.n}</span>
                  <span className="font-semibold text-forest">
                    {d.name}
                    <span className="block text-[15px] font-normal text-ink/75">{d.theme}</span>
                    {phare && (
                      <span className="mt-2 inline-block bg-sun px-3 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-forest">
                        Journée phare
                      </span>
                    )}
                  </span>
                  <span className="col-span-2 col-start-2 text-ink/80 sm:col-span-1 sm:col-start-auto">
                    {d.goal}
                  </span>
                  {canOpen && (
                    <span
                      className={
                        'row-start-1 col-start-3 text-2xl font-light text-forest transition-transform duration-300 sm:col-start-4'
                        + (isOpen ? ' rotate-45' : '')
                      }
                      aria-hidden="true"
                    >
                      +
                    </span>
                  )}
                </button>

                <div className="fold" data-open={isOpen}>
                  <div>
                    <div className="pb-8 sm:ml-[5rem] sm:pl-8 lg:ml-[7rem]">
                      <p className="mb-5 text-[15px] text-ink/70">{d.where}</p>
                      <ol className="relative ml-2 border-l-2 border-forest/25">
                        {d.slots.map(([h, t]) => (
                          <li key={h + t} className="relative pb-5 pl-6 last:pb-0">
                            <span
                              aria-hidden="true"
                              className={
                                'absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-forest '
                                + (phare ? 'bg-sun' : 'bg-white')
                              }
                            />
                            <p className="text-sm font-bold tabular-nums text-forest">{h}</p>
                            <p className="mt-0.5 text-[15px] leading-relaxed text-ink/85">{t}</p>
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
          <p className="mr-2 text-ink/80">Préparez votre parcours :</p>
          <Button to="/carte">Ouvrir la carte</Button>
          <Button to="/#contact" variant="accent">
            Nous écrire
          </Button>
        </div>
      </div>
    </main>
  )
}
