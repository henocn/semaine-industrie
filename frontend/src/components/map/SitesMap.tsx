import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapPoint } from '../../api/labels'

type Props = {
  points: MapPoint[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/* Marqueur circulaire brand (évite les PNG Leaflet cassés sous Vite). */
function makeIcon(active: boolean) {
  const fill = active ? '#f6c800' : '#024d3e'
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:14px;height:14px;border-radius:999px;background:${fill};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

/* Carte Leaflet centrée sur le Togo, points labellisés. */
export function SitesMap({ points, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const selectedRef = useRef(selectedId)
  selectedRef.current = selectedId

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

      const marker = L.marker([lat, lng], { icon: makeIcon(false) })
        .bindPopup(
          `<strong>${p.name}</strong><br/>${[p.city, p.region].filter(Boolean).join(' · ')}`,
        )
        .on('click', () => onSelect(p.id))

      marker.addTo(layer)
      markersRef.current.set(p.id, marker)
      marker.setIcon(makeIcon(p.id === selectedRef.current))
      latLngs.push([lat, lng])
    }

    if (latLngs.length === 1) {
      map.setView(latLngs[0], 12)
    } else if (latLngs.length > 1) {
      map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40], maxZoom: 12 })
    } else {
      map.setView([8.6, 1.2], 7)
    }
  }, [points, onSelect])

  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      marker.setIcon(makeIcon(id === selectedId))
      if (id === selectedId) {
        marker.openPopup()
        mapRef.current?.panTo(marker.getLatLng(), { animate: true })
      }
    }
  }, [selectedId])

  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-sage/60 sm:aspect-[16/10]">
      <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full" />
      {points.length === 0 && (
        <p className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-sage/40 text-ink/50">
          Aucun site labellisé pour l’instant
        </p>
      )}
    </div>
  )
}
