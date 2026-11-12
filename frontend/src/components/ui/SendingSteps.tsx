import { useEffect, useState } from 'react'

/* Étapes affichées pendant un envoi long : 5 secondes chacune, la dernière reste jusqu'à la réponse. */
const DEFAULT_STEPS = [
  'Vérification…',
  'Chargement…',
  'Traitement…',
  'Enregistrement…',
  'Finalisation…',
]
const STEP_MS = 5000

/* À afficher seulement pendant l'envoi : repart de la première étape à chaque nouvel envoi. */
export function SendingSteps({ steps = DEFAULT_STEPS }: { steps?: string[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => Math.min(current + 1, steps.length - 1))
    }, STEP_MS)
    return () => window.clearInterval(timer)
  }, [steps.length])

  return (
    <div role="status" aria-live="polite" className="mt-4 max-w-sm">
      <div className="flex gap-1" aria-hidden="true">
        {steps.map((step, i) => (
          <span key={step} className={`h-1 flex-1 rounded-full transition-colors ${i <= index ? 'bg-forest' : 'bg-forest/15'}`} />
        ))}
      </div>
      <p className="mt-2 text-[15px] font-medium text-forest">{steps[index]}</p>
      <p className="mt-0.5 text-[13px] text-ink/60">Ne fermez pas la page.</p>
    </div>
  )
}
