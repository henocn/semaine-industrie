import { useEffect, useRef, useState } from 'react'
import { mailParticipation, notifyParticipation, type Participation } from '../../api/participations'
import { useConfirm } from '../../lib/useConfirm'

/* Relance des personnes acceptées qui n'ont pas reçu leur message : WhatsApp, e-mail, ou les deux selon ce qui manque. */

type Mode = 'whatsapp' | 'email' | 'auto'
type Job = { row: Participation; channel: 'wa' | 'mail' }
type Tally = { ok: number; failed: number }
type Outcome = { wa: Tally; mail: Tally; mailStopped: string | null }

/* Acceptée, avec un numéro, sans QR reçu sur WhatsApp. */
const needsWhatsapp = (row: Participation) => row.status === 'approved' && Boolean(row.phone) && !row.whatsapp_qr
/* Acceptée, avec une adresse, sans e-mail d'acceptation envoyé. */
const needsMail = (row: Participation) => row.status === 'approved' && Boolean(row.email) && row.approved_mail !== true

const MODES: { mode: Mode; label: string; hint: string }[] = [
  { mode: 'whatsapp', label: 'WhatsApp', hint: 'QR non reçu sur WhatsApp' },
  { mode: 'email', label: 'E-mail', hint: 'e-mail d’acceptation non envoyé' },
  { mode: 'auto', label: 'Auto', hint: 'ce qui manque à chacun, WhatsApp et/ou e-mail' },
]

function jobsFor(mode: Mode, rows: readonly Participation[]): Job[] {
  const jobs: Job[] = []
  for (const row of rows) {
    if (mode !== 'email' && needsWhatsapp(row)) jobs.push({ row, channel: 'wa' })
    if (mode !== 'whatsapp' && needsMail(row)) jobs.push({ row, channel: 'mail' })
  }
  return jobs
}

/* Nombre de personnes concernées (une personne compte une fois, même en « Auto »). */
function peopleCount(jobs: Job[]) {
  return new Set(jobs.map((job) => job.row.id)).size
}

export function RelaunchButton({ rows, onDone }: { rows: readonly Participation[]; onDone: () => Promise<void> }) {
  const { confirm, modal } = useConfirm()
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const runningRef = useRef(false)

  /* Pendant la relance, prévient avant de quitter la page (les envois restants seraient interrompus). */
  useEffect(() => {
    if (!progress) return undefined
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [progress])

  async function run(mode: Mode) {
    setOpen(false)
    const jobs = jobsFor(mode, rows)
    if (!jobs.length || runningRef.current) return
    const wa = jobs.filter((job) => job.channel === 'wa').length
    const mail = jobs.length - wa
    const ok = await confirm({
      title: `Relancer ${peopleCount(jobs)} personne${peopleCount(jobs) > 1 ? 's' : ''} ?`,
      message: [
        wa ? `${wa} WhatsApp d’acceptation avec le QR` : null,
        mail ? `${mail} e-mail${mail > 1 ? 's' : ''} d’acceptation avec le QR` : null,
      ].filter(Boolean).join(' et ') + '. Ne fermez pas la page pendant l’envoi.',
      confirmLabel: 'Relancer',
      danger: true,
    })
    if (!ok) return

    runningRef.current = true
    setOutcome(null)
    const result: Outcome = { wa: { ok: 0, failed: 0 }, mail: { ok: 0, failed: 0 }, mailStopped: null }
    try {
      for (let i = 0; i < jobs.length; i += 1) {
        setProgress({ done: i, total: jobs.length })
        const job = jobs[i]
        /* Après un refus du serveur d'e-mail (limite d'envoi), on n'insiste pas : cela prolongerait le blocage. */
        if (job.channel === 'mail' && result.mailStopped) continue
        try {
          await (job.channel === 'wa' ? notifyParticipation(job.row.id) : mailParticipation(job.row.id))
          result[job.channel === 'wa' ? 'wa' : 'mail'].ok += 1
        } catch (err) {
          result[job.channel === 'wa' ? 'wa' : 'mail'].failed += 1
          if (job.channel === 'mail') result.mailStopped = err instanceof Error ? err.message : 'envoi refusé'
        }
      }
      setOutcome(result)
      try {
        await onDone()
      } catch {
        /* Rechargement raté : le bilan reste juste, le tableau se met à jour au prochain chargement. */
      }
    } finally {
      setProgress(null)
      runningRef.current = false
    }
  }

  return (
    <div className="relative flex items-center gap-3">
      {outcome && !progress && (
        <span className="flex items-center gap-2 text-[12px]">
          <span className={outcome.wa.failed || outcome.mail.failed ? 'font-semibold text-red-700' : 'font-semibold text-forest'}>
            {outcome.wa.ok + outcome.wa.failed > 0 && `WhatsApp ${outcome.wa.ok}/${outcome.wa.ok + outcome.wa.failed}`}
            {outcome.wa.ok + outcome.wa.failed > 0 && outcome.mail.ok + outcome.mail.failed > 0 && ' · '}
            {outcome.mail.ok + outcome.mail.failed > 0 && `E-mail ${outcome.mail.ok}/${outcome.mail.ok + outcome.mail.failed}`}
            {outcome.mailStopped && ' · e-mails arrêtés'}
          </span>
          <button type="button" className="text-ink/50 hover:text-forest" onClick={() => setOutcome(null)}>
            Fermer
          </button>
        </span>
      )}
      <button
        type="button"
        className="orga-btn !border-red-700 !bg-red-700 hover:!bg-red-800 disabled:opacity-70"
        disabled={Boolean(progress)}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {progress ? (
          <span className="tabular-nums">Relance… {progress.done}/{progress.total}</span>
        ) : 'Relancer'}
      </button>
      {open && (
        <>
          {/* Clic en dehors : ferme le menu. */}
          <button type="button" aria-label="Fermer le menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-72 border border-black bg-white text-[13px] shadow-lg">
            {MODES.map(({ mode, label, hint }) => {
              const count = peopleCount(jobsFor(mode, rows))
              return (
                <button
                  key={mode}
                  type="button"
                  role="menuitem"
                  disabled={count === 0}
                  className="flex w-full items-baseline justify-between gap-3 border-b border-black/10 px-3 py-2 text-left last:border-b-0 hover:bg-sage disabled:cursor-not-allowed disabled:text-ink/35 disabled:hover:bg-white"
                  onClick={() => void run(mode)}
                >
                  <span>
                    <span className="font-semibold text-forest">{label}</span>
                    <span className="block text-[11px] text-ink/55">{hint}</span>
                  </span>
                  <span className="tabular-nums text-ink/70">{count}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
      {modal}
    </div>
  )
}
