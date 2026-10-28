import { useEffect, useMemo, useState } from 'react'
import { castVote, getVotes, type VoteOption } from '../api/engagement'
import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/ui/SectionHeader'
import { joinRoom, onRealtime } from '../lib/socket'

/* Clé locale pour un seul vote par navigateur. */
function voterKey() {
  const k = 'si_voter_key'
  let v = localStorage.getItem(k)
  if (!v) {
    v = `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    localStorage.setItem(k, v)
  }
  return v
}

/* Vote coup de cœur (expo samedi), scores live via Socket.IO. */
export default function VotePage() {
  const [options, setOptions] = useState<VoteOption[]>([])
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    getVotes().then(setOptions).catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
    joinRoom('votes')
    return onRealtime<VoteOption[]>('vote:updated', setOptions)
  }, [])

  /* Enregistre le vote pour l'option choisie. */
  async function onVote(id: string) {
    setError(null)
    try {
      const data = await castVote(id, voterKey())
      setOptions(data)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vote impossible')
    }
  }

  const ranked = useMemo(
    () => [...options].sort((a, b) => b.votes - a.votes || a.label.localeCompare(b.label, 'fr')),
    [options],
  )
  const total = ranked.reduce((s, o) => s + o.votes, 0)

  return (
    <main className="py-16 sm:py-24">
      <Seo {...publicSeo('/vote')} />
      <div className={WRAP}>
        <div className="animate-rise">
          <SectionHeader
            level={1}
            title="Produit coup de cœur"
            lead="Un vote par personne. Le classement se met à jour au fil des voix."
          />
        </div>
        {error && <p role="alert" className="mt-6 font-medium text-flag">{error}</p>}
        {done && <p className="mt-6 font-medium text-forest">Merci, votre vote est enregistré.</p>}

        {ranked.length === 0 && !error && (
          <p className="mt-10 text-[15px] text-ink/55">Les produits en lice seront affichés ici.</p>
        )}

        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {ranked.map((o, index) => {
            const pct = total ? Math.round((o.votes / total) * 100) : 0
            const lead = index === 0 && o.votes > 0
            return (
              <li
                key={o.id}
                className={`flex flex-col bg-white ${lead ? 'border-2 border-sun' : 'border border-forest/15'}`}
              >
                <div className="relative aspect-[4/3] bg-sage">
                  {o.image_url ? (
                    <img src={o.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-[13px] text-forest/40">Photo à venir</div>
                  )}
                  <span
                    className={`absolute left-3 top-3 grid h-9 w-9 place-items-center text-[14px] font-bold ${
                      lead ? 'bg-sun text-forest' : 'bg-forest text-white'
                    }`}
                  >
                    {index + 1}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <p className="text-lg font-semibold text-forest sm:text-xl">{o.label}</p>
                  {o.description && (
                    <p className="mt-2 text-[14px] leading-relaxed text-ink/70">{o.description}</p>
                  )}
                  <div className="mt-4 h-1.5 bg-forest/10">
                    <div className="h-full bg-forest transition-[width] duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 text-[13px] text-ink/55">
                    {o.votes} voix · {pct}%
                  </p>
                  {!done && (
                    <Button onClick={() => onVote(o.id)} withArrow={false} className="mt-4 w-fit">
                      Voter
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </main>
  )
}
