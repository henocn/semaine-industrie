import type { ReactNode } from 'react'
import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { WRAP } from '../components/layout/Mark'
import { SectionHeader } from '../components/ui/SectionHeader'

const HASHTAG = '#SemaineIndustrieTogo2026'

/* Compte du Ministère à taguer, selon le réseau où la vidéo est publiée. */
const MINISTRY_TAGS: { handle: string; networks: string }[] = [
  { handle: '@ministre_mdpise', networks: 'Instagram, Facebook' },
  { handle: '@ministere.invest', networks: 'TikTok' },
  { handle: '@Promo_InvestTg', networks: 'X' },
]

const STEPS: { title: string; text: ReactNode }[] = [
  {
    title: 'Vis pleinement la Semaine de l’industrie',
    text: 'Participe à toutes les activités de la Semaine de l’industrie, du 16 au 22 novembre 2026, et trouve ton inspiration.',
  },
  {
    title: 'Réalise ta vidéo',
    text: 'Raconte ton expérience à ta manière. Laisse libre cours à ta créativité !',
  },
  {
    title: 'Publie et mobilise ta communauté !',
    text: (
      <>
        Partage ta vidéo sur les réseaux sociaux avec le hashtag{' '}
        <span className="whitespace-nowrap font-semibold text-forest">{HASHTAG}</span> et tague les comptes officiels du
        Ministère délégué chargé de la Promotion des Investissements, de l’Industrie et de la Souveraineté économique :
        <span className="mt-2 block space-y-1">
          {MINISTRY_TAGS.map((tag) => (
            <span key={tag.handle} className="block">
              <span className="font-semibold text-forest">{tag.handle}</span> · {tag.networks}
            </span>
          ))}
        </span>
        <span className="mt-3 block">
          <span className="font-semibold text-forest">Le nombre de likes compte :</span> plus ta vidéo en reçoit, plus elle a
          de chances de remporter le concours !
        </span>
      </>
    ),
  },
]

/* Concours vidéo : élèves et étudiants racontent la Semaine de l'industrie en vidéo. */
export default function ConcoursVideoPage() {
  return (
    <main className="py-16 sm:py-24">
      <Seo {...publicSeo('/concours-video')} />
      <div className={`${WRAP} max-w-2xl`}>
        <div className="animate-rise">
          <SectionHeader level={1} title="Relève le challenge !" lead="Et si ta vidéo faisait la différence ?" />
          <p className="mt-5 text-[16px] text-ink/80">
            <span className="mr-2 whitespace-nowrap font-sans text-[32px] font-bold italic tracking-tight tabular-nums text-[#a87d00] sm:text-[38px]">200 000 FCFA</span>
            à remporter !
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-ink/75">
            À l’occasion de la Semaine de l’industrie 2026, réalise la meilleure vidéo de l’événement et tente de remporter le
            grand prix ! Reportage, vlog, résumé de tes découvertes ou création originale… À toi de raconter la Semaine de
            l’industrie comme tu l’entends !
          </p>
        </div>

        {/* Image retirée de la page (nouvelle présentation du concours) ; fichiers conservés dans public/images.
        <picture className="contents">
          <source srcSet="/images/concours-video.webp" type="image/webp" />
          <img
            src="/images/concours-video.jpg"
            alt="Deux élèves en casque et gilet de sécurité filment avec un téléphone pendant qu’un technicien leur explique une machine dans une usine"
            width={1200}
            height={900}
            className="mt-6 aspect-[5/2] w-full rounded-sm object-cover object-[50%_5%]"
          />
        </picture>
        */}

        <h2 className="mt-10 text-xl font-semibold text-forest">Comment participer ?</h2>
        <ol className="mt-4 border-t border-forest/15">
          {STEPS.map((step, index) => (
            <li key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-3 border-b border-forest/15 py-5">
              <span className="text-xl font-semibold tabular-nums text-forest">{index + 1}</span>
              <div>
                <h3 className="font-semibold text-forest">{step.title}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-ink/75">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-10 space-y-2 text-[15px] leading-relaxed text-ink/75">
          <h2 className="text-xl font-semibold text-forest">Et si c’était toi le grand gagnant ?</h2>
          <p>
            Un jury désignera la vidéo gagnante. Son auteur remportera 200 000 FCFA et verra sa création mise à l’honneur sur
            les réseaux sociaux officiels du Ministère.
          </p>
          <p className="font-semibold text-forest">Concours réservé aux élèves et aux étudiants.</p>
        </section>

        <section className="mt-10 space-y-2 text-[15px] leading-relaxed text-ink/75">
          <h2 className="text-xl font-semibold text-forest">Alors, prêt à relever le challenge ?</h2>
          <p>Deviens le créateur vedette de la Semaine de l’industrie 2026 !</p>
          <p>
            Une question ?{' '}
            <a href="mailto:infos@semaineindustrie.tg" className="font-semibold text-forest underline underline-offset-2">
              infos@semaineindustrie.tg
            </a>
          </p>
        </section>
      </div>
    </main>
  )
}
