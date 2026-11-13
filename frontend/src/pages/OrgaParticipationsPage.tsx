import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  approveParticipation,
  createParticipation,
  deleteParticipation,
  getParticipation,
  listParticipations,
  rejectParticipation,
  updateParticipation,
  type Participation,
  type ParticipationKind,
} from '../api/participations'
import { googleMapsUrl } from '../api/labels'
import { OrgaShell } from '../components/layout/OrgaShell'
import { LocationField } from '../components/map/LocationField'
import { IconButton, IconCheck, IconX, IconEdit, IconTrash } from '../components/ui/IconButton'
import { useOrgaRealtime } from '../lib/useOrgaRealtime'
import { PhoneField } from '../components/ui/PhoneField'
import { ExportBar, SelectAllHeader, SelectCell } from '../components/orga/RowSelection'
import { PendingBadge } from '../components/orga/PendingBadge'
import { useConfirm } from '../lib/useConfirm'
import { SortControl } from '../components/orga/SortControl'
import { useTableSort, type SortAccessors } from '../lib/useTableSort'
import { useRowSelection } from '../lib/useRowSelection'
import { excelDate, type ExcelColumn } from '../lib/excel'
import { MEDIA_PROFILES, PALAIS_DAYS, mediaProfileLabel } from '../data'

const field = 'mt-1 w-full border border-black bg-white px-3 py-2 text-[14px] text-ink focus:outline-none'

/* Libellé court du statut. */
function statusLabel(status: Participation['status'], waitlisted = false) {
  if (status === 'approved') return 'Acceptée'
  if (status === 'rejected') return 'Refusée'
  return waitlisted ? 'Liste d’attente' : 'En attente'
}

/* Tri : date d'inscription, nom, puis statut (en attente, liste d'attente, acceptée, refusée). */
const SORT: SortAccessors<Participation> = {
  date: (r) => r.createdAt,
  name: (r) => r.name,
  status: (r) => {
    if (r.status === 'approved') return 2
    if (r.status === 'rejected') return 3
    return r.waitlisted ? 1 : 0
  },
}

/* Libellé de chaque onglet. */
const KIND_TABS: { key: ParticipationKind; label: string }[] = [
  { key: 'ecole', label: 'Visites : Écoles' },
  { key: 'particulier', label: 'Visites : Particuliers' },
  { key: 'palais', label: 'Palais des Congrès' },
  { key: 'media', label: 'Médias' },
]

/* Journées du Palais choisies, triées. */
function palaisDays(item: Participation) {
  return (item.palais_days || []).map(Number).sort((a, b) => a - b)
}

