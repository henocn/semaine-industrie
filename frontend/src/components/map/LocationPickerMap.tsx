import { useEffect, useRef } from 'react'
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
    map.setView(pos, Math.max(map.getZoom(), 12))
  }, [lat, lng])

  return (
    <div className={className}>
      <div ref={containerRef} className="h-56 w-full border border-forest/20 sm:h-64" />
      <p className="mt-2 text-[13px] text-ink/55">
        Cliquez sur la carte (ou glissez le point) pour situer la structure.
        {lat != null && lng != null && (
          <span className="ml-1 font-medium text-forest">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        )}
      </p>
    </div>
  )
}
