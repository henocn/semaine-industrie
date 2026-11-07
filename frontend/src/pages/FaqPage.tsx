import { Seo } from '../components/Seo'
import { WRAP } from '../components/layout/Mark'
import { SectionHeader } from '../components/ui/SectionHeader'
import { SITE_URL, publicSeo } from '../lib/seo'
import { FAQ } from '../data'

/* Page À propos : questions fréquentes. */
export default function FaqPage() {
  return (
    <main className="py-16 sm:py-24">
      <Seo {...publicSeo('/faq')} />
      <div className={`${WRAP} max-w-2xl`}>
        <div className="animate-rise">
          <SectionHeader
            level={1}
            title="Questions fréquentes"
            lead="Les réponses courtes. Le détail de chaque journée est sur la page Programme."
          />
        </div>
        <div className="mt-10 divide-y divide-forest/10 border-y border-forest/10">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="cursor-pointer list-none text-[16px] font-semibold text-forest marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-start justify-between gap-4">
                  {item.q}
                  <span className="mt-1 text-[12px] font-medium text-ink/40 group-open:hidden" aria-hidden="true">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-2 max-w-xl whitespace-pre-line text-[15px] leading-relaxed text-ink/75">{item.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-[14px] text-ink/55">
          Site : {SITE_URL.replace('https://', '')}
        </p>
      </div>
    </main>
  )
}
