import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getEspace, type Espace, type EspaceRow, type EspaceType } from '../api/espace'
import { ResourceCard } from '../components/ResourceCard'
import { Seo } from '../components/Seo'
import { WRAP } from '../components/layout/Mark'
import { SectionHeader } from '../components/ui/SectionHeader'
import { publicSeo } from '../lib/seo'

const TYPE_LABEL: Record<EspaceType, string> = {
  ecole: 'École / université',
  particulier: 'Particulier',
  palais: 'Participation au Palais des Congrès',
  media: 'Accréditation médias',
  industrie: 'Industrie',
  affaires: 'Rencontres d’affaires',
}

const STATUS_LABEL: Record<Espace['status'], string> = {
  approved: 'Dossier validé',
  pending: 'En attente de validation',
  waitlist: 'En liste d’attente',
  rejected: 'Dossier non retenu',
}

/* Explication d'un dossier sans bilan. */
const STATUS_NOTICE: Partial<Record<Espace['status'], string>> = {
  pending: 'Votre dossier est en cours d’examen par l’équipe d’organisation. Vous recevrez bientôt la réponse.',
  waitlist: 'Les places prévues pour les particuliers sont toutes attribuées. Votre inscription est en liste d’attente : nous vous préviendrons par e-mail et sur WhatsApp dès qu’une place se libère.',
  rejected: 'Ce dossier n’a pas été retenu. Pour en savoir plus, écrivez à infos@semaineindustrie.tg.',
}

/* Titres et message vide des listes, selon le dossier. */
const LISTS: Record<EspaceType, { done: string; next: string; empty: string }> = {
  ecole: { done: 'Sites visités', next: 'Visites à venir', empty: 'Aucun passage enregistré pour le moment.' },
  particulier: { done: 'Sites visités', next: 'Visites à venir', empty: 'Aucun passage enregistré pour le moment.' },
  palais: { done: 'Journées suivies', next: 'Journées à venir', empty: 'Aucune entrée enregistrée pour le moment.' },
  media: { done: 'Passages', next: 'À venir', empty: 'Aucun passage enregistré pour le moment.' },
  industrie: { done: 'Passages reçus', next: 'Visites à venir', empty: 'Aucun passage reçu pour le moment.' },
  affaires: { done: 'Rendez-vous tenus', next: 'Rendez-vous à venir', empty: 'Aucun rendez-vous tenu pour le moment.' },
}

/* Liste de lignes d'un bilan : quoi à gauche, quand à droite. */
function RowList({ rows }: { rows: EspaceRow[] }) {
  return (
    <ul className="mt-3 divide-y divide-forest/10 border-y border-forest/10">
      {rows.map((row) => (
        <li key={row.id} className="py-3">
          <p className="font-semibold text-forest">{row.title}</p>
          {row.detail && <p className="mt-0.5 text-[14px] text-ink/65">{row.detail}</p>}
          <p className="mt-0.5 text-[14px] text-ink/65 first-letter:uppercase">{row.when}</p>
        </li>
      ))}
    </ul>
  )
}

