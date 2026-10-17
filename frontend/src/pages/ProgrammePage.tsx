import { useState } from 'react'
import { DAYS } from '../data'
import { Seo } from '../components/Seo'
import { WRAP } from '../components/layout/Mark'

/* Page dédiée au programme, journée phare mise en avant dans la liste. */
export default function ProgrammePage() {
  const [open, setOpen] = useState<number | null>(20)

  return (
    <main className="bg-sage py-16 sm:py-24">
      <Seo
        title="Programme"
        description="Programme officiel du 16 au 22 novembre 2026. Un thème par jour, journée phare le vendredi 20 novembre."
        path="/programme"
      />
      <div className={WRAP}>
        <div className="max-w-2xl">
          <h1 className="display text-4xl sm:text-5xl">Le programme</h1>
          <p className="mt-4 text-lg text-ink/70">
            Du 16 au 22 novembre 2026 · un thème par jour.
            Fil conducteur : « L’industrie à portée de main ».
          </p>
          <p className="mt-2 text-[15px] text-ink/50">
            Lieu principal à confirmer (Palais des congrès ou Hôtel Sarakawa).
          </p>
        </div>

        <ul className="mt-12 border-t border-forest/15">
          {DAYS.map((d) => {
            const isOpen = open === d.n
            const canOpen = d.slots.length > 0
            const phare = Boolean(d.phare)
            const c = (onPhare: string, onSage: string) => (phare ? onPhare : onSage)

            return (
              <li
                key={d.n}
                id={phare ? 'vendredi' : undefined}
                className={
                  phare
                    ? '-mx-4 mt-2 mb-2 rounded-sm bg-flag px-4 text-white shadow-md shadow-forest/20 sm:-mx-6 sm:px-6'
                    : 'border-b border-forest/15'
                }
              >
                <button
                  type="button"
                  disabled={!canOpen}
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : d.n)}
                  className={
                    'grid w-full grid-cols-[3rem_1fr_auto] items-baseline gap-x-4 gap-y-1 text-left sm:grid-cols-[5rem_13rem_1fr_auto] sm:gap-x-8 '
                    + (phare ? 'py-6' : 'py-4')
                  }
                >
                  <span className={'display text-2xl sm:text-3xl ' + c('!text-white', '')}>{d.n}</span>
                  <span className={'font-semibold ' + c('text-white', 'text-forest')}>
                    {d.name}
                    <span className={'block text-[15px] font-normal ' + c('text-white/80', 'text-ink/60')}>
                      {d.theme}
                    </span>
                    {phare && (
                      <span className="mt-2 inline-block border border-sun/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-sun">
                        Journée phare
                      </span>
                    )}
                  </span>
                  <span className={'col-span-2 col-start-2 sm:col-span-1 sm:col-start-auto ' + c('text-white/90', 'text-ink/75')}>
                    {d.goal}
                  </span>
                  {canOpen && (
                    <span
                      className={
                        'row-start-1 col-start-3 text-2xl font-light transition-transform duration-300 sm:col-start-4 '
                        + c('text-white', 'text-forest')
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
                    <div className={'pb-6 lg:ml-[23rem] ' + (phare ? 'pb-8' : '')}>
                      <p className={'mb-3 text-[15px] ' + c('text-white/75', 'text-ink/55')}>{d.where}</p>
                      <table className="w-full text-[15px]">
                        <tbody>
                          {d.slots.map(([h, t]) => (
                            <tr key={h + t} className={'border-t ' + c('border-white/20', 'border-forest/10')}>
                              <td className={'w-20 py-2.5 align-top font-semibold ' + c('text-sun', 'text-forest')}>{h}</td>
                              <td className={'py-2.5 ' + c('text-white/90', 'text-ink/80')}>{t}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </main>
  )
}
