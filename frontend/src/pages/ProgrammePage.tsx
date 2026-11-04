import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { DAYS, NATIONAL_THEME } from '../data'
import { Seo } from '../components/Seo'
import { WRAP } from '../components/layout/Mark'
import { publicSeo } from '../lib/seo'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/ui/SectionHeader'

/* Page programme : intro courte, jours en liste. */
export default function ProgrammePage() {
  const [open, setOpen] = useState<number | null>(20)

  return (
    <main className="bg-white pb-16 sm:pb-20">
      <Seo {...publicSeo('/programme')} />

      <section className="border-b border-forest/10 py-10 sm:py-14">
        <div className={WRAP}>
          <SectionHeader
            level={1}
            title="Le programme"
            lead={`Thème : « ${NATIONAL_THEME} ». Un thème par jour, au Palais des Congrès de Lomé.`}
          />
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Button to="/carte" variant="primary">
              Carte des sites
            </Button>
            <Button to="/#contact" variant="outline">
              Contact
            </Button>
          </div>
        </div>
      </section>

      <div className={`${WRAP} mt-8 sm:mt-10`}>
        <ul>
          {DAYS.map((d) => {
            const isOpen = open === d.n
            const canOpen = d.slots.length > 0
            const phare = Boolean(d.phare)

            return (
              <li
                key={d.n}
                id={phare ? 'vendredi' : undefined}
                className={phare ? 'border-b border-forest/15 border-l-2 border-l-sun' : 'border-b border-forest/15'}
              >
                <button
                  type="button"
                  disabled={!canOpen}
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : d.n)}
                  className="grid w-full grid-cols-[2.5rem_1fr_auto] items-start gap-x-3 gap-y-1 py-4 text-left md:grid-cols-[3.5rem_9rem_1fr_auto] md:gap-x-6"
                >
                  <span className="font-semibold tabular-nums text-forest">{d.n}</span>
                  <span className="font-medium text-forest">
                    {d.name}
                    <span className="mt-0.5 block text-[13px] font-normal text-ink/65">{d.theme}</span>
                  </span>
                  <span className="col-span-2 col-start-2 text-[14px] leading-relaxed text-ink/75 md:col-span-1 md:col-start-auto">
                    {d.goal}
                  </span>
                  {canOpen && (
                    <span className="row-start-1 col-start-3 text-forest md:col-start-4" aria-hidden="true">
                      {isOpen ? (
                        <Minus className="h-4 w-4" strokeWidth={1.75} />
                      ) : (
                        <Plus className="h-4 w-4" strokeWidth={1.75} />
                      )}
                    </span>
                  )}
                </button>

                <div className="fold" data-open={isOpen}>
                  <div>
                    <div className="pb-5 md:ml-[3.5rem] md:pl-6">
                      <p className="mb-3 text-[13px] text-ink/60">{d.where}</p>
                      <ol className="grid gap-3">
                        {d.slots.map(([h, t]) => (
                          <li key={h + t} className="grid grid-cols-[6rem_1fr] gap-3 text-[14px]">
                            <span className="font-medium tabular-nums text-forest">{h}</span>
                            <span className="leading-relaxed text-ink/80">{t}</span>
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
        <p className="mt-6 text-[14px] leading-relaxed text-ink/70">
          En marge du programme : atelier de validation de l’étude sur la gestion des déchets industriels,
          jeudi 19 novembre de 8h30 à 12h00, Hôtel Concorde.
        </p>
      </div>
    </main>
  )
}
