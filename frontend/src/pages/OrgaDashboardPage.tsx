import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardStats, type DashboardOverview, type DashboardStats } from '../api/dashboard'
import { OrgaShell } from '../components/layout/OrgaShell'
import { useOrgaRealtime } from '../lib/useOrgaRealtime'

type Overview = DashboardOverview

/* Nombre formaté à la française (12 345). */
const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

/* Accord simple : « 1 entrée », « 3 entrées ». */
const plural = (n: number, one: string, many: string) => `${fmt(n)} ${n > 1 ? many : one}`

/* Titre de section du tableau de bord. */
function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[15px] font-semibold text-forest">{children}</h2>
      {aside && <span className="text-[12px] text-ink/50">{aside}</span>}
    </div>
  )
}

/* Ligne libellé / valeur d'un panneau de chiffres. */
function StatLine({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-black/10 py-2.5 first:border-t-0">
      <dt className="text-[14px] text-ink/70">
        {label}
        {sub && <span className="block text-[12px] text-ink/45">{sub}</span>}
      </dt>
      <dd className="text-[17px] font-bold tabular-nums text-forest">{fmt(value)}</dd>
    </div>
  )
}

/* Bandeau « à traiter » : total des demandes en attente, puis le détail cliquable par formulaire. */
function ToProcess({ o }: { o: Overview }) {
  const items: [string, number, string][] = [
    ['Palais des Congrès', o.participations.palais.pending, '/orga/participations'],
    ['Visites : particuliers', o.participations.particulier.pending, '/orga/participations'],
    ['Visites : écoles', o.participations.ecole.pending, '/orga/participations'],
    ['Médias', o.participations.media.pending, '/orga/participations'],
    ['Demandes de label', o.labels.requests.pending, '/orga/labels'],
  ]
  return (
    <section className="border border-black bg-white">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-black px-5 py-4">
        <p className="text-[32px] font-bold leading-none tabular-nums text-forest">{fmt(o.to_process)}</p>
        <p className="text-[15px] text-ink/70">{o.to_process > 1 ? 'demandes à traiter' : 'demande à traiter'}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {items.map(([label, count, to]) => (
          <Link
            key={label}
            to={to}
            className="border-t border-black/10 px-5 py-3 transition-colors hover:bg-forest/[0.04] sm:border-l sm:first:border-l-0"
          >
            <p className="text-[13px] text-ink/60">{label}</p>
            <p className={`mt-0.5 text-[20px] font-bold tabular-nums ${count > 0 ? 'text-forest' : 'text-ink/30'}`}>{fmt(count)}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

/* Couleurs de statut de la barre de répartition (validées : contraste et daltonisme, avec les chiffres du tableau à côté). */
const STATUS_COLORS = [
  { key: 'approved', label: 'Acceptées', color: '#00a85a' },
  { key: 'pending', label: 'En attente', color: '#e0a800' },
  { key: 'rejected', label: 'Refusées', color: '#c2410c' },
] as const

/* Légende de la barre de répartition. */
function StatusLegend() {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink/60">
      {STATUS_COLORS.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
          {s.label}
        </span>
      ))}
    </span>
  )
}

/* Barre de répartition d'un formulaire : acceptées, en attente, refusées (2px de blanc entre les parts). */
function StatusBar({ c }: { c: { total: number; pending: number; approved: number; rejected: number } }) {
  if (!c.total) return <div className="h-2.5 rounded-[4px] bg-black/[0.06]" aria-hidden />
  return (
    <div className="flex h-2.5 gap-[2px]" role="img" aria-label={STATUS_COLORS.map((s) => `${s.label} : ${c[s.key]}`).join(', ')}>
      {STATUS_COLORS.filter((s) => c[s.key] > 0).map((s) => (
        <div
          key={s.key}
          title={`${s.label} : ${fmt(c[s.key])}`}
          className="first:rounded-l-[4px] last:rounded-r-[4px]"
          style={{ flexGrow: c[s.key], flexBasis: 0, background: s.color }}
        />
      ))}
    </div>
  )
}

/* Inscriptions par formulaire et par statut. */
function RegistrationsTable({ o }: { o: Overview }) {
  const p = o.participations
  const rows: { label: string; to: string; c: { total: number; pending: number; approved: number; rejected: number }; note?: string }[] = [
    { label: 'Palais des Congrès', to: '/orga/participations', c: p.palais },
    { label: 'Visites : particuliers', to: '/orga/participations', c: p.particulier, note: p.particulier.waitlist ? plural(p.particulier.waitlist, 'en liste d’attente', 'en liste d’attente') : undefined },
    { label: 'Visites : écoles / universités', to: '/orga/participations', c: p.ecole, note: p.ecole.headcount ? plural(p.ecole.headcount, 'personne déclarée', 'personnes déclarées') : undefined },
    { label: 'Accréditations médias', to: '/orga/participations', c: p.media },
    { label: 'Demandes de label', to: '/orga/labels', c: o.labels.requests },
  ]
  return (
    <section className="orga-panel !p-0 overflow-x-auto">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black px-4 py-3">
        <h2 className="text-[15px] font-semibold text-forest">Inscriptions par formulaire</h2>
        <StatusLegend />
      </div>
      <table className="orga-table min-w-[760px]">
        <thead>
          <tr>
            <th>Formulaire</th>
            <th className="w-48">Répartition</th>
            <th className="w-24 text-right">Total</th>
            <th className="w-28 text-right">Acceptées</th>
            <th className="w-28 text-right">En attente</th>
            <th className="w-24 text-right">Refusées</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td>
                <Link to={r.to} className="font-medium text-forest hover:underline">{r.label}</Link>
                {r.note && <span className="block text-[12px] text-ink/50">{r.note}</span>}
              </td>
              <td className="align-middle"><StatusBar c={r.c} /></td>
              <td className="text-right font-bold tabular-nums text-forest">{fmt(r.c.total)}</td>
              <td className="text-right tabular-nums text-ink">{fmt(r.c.approved)}</td>
              <td className={`text-right tabular-nums ${r.c.pending ? 'font-semibold text-ink' : 'text-ink/35'}`}>{fmt(r.c.pending)}</td>
              <td className="text-right tabular-nums text-ink/60">{fmt(r.c.rejected)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

/* Journées du Palais : inscrits, acceptés et entrées enregistrées à l'accueil. */
function PalaisDays({ o }: { o: Overview }) {
  return (
    <section>
      <SectionTitle>Palais des Congrès, jour par jour</SectionTitle>
      <div className="grid border border-black bg-white sm:grid-cols-3">
        {o.palais_days.map((d, i) => (
          <div key={d.n} className={`px-5 py-4 ${i > 0 ? 'border-t border-black sm:border-t-0 sm:border-l' : ''}`}>
            <p className="text-[14px] font-semibold text-forest">{d.label}</p>
            <p className="text-[13px] text-ink/60">{d.title}</p>
            <p className="mt-2 text-[14px] text-ink/70">
              <strong className="text-[17px] font-bold tabular-nums text-forest">{fmt(d.registered)}</strong> {d.registered > 1 ? 'inscrits' : 'inscrit'}
              <span className="mx-1.5 text-ink/30">·</span>
              <strong className="text-[17px] font-bold tabular-nums text-forest">{fmt(d.approved)}</strong> {d.approved > 1 ? 'acceptés' : 'accepté'}
              <span className="mx-1.5 text-ink/30">·</span>
              <strong className="text-[17px] font-bold tabular-nums text-forest">{fmt(d.entries)}</strong> {d.entries > 1 ? 'entrées' : 'entrée'}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* Date courte d'un jour ISO : « lun. 9 nov. ». */
function shortDay(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
}

/* Inscriptions reçues par jour (14 jours) : colonnes fines, survol avec la valeur exacte. */
function DailyChart({ o }: { o: Overview }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...o.daily.map((d) => d.count))
  const total = o.daily.reduce((sum, d) => sum + d.count, 0)
  const shown = hover !== null ? o.daily[hover] : null
  return (
    <section className="orga-panel">
      <SectionTitle aside={`${plural(total, 'inscription', 'inscriptions')} sur 14 jours`}>Inscriptions reçues par jour</SectionTitle>
      <p className="h-5 text-[13px] text-ink/70" aria-live="polite">
        {shown ? <><strong className="text-ink">{shortDay(shown.date)}</strong> : {plural(shown.count, 'inscription', 'inscriptions')}</> : 'Survolez une colonne pour le détail.'}
      </p>
      <div className="relative mt-3">
        <span className="absolute -top-1 left-0 text-[11px] tabular-nums text-ink/45">{fmt(max)}</span>
        <div className="flex h-40 items-end gap-[2px] border-b border-black/30 pl-8" role="list" aria-label="Inscriptions reçues par jour">
          {o.daily.map((d, i) => (
            <div
              key={d.date}
              role="listitem"
              tabIndex={0}
              aria-label={`${shortDay(d.date)} : ${plural(d.count, 'inscription', 'inscriptions')}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="flex h-full flex-1 cursor-default items-end justify-center outline-none"
            >
              <div
                className={`w-full max-w-6 rounded-t-[4px] transition-opacity ${hover !== null && hover !== i ? 'opacity-40' : ''}`}
                style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 2 : 0, background: '#00a85a' }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-[2px] pl-8 pt-1.5">
          {o.daily.map((d, i) => (
            <span key={d.date} className="flex-1 text-center text-[11px] tabular-nums text-ink/45">
              {i % 2 === 1 || i === o.daily.length - 1 ? new Date(`${d.date}T12:00:00Z`).getUTCDate() : ''}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[12px] text-ink/45">Tous formulaires et demandes de label confondus.</p>
    </section>
  )
}

/* Labels, visites d'usines et engagement du public. */
function SidePanels({ o }: { o: Overview }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="orga-panel">
        <SectionTitle>Labels et visites d’usines</SectionTitle>
        <dl>
          <StatLine label="Industries labellisées" value={o.labels.labeled.industries} />
          <StatLine label="Écoles partenaires labellisées" value={o.labels.labeled.schools} />
          <StatLine label="Sites sur la carte" value={o.labels.on_map} sub="Avec position GPS" />
          <StatLine label="Visites planifiées" value={o.visits.booked} sub={plural(o.visits.headcount, 'personne prévue', 'personnes prévues')} />
          <StatLine label="Passages enregistrés" value={o.visits.passages} sub="QR scannés dans les usines" />
        </dl>
      </section>
      <section className="orga-panel">
        <SectionTitle>Engagement du public</SectionTitle>
        <dl>
          <StatLine label="Réponses au questionnaire" value={o.engagement.survey.total} sub={`Avant la visite ${fmt(o.engagement.survey.before)} · après ${fmt(o.engagement.survey.after)}`} />
          <StatLine label="Parties du quiz" value={o.engagement.quiz_played} sub="À quel point connaissez-vous l’industrie ?" />
          <StatLine label="Contacts WhatsApp" value={o.engagement.whatsapp.contacts} sub={plural(o.engagement.whatsapp.messages_in, 'message reçu', 'messages reçus')} />
        </dl>
      </section>
    </div>
  )
}

/* Tableau de bord orga : ce qui reste à traiter, les inscriptions, le Palais, la courbe, puis labels, visites et engagement. */
export default function OrgaDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  /* Charge les indicateurs. */
  async function load() {
    try {
      setError(null)
      setStats(await getDashboardStats())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le tableau de bord')
    }
  }

  useEffect(() => {
    void load()
    /* Retour sur l'onglet du navigateur : chiffres à jour. */
    function onVisible() {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useOrgaRealtime(
    ['label:created', 'label:updated', 'label:deleted', 'participation:changed', 'business:changed', 'booking:changed', 'survey:updated'],
    () => void load(),
  )

  const o = stats?.overview
  const updated = stats?.updated_at
    ? new Date(stats.updated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <OrgaShell
      title="Tableau de bord"
      actions={updated ? <span className="text-[13px] text-ink/50">Mis à jour à {updated}</span> : undefined}
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}
      {!o && !error && <p className="text-[14px] text-ink/45">Chargement des indicateurs…</p>}

      {o && (
        <div className="space-y-6">
          <ToProcess o={o} />
          <RegistrationsTable o={o} />
          <PalaisDays o={o} />
          <DailyChart o={o} />
          <SidePanels o={o} />
        </div>
      )}
    </OrgaShell>
  )
}
