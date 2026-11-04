import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { createTogoMap, isInTogo } from './togoMap'

type Props = {
  lat: number | null
  lng: number | null
  onPick: (lat: number, lng: number) => void
  className?: string
}

const OUTSIDE_TOGO = 'Choisissez un emplacement à l’intérieur du Togo.'

/* Marqueur brand pour le point choisi. */
function pinIcon() {
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:16px;height:16px;border-radius:999px;background:#024d3e;border:2px solid #f6c800;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

/* Carte du Togo cliquable : pose / déplace le marqueur (lat/lng auto). */
export function LocationPickerMap({ lat, lng, onPick, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick
  const focusRef = useRef(false)
  const lastPosRef = useRef<L.LatLngTuple | null>(null)
  const [locating, setLocating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  /* Retient le point s'il est au Togo, sinon le signale ; indique si le point est accepté. */
  const pickRef = useRef((pickedLat: number, pickedLng: number) => {
    if (!isInTogo(pickedLat, pickedLng)) {
      setMessage(OUTSIDE_TOGO)
      return false
    }
    setMessage(null)
    onPickRef.current(pickedLat, pickedLng)
    return true
  })

  /* Place le point sur la position de l'appareil. */
  function locateMe() {
    if (!navigator.geolocation) {
      setMessage('Position indisponible sur cet appareil.')
      return
    }
    setLocating(true)
    setMessage(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        focusRef.current = pickRef.current(pos.coords.latitude, pos.coords.longitude)
        setLocating(false)
      },
      () => {
        setMessage('Position refusée ou indisponible.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    )
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = createTogoMap(containerRef.current)
    map.on('click', (e) => {
      pickRef.current(e.latlng.lat, e.latlng.lng)
    })
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      lastPosRef.current = null
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      return
    }

    const pos: L.LatLngTuple = [lat, lng]
    lastPosRef.current = pos
    if (!markerRef.current) {
      markerRef.current = L.marker(pos, { icon: pinIcon(), draggable: true })
        .addTo(map)
        .on('dragend', () => {
          const p = markerRef.current?.getLatLng()
          if (!p || pickRef.current(p.lat, p.lng)) return
          /* Déposé hors du Togo : le marqueur revient à sa dernière position. */
          if (lastPosRef.current) markerRef.current?.setLatLng(lastPosRef.current)
        })
    } else {
      markerRef.current.setLatLng(pos)
    }
    map.setView(pos, focusRef.current ? 16 : Math.max(map.getZoom(), 12))
    focusRef.current = false
  }, [lat, lng])

  return (
    <div className={`${className ?? ''} flex flex-col gap-4 sm:flex-row sm:items-start`}>
      <div
        ref={containerRef}
        className="mx-auto h-[576px] w-[240px] shrink-0 border border-forest/20 sm:mx-0"
        style={{ background: '#fff' }}
      />
      <div className="flex flex-col items-start gap-3">
        <p className="text-[14px] leading-relaxed text-ink/70">
          Cliquez sur votre région pour zoomer, puis ajustez le point sur votre site.
        </p>
        <button
          type="button"
          onClick={locateMe}
          disabled={locating}
          className="border border-forest bg-white px-3 py-1.5 text-[13px] font-semibold text-forest disabled:opacity-50"
        >
          {locating ? 'Localisation…' : 'Ma position'}
        </button>
        {lat != null && lng != null && (
          <span className="text-[13px] font-medium text-forest">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        )}
        {message && <span role="alert" className="text-[13px] text-red-700">{message}</span>}
      </div>
    </div>
  )
}