/* Fiche et bilan d'un dossier. */
function EspaceView({ space }: { space: Espace }) {
  const lists = LISTS[space.type]
  return (
    <div className="mt-10 space-y-12">
      <section className="grid gap-8 border border-forest/15 bg-white p-5 sm:p-7 md:grid-cols-[1fr_auto]">
        <div>
          <h2 className="display h3">{space.name}</h2>
          <p className="mt-2 text-[15px] text-ink/70">
            {TYPE_LABEL[space.type]} · {STATUS_LABEL[space.status]} · <span className="font-mono">{space.code}</span>
          </p>
          {STATUS_NOTICE[space.status] && (
            <p className="mt-4 text-[15px] text-ink">{STATUS_NOTICE[space.status]}</p>
          )}
          {space.facts.length > 0 && (
            <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {space.facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-[13px] text-ink/55">{fact.label}</dt>
                  <dd className={`mt-0.5 text-[15px] text-ink ${fact.label === 'E-mail' ? '' : 'first-letter:uppercase'}`}>{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {space.page_url && (
            <Link to={space.page_url} className="mt-6 inline-block font-semibold text-forest underline underline-offset-4">
              Voir ma fiche publique
            </Link>
          )}
        </div>
        {space.qr_data_url && (
          <figure className="justify-self-start md:justify-self-end">
            <img src={space.qr_data_url} alt={`QR de participation ${space.code}`} width={144} height={144} className="h-36 w-36 border border-forest/15" />
            <figcaption className="mt-2 max-w-36 text-[13px] text-ink/60">
              {space.type === 'palais' ? 'À présenter à l’accueil du Palais des Congrès' : space.type === 'media' ? 'Accréditation valable du 16 au 22 novembre' : 'À présenter à l’entrée des sites'}
            </figcaption>
          </figure>
        )}
      </section>

      {space.status === 'approved' && space.stats.length > 0 && (
        <section aria-labelledby="bilan">
          <h2 id="bilan" className="display h3">Mon bilan</h2>
          <dl className="mt-4 flex flex-wrap gap-px border border-forest/15 bg-forest/15">
            {space.stats.map((stat) => (
              <div key={stat.label} className="flex min-w-[45%] flex-1 flex-col-reverse bg-white px-4 py-5 sm:min-w-0">
                <dt className="mt-1 text-[14px] text-ink/65">{stat.label}</dt>
                <dd className="display text-4xl">{stat.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 grid gap-10 lg:grid-cols-2">
            <div>
              <h3 className="font-semibold text-ink">{lists.done}</h3>
              {space.passages.length > 0
                ? <RowList rows={space.passages} />
                : <p className="mt-3 text-[15px] text-ink/60">{lists.empty}</p>}
            </div>
            {space.planned.length > 0 && (
              <div>
                <h3 className="font-semibold text-ink">{lists.next}</h3>
                <RowList rows={space.planned} />
              </div>
            )}
          </div>
        </section>
      )}

      {space.documents.length > 0 && (
        <section aria-labelledby="documents">
          <h2 id="documents" className="display h3">Mes documents</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {space.documents.map((doc) => (
              <ResourceCard key={doc.id} title={doc.title} url={doc.url} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/* Mon espace : le code de suivi ouvre la fiche et le bilan des passages. */
export default function MonEspacePage() {
  const [params, setParams] = useSearchParams()
  const code = (params.get('code') || '').trim().toUpperCase()
  const [input, setInput] = useState(code)
  const [result, setResult] = useState<{ code: string; space?: Espace; error?: string } | null>(null)

  useEffect(() => {
    if (!code) return
    let active = true
    getEspace(code)
      .then((space) => {
        if (active) setResult({ code, space })
      })
      .catch((err) => {
        if (active) setResult({ code, error: err instanceof Error ? err.message : 'Code introuvable' })
      })
    return () => {
      active = false
    }
  }, [code])

  const current = result?.code === code ? result : null
  const busy = Boolean(code) && !current

  /* Le code passe dans l'adresse : la page se recharge et se partage telle quelle. */
  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setParams({ code: input.trim().toUpperCase() })
  }

  return (
    <main className={`${WRAP} pb-20 pt-14 sm:pt-20`}>
      <Seo {...publicSeo('/mon-espace')} />
      <div className="animate-rise">
        <SectionHeader
          level={1}
          title="Mon espace"
          lead="Entrez votre code de suivi pour retrouver votre dossier et vos passages."
        />
        <form onSubmit={onSubmit} className="mt-6 flex max-w-md flex-wrap items-end gap-3">
          <label className="min-w-[12rem] flex-1 text-[14px] font-medium text-forest">
            Code de suivi
            <input
              required
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="PA-3MXR"
              autoComplete="off"
              className="mt-1 w-full border border-forest/40 bg-white px-3 py-2.5 font-mono text-[15px] tracking-wide focus:border-forest focus:outline-none"
            />
          </label>
          <button type="submit" disabled={busy} className="ui-btn-primary min-h-11!">
            {busy ? 'Recherche…' : 'Ouvrir'}
          </button>
        </form>
        {current?.error && (
          <p role="alert" className="mt-3 text-[14px] font-medium text-flag">{current.error}</p>
        )}
      </div>
      {current?.space && <EspaceView space={current.space} />}
    </main>
  )
}
