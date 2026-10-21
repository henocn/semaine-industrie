import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type Props = {
  lat: number | null
  lng: number | null
  onPick: (lat: number, lng: number) => void
  className?: string
}

/* Marqueur brand pour le point choisi. */
function pinIcon() {
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:16px;height:16px;border-radius:999px;background:#024d3e;border:2px solid #f6c800;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

/* Carte cliquable : pose / déplace le marqueur (lat/lng auto). */
export function LocationPickerMap({ lat, lng, onPick, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick
  const focusRef = useRef(false)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)

  /* Place le point sur la position de l'appareil. */
  function locateMe() {
    if (!navigator.geolocation) {
      setLocError('Position indisponible sur cet appareil.')
      return
    }
    setLocating(true)
    setLocError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        focusRef.current = true
        onPickRef.current(pos.coords.latitude, pos.coords.longitude)
        setLocating(false)
      },
      () => {
        setLocError('Position refusée ou indisponible.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    )
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      scrollWheelZoom: true,
      zoomControl: true,
    }).setView([8.6, 1.2], 7)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map)

    map.on('click', (e) => {
      onPickRef.current(e.latlng.lat, e.latlng.lng)
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
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      return
    }

    const pos: L.LatLngExpression = [lat, lng]
    if (!markerRef.current) {
      markerRef.current = L.marker(pos, { icon: pinIcon(), draggable: true })
        .addTo(map)
        .on('dragend', () => {
          const p = markerRef.current?.getLatLng()
          if (p) onPickRef.current(p.lat, p.lng)
        })
    } else {
      markerRef.current.setLatLng(pos)
    }
    map.setView(pos, focusRef.current ? 16 : Math.max(map.getZoom(), 12))
    focusRef.current = false
  }, [lat, lng])

  return (
    <div className={className}>
      <div ref={containerRef} className="h-56 w-full border border-forest/20 sm:h-64" />
      <div className="mt-2 flex flex-wrap items-center gap-3">
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
        {locError && <span className="text-[13px] text-red-700">{locError}</span>}
      </div>
    </div>
  )
}