/* Heure d'entrée au Palais, ou rien. */
function palaisEntry(item: Participation, n: number) {
  const at = item.palais_checkins?.[String(n)]
  return at ? new Date(at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lome' }) : null
}

/* Colonnes de l'export Excel des inscriptions. */
const EXPORT_COLUMNS: ExcelColumn<Participation>[] = [
  { header: 'Code de suivi', width: 14, value: (r) => r.passport?.code || r.tracking_code || '' },
  { header: 'Nom', width: 32, value: (r) => r.name },
  { header: 'Statut', width: 12, value: (r) => statusLabel(r.status, r.waitlisted) },
  { header: 'Téléphone', width: 18, value: (r) => r.phone },
  { header: 'E-mail', width: 28, value: (r) => r.email },
  { header: 'Ville', width: 16, value: (r) => r.city },
  { header: 'Adresse', width: 28, value: (r) => r.address },
  { header: 'Effectif', width: 10, value: (r) => r.headcount },
  { header: 'Passages', width: 10, value: (r) => passageCount(r) },
  { header: 'Spécialités / note', width: 36, value: (r) => r.description },
  { header: 'Date de demande', width: 18, value: (r) => excelDate(r.createdAt) },
]

/* Export des inscriptions au Palais : une colonne par journée (inscrit, puis heure d'entrée). */
const PALAIS_EXPORT_COLUMNS: ExcelColumn<Participation>[] = [
  ...EXPORT_COLUMNS.slice(0, 5),
  ...PALAIS_DAYS.map((d): ExcelColumn<Participation> => ({
    header: `${d.n} nov.`,
    width: 12,
    value: (r) => (palaisDays(r).includes(d.n) ? (palaisEntry(r, d.n) ? `Entré ${palaisEntry(r, d.n)}` : 'Inscrit') : ''),
  })),
  { header: 'Ce qui l’amène', width: 36, value: (r) => r.description },
  { header: 'Date de demande', width: 18, value: (r) => excelDate(r.createdAt) },
]

/* Média et profil d'une accréditation : « Radio Lomé · Journaliste ». */
function mediaSummary(item: Participation) {
  const d = item.media_details || {}
  return [d.outlet, d.profile ? mediaProfileLabel(d.profile) : null].filter(Boolean).join(' · ')
}

/* Export des accréditations médias. */
const MEDIA_EXPORT_COLUMNS: ExcelColumn<Participation>[] = [
  ...EXPORT_COLUMNS.slice(0, 5),
  { header: 'Média', width: 28, value: (r) => r.media_details?.outlet || '' },
  { header: 'Profil', width: 20, value: (r) => (r.media_details?.profile ? mediaProfileLabel(r.media_details.profile) : '') },
  { header: 'Lien officiel', width: 36, value: (r) => r.media_details?.link || '' },
  { header: 'Ce qu’il prévoit de couvrir', width: 36, value: (r) => r.description },
  { header: 'Date de demande', width: 18, value: (r) => excelDate(r.createdAt) },
]

/* Nombre de passages (0 tant qu'aucun scan). */
function passageCount(item: Participation) {
  return item.passport?.passages ?? 0
}

/* Classe de ligne selon le statut. */
function rowClass(status: Participation['status']) {
  if (status === 'approved') return 'orga-row-approved'
  if (status === 'rejected') return 'orga-row-rejected'
  return 'orga-row-pending'
}

/* Télécharge l'image du QR. */
function downloadQr(dataUrl: string, code: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `qr-${code}.png`
  a.click()
}

/* Lit le formulaire d'une participation. */
function readForm(fd: FormData, kind: ParticipationKind) {
  const headcountRaw = String(fd.get('headcount') || '').trim()
  return {
    name: String(fd.get('name') || '').trim(),
    email: String(fd.get('email') || '').trim() || null,
    phone: String(fd.get('phone') || '').trim() || null,
    description: String(fd.get('description') || '').trim() || null,
    headcount: kind === 'ecole' && headcountRaw ? Number(headcountRaw) : null,
    address: String(fd.get('address') || '').trim() || null,
    ...(kind === 'palais' ? { palais_days: fd.getAll('palais_days').map(Number) } : {}),
    ...(kind === 'media'
      ? {
          media_outlet: String(fd.get('media_outlet') || '').trim(),
          media_profile: String(fd.get('media_profile') || 'autre'),
          media_link: String(fd.get('media_link') || '').trim(),
        }
      : {}),
  }
}

/* Libellé du champ libre selon l'onglet. */
function descriptionLabel(kind: ParticipationKind) {
  if (kind === 'ecole') return 'Spécialités / séries ou filières'
  if (kind === 'palais') return 'Ce qui l’amène'
  if (kind === 'media') return 'Ce qu’il prévoit de couvrir'
  return 'Note'
}

/* Média, profil et lien officiel d'une accréditation, pour l'ajout et la modification. */
function MediaFields({ outlet = '', profile = '', link = '' }: { outlet?: string; profile?: string; link?: string }) {
  return (
    <>
      <label className="text-[13px] font-medium text-forest">
        Média, chaîne ou compte
        <input required name="media_outlet" minLength={2} maxLength={160} defaultValue={outlet} className={field} />
      </label>
      <label className="text-[13px] font-medium text-forest">
        Profil
        <select name="media_profile" defaultValue={profile || 'journaliste'} className={field}>
          {MEDIA_PROFILES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </label>
      <label className="text-[13px] font-medium text-forest sm:col-span-2">
        Lien officiel
        <input name="media_link" type="text" inputMode="url" maxLength={300} defaultValue={link} placeholder="Page de réseau social, site web" className={field} />
      </label>
    </>
  )
}

/* Cases des journées du Palais, pour l'ajout et la modification. */
function PalaisDaysField({ value = [] }: { value?: number[] }) {
  return (
    <fieldset className="text-[13px] font-medium text-forest sm:col-span-2">
      <legend>Journées</legend>
      <div className="mt-1 flex flex-wrap gap-4">
        {PALAIS_DAYS.map((d) => (
          <label key={d.n} className="flex items-center gap-2 font-normal text-ink">
            <input type="checkbox" name="palais_days" value={d.n} defaultChecked={value.includes(d.n)} className="h-4 w-4 accent-forest" />
            {d.label} · {d.title}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/* Compteurs par journée : inscrits (hors refus), acceptés, entrées. */
function PalaisCounts({ rows }: { rows: Participation[] }) {
  return (
    <div className="mb-4 grid border border-black bg-white sm:grid-cols-3">
      {PALAIS_DAYS.map((d, index) => {
        const forDay = rows.filter((r) => r.status !== 'rejected' && palaisDays(r).includes(d.n))
        const approved = forDay.filter((r) => r.status === 'approved').length
        const entered = forDay.filter((r) => palaisEntry(r, d.n)).length
        const stats: [number, string, string][] = [
          [forDay.length, 'inscrit', 'inscrits'],
          [approved, 'accepté', 'acceptés'],
          [entered, 'entrée', 'entrées'],
        ]
        return (
          <div key={d.n} className={`px-5 py-4 ${index > 0 ? 'border-t border-black sm:border-t-0 sm:border-l' : ''}`}>
            <p className="text-[14px] font-semibold text-forest">{d.label}</p>
            <p className="text-[13px] text-ink/60">{d.title}</p>
            <p className="mt-2 text-[14px] text-ink/70">
              {stats.map(([value, one, many], i) => (
                <span key={many}>
                  {i > 0 && <span className="mx-1.5 text-ink/30">·</span>}
                  <strong className="text-[17px] font-bold tabular-nums text-forest">{value}</strong> {value > 1 ? many : one}
                </span>
              ))}
            </p>
          </div>
        )
      })}
    </div>
  )
}

/* Coordonnée lue depuis l'API, ou rien si elle est absente. */
function coordinate(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

/* Backoffice : écoles (centres, univ) et particuliers, avec QR à l'acceptation. */
export default function OrgaParticipationsPage() {
  const [kind, setKind] = useState<ParticipationKind>('ecole')
  const [rows, setRows] = useState<Participation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Participation | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [pendingByKind, setPendingByKind] = useState<Record<ParticipationKind, number>>({ ecole: 0, particulier: 0, palais: 0, media: 0 })
  const [position, setPosition] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null })
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { confirm, modal } = useConfirm()

  /* Compte les inscriptions à traiter, pour les deux onglets. */
  async function loadPending() {
    const pending = await listParticipations({ status: 'pending' })
    setPendingByKind({
      ecole: pending.filter((row) => row.kind === 'ecole').length,
      particulier: pending.filter((row) => row.kind === 'particulier').length,
      palais: pending.filter((row) => row.kind === 'palais').length,
      media: pending.filter((row) => row.kind === 'media').length,
    })
  }

  /* Recharge l'onglet courant et les compteurs. */
  async function load() {
    const [data] = await Promise.all([listParticipations({ kind }), loadPending()])
    setRows(data)
  }

  useEffect(() => {
    void loadPending().catch(() => undefined)
    /* Retour sur l'onglet du navigateur : compteurs et liste à jour, comme le menu latéral. */
    function onVisible() {
      if (document.visibilityState === 'visible') void load().catch(() => undefined)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  useEffect(() => {
    setRows([])
    setSelectedId(null)
    setDetail(null)
    setEditingId(null)
    setShowAdd(false)
    setError(null)
    listParticipations({ kind })
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : 'Chargement impossible'))
  }, [kind])

  useOrgaRealtime(
    ['participation:changed'],
    () => load().catch((err) => setError(err instanceof Error ? err.message : 'Chargement impossible')),
  )

  /* Ouvre le détail juste sous la ligne, avec le QR s'il existe. */
  async function openRow(id: string) {
    if (selectedId === id) {
      setSelectedId(null)
      setDetail(null)
      setEditingId(null)
      return
    }
    setSelectedId(id)
    setEditingId(null)
    setError(null)
    try {
      setDetail(await getParticipation(id))
    } catch (err) {
      setDetail(rows.find((row) => row.id === id) || null)
      setError(err instanceof Error ? err.message : 'Détail indisponible')
    }
  }

  /* Enregistre une nouvelle participation dans l'onglet ouvert. */
  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setBusy(true)
    setError(null)
    try {
      await createParticipation({ kind, ...readForm(new FormData(form), kind), ...(kind === 'ecole' ? position : {}) })
      setPosition({ lat: null, lng: null })
      form.reset()
      setShowAdd(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible')
    } finally {
      setBusy(false)
    }
  }

  /* Enregistre les corrections d'une ligne. */
  async function onUpdate(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()
    const form = e.currentTarget
    setBusy(true)
    setError(null)
    try {
      const updated = await updateParticipation(id, { ...readForm(new FormData(form), kind), ...(kind === 'ecole' ? position : {}) })
      setDetail(updated)
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible')
    } finally {
      setBusy(false)
    }
  }

  /* Nom de la ligne, pour les fenêtres de confirmation. */
  function rowName(id: string) {
    return rows.find((row) => row.id === id)?.name || 'Cette inscription'
  }

  /* Accepte (après confirmation) et affiche le QR ; sans confirmation pour recréer le QR d'une inscription déjà acceptée. */
  async function onApprove(id: string) {
    const row = rows.find((r) => r.id === id)
    if (row?.status !== 'approved' && !(await confirm({
      title: 'Accepter l’inscription ?',
      message: `${rowName(id)} recevra son QR par e-mail et sur WhatsApp.`,
      confirmLabel: 'Accepter',
    }))) return
    setBusy(true)
    setError(null)
    try {
      const updated = await approveParticipation(id)
      setSelectedId(id)
      setDetail(updated)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Acceptation impossible')
    } finally {
      setBusy(false)
    }
  }

  /* Refuse la participation. */
  async function onReject(id: string) {
    if (!(await confirm({
      title: 'Refuser l’inscription ?',
      message: `${rowName(id)} sera prévenu par e-mail et sur WhatsApp. Il ne restera ensuite que la suppression.`,
      confirmLabel: 'Refuser',
      danger: true,
    }))) return
    setBusy(true)
    setError(null)
    try {
      const updated = await rejectParticipation(id)
      setDetail(updated)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refus impossible')
    } finally {
      setBusy(false)
    }
  }

  /* Supprime la participation. */
  async function onDelete(id: string) {
    if (!(await confirm({
      title: 'Supprimer cette participation ?',
      message: `${rowName(id)} sera retiré. Cette action est définitive.`,
      confirmLabel: 'Supprimer',
      danger: true,
    }))) return
    setBusy(true)
    setError(null)
    try {
      await deleteParticipation(id)
      if (selectedId === id) {
        setSelectedId(null)
        setDetail(null)
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible')
    } finally {
      setBusy(false)
    }
  }

  /* Filtre nom, contact et code de suivi. */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((item) =>
      [
        item.name,
        item.email,
        item.phone,
        item.city,
        item.description,
        item.passport?.code || item.tracking_code,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [rows, query])
  const sort = useTableSort(filtered, SORT, kind)
  const picked = useRowSelection(sort.sorted)

  const isSchool = kind === 'ecole'
  const isPalais = kind === 'palais'
  const isMedia = kind === 'media'
  let noun = filtered.length > 1 ? 'particuliers' : 'particulier'
  if (isSchool) noun = filtered.length > 1 ? 'écoles' : 'école'
  if (isPalais) noun = filtered.length > 1 ? 'inscrits au Palais' : 'inscrit au Palais'
  if (isMedia) noun = filtered.length > 1 ? 'accréditations médias' : 'accréditation média'
  let addLabel = 'Ajouter un particulier'
  if (isSchool) addLabel = 'Ajouter une école'
  if (isPalais) addLabel = 'Ajouter une inscription'
  if (isMedia) addLabel = 'Ajouter une accréditation'
  let exportName = { filename: 'inscriptions-particuliers', sheet: 'Particuliers' }
  if (isSchool) exportName = { filename: 'inscriptions-ecoles', sheet: 'Écoles' }
  if (isPalais) exportName = { filename: 'inscriptions-journees-palais', sheet: 'Palais des Congrès' }
  if (isMedia) exportName = { filename: 'accreditations-medias', sheet: 'Médias' }

  return (
    <OrgaShell
      title="Participations"
      searchPlaceholder="Rechercher…"
      onSearch={setQuery}
      actions={
        <button type="button" className="orga-btn" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'Fermer' : addLabel}
        </button>
      }
    >
      {modal}
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      <div className="mb-4 flex gap-0 border border-black">
        {KIND_TABS.map(({ key, label }, index) => (
          <button
            key={key}
            type="button"
            onClick={() => setKind(key)}
            className={`flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-[14px] font-semibold ${
              kind === key ? 'bg-forest text-white' : 'bg-white text-forest hover:bg-forest/10'
            } ${index > 0 ? 'border-l border-black' : ''}`}
          >
            {label}
            <PendingBadge count={pendingByKind[key]} />
          </button>
        ))}
      </div>

      {isPalais && <PalaisCounts rows={rows} />}

      {showAdd && (
        <form onSubmit={(e) => void onCreate(e)} className="orga-panel mb-4 grid gap-3 sm:grid-cols-2">
          <label className="text-[13px] font-medium text-forest sm:col-span-2">
            Nom
            <input required name="name" className={field} />
          </label>
          <label className="text-[13px] font-medium text-forest">
            E-mail
            <input type="email" name="email" className={field} />
          </label>
          <label className="text-[13px] font-medium text-forest">
            Téléphone
            <PhoneField name="phone" className={field} />
            <span className="mt-1 block text-[12px] font-normal text-ink/50">De préférence un numéro WhatsApp.</span>
          </label>
          {isSchool && (
            <label className="text-[13px] font-medium text-forest">
              Effectif souhaité
              <input name="headcount" type="number" min={1} className={field} />
            </label>
          )}
          {isSchool && (
            <div className="sm:col-span-2">
              <LocationField lat={position.lat} lng={position.lng} onPick={(lat, lng) => setPosition({ lat, lng })} />
            </div>
          )}
          {kind === 'particulier' && (
            <label className="text-[13px] font-medium text-forest sm:col-span-2">
              Ville Quartier
              <input name="address" maxLength={500} className={field} />
            </label>
          )}
          {isPalais && <PalaisDaysField />}
          {isMedia && <MediaFields />}
          <label className="text-[13px] font-medium text-forest sm:col-span-2">
            {descriptionLabel(kind)}
            <textarea name="description" rows={3} className={`${field} resize-none`} />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="orga-btn" disabled={busy}>
              Enregistrer
            </button>
          </div>
        </form>
      )}

      <ExportBar
        selection={picked}
        filename={exportName.filename}
        sheet={exportName.sheet}
        columns={isPalais ? PALAIS_EXPORT_COLUMNS : isMedia ? MEDIA_EXPORT_COLUMNS : EXPORT_COLUMNS}
        review={{
          eligible: (row) => row.status === 'pending',
          run: (row, status) => (status === 'approved' ? approveParticipation(row.id) : rejectParticipation(row.id)),
          name: (row) => row.name,
          onDone: async () => {
            setDetail(null)
            await load()
          },
        }}
      />
      <section className="orga-panel !p-0 overflow-x-auto">
        <div className="flex items-center justify-between border-b border-black px-4 py-3">
          <h2 className="text-[15px] font-semibold text-forest">
            {filtered.length} {noun}
          </h2>
          <SortControl order={sort.order} onChange={sort.setOrder} />
        </div>
        <table className="orga-table min-w-[720px]">
          <thead>
            <tr>
              <SelectAllHeader selection={picked} />
              <th className="w-32">Code de suivi</th>
              <th>Nom</th>
              <th className="w-40">Contact</th>
              <th className="w-28">Statut</th>
              <th className={isPalais ? 'w-36' : isMedia ? 'w-56' : 'w-24'}>{isPalais ? 'Journées' : isMedia ? 'Média' : 'Passage'}</th>
              <th className="w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7}>Aucune participation</td>
              </tr>
            )}
            {sort.sorted.map((item) => {
              const open = selectedId === item.id
              const shown = open && detail?.id === item.id ? detail : item
              return (
                <Fragment key={item.id}>
                  <tr
                    className={`${rowClass(item.status)} cursor-pointer ${open ? 'bg-forest/10' : ''}`}
                    onClick={() => void openRow(item.id)}
                  >
                    <SelectCell selection={picked} id={item.id} />
                    <td className="font-semibold text-forest">
                      {item.passport?.code || item.tracking_code || '—'}
                    </td>
                    <td className="font-medium text-forest">{item.name}</td>
                    <td>{item.phone || item.email || '…'}</td>
                    <td>{statusLabel(item.status, item.waitlisted)}</td>
                    {isPalais ? (
                      <td className="whitespace-nowrap">
                        {palaisDays(item).map((n, i) => (
                          <span key={n} className={palaisEntry(item, n) ? 'font-semibold text-forest' : ''}>
                            {i > 0 ? ' · ' : ''}{n}{palaisEntry(item, n) ? ' ✓' : ''}
                          </span>
                        ))}
                      </td>
                    ) : isMedia ? (
                      <td>{mediaSummary(item) || '—'}</td>
                    ) : (
                      <td className={passageCount(item) > 0 ? 'font-semibold text-forest' : 'text-ink/45'}>
                        {passageCount(item)}
                      </td>
                    )}
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {item.status === 'pending' && (
                          <IconButton label="Accepter" variant="ok" disabled={busy} onClick={() => void onApprove(item.id)}>
                            <IconCheck />
                          </IconButton>
                        )}
                        {item.status === 'pending' && (
                          <IconButton label="Refuser" variant="danger" disabled={busy} onClick={() => void onReject(item.id)}>
                            <IconX />
                          </IconButton>
                        )}
                        {item.status !== 'rejected' && (
                        <IconButton
                          label="Modifier"
                          disabled={busy}
                          onClick={() => {
                            setSelectedId(item.id)
                            setEditingId(item.id)
                            setPosition({ lat: coordinate(item.lat), lng: coordinate(item.lng) })
                            void getParticipation(item.id).then(setDetail).catch(() => setDetail(item))
                          }}
                        >
                          <IconEdit />
                        </IconButton>
                        )}
                        <IconButton label="Supprimer" variant="danger" disabled={busy} onClick={() => void onDelete(item.id)}>
                          <IconTrash />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={7} className="bg-white">
                        {editingId === item.id ? (
                          <form onSubmit={(e) => void onUpdate(e, item.id)} className="grid gap-3 p-4 sm:grid-cols-2">
                            <label className="text-[13px] font-medium text-forest sm:col-span-2">
                              Nom
                              <input required name="name" defaultValue={shown.name} className={field} />
                            </label>
                            <label className="text-[13px] font-medium text-forest">
                              E-mail
                              <input type="email" name="email" defaultValue={shown.email || ''} className={field} />
                            </label>
                            <label className="text-[13px] font-medium text-forest">
                              Téléphone
                              <PhoneField name="phone" defaultValue={shown.phone || ''} className={field} />
                            </label>
                            {isSchool && (
                              <label className="text-[13px] font-medium text-forest">
                                Effectif souhaité
                                <input name="headcount" type="number" min={1} defaultValue={shown.headcount ?? ''} className={field} />
                              </label>
                            )}
                            {isSchool && (
                              <div className="sm:col-span-2">
                                <LocationField
                                  key={item.id}
                                  lat={position.lat}
                                  lng={position.lng}
                                  defaultAddress={shown.address || ''}
                                  onPick={(lat, lng) => setPosition({ lat, lng })}
                                />
                              </div>
                            )}
                            {kind === 'particulier' && (
                              <label className="text-[13px] font-medium text-forest sm:col-span-2">
                                Ville Quartier
                                <input name="address" maxLength={500} defaultValue={shown.address || ''} className={field} />
                              </label>
                            )}
                            {isPalais && <PalaisDaysField value={palaisDays(shown)} />}
                            {isMedia && (
                              <MediaFields
                                outlet={shown.media_details?.outlet || ''}
                                profile={shown.media_details?.profile || ''}
                                link={shown.media_details?.link || ''}
                              />
                            )}
                            <label className="text-[13px] font-medium text-forest sm:col-span-2">
                              {descriptionLabel(kind)}
                              <textarea name="description" rows={3} defaultValue={shown.description || ''} className={`${field} resize-none`} />
                            </label>
                            <div className="sm:col-span-2 flex gap-2">
                              <button type="submit" className="orga-btn" disabled={busy}>Enregistrer</button>
                              <button type="button" className="orga-btn" onClick={() => setEditingId(null)}>Annuler</button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex flex-wrap items-start gap-6 p-4">
                            <div className="min-w-0 flex-1 text-[14px] text-ink">
                              {shown.createdAt && (
                                <p className="mb-1 text-[13px] text-ink/60">
                                  Date de demande · {new Date(shown.createdAt).toLocaleString('fr-FR')}
                                </p>
                              )}
                              {shown.city && !shown.address?.toLowerCase().includes(shown.city.trim().toLowerCase()) && <p>{shown.city}</p>}
                              {shown.address && <p>{shown.address}</p>}
                              {coordinate(shown.lat) !== null && coordinate(shown.lng) !== null && (
                                <p>
                                  <a
                                    href={googleMapsUrl(shown.lat, shown.lng) || undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-semibold text-forest underline underline-offset-2"
                                  >
                                    Voir sur la carte
                                  </a>
                                </p>
                              )}
                              {shown.email && <p>{shown.email}</p>}
                              {shown.phone && <p>{shown.phone}</p>}
                              {shown.headcount ? <p>{shown.headcount} personnes</p> : null}
                              {item.departure_scan && (
                                <p className="font-semibold text-forest">
                                  Départ scanné · {item.departure_scan.point} · {new Date(item.departure_scan.scanned_at).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                              {isMedia && mediaSummary(shown) && <p className="font-semibold text-forest">{mediaSummary(shown)}</p>}
                              {isMedia && shown.media_details?.link && (
                                <p>
                                  <a href={shown.media_details.link} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-forest underline underline-offset-2">
                                    {shown.media_details.link}
                                  </a>
                                </p>
                              )}
                              {isPalais && (
                                <ul className="my-2">
                                  {PALAIS_DAYS.filter((d) => palaisDays(shown).includes(d.n)).map((d) => (
                                    <li key={d.n}>
                                      {d.label} · {d.title}
                                      {palaisEntry(shown, d.n) && (
                                        <span className="font-semibold text-forest"> · entrée à {palaisEntry(shown, d.n)}</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {shown.description && <p className="mt-2 whitespace-pre-wrap text-ink/80">{shown.description}</p>}
                              {!shown.description && !shown.email && !shown.phone && !shown.city && (
                                <p className="text-ink/50">Complétez la fiche avant le jour J.</p>
                              )}
                            </div>
                            {shown.status === 'approved' && shown.passport?.qr_data_url && (
                              <div className="text-center">
                                <img src={shown.passport.qr_data_url} alt={`Carte QR ${shown.name}`} className="h-auto w-44 border border-black bg-white" />
                                <p className="mt-2 text-[13px] font-semibold text-forest">{shown.passport.code}</p>
                                <button
                                  type="button"
                                  className="mt-2 text-[13px] font-semibold text-forest underline"
                                  onClick={() => downloadQr(shown.passport!.qr_data_url!, shown.passport!.code)}
                                >
                                  Télécharger la carte
                                </button>
                              </div>
                            )}
                            {shown.status === 'approved' && !shown.passport?.qr_data_url && (
                              <button type="button" className="orga-btn" disabled={busy} onClick={() => void onApprove(item.id)}>
                                Créer le QR
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </section>
    </OrgaShell>
  )
}
