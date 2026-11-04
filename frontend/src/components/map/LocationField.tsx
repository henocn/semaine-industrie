import { useRef, useState } from 'react'
import { LocationPickerMap } from './LocationPickerMap'

type Props = {
  lat: number | null
  lng: number | null
  onPick: (lat: number, lng: number) => void
  defaultAddress?: string
}

/* Champ Adresse : le clic ouvre la carte dans une fenêtre, Valider retient le point. */
export function LocationField({ lat, lng, onPick, defaultAddress = '' }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ lat, lng })
  const placed = lat != null && lng != null

  /* La carte se monte une fois la fenêtre visible, pour connaître sa taille. */
  function openDialog() {
    setDraft({ lat, lng })
    dialogRef.current?.showModal()
    setOpen(true)
  }

  /* Retient le point choisi. */
  function confirm() {
    if (draft.lat == null || draft.lng == null) return
    onPick(draft.lat, draft.lng)
    dialogRef.current?.close()
  }

  return (
    <div>
      <p className="text-sm font-semibold text-forest">Adresse</p>
      {/* Conserve le texte d'une fiche déjà renseignée. */}
      <input type="hidden" name="address" value={defaultAddress} />
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={openDialog}
        className="mt-1.5 flex w-full items-center justify-between gap-3 rounded-sm border border-forest/25 bg-white px-3 py-2.5 text-left text-base text-ink hover:border-forest"
      >
        {placed ? (
          <>
            <span>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
            <span className="shrink-0 text-[13px] font-semibold text-forest">Modifier</span>
          </>
        ) : (
          <span className="text-ink/40">Choisir sur la carte</span>
        )}
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Placer votre adresse sur la carte"
        onClose={() => setOpen(false)}
        className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-3xl overflow-y-auto border border-black bg-white p-0 backdrop:bg-black/50"
      >
        {open && (
          <div className="p-4 sm:p-5">
            <LocationPickerMap
              lat={draft.lat}
              lng={draft.lng}
              onPick={(pickedLat, pickedLng) => setDraft({ lat: pickedLat, lng: pickedLng })}
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="bg-flag px-4 py-2 text-[14px] font-semibold text-white"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={draft.lat == null || draft.lng == null}
                className="bg-forest px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50"
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
