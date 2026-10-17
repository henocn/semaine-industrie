import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapPoint } from '../../api/labels'

type Props = {
  points: MapPoint[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** Carte plus haute (page visites). */
  tall?: boolean
}

/* Marqueur circulaire brand (évite les PNG Leaflet cassés sous Vite). */
function makeIcon(active: boolean, hasVisits: boolean) {
  const fill = active ? '#f6c800' : hasVisits ? '#00a85a' : '#024d3e'
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:14px;height:14px;border-radius:999px;background:${fill};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

/* HTML du popup site + résumé des visites. */
function popupHtml(p: MapPoint) {
  const place = [p.city, p.region].filter(Boolean).join(' · ')
  const groups = p.visits?.groups ?? 0
  const head = p.visits?.headcount ?? 0
  const visitLine =
    groups > 0
      ? `<br/><span style="color:#024d3e;font-weight:600">${groups} visite${groups > 1 ? 's' : ''} · ${head} personnes</span>`
      : `<br/><span style="color:#666">Aucune visite arrangée</span>`
  return `<strong>${p.name}</strong><br/>${place}${visitLine}`
}

/* Carte Leaflet centrée sur le Togo, sites + visites. */
export function SitesMap({ points, selectedId, onSelect, tall }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const selectedRef = useRef(selectedId)
  const onSelectRef = useRef(onSelect)
  selectedRef.current = selectedId
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      zoomControl: true,
    }).setView([8.6, 1.2], 7)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map)

    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
      markersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()
    markersRef.current.clear()

    const latLngs: L.LatLngExpression[] = []
    for (const p of points) {
      const lat = Number(p.lat)
      const lng = Number(p.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

      const hasVisits = (p.visits?.groups ?? 0) > 0
      const marker = L.marker([lat, lng], { icon: makeIcon(false, hasVisits) })
        .bindPopup(popupHtml(p))
        .on('click', () => onSelectRef.current(p.id))

      marker.addTo(layer)
      markersRef.current.set(p.id, marker)
      marker.setIcon(makeIcon(p.id === selectedRef.current, hasVisits))
      latLngs.push([lat, lng])
    }

    map.invalidateSize()
    if (latLngs.length === 1) {
      map.setView(latLngs[0], 12)
    } else if (latLngs.length > 1) {
      map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40], maxZoom: 12 })
    } else {
      map.setView([8.6, 1.2], 7)
    }
  }, [points])

  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      const p = points.find((x) => x.id === id)
      const hasVisits = (p?.visits?.groups ?? 0) > 0
      marker.setIcon(makeIcon(id === selectedId, hasVisits))
      if (id === selectedId) {
        marker.openPopup()
        mapRef.current?.panTo(marker.getLatLng(), { animate: true })
      }
    }
  }, [selectedId, points])

  return (
    <div
      className={
        tall
          ? 'relative h-full min-h-[420px] overflow-hidden bg-sage/60 sm:min-h-[520px] lg:min-h-[640px]'
          : 'relative aspect-[4/3] overflow-hidden bg-sage/60 sm:aspect-[16/10]'
      }
    >
      <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full" />
      {points.length === 0 && (
        <p className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-sage/40 text-ink/50">
          Aucun site avec position pour l’instant
        </p>
      )}
    </div>
  )
}
