import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { WRAP } from '../components/layout/Mark'
import { SectionHeader } from '../components/ui/SectionHeader'

const HASHTAG = '#SemaineIndustrieTogo2026'

const STEPS: { title: string; text: ReactNode }[] = [
  {
    title: 'Inscrivez-vous à une visite',
    text: (
      <>
        Avec votre établissement (
        <Link to="/inscription-groupe/" className="font-semibold text-forest underline underline-offset-2">visites d’industries : écoles / universités</Link>
        ) ou à titre personnel (
        <Link to="/inscription-particulier/" className="font-semibold text-forest underline underline-offset-2">visites d’industries : particuliers</Link>
        ). Les visites ont lieu du lundi 16 au vendredi 20 novembre.
      </>
    ),
  },
  {
    title: 'Filmez votre visite',
    text: 'Montrez ce que vous découvrez : les machines, les métiers, les personnes qui fabriquent. Filmez uniquement là où l’industrie l’autorise et suivez ses consignes de sécurité.',
  },
  {
    title: 'Publiez votre vidéo',
    text: `Partagez-la sur les réseaux sociaux avec le hashtag ${HASHTAG}, pour qu’elle soit vue et prise en compte.`,
  },
]

/* Concours vidéo : élèves et étudiants filment leur visite d'usine. */
export default function ConcoursVideoPage() {
  return (
    <main className="py-16 sm:py-24">
      <Seo {...publicSeo('/concours-video')} />
      <div className={`${WRAP} max-w-2xl`}>
        <div className="animate-rise">
          <SectionHeader
            level={1}
            title="Concours vidéo"
            lead="Élèves et étudiants : filmez votre visite d’usine pendant la Semaine de l’industrie et publiez-la sur les réseaux sociaux."
          />
          <p className="mt-5 text-[16px] text-ink/80">
            <span className="mr-2 whitespace-nowrap font-sans text-[32px] font-bold italic tracking-tight tabular-nums text-[#a87d00] sm:text-[38px]">200 000 FCFA</span>
            pour la meilleure vidéo de la semaine.
          </p>
        </div>

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

        <ol className="mt-8 border-t border-forest/15">
          {STEPS.map((step, index) => (
            <li key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-3 border-b border-forest/15 py-5">
              <span className="text-xl font-semibold tabular-nums text-forest">{index + 1}</span>
              <div>
                <h2 className="font-semibold text-forest">{step.title}</h2>
                <p className="mt-1 text-[15px] leading-relaxed text-ink/75">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-10 space-y-2 text-[15px] leading-relaxed text-ink/75">
          <h2 className="text-xl font-semibold text-forest">Qui peut participer ?</h2>
          <p>Tout élève ou étudiant présent lors d’une visite d’usine, inscrit à titre personnel ou venu avec son établissement.</p>
          <p>
            Hashtag à utiliser : <span className="font-mono font-semibold text-forest">{HASHTAG}</span>
          </p>
          <p>
            Pour toute question :{' '}
            <a href="mailto:infos@semaineindustrie.tg" className="font-semibold text-forest underline underline-offset-2">
              infos@semaineindustrie.tg
            </a>
            .
          </p>
        </section>

      </div>
    </main>
  )
}
