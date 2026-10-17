import { useEffect, useState } from 'react'
import { castVote, getVotes, type VoteOption } from '../api/engagement'
import { Seo } from '../components/Seo'
import { WRAP } from '../components/layout/Mark'
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
          <h1 className="display text-4xl sm:text-5xl">Produit coup de cœur</h1>
          <p className="mt-4 max-w-xl text-lg text-ink/65">Un vote par téléphone / navigateur. Sans téléphone : urne physique à l’accueil.</p>
          {error && <p className="mt-6 text-red-700">{error}</p>}
          {done && <p className="mt-6 text-forest">Merci, votre vote est enregistré.</p>}

          <ul className="mt-10 space-y-4">
            {options.map((o) => (
              <li key={o.id} className="rounded-2xl border border-forest/10 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xl font-semibold text-forest">{o.label}</p>
                    <p className="mt-1 text-[15px] text-ink/50">{o.votes} voix</p>
                  </div>
                  {!done && (
                    <button
                      type="button"
                      onClick={() => onVote(o.id)}
                      className="rounded-xl bg-forest px-5 py-3 text-[14px] font-semibold text-white hover:bg-ink"
                    >
                      Voter
                    </button>
                  )}
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-sage">
                  <div className="h-full bg-leaf" style={{ width: `${Math.round((o.votes / total) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
  )
}
