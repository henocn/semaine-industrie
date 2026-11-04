import { useId, useRef, useState } from 'react'
import { LocationPickerMap } from './LocationPickerMap'

type Props = {
  lat: number | null
  lng: number | null
  onPick: (lat: number, lng: number) => void
  defaultAddress?: string
  hint?: string
}

/* Champ Adresse : le clic ouvre la carte dans une fenêtre, le texte part avec le formulaire. */
export function LocationField({ lat, lng, onPick, defaultAddress = '', hint }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [address, setAddress] = useState(defaultAddress)
  const [draft, setDraft] = useState({ lat, lng, address })
  const placed = lat != null && lng != null

  /* La carte se monte une fois la fenêtre visible, pour connaître sa taille. */
  function openDialog() {
    setDraft({ lat, lng, address })
    dialogRef.current?.showModal()
    setOpen(true)
  }

  /* Retient le point et le texte. */
  function confirm() {
    if (draft.lat == null || draft.lng == null) return
    onPick(draft.lat, draft.lng)
    setAddress(draft.address.trim())
    dialogRef.current?.close()
  }

  return (
    <div>
      <p className="text-sm font-semibold text-forest">Adresse</p>
      <input type="hidden" name="address" value={address} />
      <button
        type="button"
        onClick={openDialog}
        className="mt-1.5 flex w-full items-center justify-between gap-3 border border-forest/40 bg-white px-3 py-2.5 text-left text-[15px] text-ink hover:border-forest"
      >
        <span className={placed ? '' : 'text-ink/55'}>
          {placed ? address || 'Emplacement placé sur la carte' : 'Cliquez pour placer votre adresse sur la carte'}
        </span>
        <span className="shrink-0 text-[13px] font-semibold text-forest">{placed ? 'Modifier' : 'Ouvrir la carte'}</span>
      </button>
      {placed && (
        <p className="mt-1.5 text-[13px] text-ink/60">Position : {lat.toFixed(5)}, {lng.toFixed(5)}</p>
      )}
      {hint && !placed && <p className="mt-1.5 text-xs text-muted">{hint}</p>}

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-3xl overflow-y-auto border border-black bg-white p-0 backdrop:bg-black/50"
      >
        {open && (
          <div className="p-4 sm:p-5">
            <h2 id={titleId} className="text-lg font-semibold text-forest">Votre adresse</h2>
            <p className="mt-1 text-[14px] text-ink/70">Cliquez sur la carte pour placer le point, puis ajustez-le si besoin.</p>
            <label className="mt-3 block text-[13px] font-semibold text-forest">
              Quartier, ville
              <input
                value={draft.address}
                onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.preventDefault()
                }}
                maxLength={500}
                className="mt-1 w-full border border-forest/40 bg-white px-3 py-2 text-[15px] font-normal text-ink focus:border-forest focus:outline-none"
              />
            </label>
            <LocationPickerMap
              className="mt-3"
              lat={draft.lat}
              lng={draft.lng}
              onPick={(pickedLat, pickedLng) => setDraft((current) => ({ ...current, lat: pickedLat, lng: pickedLng }))}
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="border border-forest bg-white px-4 py-2 text-[14px] font-semibold text-forest"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={draft.lat == null || draft.lng == null}
                className="border border-forest bg-forest px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50"
              >
                Valider
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  )
}
