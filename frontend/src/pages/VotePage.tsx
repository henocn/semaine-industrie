import { useEffect, useState } from 'react'
import { castVote, getVotes, type VoteOption } from '../api/engagement'
import { Seo } from '../components/Seo'
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

  const total = options.reduce((s, o) => s + o.votes, 0) || 1

  return (
    <main className="py-16 sm:py-24">
        <Seo
          title="Vote coup de cœur"
          description="Votez pour le produit coup de cœur de l’exposition Semaine de l’industrie 2026."
          path="/vote"
        />
        <div className={WRAP}>
          <div className="animate-rise">
            <SectionHeader
              level={1}
              eyebrow="Exposition du samedi"
              title="Produit coup de cœur"
              lead="Un vote par navigateur. Sans téléphone : urne physique à l’accueil."
            />
          </div>
          {error && <p role="alert" className="mt-6 font-medium text-flag">{error}</p>}
          {done && <p className="mt-6 font-medium text-forest">Merci, votre vote est enregistré.</p>}

          <ul className="mt-10 space-y-4">
            {options.map((o) => (
              <li key={o.id} className="rounded-sm border border-forest/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xl font-semibold text-forest">{o.label}</p>
                    <p className="mt-1 text-[15px] text-ink/70">{o.votes} voix</p>
                  </div>
                  {!done && (
                    <Button onClick={() => onVote(o.id)} withArrow={false}>Voter</Button>
                  )}
                </div>
                <div className="mt-3 h-2 overflow-hidden bg-sage">
                  <div className="h-full bg-leaf" style={{ width: `${Math.round((o.votes / total) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
  )
}
